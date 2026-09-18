/**
 * LIE DETECTOR — Interrogation Engine
 *
 * Deterministic-but-varied branching dialogue. Responses are composed from
 * layered template pools keyed on: question, personality, emotional state,
 * stress band, truthfulness of the underlying statement, and how many times
 * the player has already asked. Suspects remember everything.
 *
 * Body language is a CLUE, never proof: tell strength is deliberately noised
 * by the personality's `tellReliability`, and honest people under pressure
 * produce the same signals as liars.
 */

import { RNG } from './rng';
import { PERSONALITIES } from './data/people';
import {
  CaseFile,
  DialogueTurn,
  Emotion,
  Evidence,
  Person,
  Statement,
  SuspectState,
} from './types';
import { detectContradictions } from './generator';

export interface QuestionDef {
  id: string;
  label: string;
  category: 'timeline' | 'relationship' | 'pressure' | 'evidence' | 'special';
  icon: string;
  unlocked: (ctx: AskCtx) => boolean;
}

export interface AskCtx {
  cf: CaseFile;
  suspect: Person;
  state: SuspectState;
  discovered: string[];
  analysed: string[];
  interrogated: string[];
}

export interface AskResult {
  turns: DialogueTurn[];
  delta: { trust: number; stress: number; cooperation: number };
  revealedSecret?: boolean;
  brokeStatement?: string;
  contradiction?: boolean;
  unlockEvidenceId?: string;
}

export function newSuspectState(s: Person): SuspectState {
  const p = PERSONALITIES[s.personality];
  return {
    trust: p.baseTrust,
    stress: p.baseStress,
    cooperation: 50,
    askedQuestions: {},
    presentedEvidence: [],
    brokenStatements: [],
    secretRevealed: false,
    log: [],
    lastEmotion: 'calm',
  };
}

/* ------------------------------------------------------------------ */
/*  Question bank                                                      */
/* ------------------------------------------------------------------ */

export const QUESTIONS: QuestionDef[] = [
  { id: 'account', label: 'Tell me what happened, in your own words.', category: 'timeline', icon: 'chatbox-ellipses', unlocked: () => true },
  { id: 'timeline', label: 'Where were you that evening?', category: 'timeline', icon: 'map', unlocked: () => true },
  { id: 'crimewindow', label: 'Be specific. Where were you at {CRIME}?', category: 'timeline', icon: 'time', unlocked: () => true },
  { id: 'arrive', label: 'When did you arrive?', category: 'timeline', icon: 'enter', unlocked: () => true },
  { id: 'leave', label: 'Why did you leave when you did?', category: 'timeline', icon: 'exit', unlocked: () => true },
  { id: 'company', label: 'Who were you with?', category: 'timeline', icon: 'people', unlocked: () => true },
  { id: 'witnesses', label: 'Can anyone confirm that?', category: 'timeline', icon: 'eye', unlocked: () => true },
  { id: 'travel', label: 'How did you get around that night?', category: 'timeline', icon: 'car', unlocked: () => true },
  { id: 'victim', label: 'Did you know {VICTIM}?', category: 'relationship', icon: 'person', unlocked: () => true },
  { id: 'relationship', label: 'Describe your relationship with them.', category: 'relationship', icon: 'heart-dislike', unlocked: () => true },
  { id: 'object', label: 'Did you touch {OBJECT}?', category: 'relationship', icon: 'hand-left', unlocked: () => true },
  { id: 'suspicion', label: 'Who do you think did this?', category: 'relationship', icon: 'help-circle', unlocked: () => true },
  { id: 'rapport', label: 'Take your time. I’m not accusing you.', category: 'pressure', icon: 'happy', unlocked: () => true },
  { id: 'pressure', label: 'You’re not telling me everything.', category: 'pressure', icon: 'flash', unlocked: () => true },
  { id: 'withhold', label: 'Last chance. What are you holding back?', category: 'pressure', icon: 'lock-open', unlocked: (c) => c.state.stress > 45 },
  {
    id: 'motive', label: 'Let’s talk about your finances and your grievances.', category: 'special', icon: 'cash',
    unlocked: (c) => c.cf.evidence.some((e) => e.tags.includes('motive') && e.placesSuspectId === c.suspect.id && c.discovered.includes(e.id)),
  },
  {
    id: 'contradiction', label: 'Why does the evidence contradict you?', category: 'evidence', icon: 'warning',
    unlocked: (c) => detectContradictions(c.cf, c.discovered, c.analysed).some((x) => x.suspectId === c.suspect.id),
  },
  {
    id: 'identity', label: 'You’ve used another name. Explain that.', category: 'special', icon: 'id-card',
    unlocked: (c) => c.cf.evidence.some((e) => e.tags.includes('identity') && c.discovered.includes(e.id) && e.payload?.lines?.[0]?.includes(c.suspect.name)),
  },
  {
    id: 'relation', label: 'You didn’t mention your connection to another suspect.', category: 'special', icon: 'git-network',
    unlocked: (c) => c.cf.evidence.some((e) => e.tags.includes('relationship') && c.discovered.includes(e.id) && (e.payload?.lines ?? []).some((l: string) => l.includes(c.suspect.name))),
  },
];

/* ------------------------------------------------------------------ */
/*  Emotion + body language                                            */
/* ------------------------------------------------------------------ */

const TELLS: Record<Emotion, string[]> = {
  calm: [
    'Hands loose on the table. Breathing even.',
    'Holds your gaze without effort. Shoulders low.',
    'Sits back. Answers at the same speed they arrived at.',
    'Blink rate unremarkable. No self-touching.',
  ],
  nervous: [
    'Left hand keeps finding the edge of the table.',
    'Swallows before answering. Twice.',
    'Foot taps under the chair — out of rhythm with speech.',
    'Wipes a palm on the thigh of their trousers.',
    'Breath shortens on the second half of the sentence.',
  ],
  angry: [
    'Jaw sets. The nostrils flare on the inhale.',
    'Leans in hard. The chair scrapes.',
    'Points with two fingers, then catches themselves.',
    'Voice drops rather than rises. Colder, not louder.',
  ],
  defensive: [
    'Arms fold. One shoulder turns away from you.',
    'Repeats your question back before answering it.',
    'Chin lifts. Answer arrives pre-packaged.',
    'Body angles toward the door without moving.',
  ],
  confused: [
    'Eyebrows draw in. Genuine search behind the eyes.',
    'Starts an answer, abandons it, starts again.',
    'Looks up and left, then apologises for the pause.',
    'Asks for the question again — not stalling, actually lost.',
  ],
  evasive: [
    'Answers a nearby question instead of yours.',
    'Eye contact breaks precisely on the operative word.',
    'The sentence gets longer the less it says.',
    'Touches the base of the throat, briefly.',
  ],
  confident: [
    'Smiles with the eyes as well as the mouth.',
    'Hands open, palms visible. Deliberately so.',
    'Corrects a small detail of your question. Enjoys it.',
    'Settles deeper into the chair.',
  ],
  shocked: [
    'The colour drains from the face inside a second.',
    'Whole body goes still. Not tense — stopped.',
    'Mouth opens before any sound arrives.',
    'Both hands come off the table.',
  ],
  emotional: [
    'Eyes glass over. They refuse the tissue.',
    'Voice fractures on the victim’s name.',
    'Presses the heels of both hands into the eyes.',
    'Laughs once, wrongly, and then stops.',
  ],
  suspicious: [
    'Studies you for longer than the question deserves.',
    'Asks who else you’ve spoken to.',
    'Checks the mirror behind you. Twice.',
    'Answers, then watches your pen instead of your face.',
  ],
  broken: [
    'Something goes out of the posture entirely.',
    'Head drops. The hands stop performing.',
    'A long exhale, and the shoulders finally come down.',
    'Stares at a point on the table and does not leave it.',
  ],
};

export function tellFor(e: Emotion, rng: RNG): string {
  return rng.pick(TELLS[e]);
}

function emotionFor(
  s: Person,
  state: SuspectState,
  lying: boolean,
  aggressive: boolean,
  rng: RNG
): Emotion {
  const p = PERSONALITIES[s.personality];
  const stress = state.stress;
  // Honest people generate false positives; liars sometimes stay glassy.
  const noise = rng.next();
  const lyingSignal = lying ? p.tellReliability : 0;
  const pressureSignal = stress / 160 + (aggressive ? 0.22 : 0);
  const arousal = lyingSignal * 0.55 + pressureSignal + noise * 0.42;

  if (stress > 88 && (lying || rng.chance(0.4))) return 'broken';
  if (arousal > 0.92) return rng.pick(['shocked', 'nervous', 'defensive'] as Emotion[]);
  if (arousal > 0.74) {
    if (s.personality === 'hostile' || s.personality === 'arrogant') return rng.pick(['angry', 'defensive'] as Emotion[]);
    if (s.personality === 'grieving' || s.personality === 'anxious') return rng.pick(['emotional', 'nervous'] as Emotion[]);
    return rng.pick(['evasive', 'defensive', 'nervous'] as Emotion[]);
  }
  if (arousal > 0.55) {
    if (s.personality === 'charming') return rng.pick(['confident', 'evasive'] as Emotion[]);
    if (s.personality === 'analytical') return rng.pick(['calm', 'defensive'] as Emotion[]);
    return rng.pick(['nervous', 'evasive', 'suspicious'] as Emotion[]);
  }
  if (arousal > 0.34) {
    if (s.personality === 'grieving') return 'emotional';
    if (s.personality === 'hostile') return 'suspicious';
    return rng.pick(['calm', 'confident', 'confused'] as Emotion[]);
  }
  if (s.personality === 'arrogant' || s.personality === 'charming') return 'confident';
  if (s.personality === 'grieving') return 'emotional';
  return 'calm';
}

/* ------------------------------------------------------------------ */
/*  Response pools                                                     */
/* ------------------------------------------------------------------ */

const OPENERS: Record<string, string[]> = {
  stoic: ['', 'Go on.', 'Right.', ''],
  anxious: ['Okay. Okay, um — ', 'Sorry, one second. ', 'Right, yes. ', ''],
  hostile: ['Again? ', 'Fine. ', 'You already know this. ', ''],
  charming: ['Of course. ', 'Absolutely. ', 'Happy to. ', ''],
  analytical: ['Let me be precise. ', 'To the minute: ', 'Chronologically: ', ''],
  grieving: ['I’m sorry. ', 'Give me — okay. ', 'It’s hard to — okay. ', ''],
  arrogant: ['If we must. ', 'Briefly. ', 'For the record, again: ', ''],
  rambling: ['Right, so, ', 'Okay so the thing is, ', 'Well — ', ''],
};

const CLOSERS: Record<string, string[]> = {
  stoic: ['', ' That’s it.', ' Nothing else.'],
  anxious: [' Is that — is that alright?', ' I think that’s right.', ' Sorry, I’m rambling.'],
  hostile: [' Happy?', ' Write it down.', ' Next.'],
  charming: [' Anything else I can clear up?', ' I hope that helps.', ' Ask me again if it’s useful.'],
  analytical: [' You can verify all of that.', ' The records will bear that out.', ' That is accurate to the minute.'],
  grieving: [' I keep going over it.', ' I should have called them.', ' Sorry.'],
  arrogant: [' Moving on.', ' Was that difficult?', ' I trust that settles it.'],
  rambling: [' — anyway. Yes.', ' Where was I? Right, that.', ' Sorry, long way round.'],
};

const REPEAT_PUSHBACK = [
  'You asked me that already.',
  'We did this ten minutes ago.',
  'Is there a version of this answer you’d prefer?',
  'I’ll say it the same way, because it’s the same night.',
  'Asking twice doesn’t change what happened.',
  'You want me to slip. I understand. I’m still going to tell you the truth.',
];

const REPEAT_DRIFT = [
  'Maybe it was a few minutes later. I wasn’t watching a clock.',
  'Actually — no, hold on. It might have been before that.',
  'I said quarter past. Call it half past. I’m not certain to the minute.',
  'It could have been the other entrance. They look the same at night.',
];

function tone(rng: RNG, s: Person, body: string): string {
  const o = rng.pick(OPENERS[s.personality]);
  const c = rng.chance(0.55) ? rng.pick(CLOSERS[s.personality]) : '';
  return (o + body + c).trim();
}

/* ------------------------------------------------------------------ */
/*  Ask                                                                */
/* ------------------------------------------------------------------ */

export function questionLabel(q: QuestionDef, cf: CaseFile): string {
  const objectNoun = objectFor(cf);
  return q.label
    .replace('{VICTIM}', cf.victimName)
    .replace('{CRIME}', cf.slots[cf.crimeSlotIndex].label)
    .replace('{OBJECT}', objectNoun);
}

function objectFor(cf: CaseFile): string {
  const phys = cf.evidence.find((e) => e.kind === 'physical' && e.payload?.item && e.payload.item !== 'Scene');
  return phys?.payload?.item ?? 'the item recovered at the scene';
}

export function askQuestion(ctx: AskCtx, questionId: string): AskResult {
  const { cf, suspect, state } = ctx;
  const count = state.askedQuestions[questionId] ?? 0;
  const rng = new RNG(`${cf.seed}:${suspect.id}:${questionId}:${count}:${Math.floor(state.stress / 7)}`);
  const crimeStmt = stmtAt(cf, suspect.id, cf.crimeSlotIndex);
  const locName = (id: string) => cf.locations.find((l) => l.id === id)?.name ?? 'somewhere else';
  const turns: DialogueTurn[] = [];
  const delta = { trust: 0, stress: 0, cooperation: 0 };
  const p = PERSONALITIES[suspect.personality];
  let lyingHere = false;
  let revealedSecret = false;

  const push = (text: string, lying: boolean, extra?: Partial<DialogueTurn>) => {
    const emotion = emotionFor(suspect, state, lying, questionId === 'pressure' || questionId === 'withhold', rng);
    turns.push({
      id: `t${turns.length}_${Date.now()}`,
      speaker: 'suspect',
      text,
      emotion,
      tell: tellFor(emotion, rng),
      ...extra,
    });
  };

  // repeat handling
  if (count >= 1 && questionId !== 'pressure' && questionId !== 'rapport') {
    if (count >= 3 && rng.chance(0.7)) {
      delta.trust -= 6; delta.stress += 5; delta.cooperation -= 6;
      push(rng.pick(REPEAT_PUSHBACK), false);
      return { turns, delta };
    }
    if (rng.chance(0.35)) {
      delta.trust -= 2; delta.stress += 3;
      turns.push({
        id: `t_pre_${Date.now()}`, speaker: 'suspect',
        text: rng.pick(REPEAT_PUSHBACK), emotion: 'defensive', tell: tellFor('defensive', rng),
      });
    }
  }

  switch (questionId) {
    case 'account': {
      const parts: string[] = [];
      const own = cf.statements.filter((s) => s.suspectId === suspect.id).sort((a, b) => a.slotIndex - b.slotIndex);
      const first = own[0], mid = own[Math.floor(own.length / 2)], last = own[own.length - 1];
      parts.push(`Started the evening at ${locName(first.claimedLocationId)}.`);
      parts.push(rng.pick([
        `Middle of it I was at ${locName(mid.claimedLocationId)}.`,
        `Then ${locName(mid.claimedLocationId)}, for a while.`,
        `I ended up at ${locName(mid.claimedLocationId)}.`,
      ]));
      parts.push(rng.pick([
        `Finished up at ${locName(last.claimedLocationId)}.`,
        `Last place was ${locName(last.claimedLocationId)}.`,
        `By the end of it, ${locName(last.claimedLocationId)}.`,
      ]));
      parts.push(rng.pick([
        `I heard about ${cf.victimName} the next morning.`,
        `Nobody told me about ${cf.victimName} until it was on the news.`,
        `I found out when your people knocked on my door.`,
      ]));
      lyingHere = own.some((s) => !s.isTrue);
      delta.stress += 2 * p.stressGain;
      push(tone(rng, suspect, parts.join(' ')), lyingHere);
      break;
    }

    case 'timeline': {
      const own = cf.statements.filter((s) => s.suspectId === suspect.id).sort((a, b) => a.slotIndex - b.slotIndex);
      const chosen = own.slice(0, Math.min(4, own.length));
      const body = chosen
        .map((s) => `${cf.slots[s.slotIndex].label} — ${locName(s.claimedLocationId)}`)
        .join('. ') + '.';
      lyingHere = chosen.some((s) => !s.isTrue);
      delta.stress += 3 * p.stressGain;
      push(tone(rng, suspect, body), lyingHere);
      if (count >= 1 && rng.chance(0.4)) {
        push(rng.pick(REPEAT_DRIFT), lyingHere);
        delta.stress += 3;
      }
      break;
    }

    case 'crimewindow': {
      lyingHere = !crimeStmt.isTrue;
      const claim = locName(crimeStmt.claimedLocationId);
      const bodies = lyingHere
        ? [
          `${cf.slots[cf.crimeSlotIndex].label}. ${claim}. I'm sure.`,
          `${claim}. I remember because I checked my phone.`,
          `I was at ${claim}. Ask anyone who was there.`,
          `${claim}, and I'd say that under oath.`,
          `Nowhere near ${cf.locationName}, if that's what you're circling.`,
        ]
        : [
          `${claim}. ${rng.pick(['That one I’m certain of.', 'There’s a record of it, I imagine.', 'You can check.'])}`,
          `I was at ${claim} at ${cf.slots[cf.crimeSlotIndex].label}.`,
          `${claim}. I didn’t move for the best part of an hour.`,
        ];
      delta.stress += (lyingHere ? 7 : 4) * p.stressGain;
      push(tone(rng, suspect, rng.pick(bodies)), lyingHere);
      break;
    }

    case 'arrive': {
      const firstSlot = cf.statements
        .filter((s) => s.suspectId === suspect.id)
        .sort((a, b) => a.slotIndex - b.slotIndex)[0];
      lyingHere = !firstSlot.isTrue;
      delta.stress += 2 * p.stressGain;
      push(tone(rng, suspect, rng.pick([
        `${cf.slots[firstSlot.slotIndex].label}, roughly. Maybe five minutes either side.`,
        `Just before ${cf.slots[firstSlot.slotIndex].label}. I wasn't early.`,
        `${cf.slots[firstSlot.slotIndex].label}. There'd be a record of it if it matters.`,
      ])), lyingHere);
      break;
    }

    case 'leave': {
      const own = cf.statements.filter((s) => s.suspectId === suspect.id).sort((a, b) => a.slotIndex - b.slotIndex);
      const change = own.find((s, i) => i > 0 && s.claimedLocationId !== own[i - 1].claimedLocationId);
      lyingHere = !!change && !change.isTrue;
      const reason = rng.pick([
        'I was tired.',
        'The place was closing.',
        'I had an early start.',
        'I’d had enough of the company.',
        'Someone called me.',
        'I wasn’t enjoying myself, if I’m honest.',
        'I never planned to stay.',
      ]);
      delta.stress += 3 * p.stressGain;
      push(tone(rng, suspect, change
        ? `I left around ${cf.slots[change.slotIndex].label}. ${reason}`
        : `I didn’t leave. I was in the same place most of the night. ${reason}`), lyingHere);
      break;
    }

    case 'company': {
      const comp = crimeStmt.claimedCompanionId
        ? cf.suspects.find((s) => s.id === crimeStmt.claimedCompanionId)
        : null;
      lyingHere = !!crimeStmt.claimedCompanionId && !crimeStmt.isTrue;
      delta.stress += 3 * p.stressGain;
      if (comp) {
        push(tone(rng, suspect, rng.pick([
          `${comp.name} was with me. Ask them.`,
          `I was with ${comp.name}. We were together the whole time.`,
          `${comp.name}. We’ve known each other for years.`,
        ])), lyingHere, { isContradiction: false });
      } else {
        push(tone(rng, suspect, rng.pick([
          'Alone, mostly. That’s not a crime yet.',
          'Nobody who’d remember me. It was that kind of night.',
          'People were around. I didn’t know any of them.',
          'On my own. I prefer it.',
        ])), lyingHere);
      }
      break;
    }

    case 'witnesses': {
      lyingHere = !crimeStmt.isTrue;
      delta.stress += 5 * p.stressGain;
      push(tone(rng, suspect, lyingHere
        ? rng.pick([
          'Someone must have seen me. I don’t know their names.',
          'There were people. I couldn’t pick them out of a room.',
          'That’s your job, isn’t it? Finding them?',
          'I didn’t know I’d need an audience.',
        ])
        : rng.pick([
          'Yes. There’ll be a record — a card, a camera, something.',
          'Plenty of people. Look at the door camera.',
          'I paid for something. That leaves a trail, doesn’t it?',
          'Check the timestamps. They’ll back me up.',
        ])), lyingHere);
      break;
    }

    case 'travel': {
      delta.stress += 2 * p.stressGain;
      push(tone(rng, suspect, rng.pick([
        'I drove. Parked two streets away because the lot was full.',
        'Train, both ways. I tap in and out like everyone else.',
        'Walked. It’s twenty minutes and I needed the air.',
        'Cab. I don’t remember the company. It came off my card, probably.',
        'A friend dropped me. I didn’t ask them to wait.',
      ])), false);
      break;
    }

    case 'victim': {
      delta.stress += 3 * p.stressGain;
      push(tone(rng, suspect, rng.pick([
        `Everyone knew ${cf.victimName}. I knew them better than most.`,
        `We were ${suspect.relationToVictim}s. That’s the whole of it.`,
        `Yes. ${cf.victimName} and I go back a long way. Not all of it good.`,
        `I knew them. I didn’t like them. Those aren’t the same thing.`,
      ])), false);
      break;
    }

    case 'relationship': {
      const strained = !!suspect.motive;
      delta.stress += 4 * p.stressGain;
      push(tone(rng, suspect, strained
        ? rng.pick([
          `Complicated. We disagreed about money and neither of us moved.`,
          `We’d stopped speaking properly. That happens.`,
          `There was a dispute. It was going to be resolved. It just wasn’t resolved yet.`,
          `I resented them. I’m not going to pretend otherwise — you’ll find out anyway.`,
        ])
        : rng.pick([
          `Perfectly ordinary. We weren’t close, we weren’t at war.`,
          `Cordial. We saw each other maybe twice a month.`,
          `Good, actually. I liked them.`,
        ])), false);
      break;
    }

    case 'object': {
      const obj = objectFor(cf);
      lyingHere = cf.solution.lieTopicId === 'object' && suspect.isCulprit;
      delta.stress += (lyingHere ? 8 : 3) * p.stressGain;
      push(tone(rng, suspect, lyingHere
        ? rng.pick([
          `No. I’ve never touched ${obj}.`,
          `Absolutely not. Why would I?`,
          `I don’t even know what ${obj} looks like.`,
        ])
        : rng.pick([
          `Possibly. I’ve been in that building a hundred times.`,
          `Not that I remember. I might have moved something out of the way.`,
          `No. And if my prints are on it, someone put them there.`,
          `I don’t think so. I couldn’t swear to it.`,
        ])), lyingHere);
      break;
    }

    case 'suspicion': {
      const others = cf.suspects.filter((s) => s.id !== suspect.id);
      const target = suspect.isCulprit
        ? (others.find((o) => o.hasSecret) ?? rng.pick(others))
        : rng.pick(others);
      delta.stress += 2 * p.stressGain;
      delta.cooperation += 3;
      push(tone(rng, suspect, rng.pick([
        `If you’re making me say it — ${target.name}. Ask them about that night properly.`,
        `${target.name} has been strange since it happened. Draw your own conclusions.`,
        `I’m not accusing anyone. But I’d look at ${target.name} before I looked at me.`,
        `${target.name}. And they’ll tell you the same about me, I expect.`,
      ])), false);
      break;
    }

    case 'rapport': {
      delta.trust += 9; delta.stress -= 12; delta.cooperation += 8;
      push(tone(rng, suspect, rng.pick([
        'Thank you. Genuinely. Nobody’s said that yet.',
        'I appreciate that. I’m not used to any of this.',
        'Alright. Alright. Ask me properly and I’ll answer properly.',
        'That helps. You’d be amazed how rarely anyone says it.',
      ])), false);
      if (state.trust + delta.trust > 72 && suspect.hasSecret && !state.secretRevealed && rng.chance(0.35)) {
        push('There is… something. Not what you think. Ask me again when you have something in your hand.', false);
      }
      break;
    }

    case 'pressure': {
      delta.trust -= 11; delta.stress += 16; delta.cooperation -= 6;
      const cracking = state.stress + 16 > 70;
      push(tone(rng, suspect, cracking
        ? rng.pick([
          'Everyone is holding something back. That doesn’t make everyone a murderer.',
          'You want me to say something I’ll regret. I’ve seen this done before.',
          'Fine. There’s a thing. It isn’t your thing. Bring me proof and I’ll talk about it.',
          'Stop. Just — stop for a second.',
        ])
        : rng.pick([
          'I’ve told you what I know.',
          'Try that again and I’ll want a lawyer in the room.',
          'You’re fishing. I can hear the line.',
          'I’m not holding anything back that concerns you.',
        ])), true);
      break;
    }

    case 'withhold': {
      delta.stress += 12; delta.trust -= 4;
      if (suspect.hasSecret && !state.secretRevealed && (state.stress > 62 || state.trust > 70)) {
        revealedSecret = true;
        delta.cooperation += 10;
        push(suspect.secret!.confession, true, { emotion: 'broken' });
        turns.push({
          id: `sys_${Date.now()}`, speaker: 'system',
          text: `${suspect.name} has admitted a false statement for ${cf.slots[suspect.secret!.slotIndex].label}. Note the time: it is ${suspect.secret!.slotIndex === cf.crimeSlotIndex ? 'inside' : 'outside'} the crime window.`,
        });
      } else if (suspect.isCulprit && state.stress > 75 && state.brokenStatements.length > 0) {
        push(crimeStmt.revisedText ?? 'I was closer to it than I said. That is all you are getting.', true, { emotion: 'broken' });
        turns.push({
          id: `sys2_${Date.now()}`, speaker: 'system',
          text: 'A revised account is not a confession. It has to be tested against the record like everything else.',
        });
      } else {
        push(tone(rng, suspect, rng.pick([
          'Nothing. I’ve given you the night as it happened.',
          'You keep asking as if the answer will change.',
          'If I had something, I’d have used it by now to get out of this room.',
          'There is nothing. I want that written down.',
        ])), false);
      }
      break;
    }

    case 'motive': {
      delta.stress += 10; delta.trust -= 3;
      const m = suspect.motive;
      push(tone(rng, suspect, m
        ? rng.pick([
          `Yes, I had a reason to dislike them. So did four other people you’ve got in rooms like this.`,
          `You found the money. Well done. It doesn’t put me anywhere.`,
          `A motive isn’t an act. I’d have thought you’d know the difference.`,
          `I won’t insult you. It looks bad. It is still not what happened.`,
        ])
        : rng.pick([
          `I don’t have a motive, which is presumably why you’re irritated.`,
          `There’s nothing there. Look as long as you like.`,
        ])), !!m && suspect.isCulprit);
      break;
    }

    case 'contradiction': {
      const cx = detectContradictions(cf, ctx.discovered, ctx.analysed).filter((x) => x.suspectId === suspect.id);
      if (!cx.length) {
        push('Contradiction? Show me one.', false);
        break;
      }
      const c = cx[0];
      delta.stress += 18; delta.trust -= 8;
      const stmt = cf.statements.find((s) => s.id === c.statementId)!;
      if (!stmt.isTrue && suspect.hasSecret && suspect.secret!.slotIndex === c.slotIndex) {
        revealedSecret = true;
        push(suspect.secret!.confession, true, { emotion: 'broken', isContradiction: true });
      } else if (!stmt.isTrue && suspect.isCulprit) {
        push(rng.pick([
          `Your record is wrong. It happens more than you’d like to admit.`,
          `That timestamp means nothing. Devices drift.`,
          `Somebody has made a mistake and you’ve decided it’s me.`,
          `I’m not changing my account because you’ve produced a piece of paper.`,
        ]), true, { isContradiction: true });
      } else {
        push(rng.pick([
          `Then your record is wrong, because I know where I was.`,
          `I can’t explain your machine. I can only tell you what I did.`,
          `Check it again. Please. Because that isn’t me.`,
        ]), false, { isContradiction: true });
      }
      break;
    }

    case 'identity': {
      delta.stress += 14; delta.trust -= 6;
      push(tone(rng, suspect, rng.pick([
        'I changed my name legally, years ago, and I don’t discuss why.',
        'That name belongs to a person I stopped being. It isn’t relevant.',
        'You found it, so you know it was registered properly. Move on.',
        'I didn’t volunteer it because nobody asks a normal person that question.',
      ])), suspect.isCulprit);
      break;
    }

    case 'relation': {
      delta.stress += 12; delta.trust -= 5;
      push(tone(rng, suspect, rng.pick([
        'We’re connected. So is half this city. It didn’t seem worth raising.',
        'I didn’t hide it. You didn’t ask.',
        'It ended badly and I don’t discuss it. That is not the same as concealing it.',
        'Fine — yes. We know each other. That is not an alibi and it isn’t a conspiracy.',
      ])), suspect.isCulprit);
      break;
    }

    default:
      push('I don’t follow the question.', false);
  }

  delta.stress = Math.round(delta.stress);
  return { turns, delta, revealedSecret };
}

/* ------------------------------------------------------------------ */
/*  Present evidence                                                   */
/* ------------------------------------------------------------------ */

export function presentEvidence(ctx: AskCtx, ev: Evidence): AskResult {
  const { cf, suspect, state } = ctx;
  const rng = new RNG(`${cf.seed}:${suspect.id}:present:${ev.id}:${state.presentedEvidence.length}`);
  const turns: DialogueTurn[] = [];
  const delta = { trust: 0, stress: 0, cooperation: 0 };
  const locName = (id: string) => cf.locations.find((l) => l.id === id)?.name ?? 'elsewhere';
  let brokeStatement: string | undefined;
  let revealedSecret = false;
  let contradiction = false;

  const already = state.presentedEvidence.includes(ev.id);
  if (already) {
    turns.push({
      id: `p_rep_${Date.now()}`, speaker: 'suspect',
      text: rng.pick([
        'You’ve shown me that. My answer hasn’t improved.',
        'Same piece of paper, same answer.',
        'Are we going in circles deliberately?',
      ]),
      emotion: 'defensive', tell: tellFor('defensive', rng),
    });
    delta.trust -= 4; delta.stress += 3;
    return { turns, delta };
  }

  const proven = ctx.analysed.includes(ev.id) && ev.analysis?.upgradesTo === 'tampered';
  const stmt = ev.slotIndex !== null && ev.placesSuspectId === suspect.id
    ? stmtAt(cf, suspect.id, ev.slotIndex)
    : null;

  const contradicts =
    !!stmt && !!ev.placesLocationId && stmt.claimedLocationId !== ev.placesLocationId && !proven;

  const push = (text: string, lying: boolean, emotion?: Emotion) => {
    const e = emotion ?? emotionFor(suspect, state, lying, true, rng);
    turns.push({
      id: `p${turns.length}_${Date.now()}`, speaker: 'suspect', text,
      emotion: e, tell: tellFor(e, rng), isContradiction: contradicts,
    });
  };

  if (proven) {
    delta.stress += 4; delta.trust += 3;
    push(rng.pick([
      'That file has been messed with. Even I can see it, and I’m not the detective.',
      'You’ve already established that’s fake. Why show me?',
      'Someone made that. It isn’t evidence, it’s a decision.',
    ]), false);
    return { turns, delta };
  }

  if (!contradicts) {
    // Evidence that supports them, or is irrelevant to them
    const supportsThem = !!stmt && stmt.claimedLocationId === ev.placesLocationId;
    if (supportsThem) {
      delta.trust += 7; delta.stress -= 8; delta.cooperation += 5;
      push(rng.pick([
        'There. That’s exactly what I told you.',
        'Good. Now can we move on to someone who lied to you?',
        'Thank you. I’ve been saying that since I walked in.',
        'You had that the whole time, didn’t you.',
      ]), false, 'confident');
    } else if (ev.placesSuspectId && ev.placesSuspectId !== suspect.id) {
      const other = cf.suspects.find((s) => s.id === ev.placesSuspectId);
      delta.cooperation += 4; delta.stress += 2;
      push(rng.pick([
        `That’s ${other?.name ?? 'them'}, not me. I don’t know what they were doing.`,
        `Interesting. I’d ask ${other?.firstName ?? 'them'} about that, not me.`,
        `If that’s ${other?.firstName ?? 'them'}, then ${other?.firstName ?? 'they'} lied to you. That’s not my problem to solve.`,
      ]), false);
    } else {
      delta.stress += 3;
      push(rng.pick([
        'I don’t know what you want me to do with that.',
        'That has nothing to do with me.',
        'You’re showing me paperwork and waiting for a reaction. There isn’t one.',
      ]), false);
    }
    return { turns, delta, revealedSecret, brokeStatement, contradiction };
  }

  /* --- it contradicts them --- */
  contradiction = true;
  brokeStatement = stmt!.id;
  delta.stress += 22; delta.trust -= 9; delta.cooperation -= 3;

  const slotLabel = cf.slots[stmt!.slotIndex].label;
  const claimed = locName(stmt!.claimedLocationId);
  const actual = locName(ev.placesLocationId!);

  turns.push({
    id: `sysc_${Date.now()}`, speaker: 'system',
    text: `CONTRADICTION — ${suspect.name} placed themselves at ${claimed} at ${slotLabel}. ${ev.title} places them at ${actual}.`,
  });

  const stressAfter = state.stress + 22;

  if (suspect.hasSecret && suspect.secret!.slotIndex === stmt!.slotIndex && !state.secretRevealed) {
    if (stressAfter > 52) {
      revealedSecret = true;
      push(suspect.secret!.confession, true, 'broken');
      turns.push({
        id: `sysd_${Date.now()}`, speaker: 'system',
        text: `Admission logged. This falsehood concerns ${slotLabel}${stmt!.slotIndex === cf.crimeSlotIndex ? ', which is inside the crime window.' : ', which is OUTSIDE the crime window. A liar is not automatically an offender.'}`,
      });
    } else {
      push(rng.pick([
        'That’s… I must have mixed up the days.',
        'I don’t — give me a moment.',
        'Your machine is wrong. It has to be.',
      ]), true, 'nervous');
    }
  } else if (suspect.isCulprit) {
    if (stressAfter > 74 && state.brokenStatements.length >= 1) {
      push(stmt!.revisedText ?? 'Fine. I was nearer than I said.', true, 'broken');
      turns.push({
        id: `syse_${Date.now()}`, speaker: 'system',
        text: 'Account revised under pressure. A revision is not a confession — corroborate it against the record before you rely on it.',
      });
    } else {
      push(rng.pick([
        'That is not me. Whoever that is, it is not me.',
        'Timestamps drift. Cameras get the day wrong. This proves nothing.',
        'You’ve had that in your folder all afternoon, waiting to spring it. It still isn’t true.',
        'I want that examined by someone independent before I say another word about it.',
        'No. No. Run it again.',
      ]), true, rng.pick(['angry', 'defensive', 'shocked'] as Emotion[]));
    }
  } else {
    push(rng.pick([
      'Then something is wrong with your record, because I know where I was.',
      'That can’t be right. Check the date on it — please, actually check it.',
      'I’m telling you the truth and you’re holding a piece of paper that says otherwise. One of us is being lied to.',
      'Where did that come from? Who gave you that?',
    ]), false, rng.pick(['shocked', 'confused', 'emotional'] as Emotion[]));
    if (ev.reliability === 'unverified') {
      turns.push({
        id: `sysf_${Date.now()}`, speaker: 'system',
        text: 'Note: the source of this item is unverified. Run a forensic analysis before treating it as fact.',
      });
    }
  }

  return { turns, delta, revealedSecret, brokeStatement, contradiction };
}

function stmtAt(cf: CaseFile, suspectId: string, slot: number): Statement {
  return cf.statements.find((s) => s.suspectId === suspectId && s.slotIndex === slot)!;
}

export function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

export function greetingFor(cf: CaseFile, s: Person, state: SuspectState): DialogueTurn {
  const rng = new RNG(`${cf.seed}:${s.id}:greet:${state.log.length}`);
  const p = PERSONALITIES[s.personality];
  const first = state.log.length === 0;
  const text = first
    ? rng.pick([
      `${rng.pick(p.verbal)} Let’s get this over with.`,
      `I’ve been sitting here for forty minutes. Somebody could have said something.`,
      `Before we start — am I a suspect, or a witness? Nobody will tell me.`,
      `I’ll help however I can. I want whoever did this found.`,
      `I’ve already given a statement. Twice.`,
    ])
    : rng.pick([
      'Back again.',
      'Did you find what you were looking for?',
      `${rng.pick(p.verbal)}`,
      'I assume you’ve spoken to the others by now.',
      'Whatever you’ve got, show me and let’s finish this.',
    ]);
  const emotion = emotionFor(s, state, false, false, rng);
  return { id: `g_${Date.now()}`, speaker: 'suspect', text, emotion, tell: tellFor(emotion, rng) };
}
