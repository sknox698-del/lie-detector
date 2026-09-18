/**
 * LIE DETECTOR — Procedural Mystery Generator
 *
 * Guarantees, enforced by construction:
 *  1. Exactly one suspect (the culprit) was at the crime location during the crime window.
 *  2. EVERY innocent has at least one `verified` piece of evidence placing them elsewhere
 *     during the crime window. Their alibi is therefore provable.
 *  3. The culprit has at least one `verified` piece of evidence placing them AT the scene
 *     during the crime window (the key evidence), plus a documented motive.
 *  4. Red herrings (secret-keepers, tampered evidence, pre-crime presence) always resolve:
 *     the contradiction they create never touches the crime window, or is provably tampered.
 *  => Every generated case has exactly one logically defensible solution.
 */

import { RNG, caseCode } from './rng';
import { makeFace, makeName, OCCUPATIONS, PERSONALITIES } from './data/people';
import {
  ARCHETYPES,
  LOCATION_TEMPLATES,
  RELATIONS,
  SECRET_TEMPLATES,
  RED_HERRING_FLAVOUR,
  CaseArchetype,
} from './data/world';
import {
  CaseFile,
  Difficulty,
  Evidence,
  EvidenceKind,
  GameLocation,
  Motive,
  Person,
  PersonalityKey,
  Statement,
  TimeSlot,
} from './types';

export interface DiffConfig {
  suspects: number;
  slots: number;
  secretKeepers: number;
  redHerrings: number;
  motiveDecoys: number;
  tampered: number;
  lockedKey: boolean;
  footageGap: boolean;
  coordinatedLie: boolean;
  preCrimePresence: boolean;
  hiddenRelation: boolean;
  alias: boolean;
  showTells: boolean;
  topics: LieTopicId[];
  parMinutes: number;
}

export type LieTopicId = 'location' | 'departure' | 'company' | 'object';

export const DIFF_CONFIG: Record<Difficulty, DiffConfig> = {
  Beginner: {
    suspects: 3, slots: 5, secretKeepers: 0, redHerrings: 1, motiveDecoys: 1, tampered: 0,
    lockedKey: false, footageGap: false, coordinatedLie: false, preCrimePresence: false,
    hiddenRelation: false, alias: false, showTells: true, topics: ['location'], parMinutes: 6,
  },
  Intermediate: {
    suspects: 4, slots: 6, secretKeepers: 1, redHerrings: 2, motiveDecoys: 2, tampered: 0,
    lockedKey: false, footageGap: false, coordinatedLie: false, preCrimePresence: false,
    hiddenRelation: false, alias: false, showTells: true, topics: ['location', 'departure'], parMinutes: 9,
  },
  Advanced: {
    suspects: 4, slots: 6, secretKeepers: 1, redHerrings: 3, motiveDecoys: 2, tampered: 1,
    lockedKey: true, footageGap: false, coordinatedLie: false, preCrimePresence: true,
    hiddenRelation: false, alias: false, showTells: true, topics: ['location', 'departure', 'object'], parMinutes: 12,
  },
  Expert: {
    suspects: 5, slots: 7, secretKeepers: 2, redHerrings: 3, motiveDecoys: 3, tampered: 1,
    lockedKey: true, footageGap: true, coordinatedLie: true, preCrimePresence: true,
    hiddenRelation: true, alias: false, showTells: true, topics: ['location', 'departure', 'company', 'object'], parMinutes: 15,
  },
  Master: {
    suspects: 5, slots: 8, secretKeepers: 2, redHerrings: 4, motiveDecoys: 4, tampered: 2,
    lockedKey: true, footageGap: true, coordinatedLie: true, preCrimePresence: true,
    hiddenRelation: true, alias: true, showTells: false, topics: ['location', 'departure', 'company', 'object'], parMinutes: 19,
  },
  Impossible: {
    suspects: 6, slots: 8, secretKeepers: 3, redHerrings: 5, motiveDecoys: 4, tampered: 2,
    lockedKey: true, footageGap: true, coordinatedLie: true, preCrimePresence: true,
    hiddenRelation: true, alias: true, showTells: false, topics: ['location', 'departure', 'company', 'object'], parMinutes: 24,
  },
};

export const DIFFICULTY_ORDER: Difficulty[] = [
  'Beginner', 'Intermediate', 'Advanced', 'Expert', 'Master', 'Impossible',
];

const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
const tLabel = (mins: number) => `${pad(Math.floor(mins / 60) % 24)}:${pad(mins % 60)}`;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/* ------------------------------------------------------------------ */
/*  Main entry                                                         */
/* ------------------------------------------------------------------ */

export function generateCase(seed: number, difficulty: Difficulty): CaseFile {
  const rng = new RNG(seed ^ 0x5bf03635);
  const cfg = DIFF_CONFIG[difficulty];
  const arch: CaseArchetype = rng.pick(ARCHETYPES);

  /* ---- time ---- */
  const startHour = rng.pick([18, 19, 20, 21]);
  const step = 30;
  const slots: TimeSlot[] = [];
  for (let i = 0; i < cfg.slots; i++) {
    const m = startHour * 60 + i * step;
    slots.push({ index: i, label: tLabel(m), minutes: m });
  }
  const crimeSlotIndex = rng.int(2, cfg.slots - 3);
  const crimeSlot = slots[crimeSlotIndex];

  const day = rng.int(1, 28);
  const month = rng.int(0, 11);
  const weekday = WEEKDAYS[rng.int(0, 6)];
  const dateLabel = `${weekday} ${day} ${MONTHS[month]} — ${crimeSlot.label}`;

  /* ---- locations ---- */
  const usedKinds = new Set<string>();
  const locations: GameLocation[] = [];
  const mkLoc = (kind?: string): GameLocation => {
    const fresh = LOCATION_TEMPLATES.filter((t) => !usedKinds.has(t.kind));
    let tpl = kind
      ? LOCATION_TEMPLATES.find((t) => t.kind === kind)
      : (fresh.length ? rng.pick(fresh) : undefined);
    if (!tpl) tpl = rng.pick(LOCATION_TEMPLATES);
    usedKinds.add(tpl.kind);
    const loc: GameLocation = {
      id: `loc${locations.length}`,
      name: rng.pick(tpl.names),
      kind: tpl.kind,
      detail: rng.pick(tpl.detail),
    };
    locations.push(loc);
    return loc;
  };

  const crimeLocation = mkLoc(rng.pick(arch.sceneKinds));
  const otherLocations: GameLocation[] = [];
  const otherCount = Math.max(4, cfg.suspects + 1);
  for (let i = 0; i < otherCount; i++) otherLocations.push(mkLoc());
  const locById = (id: string) => locations.find((l) => l.id === id)!;
  const tplFor = (loc: GameLocation) => LOCATION_TEMPLATES.find((t) => t.kind === loc.kind)!;

  /* ---- victim ---- */
  const usedNames = new Set<string>();
  const victim = makeName(rng, usedNames);
  const victimAge = rng.int(28, 66);
  const victimJob = rng.pick(OCCUPATIONS);

  /* ---- suspects ---- */
  const objectNoun = rng.pick(arch.objectNoun);
  const suspects: Person[] = [];
  const personalityPool: PersonalityKey[] = rng.shuffle([
    'stoic', 'anxious', 'hostile', 'charming', 'analytical', 'grieving', 'arrogant', 'rambling',
  ]);
  for (let i = 0; i < cfg.suspects; i++) {
    const { name, first } = makeName(rng, usedNames);
    const age = rng.int(23, 68);
    const personality = personalityPool[i % personalityPool.length];
    const relation = rng.pick(RELATIONS);
    suspects.push({
      id: `s${i}`,
      name,
      firstName: first,
      age,
      occupation: rng.pick(OCCUPATIONS),
      personality,
      bio: '',
      face: makeFace(rng, age),
      relationToVictim: relation,
      isCulprit: false,
      hasSecret: false,
    });
  }

  const culpritIdx = rng.int(0, suspects.length - 1);
  const culprit = suspects[culpritIdx];
  culprit.isCulprit = true;

  /* ---- motives ---- */
  const motivePool = rng.shuffle(arch.motives);
  const trueMotive: Motive = motivePool[0];
  culprit.motive = trueMotive;
  const decoyMotives = motivePool.slice(1, 1 + cfg.motiveDecoys);
  decoyMotives.forEach((m, i) => {
    const inn = suspects.filter((s) => !s.isCulprit)[i];
    if (inn) inn.motive = m;
  });
  const motiveOptions: Motive[] = rng.shuffle(motivePool.slice(0, Math.max(4, cfg.motiveDecoys + 2)));
  if (!motiveOptions.find((m) => m.id === trueMotive.id)) motiveOptions[0] = trueMotive;

  /* ---- secrets (innocent liars = red herrings) ---- */
  const innocents = suspects.filter((s) => !s.isCulprit);
  const secretHolders = rng.sample(innocents, cfg.secretKeepers);
  const secretTpls = rng.shuffle(SECRET_TEMPLATES);
  secretHolders.forEach((s, i) => {
    const tpl = secretTpls[i % secretTpls.length];
    // secret slot must NOT be the crime slot (so the contradiction can't be mistaken for the solution)
    const candidates = slots.map((sl) => sl.index).filter((ix) => ix !== crimeSlotIndex);
    const slotIndex = rng.pick(candidates);
    s.hasSecret = true;
    s.secret = {
      id: tpl.id,
      label: tpl.label,
      confession: tpl.confession,
      slotIndex,
      realLocationId: rng.pick(otherLocations).id,
    };
  });

  /* ---- ground truth movement table ---- */
  const truth: Record<string, string[]> = {};
  const homeBase: Record<string, string> = {};
  suspects.forEach((s, i) => {
    homeBase[s.id] = otherLocations[i % otherLocations.length].id;
  });

  suspects.forEach((s) => {
    const path: string[] = [];
    const base = homeBase[s.id];
    const alt = rng.pick(otherLocations.filter((l) => l.id !== base)).id;
    const switchAt = rng.int(1, cfg.slots - 1);
    for (let i = 0; i < cfg.slots; i++) path.push(i < switchAt ? base : alt);
    truth[s.id] = path;
  });

  // culprit: present at the scene at the crime slot (and the slot before, for arrival)
  truth[culprit.id][crimeSlotIndex] = crimeLocation.id;
  if (crimeSlotIndex - 1 >= 0 && rng.chance(0.7)) truth[culprit.id][crimeSlotIndex - 1] = crimeLocation.id;
  if (crimeSlotIndex + 1 < cfg.slots && rng.chance(0.4)) truth[culprit.id][crimeSlotIndex + 1] = crimeLocation.id;

  // innocents never at the scene during the crime slot
  innocents.forEach((s) => {
    if (truth[s.id][crimeSlotIndex] === crimeLocation.id) {
      truth[s.id][crimeSlotIndex] = rng.pick(otherLocations.filter((l) => l.id !== crimeLocation.id)).id;
    }
    if (s.secret) truth[s.id][s.secret.slotIndex] = s.secret.realLocationId;
  });

  // Advanced+: one innocent WAS at the scene, but earlier. Powerful red herring.
  let preCrimeInnocent: Person | null = null;
  if (cfg.preCrimePresence && innocents.length) {
    preCrimeInnocent = rng.pick(innocents);
    const earlier = crimeSlotIndex - 2 >= 0 ? crimeSlotIndex - 2 : 0;
    if (earlier !== crimeSlotIndex) truth[preCrimeInnocent.id][earlier] = crimeLocation.id;
  }

  /* ---- the culprit's lie ---- */
  const lieTopicId: LieTopicId = rng.pick(cfg.topics);
  const falseClaimLocation = rng.pick(
    otherLocations.filter((l) => l.id !== truth[culprit.id][crimeSlotIndex])
  );
  let claimedCompanion: Person | null = null;
  if (lieTopicId === 'company') {
    const pool = innocents.filter((s) => truth[s.id][crimeSlotIndex] !== falseClaimLocation.id);
    claimedCompanion = pool.length ? rng.pick(pool) : null;
  }

  /* ---- statements ---- */
  const statements: Statement[] = [];
  const stmtId = (sid: string, slot: number) => `st_${sid}_${slot}`;

  const narrate = (s: Person, slot: TimeSlot, loc: GameLocation, extra?: string) => {
    const forms = [
      `At ${slot.label} I was at ${loc.name}.`,
      `${slot.label} — ${loc.name}. I'm certain of that.`,
      `Around ${slot.label} I'd have been at ${loc.name}.`,
      `${loc.name}. That's where I was at ${slot.label}.`,
      `I was at ${loc.name} by ${slot.label}, give or take.`,
    ];
    return rng.pick(forms) + (extra ? ' ' + extra : '');
  };

  suspects.forEach((s) => {
    for (let i = 0; i < cfg.slots; i++) {
      const realLoc = locById(truth[s.id][i]);
      let claimedId = truth[s.id][i];
      let isTrue = true;
      let companion: string | undefined;
      let extra: string | undefined;

      if (s.isCulprit && i === crimeSlotIndex) {
        isTrue = false;
        if (lieTopicId === 'departure') {
          claimedId = homeBase[s.id];
          extra = `I left before then. I remember checking the time.`;
        } else if (lieTopicId === 'company') {
          claimedId = falseClaimLocation.id;
          companion = claimedCompanion?.id;
          extra = claimedCompanion ? `I was with ${claimedCompanion.name}.` : undefined;
        } else if (lieTopicId === 'object') {
          claimedId = falseClaimLocation.id;
          extra = `And before you ask — I never touched ${objectNoun}.`;
        } else {
          claimedId = falseClaimLocation.id;
        }
      } else if (s.secret && i === s.secret.slotIndex) {
        isTrue = false;
        claimedId = homeBase[s.id];
      }

      const claimedLoc = locById(claimedId);
      statements.push({
        id: stmtId(s.id, i),
        suspectId: s.id,
        slotIndex: i,
        claimedLocationId: claimedId,
        claimedCompanionId: companion,
        text: narrate(s, slots[i], claimedLoc, extra),
        isTrue,
        revisedText: isTrue
          ? undefined
          : s.isCulprit
            ? `…Fine. I was closer to ${crimeLocation.name} than I said. I had a reason to be there and it isn't the one you want.`
            : `I lied about ${slots[i].label}. I was at ${locById(truth[s.id][i]).name}. It has nothing to do with ${victim.name}.`,
        broken: false,
      });
      void realLoc;
    }
  });

  // Expert+: a coordinated false corroboration — an innocent backs the culprit's alibi.
  let coordinator: Person | null = null;
  if (cfg.coordinatedLie) {
    const pool = innocents.filter((s) => !s.hasSecret);
    if (pool.length) coordinator = rng.pick(pool);
  }

  /* ---- evidence ---- */
  const evidence: Evidence[] = [];
  let evIdx = 0;
  const newId = () => `ev${evIdx++}`;

  const pushEv = (e: Omit<Evidence, 'id' | 'discovered'> & { discovered?: boolean }): Evidence => {
    const full: Evidence = { ...e, id: newId(), discovered: e.discovered ?? false };
    evidence.push(full);
    return full;
  };

  /** Choose a plausible evidence kind for a placement at a location. */
  const kindFor = (loc: GameLocation, prefer?: EvidenceKind): EvidenceKind => {
    if (prefer) return prefer;
    const tpl = tplFor(loc);
    const pool: EvidenceKind[] = ['calls', 'messages', 'witness', 'social', 'photo'];
    if (tpl.hasCamera) pool.push('footage', 'footage');
    if (tpl.hasPayment) pool.push('financial', 'financial');
    return rng.pick(pool);
  };

  const CONTACTS = ['Mum', 'Work', 'D.', 'Unknown', 'K. Reyes', 'Dispatch', 'Sam', 'Landlord', 'Bank', 'No Caller ID'];

  function buildPayload(
    kind: EvidenceKind,
    person: Person,
    loc: GameLocation,
    slot: TimeSlot,
    tone: 'confirm' | 'break' | 'neutral'
  ): { title: string; source: string; summary: string; payload: any } {
    const tpl = tplFor(loc);
    switch (kind) {
      case 'footage': {
        const cam = `CAM-${rng.int(1, 9)}${rng.pick(['A', 'B', 'C'])}`;
        const frames = [];
        for (let i = -1; i <= 1; i++) {
          const m = slot.minutes + i * 8;
          frames.push({
            time: tLabel(m),
            desc:
              i === 0
                ? `${person.name} clearly identifiable, facing camera. ${tpl.detail}.`
                : i < 0
                  ? `Figure approaches from the ${rng.pick(['north stairwell', 'service door', 'main entrance', 'ramp'])}.`
                  : `Subject moves out of frame toward the ${rng.pick(['lift', 'exit', 'corridor', 'street'])}.`,
            gap: false,
          });
        }
        return {
          title: `${loc.name} — ${cam}`,
          source: `Security footage · ${cam}`,
          summary: `${cam} records ${person.name} at ${loc.name} at ${slot.label}.`,
          payload: { camera: cam, location: loc.name, frames, resolution: rng.pick(['720p', '1080p', '480p']), subject: person.name },
        };
      }
      case 'financial': {
        const merchant = loc.name;
        const amount = (rng.int(4, 240) + rng.int(0, 99) / 100).toFixed(2);
        const rows = [
          { time: tLabel(slot.minutes - rng.int(40, 90)), merchant: rng.pick(['Kiosk 42', 'Metro Fare', 'Corner Pharmacy', 'Fuel Stop 7']), amount: (rng.int(2, 40)).toFixed(2), method: 'Contactless', flagged: false },
          { time: slot.label, merchant, amount, method: rng.pick(['Chip & PIN', 'Contactless', 'Mobile Wallet']), flagged: true },
          { time: tLabel(slot.minutes + rng.int(35, 110)), merchant: rng.pick(['Night Taxi Co.', 'Corner Store', 'Rail Ticketing', 'Late Bar']), amount: (rng.int(5, 70)).toFixed(2), method: 'Contactless', flagged: false },
        ];
        return {
          title: `Card Statement — ${person.name}`,
          source: `Financial disclosure · acct •••${rng.int(1000, 9999)}`,
          summary: `A card in ${person.name}'s name is used at ${merchant} at ${slot.label}.`,
          payload: { account: `•••• ${rng.int(1000, 9999)}`, holder: person.name, rows },
        };
      }
      case 'calls': {
        const rows = [
          { time: tLabel(slot.minutes - rng.int(20, 70)), name: rng.pick(CONTACTS), number: `+44 7${rng.int(100, 999)} ${rng.int(100000, 999999)}`, direction: 'Outgoing', duration: `${rng.int(0, 4)}m ${rng.int(10, 59)}s`, cell: rng.pick(otherLocations).name },
          { time: slot.label, name: rng.pick(CONTACTS), number: `+44 7${rng.int(100, 999)} ${rng.int(100000, 999999)}`, direction: rng.pick(['Incoming', 'Outgoing']), duration: `${rng.int(1, 9)}m ${rng.int(10, 59)}s`, cell: loc.name, flagged: true },
          { time: tLabel(slot.minutes + rng.int(20, 80)), name: 'No Caller ID', number: 'Withheld', direction: 'Missed', duration: '—', cell: loc.name },
        ];
        return {
          title: `Call Log — ${person.name}`,
          source: `Carrier records · cell-site data`,
          summary: `${person.name}'s handset connects to the mast serving ${loc.name} at ${slot.label}.`,
          payload: { holder: person.name, rows },
        };
      }
      case 'messages': {
        const other = rng.pick(CONTACTS);
        const thread = [
          { from: 'them', text: rng.pick(['you still coming?', 'where are you', 'this is getting late', 'are we still on?']), time: tLabel(slot.minutes - 22) },
          { from: 'me', text: tone === 'break'
              ? `at ${loc.name} now. will explain later`
              : `at ${loc.name}. give me twenty minutes`, time: slot.label },
          { from: 'them', text: rng.pick(['ok', 'fine', 'call me when you can', 'don’t bother then']), time: tLabel(slot.minutes + 6) },
          { from: 'me', text: rng.pick(['can’t talk', 'later', 'not now', 'please just wait']), time: tLabel(slot.minutes + 9), deleted: rng.chance(0.35) },
        ];
        return {
          title: `Thread — ${person.firstName} ↔ ${other}`,
          source: `Handset extraction · ${person.name}`,
          summary: `${person.name} states their position as ${loc.name} at ${slot.label} in a private message.`,
          payload: { contact: other, holder: person.name, thread },
        };
      }
      case 'social': {
        return {
          title: `Post — @${person.firstName.toLowerCase()}${rng.int(10, 99)}`,
          source: rng.pick(['Loop', 'Chirp', 'Prism', 'Vantage Social']),
          summary: `A geotagged post places ${person.name} at ${loc.name} at ${slot.label}.`,
          payload: {
            platform: rng.pick(['Loop', 'Chirp', 'Prism']),
            author: `@${person.firstName.toLowerCase()}${rng.int(10, 99)}`,
            time: slot.label,
            geo: loc.name,
            text: rng.pick([
              'long night. tell me it ends soon',
              'this place never changes',
              'second coffee. do not judge',
              'should have stayed home',
              'someone come rescue me',
            ]),
            comments: [
              { author: `@${rng.pick(['nils', 'mara', 'jonas', 'petra', 'ade'])}${rng.int(10, 99)}`, text: rng.pick(['you good?', 'thought you were away tonight', 'send location lol', 'call me']) },
              { author: `@${rng.pick(['kit', 'roan', 'dee', 'sal'])}${rng.int(10, 99)}`, text: rng.pick(['classic', 'again??', 'be safe', 'ha']) },
            ],
            deletedAfter: rng.chance(0.3) ? `Post deleted ${rng.int(2, 40)} hours later` : null,
          },
        };
      }
      case 'photo': {
        return {
          title: `Photograph — ${loc.name}`,
          source: `Device gallery · ${rng.pick(['Aperture 12 Pro', 'Kestrel S9', 'Novus X', 'Halcyon 8'])}`,
          summary: `An image with intact metadata places ${person.name} at ${loc.name} at ${slot.label}.`,
          payload: {
            caption: rng.pick([
              'Low-light interior, subject partially reflected in glass.',
              'Street-level frame, subject visible at edge.',
              'Group shot, subject third from left.',
              'Table shot; a wall clock is legible in the background.',
            ]),
            metadata: {
              Device: rng.pick(['Aperture 12 Pro', 'Kestrel S9', 'Novus X']),
              Captured: `${slot.label}:${pad(rng.int(10, 59))}`,
              Location: loc.name,
              Lens: `${rng.int(18, 77)}mm f/${(1.4 + rng.next() * 2).toFixed(1)}`,
              Edited: rng.chance(0.25) ? 'Yes — crop only' : 'No',
            },
            hotspots: [
              { x: 0.24, y: 0.32, label: 'Reflection', detail: `A face is legible in the glass — consistent with ${person.name}.` },
              { x: 0.7, y: 0.2, label: 'Wall clock', detail: `Hands read ${slot.label}. Consistent with the file timestamp.` },
              { x: 0.52, y: 0.74, label: 'Table', detail: rng.pick([`Two glasses. Only one has been used.`, `A set of keys with a ${rng.pick(['blue', 'red', 'brass'])} fob.`, `A receipt, face-down.`]) },
            ],
          },
        };
      }
      case 'witness': {
        const wname = makeName(rng, usedNames).name;
        const rel = rng.pick(['bartender', 'night porter', 'neighbour', 'taxi driver', 'security guard', 'shift supervisor', 'delivery rider']);
        return {
          title: `Statement — ${wname}`,
          source: `Witness · ${rel}`,
          summary: `${wname} (${rel}) places ${person.name} at ${loc.name} around ${slot.label}.`,
          payload: {
            witness: wname,
            role: rel,
            text: `"I saw ${person.name} at ${loc.name}. Must have been about ${slot.label}, because ${rng.pick([
              'the shift bell had just gone',
              'the last train was announced right after',
              'I’d just cashed up the till',
              'my break started on the half hour',
              'the news was starting on the screen behind the bar',
            ])}."`,
            caveats: rng.chance(0.5)
            ? ['Witness wears corrective lenses and was not wearing them.', 'Estimate of time is approximate.']
            : ([] as string[]),
          },
        };
      }
      case 'physical':
      default: {
        return {
          title: `Exhibit — ${objectNoun}`,
          source: `Forensics · ${rng.pick(['Lab 2', 'Trace Unit', 'Latent Prints'])}`,
          summary: `Forensic examination links ${person.name} to ${objectNoun} recovered at ${loc.name}.`,
          payload: {
            item: objectNoun,
            recoveredAt: loc.name,
            findings: [
              `Latent print, 14-point match to ${person.name}.`,
              `Deposit consistent with contact within the ${rng.int(2, 8)} hours before recovery.`,
              rng.pick(['Partial secondary print, insufficient for comparison.', 'Fibre transfer consistent with a wool blend.', 'No blood or tissue present.']),
            ],
            chain: [`Recovered ${slot.label}`, 'Sealed on scene', 'Logged to evidence store', 'Examined 09:40 following morning'],
          },
        };
      }
    }
  }

  const addPlacement = (
    person: Person,
    slotIndex: number,
    locationId: string,
    opts: {
      reliability: Evidence['reliability'];
      isKey?: boolean;
      isRedHerring?: boolean;
      prefer?: EvidenceKind;
      tags?: string[];
      locked?: Evidence['locked'];
      analysis?: Evidence['analysis'];
    }
  ) => {
    const loc = locById(locationId);
    const slot = slots[slotIndex];
    const claimed = statements.find((st) => st.suspectId === person.id && st.slotIndex === slotIndex);
    const breaks = claimed ? claimed.claimedLocationId !== locationId : false;
    const kind = kindFor(loc, opts.prefer);
    const built = buildPayload(kind, person, loc, slot, breaks ? 'break' : 'confirm');
    return pushEv({
      kind,
      title: built.title,
      source: built.source,
      timeLabel: slot.label,
      slotIndex,
      summary: built.summary,
      placesSuspectId: person.id,
      placesLocationId: locationId,
      isKeyEvidence: !!opts.isKey,
      isRedHerring: !!opts.isRedHerring,
      reliability: opts.reliability,
      payload: built.payload,
      analysis: opts.analysis,
      locked: opts.locked,
      tags: opts.tags ?? [],
    });
  };

  /* 1. Verified alibis for every innocent during the crime window */
  innocents.forEach((s) => {
    addPlacement(s, crimeSlotIndex, truth[s.id][crimeSlotIndex], {
      reliability: 'verified',
      tags: ['alibi', 'crime-window'],
      analysis: {
        result: `Timestamp integrity confirmed. Source device clock synchronised to network time. No edit history. Places ${s.name} at ${locById(truth[s.id][crimeSlotIndex]).name} during the crime window.`,
      },
    });
  });

  /* 2. Key evidence — places the culprit at the scene during the crime window */
  const keyPrefer: EvidenceKind | undefined = lieTopicId === 'object' ? 'physical' : undefined;
  const keyEv = addPlacement(culprit, crimeSlotIndex, crimeLocation.id, {
    reliability: 'verified',
    isKey: true,
    prefer: keyPrefer,
    tags: ['key', 'crime-window', 'scene'],
    analysis: {
      result: `Independent verification complete. Source is a system of record with an audited clock. This places ${culprit.name} inside ${crimeLocation.name} at ${crimeSlot.label} — the crime window.`,
    },
  });

  /* 3. A supporting piece — the culprit's approach or exit */
  const approachSlot = crimeSlotIndex - 1 >= 0 ? crimeSlotIndex - 1 : crimeSlotIndex + 1;
  if (truth[culprit.id][approachSlot] === crimeLocation.id) {
    addPlacement(culprit, approachSlot, crimeLocation.id, {
      reliability: 'partial',
      tags: ['scene', 'support'],
      analysis: { result: `Partially corroborated. Identification is probable but not conclusive; treat as supporting, not primary.` },
    });
  } else {
    addPlacement(culprit, approachSlot, truth[culprit.id][approachSlot], {
      reliability: 'partial',
      tags: ['support'],
      analysis: { result: `Consistent with the subject's own account for this window. No anomalies.` },
    });
  }

  /* 4. Lock the key evidence behind an earlier discovery on harder cases */
  if (cfg.lockedKey) {
    const gate = evidence.find((e) => e.tags.includes('support')) ?? evidence[0];
    keyEv.locked = { requiresEvidenceId: gate.id };
  }

  /* 5. Secret-keeper contradictions (red herrings that resolve away from the crime window) */
  secretHolders.forEach((s) => {
    const sec = s.secret!;
    addPlacement(s, sec.slotIndex, sec.realLocationId, {
      reliability: 'verified',
      isRedHerring: true,
      tags: ['contradiction', 'secret'],
      analysis: { result: `Verified. Note: this window falls OUTSIDE the crime window (${crimeSlot.label}). Probative of a false statement, not of the offence.` },
    });
  });

  /* 6. Pre-crime presence red herring */
  if (preCrimeInnocent) {
    const earlier = crimeSlotIndex - 2 >= 0 ? crimeSlotIndex - 2 : 0;
    if (earlier !== crimeSlotIndex) {
      addPlacement(preCrimeInnocent, earlier, crimeLocation.id, {
        reliability: 'verified',
        isRedHerring: true,
        tags: ['scene', 'pre-crime'],
        analysis: { result: `Verified — but the timestamp precedes the crime window by ${(crimeSlotIndex - earlier) * step} minutes. Presence at the scene is not presence at the offence.` },
      });
    }
  }

  /* 7. Tampered evidence — falsely implicates an innocent inside the crime window */
  if (cfg.tampered > 0) {
    const targets = rng.sample(innocents, cfg.tampered);
    targets.forEach((t) => {
      const ev = addPlacement(t, crimeSlotIndex, crimeLocation.id, {
        reliability: 'unverified',
        isRedHerring: true,
        prefer: rng.pick(['photo', 'footage', 'social'] as EvidenceKind[]),
        tags: ['contradiction', 'suspicious', 'crime-window'],
        analysis: {
          result: `FILE INTEGRITY FAILURE. Container modification time postdates the recorded capture time by ${rng.int(6, 40)} hours. Frame hash sequence is discontinuous. This item has been altered and cannot place anyone anywhere.`,
          upgradesTo: 'tampered',
        },
      });
      ev.summary = ev.summary + ' — SOURCE UNVERIFIED.';
    });
  }

  /* 8. Coordinated false corroboration */
  if (coordinator) {
    const wname = coordinator.name;
    pushEv({
      kind: 'witness',
      title: `Statement — ${wname}`,
      source: `Witness · ${coordinator.occupation}`,
      timeLabel: crimeSlot.label,
      slotIndex: crimeSlotIndex,
      summary: `${wname} corroborates ${culprit.name}'s account for ${crimeSlot.label}.`,
      placesSuspectId: culprit.id,
      placesLocationId: statements.find((s) => s.suspectId === culprit.id && s.slotIndex === crimeSlotIndex)!.claimedLocationId,
      isKeyEvidence: false,
      isRedHerring: true,
      reliability: 'unverified',
      payload: {
        witness: wname,
        role: coordinator.occupation,
        text: `"${culprit.firstName} was with me. ${crimeSlot.label}, near enough. I'd swear to it."`,
        caveats: [
          `Witness is themselves a person of interest in this matter.`,
          `Account is not supported by any independent record.`,
          `Compare against ${wname}'s own verified position for the same window.`,
        ],
      },
      analysis: {
        result: `Uncorroborated. Cross-reference: ${wname}'s own verified alibi places them at ${locById(truth[coordinator.id][crimeSlotIndex]).name} at ${crimeSlot.label}. They cannot have observed ${culprit.name} elsewhere.`,
        upgradesTo: 'tampered',
      },
      discovered: false,
      tags: ['contradiction', 'coordinated', 'crime-window'],
    });
  }

  /* 9. Motive documents */
  const motiveDoc = (p: Person, m: Motive, strong: boolean) => {
    const kinds: EvidenceKind[] = ['financial', 'messages', 'document', 'social'];
    const k = rng.pick(kinds);
    const base = {
      timeLabel: rng.pick(['Two days prior', 'One week prior', 'Three weeks prior', 'The morning of']),
      slotIndex: null,
      placesSuspectId: p.id,
      isKeyEvidence: false,
      isRedHerring: !strong,
      reliability: (strong ? 'verified' : 'partial') as Evidence['reliability'],
      discovered: false,
      tags: strong ? ['motive'] : ['motive', 'weak'],
    };
    if (k === 'financial') {
      pushEv({
        ...base,
        kind: 'financial',
        title: `Account Review — ${p.name}`,
        source: 'Financial disclosure order',
        summary: `${p.name}'s finances are consistent with: ${m.label}.`,
        payload: {
          account: `•••• ${rng.int(1000, 9999)}`,
          holder: p.name,
          note: m.description,
          rows: [
            { time: 'D-21', merchant: rng.pick(['Marrow Credit Ltd', 'Private Lender', 'Kestrel Finance']), amount: `-${rng.int(1200, 9800)}.00`, method: 'Transfer', flagged: strong },
            { time: 'D-9', merchant: rng.pick(['Cash withdrawal', 'Unnamed payee', 'Overseas transfer']), amount: `-${rng.int(400, 4000)}.00`, method: 'Transfer', flagged: strong },
            { time: 'D-2', merchant: rng.pick(['Balance alert', 'Returned payment', 'Overdraft fee']), amount: `-${rng.int(15, 90)}.00`, method: 'Fee', flagged: false },
          ],
        },
        analysis: { result: strong ? `Pattern is sustained and severe. This constitutes a documented, current motive for ${p.name}.` : `Pattern is mild and historic. Weak as motive evidence.` },
      });
    } else if (k === 'messages') {
      pushEv({
        ...base,
        kind: 'messages',
        title: `Archived Thread — ${p.firstName} ↔ ${victim.name.split(' ')[0]}`,
        source: `Handset extraction · ${p.name}`,
        summary: `Prior correspondence between ${p.name} and ${victim.name} indicating: ${m.label}.`,
        payload: {
          contact: victim.name,
          holder: p.name,
          thread: [
            { from: 'them', text: rng.pick(['we need to talk about this properly', 'I am not covering for you again', 'this ends now', 'I have the documents']), time: 'D-6 18:22' },
            { from: 'me', text: rng.pick(['don’t do this', 'you have no idea what you are doing', 'give me a week', 'you will regret putting that in writing']), time: 'D-6 18:31' },
            { from: 'them', text: rng.pick(['I already sent it', 'no more weeks', 'it is out of my hands', 'meet me or I go to them']), time: 'D-6 18:40' },
            { from: 'me', text: rng.pick(['fine.', 'we will see', 'you always were sentimental about the wrong things', 'consider it handled']), time: 'D-6 18:44', deleted: true },
          ],
        },
        analysis: { result: strong ? `Deleted message recovered intact. Tone and content establish a concrete grievance. Motive: ${m.label}.` : `Ambiguous. Could support several readings.` },
      });
    } else if (k === 'social') {
      pushEv({
        ...base,
        kind: 'social',
        title: `Deleted Post — @${p.firstName.toLowerCase()}${rng.int(10, 99)}`,
        source: rng.pick(['Loop', 'Chirp', 'Prism']),
        summary: `A deleted post by ${p.name} touches on: ${m.label}.`,
        payload: {
          platform: rng.pick(['Loop', 'Chirp', 'Prism']),
          author: `@${p.firstName.toLowerCase()}${rng.int(10, 99)}`,
          time: 'D-4',
          geo: null,
          text: rng.pick([
            'some people take and take and call it business',
            'if you knew what I knew about this city you would not sleep',
            'countdown started. that is all I will say',
            'karma is slow but it is not lazy',
          ]),
          comments: [{ author: '@anon', text: rng.pick(['you ok?', 'DM me', 'delete this']) }],
          deletedAfter: 'Deleted 31 minutes after posting',
        },
        analysis: { result: strong ? `Recovered from cache. Timing and content align with a documented grievance against the victim.` : `Vague. Not attributable to the victim with confidence.` },
      });
    } else {
      pushEv({
        ...base,
        kind: 'document',
        title: rng.pick(['Amended Beneficiary Form', 'Termination Notice (Draft)', 'Policy Schedule', 'Dissolution Agreement', 'Internal Complaint Record']),
        source: 'Disclosure bundle',
        summary: `A document establishes ${m.label} for ${p.name}.`,
        payload: {
          docType: 'Disclosure',
          lines: [
            `RE: ${victim.name} / ${p.name}`,
            m.description,
            `Executed ${rng.int(3, 40)} days before the incident.`,
            `Counter-signature: ${rng.chance(0.5) ? 'present' : 'ABSENT — flagged by registrar'}.`,
            `Distribution: limited. ${p.name} is named on the circulation list.`,
          ],
        },
        analysis: { result: strong ? `Authenticated against the registrar copy. Establishes ${m.label} as a live motive.` : `Superseded by a later revision. Historic interest only.` },
      });
    }
  };

  motiveDoc(culprit, trueMotive, true);
  decoyMotives.forEach((m, i) => {
    const inn = innocents[i];
    if (inn) motiveDoc(inn, m, false);
  });

  /* 10. Pure red herrings */
  for (let i = 0; i < cfg.redHerrings; i++) {
    const p = rng.pick(innocents.length ? innocents : suspects);
    const slotIx = rng.int(0, cfg.slots - 1);
    if (slotIx === crimeSlotIndex) continue;
    addPlacement(p, slotIx, truth[p.id][slotIx], {
      reliability: rng.pick(['partial', 'unverified'] as Evidence['reliability'][]),
      isRedHerring: true,
      tags: ['noise'],
      analysis: { result: rng.pick(RED_HERRING_FLAVOUR) + ' Does not bear on the crime window.' },
    });
  }

  /* 11. Missing footage at the scene */
  if (cfg.footageGap) {
    pushEv({
      kind: 'footage',
      title: `${crimeLocation.name} — CAM-01 (INCOMPLETE)`,
      source: 'Security footage · primary camera',
      timeLabel: crimeSlot.label,
      slotIndex: crimeSlotIndex,
      summary: `The primary camera covering ${crimeLocation.name} has a recording gap across the crime window.`,
      isKeyEvidence: false,
      isRedHerring: false,
      reliability: 'partial',
      payload: {
        camera: 'CAM-01',
        location: crimeLocation.name,
        resolution: '1080p',
        subject: null,
        frames: [
          { time: tLabel(crimeSlot.minutes - 40), desc: 'Corridor empty. Lighting normal.', gap: false },
          { time: tLabel(crimeSlot.minutes - 22), desc: 'Unidentified figure crosses frame, back to camera. No usable features.', gap: false },
          { time: tLabel(crimeSlot.minutes - 14), desc: 'RECORDING ENDS — no shutdown event logged.', gap: true },
          { time: tLabel(crimeSlot.minutes + 26), desc: 'RECORDING RESUMES — 41 minutes unaccounted for.', gap: true },
          { time: tLabel(crimeSlot.minutes + 34), desc: 'Corridor empty. A door that was closed is now ajar.', gap: false },
        ],
      },
      analysis: { result: `Deletion was manual and local. Requires physical access to the recorder cabinet at ${crimeLocation.name}. Access is limited to persons who were inside the building.` },
      discovered: false,
      tags: ['scene', 'deleted', 'crime-window'],
    });
  }

  /* 12. Hidden relationship / alias */
  if (cfg.hiddenRelation && suspects.length >= 3) {
    const [a, b] = rng.sample(suspects, 2);
    pushEv({
      kind: 'document',
      title: 'Registry Cross-Match',
      source: 'Public records search',
      timeLabel: 'Background',
      slotIndex: null,
      summary: `${a.name} and ${b.name} are connected in a way neither of them has disclosed.`,
      isKeyEvidence: false,
      isRedHerring: !(a.isCulprit || b.isCulprit),
      reliability: 'verified',
      payload: {
        docType: 'Records',
        lines: [
          `Cross-match on shared address history (${rng.int(2, 9)} years).`,
          `${a.name} — ${a.occupation}.`,
          `${b.name} — ${b.occupation}.`,
          `Relationship inferred: ${rng.pick(['half-siblings', 'former spouses', 'co-directors of a dissolved company', 'creditor and debtor', 'landlord and tenant'])}.`,
          `Neither party disclosed this connection in initial interview.`,
        ],
      },
      analysis: { result: `Records are authentic. An undisclosed relationship is a reason to distrust mutual corroboration between these two.` },
      discovered: false,
      tags: ['relationship', 'background'],
    });
  }

  if (cfg.alias) {
    const a = rng.pick(suspects);
    pushEv({
      kind: 'document',
      title: 'Identity Discrepancy',
      source: 'Immigration & records check',
      timeLabel: 'Background',
      slotIndex: null,
      summary: `${a.name} has previously used another name.`,
      isKeyEvidence: false,
      isRedHerring: !a.isCulprit,
      reliability: 'verified',
      payload: {
        docType: 'Records',
        lines: [
          `Subject: ${a.name}, ${a.age}, ${a.occupation}.`,
          `Prior recorded name: ${makeName(rng, usedNames).name}.`,
          `Change registered ${rng.int(3, 14)} years ago. No criminal bar found.`,
          `Prior name appears on a ${rng.pick(['tenancy', 'company filing', 'insurance policy', 'utility account'])} linked to ${victim.name}.`,
          `A name change is lawful. Concealing it from an investigator is a choice.`,
        ],
      },
      analysis: { result: `Verified. The prior identity establishes a connection to the victim that the subject did not volunteer.` },
      discovered: false,
      tags: ['identity', 'background'],
    });
  }

  /* 13. Scene report — always available, orients the player */
  pushEv({
    kind: 'physical',
    title: 'Scene Examination Report',
    source: `Crime scene unit · ${crimeLocation.name}`,
    timeLabel: crimeSlot.label,
    slotIndex: crimeSlotIndex,
    summary: `Examination fixes the incident at ${crimeLocation.name} within the ${crimeSlot.label} window.`,
    isKeyEvidence: false,
    isRedHerring: false,
    reliability: 'verified',
    payload: {
      item: 'Scene',
      recoveredAt: crimeLocation.name,
      findings: [
        `Incident window fixed at ${crimeSlot.label} ± ${Math.floor(step / 2)} minutes by ${rng.pick(['thermal decay', 'a stopped device clock', 'an interrupted call', 'a triggered sensor'])}.`,
        `${crimeLocation.detail.charAt(0).toUpperCase() + crimeLocation.detail.slice(1)}.`,
        `${objectNoun.charAt(0).toUpperCase() + objectNoun.slice(1)} recovered and submitted for examination.`,
        `No forced entry. Entry was made by a person with legitimate access or a key.`,
      ],
      chain: ['Scene secured', 'Photographed in situ', 'Trace lifted', 'Released to investigator'],
    },
    analysis: { result: `The window is firm. Any account that places a person inside ${crimeLocation.name} at ${crimeSlot.label} is materially significant.` },
    discovered: true,
    tags: ['scene', 'brief', 'crime-window'],
  });

  /* ---- lie topic options ---- */
  const topicLabels: Record<LieTopicId, string> = {
    location: 'Their location during the crime window',
    departure: 'When they left the scene',
    company: 'Who they were with',
    object: `Whether they handled ${objectNoun}`,
  };
  const allTopics: { id: string; label: string }[] = [
    { id: 'location', label: topicLabels.location },
    { id: 'departure', label: topicLabels.departure },
    { id: 'company', label: topicLabels.company },
    { id: 'object', label: topicLabels.object },
    { id: 'relationship', label: `Their relationship with ${victim.name}` },
    { id: 'money', label: 'The source of a payment they received' },
    { id: 'access', label: 'Whether they had a key or access code' },
  ];
  const lieTopicOptions = rng.shuffle([
    allTopics.find((t) => t.id === lieTopicId)!,
    ...rng.sample(allTopics.filter((t) => t.id !== lieTopicId), 4),
  ]);

  /* ---- briefing prose ---- */
  const incident = rng.pick(arch.incident);
  const title = rng.pick(arch.titles);
  const briefing =
    `At approximately ${crimeSlot.label} on ${weekday} ${day} ${MONTHS[month]}, ${victim.name}, ${victimAge}, ${victimJob.toLowerCase()}, ${incident} at ${crimeLocation.name}. ` +
    `The scene is ${crimeLocation.detail}. There is no forced entry and no reliable eyewitness to the event itself.\n\n` +
    `${suspects.length} people had motive, proximity or access. Each has given an account of that evening. ` +
    `At least one of those accounts is false in a way that matters.\n\n` +
    `Your job is not to find someone who seems guilty. It is to find the account that the evidence cannot survive.`;

  const objectives = [
    { id: 'o1', label: `Recover ${Math.min(6, Math.ceil(evidence.length * 0.5))} pieces of evidence`, check: 'evidence_count' as const, target: Math.min(6, Math.ceil(evidence.length * 0.5)) },
    { id: 'o2', label: 'Interview every suspect', check: 'interrogate_all' as const, target: suspects.length },
    { id: 'o3', label: 'Expose a contradiction', check: 'find_contradiction' as const, target: 1 },
    { id: 'o4', label: 'Establish presence inside the crime window', check: 'find_key' as const, target: 1 },
    { id: 'o5', label: 'Build a link on the evidence board', check: 'board_link' as const, target: 1 },
  ];

  suspects.forEach((s) => {
    const p = PERSONALITIES[s.personality];
    s.bio =
      `${s.age}, ${s.occupation}. ${s.relationToVictim.charAt(0).toUpperCase() + s.relationToVictim.slice(1)} of ${victim.name}. ` +
      `${p.blurb}`;
    if (s.motive) s.publicMotiveHint = s.motive.label;
  });

  return {
    seed,
    code: caseCode(seed, DIFFICULTY_ORDER.indexOf(difficulty)),
    title,
    subtitle: arch.type.toUpperCase(),
    difficulty,
    caseType: arch.type,
    incident: `${victim.name} ${incident} at ${crimeLocation.name}.`,
    locationName: crimeLocation.name,
    dateLabel,
    crimeSlotIndex,
    crimeLocationId: crimeLocation.id,
    victimName: victim.name,
    victimDetail: `${victimAge} · ${victimJob}`,
    briefing,
    slots,
    locations,
    suspects,
    statements,
    evidence,
    objectives,
    solution: {
      culpritId: culprit.id,
      lieStatementId: stmtId(culprit.id, crimeSlotIndex),
      lieTopicId,
      motiveId: trueMotive.id,
      keyEvidenceIds: evidence.filter((e) => e.isKeyEvidence).map((e) => e.id),
    },
    lieTopicOptions,
    motiveOptions,
    truth,
  };
}

/* ------------------------------------------------------------------ */
/*  Contradiction engine                                               */
/* ------------------------------------------------------------------ */

export interface Contradiction {
  id: string;
  statementId: string;
  evidenceId: string;
  suspectId: string;
  slotIndex: number;
  claimedLocation: string;
  actualLocation: string;
  severity: 'critical' | 'material' | 'minor';
  note: string;
}

export function detectContradictions(
  cf: CaseFile,
  discoveredIds: string[],
  analysedIds: string[] = []
): Contradiction[] {
  const out: Contradiction[] = [];
  const disc = new Set(discoveredIds);
  const anal = new Set(analysedIds);
  const locName = (id: string) => cf.locations.find((l) => l.id === id)?.name ?? 'Unknown';

  for (const ev of cf.evidence) {
    if (!disc.has(ev.id)) continue;
    if (ev.slotIndex === null || !ev.placesSuspectId || !ev.placesLocationId) continue;
    // A piece proven tampered can no longer place anybody anywhere.
    if (anal.has(ev.id) && ev.analysis?.upgradesTo === 'tampered') continue;
    const st = cf.statements.find(
      (s) => s.suspectId === ev.placesSuspectId && s.slotIndex === ev.slotIndex
    );
    if (!st) continue;
    if (st.claimedLocationId === ev.placesLocationId) continue;

    const isCrimeWindow = ev.slotIndex === cf.crimeSlotIndex;
    const atScene = ev.placesLocationId === cf.crimeLocationId;
    const severity: Contradiction['severity'] =
      isCrimeWindow && atScene ? 'critical' : isCrimeWindow ? 'material' : 'minor';

    out.push({
      id: `cx_${st.id}_${ev.id}`,
      statementId: st.id,
      evidenceId: ev.id,
      suspectId: ev.placesSuspectId,
      slotIndex: ev.slotIndex,
      claimedLocation: locName(st.claimedLocationId),
      actualLocation: locName(ev.placesLocationId),
      severity,
      note:
        severity === 'critical'
          ? 'Places the subject inside the crime scene during the crime window, against their own account.'
          : severity === 'material'
            ? 'Falsifies the subject’s account for the crime window.'
            : 'Falsifies the subject’s account outside the crime window.',
    });
  }

  // Cross-statement contradiction: A claims to be with B, B says otherwise.
  for (const st of cf.statements) {
    if (!st.claimedCompanionId) continue;
    const other = cf.statements.find(
      (s) => s.suspectId === st.claimedCompanionId && s.slotIndex === st.slotIndex
    );
    if (!other) continue;
    if (other.claimedLocationId === st.claimedLocationId) continue;
    out.push({
      id: `cx_cross_${st.id}`,
      statementId: st.id,
      evidenceId: '',
      suspectId: st.suspectId,
      slotIndex: st.slotIndex,
      claimedLocation: locName(st.claimedLocationId),
      actualLocation: locName(other.claimedLocationId),
      severity: st.slotIndex === cf.crimeSlotIndex ? 'material' : 'minor',
      note: 'Two accounts of the same moment cannot both be true.',
    });
  }

  return out;
}

/** Evidence that is currently reachable (unlock gating). */
export function isEvidenceUnlocked(
  ev: Evidence,
  discovered: string[],
  interrogated: string[]
): boolean {
  if (!ev.locked) return true;
  if (ev.locked.requiresEvidenceId && !discovered.includes(ev.locked.requiresEvidenceId)) return false;
  if (ev.locked.requiresInterrogationOf && !interrogated.includes(ev.locked.requiresInterrogationOf)) return false;
  return true;
}
