import { Platform } from 'react-native';

type SfxName =
  | 'tap' | 'select' | 'back' | 'discover' | 'sting' | 'heartbeat'
  | 'blip' | 'shutter' | 'success' | 'fail' | 'whoosh' | 'radio' | 'lock';

const SOURCES: Record<SfxName, any> = {
  tap: require('../assets/sfx/tap.wav'),
  select: require('../assets/sfx/select.wav'),
  back: require('../assets/sfx/back.wav'),
  discover: require('../assets/sfx/discover.wav'),
  sting: require('../assets/sfx/sting.wav'),
  heartbeat: require('../assets/sfx/heartbeat.wav'),
  blip: require('../assets/sfx/blip.wav'),
  shutter: require('../assets/sfx/shutter.wav'),
  success: require('../assets/sfx/success.wav'),
  fail: require('../assets/sfx/fail.wav'),
  whoosh: require('../assets/sfx/whoosh.wav'),
  radio: require('../assets/sfx/radio.wav'),
  lock: require('../assets/sfx/lock.wav'),
};

const VOLUMES: Record<SfxName, number> = {
  tap: 0.25, select: 0.3, back: 0.25, discover: 0.5, sting: 0.55, heartbeat: 0.4,
  blip: 0.12, shutter: 0.35, success: 0.5, fail: 0.45, whoosh: 0.3, radio: 0.3, lock: 0.45,
};

let players: Partial<Record<SfxName, any>> = {};
let enabled = true;
let ready = false;
let audioMod: any = null;
let lastPlay: Record<string, number> = {};

export const Audio = {
  async init() {
    if (ready) return;
    ready = true;
    try {
      audioMod = require('expo-audio');
      if (Platform.OS !== 'web' && audioMod.setAudioModeAsync) {
        await audioMod.setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
      }
    } catch {
      audioMod = null;
    }
  },
  setEnabled(v: boolean) {
    enabled = v;
  },
  play(name: SfxName) {
    if (!enabled || !audioMod) return;
    const now = Date.now();
    if (lastPlay[name] && now - lastPlay[name] < 45) return;
    lastPlay[name] = now;
    try {
      let p = players[name];
      if (!p) {
        p = audioMod.createAudioPlayer(SOURCES[name]);
        p.volume = VOLUMES[name];
        players[name] = p;
      }
      p.seekTo(0);
      p.play();
    } catch {
      /* audio is a nicety, never a failure mode */
    }
  },
  release() {
    Object.values(players).forEach((p: any) => {
      try { p?.remove?.(); } catch { /* noop */ }
    });
    players = {};
  },
};

export type { SfxName };
