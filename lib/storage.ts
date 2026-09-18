import AsyncStorage from '@react-native-async-storage/async-storage';
import { CaseProgress, PlayerProfile, Settings } from './types';

const KEY_PROFILE = 'LD::profile::v1';
const KEY_PROGRESS = 'LD::progress::v1';

export const DEFAULT_SETTINGS: Settings = {
  sfx: true,
  music: true,
  haptics: true,
  subtitles: true,
  grain: true,
  graphics: 'High',
  textSpeed: 'normal',
  language: 'en',
  reduceMotion: false,
  highContrast: false,
  showTells: true,
};

const HANDLES = ['NIGHTOWL', 'GLASSHOUSE', 'ASHFALL', 'REDLINE', 'CIPHER', 'LANTERN', 'DRIFTWOOD', 'SABLE', 'KESTREL', 'MERIDIAN'];

export function defaultProfile(): PlayerProfile {
  return {
    handle: HANDLES[Math.floor(Math.random() * HANDLES.length)] + '-' + Math.floor(100 + Math.random() * 899),
    badgeSeed: Math.floor(Math.random() * 1e9),
    xp: 0,
    casesSolved: 0,
    casesFailed: 0,
    perfect: 0,
    totalEvidence: 0,
    totalQuestions: 0,
    bestStreak: 0,
    streak: 0,
    lastPlayDay: null,
    history: [],
    achievements: [],
    unlockedDifficulties: ['Beginner'],
    seenTutorial: false,
    settings: { ...DEFAULT_SETTINGS },
    dailyDone: {},
    collection: [],
  };
}

export async function loadProfile(): Promise<PlayerProfile> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PROFILE);
    if (!raw) return defaultProfile();
    const parsed = JSON.parse(raw);
    return {
      ...defaultProfile(),
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    };
  } catch {
    return defaultProfile();
  }
}

export async function saveProfile(p: PlayerProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_PROFILE, JSON.stringify(p));
  } catch {
    /* offline-first: a failed write must never crash play */
  }
}

export async function loadAllProgress(): Promise<Record<string, CaseProgress>> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PROGRESS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function saveAllProgress(all: Record<string, CaseProgress>): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_PROGRESS, JSON.stringify(all));
  } catch {
    /* noop */
  }
}

export async function wipeAll(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY_PROFILE);
    await AsyncStorage.removeItem(KEY_PROGRESS);
  } catch {
    /* noop */
  }
}

/** Cloud-save-ready: a single serialisable blob with a schema version. */
export function exportSave(profile: PlayerProfile, progress: Record<string, CaseProgress>) {
  return JSON.stringify({ v: 1, ts: Date.now(), profile, progress });
}
