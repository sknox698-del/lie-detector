export type Difficulty =
  | 'Beginner'
  | 'Intermediate'
  | 'Advanced'
  | 'Expert'
  | 'Master'
  | 'Impossible';

export type EvidenceKind =
  | 'messages'
  | 'calls'
  | 'photo'
  | 'footage'
  | 'financial'
  | 'social'
  | 'witness'
  | 'physical'
  | 'document';

export type Emotion =
  | 'calm'
  | 'nervous'
  | 'angry'
  | 'defensive'
  | 'confused'
  | 'evasive'
  | 'confident'
  | 'shocked'
  | 'emotional'
  | 'suspicious'
  | 'broken';

export interface FaceDNA {
  skin: string;
  skinShadow: string;
  hairColor: string;
  hairStyle: number; // 0-9
  facialHair: number; // 0-4
  eyeColor: string;
  browThickness: number;
  noseWidth: number;
  jawWidth: number;
  faceLength: number;
  lipFullness: number;
  glasses: number; // 0 none, 1 thin, 2 thick
  earring: boolean;
  scar: boolean;
  clothing: string;
  clothingAccent: string;
  collar: number; // 0 crew, 1 shirt, 2 suit, 3 hoodie, 4 uniform
  age: number;
  freckles: boolean;
  cheekbone: number;
}

export interface Person {
  id: string;
  name: string;
  firstName: string;
  age: number;
  occupation: string;
  personality: PersonalityKey;
  bio: string;
  face: FaceDNA;
  relationToVictim: string;
  /** hidden truth flags */
  isCulprit: boolean;
  hasSecret: boolean;
  secret?: Secret;
  motive?: Motive;
  publicMotiveHint?: string;
}

export type PersonalityKey =
  | 'stoic'
  | 'anxious'
  | 'hostile'
  | 'charming'
  | 'analytical'
  | 'grieving'
  | 'arrogant'
  | 'rambling';

export interface Motive {
  id: string;
  label: string;
  description: string;
}

export interface Secret {
  id: string;
  label: string;
  /** shown to player once cracked */
  confession: string;
  /** the slot they lied about */
  slotIndex: number;
  realLocationId: string;
}

export interface TimeSlot {
  index: number;
  label: string; // "21:30"
  minutes: number;
}

export interface GameLocation {
  id: string;
  name: string;
  kind: string;
  detail: string;
}

export interface Statement {
  id: string;
  suspectId: string;
  slotIndex: number;
  claimedLocationId: string;
  claimedCompanionId?: string;
  text: string;
  isTrue: boolean;
  /** revised text after being broken */
  revisedText?: string;
  broken?: boolean;
}

export interface Evidence {
  id: string;
  kind: EvidenceKind;
  title: string;
  source: string;
  timeLabel: string;
  slotIndex: number | null;
  summary: string;
  /** which suspects it places somewhere */
  placesSuspectId?: string;
  placesLocationId?: string;
  /** true if this evidence proves the culprit's key lie */
  isKeyEvidence: boolean;
  /** true if it is a deliberate misdirection */
  isRedHerring: boolean;
  reliability: 'verified' | 'partial' | 'unverified' | 'tampered';
  /** rich payload for the viewer */
  payload: any;
  analysis?: { result: string; upgradesTo?: Evidence['reliability'] };
  discovered: boolean;
  locked?: { requiresEvidenceId?: string; requiresInterrogationOf?: string };
  tags: string[];
}

export interface DialogueTurn {
  id: string;
  speaker: 'you' | 'suspect' | 'system';
  text: string;
  emotion?: Emotion;
  tell?: string;
  revealsEvidenceId?: string;
  isContradiction?: boolean;
}

export interface SuspectState {
  trust: number; // 0-100
  stress: number; // 0-100
  cooperation: number; // 0-100
  askedQuestions: Record<string, number>;
  presentedEvidence: string[];
  brokenStatements: string[];
  secretRevealed: boolean;
  log: DialogueTurn[];
  lastEmotion: Emotion;
}

export interface CaseObjective {
  id: string;
  label: string;
  check: 'evidence_count' | 'interrogate_all' | 'find_contradiction' | 'find_key' | 'board_link';
  target: number;
}

export interface CaseFile {
  seed: number;
  code: string;
  title: string;
  subtitle: string;
  difficulty: Difficulty;
  caseType: string;
  incident: string;
  locationName: string;
  dateLabel: string;
  crimeSlotIndex: number;
  crimeLocationId: string;
  victimName: string;
  victimDetail: string;
  briefing: string;
  slots: TimeSlot[];
  locations: GameLocation[];
  suspects: Person[];
  statements: Statement[];
  evidence: Evidence[];
  objectives: CaseObjective[];
  solution: {
    culpritId: string;
    lieStatementId: string;
    lieTopicId: string;
    motiveId: string;
    keyEvidenceIds: string[];
  };
  lieTopicOptions: { id: string; label: string }[];
  motiveOptions: Motive[];
  /** ground truth movement table: suspectId -> slotIndex -> locationId */
  truth: Record<string, string[]>;
}

export interface BoardNode {
  id: string;
  kind: 'suspect' | 'evidence' | 'note';
  refId: string;
  x: number;
  y: number;
  text?: string;
}

export interface BoardLink {
  id: string;
  from: string;
  to: string;
  type: 'connect' | 'contradict' | 'confirm';
}

export interface CaseProgress {
  seed: number;
  startedAt: number;
  elapsedMs: number;
  discovered: string[];
  suspectStates: Record<string, SuspectState>;
  board: { nodes: BoardNode[]; links: BoardLink[] };
  notes: string;
  questionsAsked: number;
  contradictionsFound: string[];
  analysed: string[];
  accusationAttempts: number;
  completed: boolean;
}

export interface CaseResult {
  seed: number;
  code: string;
  title: string;
  difficulty: Difficulty;
  rank: string;
  score: number;
  correctSuspect: boolean;
  correctTopic: boolean;
  correctMotive: boolean;
  correctEvidence: boolean;
  evidenceFound: number;
  evidenceTotal: number;
  questionsAsked: number;
  timeMs: number;
  outcome: 'perfect' | 'correct' | 'partial' | 'insufficient' | 'wrong';
  at: number;
}

export interface PlayerProfile {
  handle: string;
  badgeSeed: number;
  xp: number;
  casesSolved: number;
  casesFailed: number;
  perfect: number;
  totalEvidence: number;
  totalQuestions: number;
  bestStreak: number;
  streak: number;
  lastPlayDay: string | null;
  history: CaseResult[];
  achievements: string[];
  unlockedDifficulties: Difficulty[];
  seenTutorial: boolean;
  settings: Settings;
  dailyDone: Record<string, boolean>;
  collection: string[];
}

export interface Settings {
  sfx: boolean;
  music: boolean;
  haptics: boolean;
  subtitles: boolean;
  grain: boolean;
  graphics: 'Low' | 'Medium' | 'High' | 'Ultra';
  textSpeed: 'slow' | 'normal' | 'fast' | 'instant';
  language: string;
  reduceMotion: boolean;
  highContrast: boolean;
  showTells: boolean;
}
