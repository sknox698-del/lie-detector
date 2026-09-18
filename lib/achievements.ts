import { CaseResult, PlayerProfile } from './types';

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  check: (p: PlayerProfile, last?: CaseResult) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_case', name: 'Badge Number', desc: 'Close your first case.', icon: 'shield-checkmark', tier: 'bronze', check: (p) => p.casesSolved >= 1 },
  { id: 'five_cases', name: 'Caseload', desc: 'Close five cases.', icon: 'folder-open', tier: 'bronze', check: (p) => p.casesSolved >= 5 },
  { id: 'twenty_cases', name: 'Institutional Memory', desc: 'Close twenty cases.', icon: 'library', tier: 'gold', check: (p) => p.casesSolved >= 20 },
  { id: 'first_s', name: 'Flawless', desc: 'Earn an S rank.', icon: 'star', tier: 'silver', check: (p) => p.history.some((h) => h.rank === 'S') },
  { id: 'three_s', name: 'Untouchable', desc: 'Earn three S ranks.', icon: 'sparkles', tier: 'gold', check: (p) => p.history.filter((h) => h.rank === 'S').length >= 3 },
  { id: 'perfect', name: 'Perfect Investigation', desc: 'Close a case with every element correct and no false accusations.', icon: 'diamond', tier: 'platinum', check: (p) => p.history.some((h) => h.outcome === 'perfect') },
  { id: 'all_evidence', name: 'Nothing Left in the Box', desc: 'Recover every piece of evidence in a case.', icon: 'cube', tier: 'silver', check: (p) => p.history.some((h) => h.evidenceFound >= h.evidenceTotal && h.evidenceTotal > 0) },
  { id: 'fast', name: 'Fast Work', desc: 'Close a case in under five minutes.', icon: 'flash', tier: 'silver', check: (p) => p.history.some((h) => h.correctSuspect && h.timeMs < 5 * 60000) },
  { id: 'quiet', name: 'Economy of Words', desc: 'Close a case with fewer than fifteen questions.', icon: 'volume-mute', tier: 'gold', check: (p) => p.history.some((h) => h.correctSuspect && h.questionsAsked < 15) },
  { id: 'expert', name: 'Deep Water', desc: 'Close an Expert case.', icon: 'trending-up', tier: 'gold', check: (p) => p.history.some((h) => h.correctSuspect && h.difficulty === 'Expert') },
  { id: 'master', name: 'Master of the Room', desc: 'Close a Master case.', icon: 'ribbon', tier: 'platinum', check: (p) => p.history.some((h) => h.correctSuspect && h.difficulty === 'Master') },
  { id: 'impossible', name: 'No Such Thing', desc: 'Close an Impossible case.', icon: 'skull', tier: 'platinum', check: (p) => p.history.some((h) => h.correctSuspect && h.difficulty === 'Impossible') },
  { id: 'streak3', name: 'On the Board', desc: 'Reach a three-day streak.', icon: 'flame', tier: 'bronze', check: (p) => p.bestStreak >= 3 },
  { id: 'streak7', name: 'Every Single Day', desc: 'Reach a seven-day streak.', icon: 'bonfire', tier: 'gold', check: (p) => p.bestStreak >= 7 },
  { id: 'daily', name: 'Morning Briefing', desc: 'Complete a Daily Mystery.', icon: 'today', tier: 'bronze', check: (p) => Object.keys(p.dailyDone).length >= 1 },
  { id: 'daily10', name: 'Regular', desc: 'Complete ten Daily Mysteries.', icon: 'calendar', tier: 'gold', check: (p) => Object.keys(p.dailyDone).length >= 10 },
  { id: 'wrong', name: 'Reasonable Doubt', desc: 'Get one wrong. It happens.', icon: 'close-circle', tier: 'bronze', check: (p) => p.casesFailed >= 1 },
  { id: 'collector', name: 'The Collection', desc: 'Log twelve distinct case types.', icon: 'albums', tier: 'gold', check: (p) => p.collection.length >= 12 },
  { id: 'thousand', name: 'Four Figures', desc: 'Score 900 or more on a single case.', icon: 'trophy', tier: 'platinum', check: (p) => p.history.some((h) => h.score >= 900) },
  { id: 'interrogator', name: 'Interrogator', desc: 'Ask 250 questions across your career.', icon: 'chatbubbles', tier: 'silver', check: (p) => p.totalQuestions >= 250 },
  { id: 'archivist', name: 'Archivist', desc: 'Recover 200 pieces of evidence across your career.', icon: 'file-tray-full', tier: 'silver', check: (p) => p.totalEvidence >= 200 },
];

export const TIER_COLOR = {
  bronze: '#C98A5B',
  silver: '#BFCBDA',
  gold: '#F5D66E',
  platinum: '#8FE9FF',
};

export function evaluateAchievements(p: PlayerProfile): string[] {
  const unlocked = new Set(p.achievements);
  const fresh: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!unlocked.has(a.id) && a.check(p)) {
      unlocked.add(a.id);
      fresh.push(a.id);
    }
  }
  p.achievements = Array.from(unlocked);
  return fresh;
}
