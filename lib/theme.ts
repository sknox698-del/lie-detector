/**
 * LIE DETECTOR — visual language.
 * Cinematic noir-tech: deep charcoal glass, cyan interrogation light,
 * amber evidence tags, blood-red contradictions.
 */

export const C = {
  // surfaces
  void: '#05070B',
  bg: '#0A0D14',
  bg2: '#0E121B',
  panel: 'rgba(20,26,38,0.92)',
  panelSolid: '#141A26',
  raised: '#1A2130',
  hairline: 'rgba(140,170,210,0.13)',
  hairlineStrong: 'rgba(150,190,235,0.28)',

  // ink
  text: '#E8EEF8',
  textDim: '#93A2BC',
  textFaint: '#5D6B84',

  // accents
  cyan: '#3EE8FF',
  cyanDeep: '#0B6E86',
  cyanGlow: 'rgba(62,232,255,0.20)',
  amber: '#FFB13C',
  amberDeep: '#7A4E0E',
  red: '#FF4D5E',
  redDeep: '#7A1420',
  green: '#3BE08D',
  greenDeep: '#0E5C3A',
  violet: '#A47BFF',
  violetDeep: '#3B2570',
  gold: '#F5D66E',

  // status
  truth: '#3BE08D',
  lie: '#FF4D5E',
  unknown: '#6E7C96',
};

export const DIFFICULTY_META = {
  Beginner: { color: '#3BE08D', tier: 0, xp: 120 },
  Intermediate: { color: '#3EE8FF', tier: 1, xp: 220 },
  Advanced: { color: '#FFB13C', tier: 2, xp: 360 },
  Expert: { color: '#FF7A3C', tier: 3, xp: 540 },
  Master: { color: '#FF4D5E', tier: 4, xp: 780 },
  Impossible: { color: '#A47BFF', tier: 5, xp: 1100 },
} as const;

export const EVIDENCE_META: Record<
  string,
  { icon: string; color: string; label: string }
> = {
  messages: { icon: 'chatbubbles', color: '#3EE8FF', label: 'Text Messages' },
  calls: { icon: 'call', color: '#3BE08D', label: 'Phone Records' },
  photo: { icon: 'image', color: '#FFB13C', label: 'Photograph' },
  footage: { icon: 'videocam', color: '#A47BFF', label: 'Security Footage' },
  financial: { icon: 'card', color: '#F5D66E', label: 'Financial Record' },
  social: { icon: 'planet', color: '#FF7AC8', label: 'Social Media' },
  witness: { icon: 'ear', color: '#7FE3B0', label: 'Witness Statement' },
  physical: { icon: 'finger-print', color: '#FF4D5E', label: 'Physical Evidence' },
  document: { icon: 'document-text', color: '#9FB6D6', label: 'Document' },
};

export const RANK_META: Record<string, { color: string; label: string }> = {
  S: { color: '#F5D66E', label: 'FLAWLESS' },
  A: { color: '#3BE08D', label: 'EXCELLENT' },
  B: { color: '#3EE8FF', label: 'SOLID' },
  C: { color: '#FFB13C', label: 'PASSABLE' },
  D: { color: '#FF7A3C', label: 'SLOPPY' },
  F: { color: '#FF4D5E', label: 'FAILED' },
};

export const FONT = {
  mono: undefined as string | undefined, // uses platform default with letterSpacing tricks
};

export const SHADOW = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  soft: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  }),
};
