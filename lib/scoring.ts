import { CaseFile, CaseProgress, CaseResult, Difficulty } from './types';
import { DIFF_CONFIG } from './generator';
import { DIFFICULTY_META } from './theme';

export interface Accusation {
  suspectId: string;
  topicId: string;
  motiveId: string;
  evidenceId: string;
}

export interface ScoreBreakdown {
  label: string;
  points: number;
  max: number;
  ok: boolean;
  detail: string;
}

export function scoreCase(
  cf: CaseFile,
  progress: CaseProgress,
  acc: Accusation
): { result: CaseResult; breakdown: ScoreBreakdown[] } {
  const cfg = DIFF_CONFIG[cf.difficulty];
  const correctSuspect = acc.suspectId === cf.solution.culpritId;
  const correctTopic = acc.topicId === cf.solution.lieTopicId;
  const correctMotive = acc.motiveId === cf.solution.motiveId;
  const correctEvidence = cf.solution.keyEvidenceIds.includes(acc.evidenceId);

  const evidenceTotal = cf.evidence.length;
  const evidenceFound = progress.discovered.length;
  const coverage = evidenceFound / Math.max(1, evidenceTotal);

  const minutes = progress.elapsedMs / 60000;
  const par = cfg.parMinutes;
  const timeFactor = Math.max(0, Math.min(1, (par * 2.2 - minutes) / (par * 1.6)));

  const qEfficiency = Math.max(
    0,
    Math.min(1, 1 - Math.max(0, progress.questionsAsked - cf.suspects.length * 6) / (cf.suspects.length * 12))
  );

  const breakdown: ScoreBreakdown[] = [];
  const add = (label: string, points: number, max: number, ok: boolean, detail: string) =>
    breakdown.push({ label, points: Math.round(points), max, ok, detail });

  add('Correct suspect', correctSuspect ? 400 : 0, 400, correctSuspect,
    correctSuspect ? 'You named the person the evidence cannot clear.' : 'The evidence does not close around this person.');
  add('Nature of the lie', correctTopic ? 130 : 0, 130, correctTopic,
    correctTopic ? 'You identified precisely what was falsified.' : 'The falsehood was of a different kind.');
  add('Motive', correctMotive ? 130 : 0, 130, correctMotive,
    correctMotive ? 'Motive is documented and current.' : 'That motive is not the one the record supports.');
  add('Proving evidence', correctEvidence ? 140 : 0, 140, correctEvidence,
    correctEvidence ? 'The item you cited is the one that survives challenge.' : 'The item you cited does not, by itself, prove the lie.');
  add('Evidence recovered', coverage * 100, 100, coverage > 0.6,
    `${evidenceFound} of ${evidenceTotal} items recovered.`);
  add('Contradictions exposed', Math.min(60, progress.contradictionsFound.length * 20), 60,
    progress.contradictionsFound.length > 0, `${progress.contradictionsFound.length} exposed in interview.`);
  add('Interview discipline', qEfficiency * 60, 60, qEfficiency > 0.5,
    `${progress.questionsAsked} questions asked.`);
  add('Time', timeFactor * 80, 80, timeFactor > 0.5,
    `${minutes.toFixed(1)} min · par ${par} min.`);

  let penalty = progress.accusationAttempts * 60;
  if (penalty > 0) add('False accusations', -penalty, 0, false, `${progress.accusationAttempts} prior accusation(s) filed.`);

  let score = breakdown.reduce((a, b) => a + b.points, 0);
  score = Math.max(0, Math.round(score));

  const maxScore = 1000;
  const pct = score / maxScore;

  let rank = 'F';
  if (!correctSuspect) rank = score > 300 ? 'D' : 'F';
  else if (pct >= 0.93 && correctTopic && correctMotive && correctEvidence) rank = 'S';
  else if (pct >= 0.8) rank = 'A';
  else if (pct >= 0.66) rank = 'B';
  else if (pct >= 0.52) rank = 'C';
  else rank = 'D';

  let outcome: CaseResult['outcome'] = 'wrong';
  if (correctSuspect && correctTopic && correctMotive && correctEvidence && coverage > 0.85 && progress.accusationAttempts === 0) outcome = 'perfect';
  else if (correctSuspect && correctEvidence) outcome = 'correct';
  else if (correctSuspect && !correctEvidence && coverage < 0.4) outcome = 'insufficient';
  else if (correctSuspect) outcome = 'partial';

  const result: CaseResult = {
    seed: cf.seed,
    code: cf.code,
    title: cf.title,
    difficulty: cf.difficulty,
    rank,
    score,
    correctSuspect,
    correctTopic,
    correctMotive,
    correctEvidence,
    evidenceFound,
    evidenceTotal,
    questionsAsked: progress.questionsAsked,
    timeMs: progress.elapsedMs,
    outcome,
    at: Date.now(),
  };

  return { result, breakdown };
}

export function xpFor(result: CaseResult): number {
  const base = DIFFICULTY_META[result.difficulty].xp;
  const mult = { S: 1.6, A: 1.3, B: 1.05, C: 0.85, D: 0.5, F: 0.2 }[result.rank] ?? 0.3;
  return Math.round(base * mult);
}

export const CAREER_RANKS: { name: string; xp: number; unlock: Difficulty | null; blurb: string }[] = [
  { name: 'Rookie', xp: 0, unlock: 'Beginner', blurb: 'Supervised case work. Everything you file is read twice.' },
  { name: 'Detective', xp: 600, unlock: 'Intermediate', blurb: 'Own caseload. Access to carrier and financial disclosure.' },
  { name: 'Senior Detective', xp: 1800, unlock: 'Advanced', blurb: 'Forensic analysis on demand. Tampered exhibits flagged.' },
  { name: 'Inspector', xp: 4200, unlock: 'Expert', blurb: 'Multi-suspect conspiracies. Coordinated alibi detection.' },
  { name: 'Special Investigator', xp: 8000, unlock: 'Master', blurb: 'Identity checks, registry cross-match, cold archives.' },
  { name: 'Chief Investigator', xp: 14000, unlock: 'Impossible', blurb: 'Cases nobody else closes. No margin, no hints.' },
  { name: 'Master Detective', xp: 24000, unlock: null, blurb: 'The record speaks for itself.' },
];

export function careerFor(xp: number) {
  let idx = 0;
  for (let i = 0; i < CAREER_RANKS.length; i++) if (xp >= CAREER_RANKS[i].xp) idx = i;
  const cur = CAREER_RANKS[idx];
  const next = CAREER_RANKS[idx + 1] ?? null;
  const progress = next ? (xp - cur.xp) / (next.xp - cur.xp) : 1;
  return { idx, cur, next, progress: Math.max(0, Math.min(1, progress)) };
}

export function unlockedDifficulties(xp: number): Difficulty[] {
  const { idx } = careerFor(xp);
  const out: Difficulty[] = [];
  for (let i = 0; i <= idx && i < CAREER_RANKS.length; i++) {
    const u = CAREER_RANKS[i].unlock;
    if (u) out.push(u);
  }
  if (!out.length) out.push('Beginner');
  return out;
}

export function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
