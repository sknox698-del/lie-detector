import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  BoardLink,
  BoardNode,
  CaseFile,
  CaseProgress,
  CaseResult,
  Difficulty,
  PlayerProfile,
  Settings,
  SuspectState,
} from './types';
import { generateCase, detectContradictions, isEvidenceUnlocked } from './generator';
import { newSuspectState } from './dialogue';
import {
  DEFAULT_SETTINGS,
  defaultProfile,
  loadAllProgress,
  loadProfile,
  saveAllProgress,
  saveProfile,
  wipeAll,
} from './storage';
import { evaluateAchievements } from './achievements';
import { unlockedDifficulties, xpFor } from './scoring';
import { Audio } from './audio';
import { Haptics } from './haptics';
import { setLanguage } from './i18n';

interface ActiveCase {
  cf: CaseFile;
  progress: CaseProgress;
  mode: 'standard' | 'daily' | 'weekly' | 'challenge';
}

interface Ctx {
  ready: boolean;
  profile: PlayerProfile;
  active: ActiveCase | null;
  toast: { text: string; kind: 'info' | 'good' | 'bad' } | null;
  showToast: (text: string, kind?: 'info' | 'good' | 'bad') => void;
  startCase: (seed: number, difficulty: Difficulty, mode?: ActiveCase['mode']) => CaseFile;
  resumeCase: (seed: number, difficulty: Difficulty, mode?: ActiveCase['mode']) => CaseFile | null;
  endCase: () => void;
  discover: (evidenceId: string) => boolean;
  analyse: (evidenceId: string) => void;
  bumpElapsed: () => void;
  setSuspectState: (suspectId: string, s: SuspectState) => void;
  addQuestion: () => void;
  addContradiction: (id: string) => void;
  setBoard: (nodes: BoardNode[], links: BoardLink[]) => void;
  setNotes: (n: string) => void;
  registerAccusationAttempt: () => void;
  reopenCase: () => void;
  completeCase: (result: CaseResult) => { fresh: string[]; xp: number };
  updateSettings: (patch: Partial<Settings>) => void;
  setHandle: (h: string) => void;
  resetAll: () => void;
  progressFor: (seed: number) => CaseProgress | undefined;
  markTutorialSeen: () => void;
}

const GameContext = createContext<Ctx>(null as any);
export const useGame = () => useContext(GameContext);

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<PlayerProfile>(defaultProfile());
  const [allProgress, setAllProgress] = useState<Record<string, CaseProgress>>({});
  const [active, setActive] = useState<ActiveCase | null>(null);
  const [toast, setToast] = useState<Ctx['toast']>(null);
  const toastTimer = useRef<any>(null);
  const saveTimer = useRef<any>(null);
  const activeRef = useRef<ActiveCase | null>(null);
  const progressRef = useRef<Record<string, CaseProgress>>({});

  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { progressRef.current = allProgress; }, [allProgress]);

  useEffect(() => {
    (async () => {
      const [p, pr] = await Promise.all([loadProfile(), loadAllProgress()]);
      p.unlockedDifficulties = unlockedDifficulties(p.xp);
      setProfile(p);
      setAllProgress(pr);
      Audio.setEnabled(p.settings.sfx);
      Haptics.setEnabled(p.settings.haptics);
      setLanguage(p.settings.language);
      await Audio.init();
      setReady(true);
    })();
  }, []);

  const persistProfile = useCallback((p: PlayerProfile) => {
    setProfile(p);
    saveProfile(p);
  }, []);

  const persistProgress = useCallback((all: Record<string, CaseProgress>) => {
    setAllProgress(all);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveAllProgress(all), 400);
  }, []);

  const showToast = useCallback((text: string, kind: 'info' | 'good' | 'bad' = 'info') => {
    setToast({ text, kind });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const makeProgress = (cf: CaseFile): CaseProgress => {
    const suspectStates: Record<string, SuspectState> = {};
    cf.suspects.forEach((s) => (suspectStates[s.id] = newSuspectState(s)));
    return {
      seed: cf.seed,
      startedAt: Date.now(),
      elapsedMs: 0,
      discovered: cf.evidence.filter((e) => e.discovered).map((e) => e.id),
      suspectStates,
      board: { nodes: [], links: [] },
      notes: '',
      questionsAsked: 0,
      contradictionsFound: [],
      analysed: [],
      accusationAttempts: 0,
      completed: false,
    };
  };

  const startCase = useCallback(
    (seed: number, difficulty: Difficulty, mode: ActiveCase['mode'] = 'standard') => {
      const cf = generateCase(seed, difficulty);
      const progress = makeProgress(cf);
      activeRef.current = { cf, progress, mode };
      setActive(activeRef.current);
      const all = { ...progressRef.current, [String(seed)]: progress };
      progressRef.current = all;
      persistProgress(all);
      return cf;
    },
    [persistProgress]
  );

  const resumeCase = useCallback(
    (seed: number, difficulty: Difficulty, mode: ActiveCase['mode'] = 'standard') => {
      const saved = progressRef.current[String(seed)];
      const cf = generateCase(seed, difficulty);
      if (!saved || saved.completed) {
        const progress = makeProgress(cf);
        activeRef.current = { cf, progress, mode };
        setActive(activeRef.current);
        const all = { ...progressRef.current, [String(seed)]: progress };
        progressRef.current = all;
        persistProgress(all);
        return cf;
      }
      // heal missing fields from saves written by an earlier schema
      const base = makeProgress(cf);
      const healed: CaseProgress = {
        ...base,
        ...saved,
        board: saved.board ?? base.board,
        analysed: saved.analysed ?? [],
        contradictionsFound: saved.contradictionsFound ?? [],
        accusationAttempts: saved.accusationAttempts ?? 0,
        suspectStates: { ...base.suspectStates, ...(saved.suspectStates ?? {}) },
      };
      activeRef.current = { cf, progress: healed, mode };
      setActive(activeRef.current);
      return cf;
    },
    [persistProgress]
  );

  const patchProgress = useCallback(
    (fn: (p: CaseProgress) => CaseProgress) => {
      const cur = activeRef.current;
      if (!cur) return;
      const next = fn(cur.progress);
      activeRef.current = { ...cur, progress: next };
      setActive(activeRef.current);
      const merged = { ...progressRef.current, [String(next.seed)]: next };
      progressRef.current = merged;
      setAllProgress(merged);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => saveAllProgress(merged), 600);
    },
    []
  );

  const discover = useCallback(
    (evidenceId: string): boolean => {
      const cur = activeRef.current;
      if (!cur) return false;
      if (cur.progress.discovered.includes(evidenceId)) return false;
      const ev = cur.cf.evidence.find((e) => e.id === evidenceId);
      if (!ev) return false;
      const interrogated = Object.entries(cur.progress.suspectStates)
        .filter(([, st]) => st.log.length > 0)
        .map(([id]) => id);
      if (!isEvidenceUnlocked(ev, cur.progress.discovered, interrogated)) return false;
      patchProgress((p) => ({ ...p, discovered: [...p.discovered, evidenceId] }));
      return true;
    },
    [patchProgress]
  );

  const analyse = useCallback((evidenceId: string) => {
    patchProgress((p) =>
      p.analysed.includes(evidenceId) ? p : { ...p, analysed: [...p.analysed, evidenceId] }
    );
  }, [patchProgress]);

  const bumpElapsed = useCallback(() => {
    patchProgress((p) => ({ ...p, elapsedMs: p.elapsedMs + 1000 }));
  }, [patchProgress]);

  const setSuspectState = useCallback(
    (suspectId: string, s: SuspectState) => {
      patchProgress((p) => ({ ...p, suspectStates: { ...p.suspectStates, [suspectId]: s } }));
    },
    [patchProgress]
  );

  const addQuestion = useCallback(() => {
    patchProgress((p) => ({ ...p, questionsAsked: p.questionsAsked + 1 }));
  }, [patchProgress]);

  const addContradiction = useCallback(
    (id: string) => {
      patchProgress((p) =>
        p.contradictionsFound.includes(id) ? p : { ...p, contradictionsFound: [...p.contradictionsFound, id] }
      );
    },
    [patchProgress]
  );

  const setBoard = useCallback(
    (nodes: BoardNode[], links: BoardLink[]) => {
      patchProgress((p) => ({ ...p, board: { nodes, links } }));
    },
    [patchProgress]
  );

  const setNotes = useCallback(
    (n: string) => patchProgress((p) => ({ ...p, notes: n })),
    [patchProgress]
  );

  const registerAccusationAttempt = useCallback(() => {
    patchProgress((p) => ({ ...p, accusationAttempts: p.accusationAttempts + 1 }));
  }, [patchProgress]);

  const reopenCase = useCallback(() => {
    patchProgress((p) => ({ ...p, completed: false }));
  }, [patchProgress]);

  const completeCase = useCallback(
    (result: CaseResult) => {
      const gained = xpFor(result);
      const p: PlayerProfile = { ...profile };
      p.xp += gained;
      p.totalEvidence += result.evidenceFound;
      p.totalQuestions += result.questionsAsked;
      if (result.correctSuspect) p.casesSolved += 1;
      else p.casesFailed += 1;
      if (result.outcome === 'perfect') p.perfect += 1;
      p.history = [result, ...p.history].slice(0, 60);

      const tk = todayKey();
      if (p.lastPlayDay !== tk) {
        const y = new Date(Date.now() - 86400000);
        const ykey = `${y.getFullYear()}-${y.getMonth() + 1}-${y.getDate()}`;
        p.streak = p.lastPlayDay === ykey ? p.streak + 1 : 1;
        p.lastPlayDay = tk;
        p.bestStreak = Math.max(p.bestStreak, p.streak);
      }

      if (active?.mode === 'daily') p.dailyDone[tk] = true;
      const ct = active?.cf.caseType;
      if (ct && !p.collection.includes(ct)) p.collection.push(ct);

      p.unlockedDifficulties = unlockedDifficulties(p.xp);
      const fresh = evaluateAchievements(p);
      persistProfile(p);

      patchProgress((pr) => ({ ...pr, completed: true }));
      return { fresh, xp: gained };
    },
    [profile, active, persistProfile, patchProgress]
  );

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      const p = { ...profile, settings: { ...DEFAULT_SETTINGS, ...profile.settings, ...patch } };
      if (patch.sfx !== undefined) Audio.setEnabled(patch.sfx);
      if (patch.haptics !== undefined) Haptics.setEnabled(patch.haptics);
      if (patch.language !== undefined) setLanguage(patch.language);
      persistProfile(p);
    },
    [profile, persistProfile]
  );

  const setHandle = useCallback(
    (h: string) => persistProfile({ ...profile, handle: h.toUpperCase().slice(0, 16) }),
    [profile, persistProfile]
  );

  const markTutorialSeen = useCallback(
    () => persistProfile({ ...profile, seenTutorial: true }),
    [profile, persistProfile]
  );

  const resetAll = useCallback(() => {
    wipeAll();
    const p = defaultProfile();
    setProfile(p);
    progressRef.current = {};
    setAllProgress({});
    activeRef.current = null;
    setActive(null);
    saveProfile(p);
  }, []);

  const endCase = useCallback(() => { activeRef.current = null; setActive(null); }, []);
  const progressFor = useCallback((seed: number) => allProgress[String(seed)], [allProgress]);

  const value = useMemo<Ctx>(
    () => ({
      ready, profile, active, toast, showToast,
      startCase, resumeCase, endCase, discover, analyse, bumpElapsed,
      setSuspectState, addQuestion, addContradiction, setBoard, setNotes,
      registerAccusationAttempt, reopenCase, completeCase, updateSettings, setHandle, resetAll,
      progressFor, markTutorialSeen,
    }),
    [ready, profile, active, toast, showToast, startCase, resumeCase, endCase, discover, analyse,
      bumpElapsed, setSuspectState, addQuestion, addContradiction, setBoard, setNotes,
      registerAccusationAttempt, reopenCase, completeCase, updateSettings, setHandle, resetAll, progressFor, markTutorialSeen]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export { detectContradictions };
