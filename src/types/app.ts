export type ScreenId =
  | 'start'
  | 'profiles'
  | 'map'
  | 'lesson'
  | 'practice'
  | 'games'
  | 'simulator'
  | 'result'
  | 'parents';

export type KiaMood = 'idle' | 'happy' | 'cheering' | 'sad' | 'teaching';

export type DigitDisplayMode = 'fa' | 'en';

export type AvatarId = 'owl' | 'fox' | 'rabbit' | 'bear' | 'panda' | 'star';

export interface SorobanColumnState {
  /** Whether the upper bead (worth 5 * 10^place) is pushed down toward the beam */
  heavenActive: boolean;
  /** How many lower beads (0..4, each worth 1 * 10^place) are pushed up toward the beam */
  earthCount: number;
}

export type SorobanState = SorobanColumnState[];

export interface SorobanGuidedMove {
  columnIndex: number; // 0 = rightmost (units), 1 = tens, 2 = hundreds
  beadType: 'heaven' | 'earth';
  beadIndex?: number; // 0..3 for earth beads (0 is closest to beam)
  direction: 'toward-beam' | 'away-from-beam';
  hintText: string;
}

export interface SorobanMoveStep {
  stateAfter: SorobanState;
  move: SorobanGuidedMove;
  spokenText: string;
  formulaLabel?: string;
}

export interface AppSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  speechEnabled: boolean;
  reducedMotion: boolean;
  nightMode: boolean;
  digitMode: DigitDisplayMode;
  abacusScale: 'normal' | 'large';
  prefer2D: boolean;
}

export type SkillKey =
  | 'recognition'
  | 'placeValue'
  | 'simpleAddition'
  | 'simpleSubtraction'
  | 'complements'
  | 'mentalMath';

export interface SkillStats {
  correct: number;
  attempts: number;
}

export interface LessonProgress {
  completed: boolean;
  stars: number; // 0..3
  bestScore: number;
}

export interface ChildProfile {
  id: string;
  name: string;
  avatar: AvatarId;
  age: number;
  createdAt: number;
  totalStars: number;
  practiceMinutes: number;
  totalCorrect: number;
  totalAttempts: number;
  difficultyLevel: number; // 1..5 adaptive
  lessons: Record<string, LessonProgress>;
  skills: Record<SkillKey, SkillStats>;
  badges: string[];
}

export interface LessonStep {
  id: string;
  title: string;
  instruction: string;
  spokenText: string;
  initialValue?: number;
  targetValue?: number;
  columns: number;
  requireInteraction: boolean;
  autoDemoSteps?: boolean;
  highlightColumn?: number;
}

export interface LessonDefinition {
  id: string;
  stageNumber: number;
  title: string;
  shortGoal: string;
  skill: SkillKey;
  columns: number;
  unlockRequirement?: string;
  iconName: 'sparkles' | 'layers' | 'plus' | 'minus' | 'puzzle' | 'brain';
  accentColor: string;
  steps: LessonStep[];
}

export interface PracticeQuestion {
  id: string;
  skill: SkillKey;
  columns: number;
  promptText: string;
  spokenText: string;
  startValue: number;
  targetValue: number;
  visualType?: 'number' | 'objects' | 'mental-flash';
  visualCountA?: number;
  visualCountB?: number;
  visualEmoji?: 'apple' | 'star' | 'balloon' | 'pencil';
  operation?: '+' | '-';
}

export type GameModeId = 'build' | 'find-number' | 'count-add' | 'spot-mistake';

export interface SessionResult {
  title: string;
  skill: SkillKey;
  stars: number; // 1..3
  correctCount: number;
  totalCount: number;
  message: string;
  nextAction: 'next-lesson' | 'map' | 'games' | 'practice';
  lessonId?: string;
}
