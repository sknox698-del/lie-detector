import { Difficulty } from './types';

export type RootStackParamList = {
  Boot: undefined;
  Menu: undefined;
  Academy: undefined;
  CaseSelect: { difficulty?: Difficulty } | undefined;
  Briefing: { seed: number; difficulty: Difficulty; mode?: 'standard' | 'daily' | 'weekly' | 'challenge'; resume?: boolean };
  Investigation: undefined;
  Interrogation: { suspectId: string };
  EvidenceDetail: { evidenceId: string };
  Accusation: undefined;
  Results: { resultJson: string; breakdownJson: string; freshJson: string; xp: number };
  Profile: undefined;
  Stats: undefined;
  Achievements: undefined;
  Collection: undefined;
  Settings: undefined;
  Challenge: undefined;
};
