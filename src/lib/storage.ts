import type { AppSettings, AvatarId, ChildProfile, SkillKey } from '../types/app';

const STORAGE_KEY = 'koodak_nabegheh_v1';

export interface StoredAppData {
  profiles: ChildProfile[];
  activeProfileId: string;
  settings: AppSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  musicEnabled: false,
  speechEnabled: true,
  reducedMotion: false,
  nightMode: false,
  digitMode: 'fa',
  abacusScale: 'normal',
  prefer2D: false,
};

function createEmptySkills(): Record<SkillKey, { correct: number; attempts: number }> {
  return {
    recognition: { correct: 0, attempts: 0 },
    placeValue: { correct: 0, attempts: 0 },
    simpleAddition: { correct: 0, attempts: 0 },
    simpleSubtraction: { correct: 0, attempts: 0 },
    complements: { correct: 0, attempts: 0 },
    mentalMath: { correct: 0, attempts: 0 },
  };
}

export function createEmptyDailyBonus() {
  return {
    streak: 0,
    lastClaimDate: '',
    totalDaysClaimed: 0,
    history: [] as string[],
  };
}

export function normalizeChildProfile(profile: ChildProfile): ChildProfile {
  return {
    ...profile,
    badges: Array.isArray(profile.badges) ? profile.badges : [],
    rewardPoints: typeof profile.rewardPoints === 'number' && Number.isFinite(profile.rewardPoints)
      ? Math.max(0, Math.round(profile.rewardPoints))
      : 0,
    dailyBonus: {
      ...createEmptyDailyBonus(),
      ...(profile.dailyBonus ?? {}),
      history: Array.isArray(profile.dailyBonus?.history) ? profile.dailyBonus.history : [],
    },
  };
}

export function createChildProfile(
  name: string,
  avatar: AvatarId,
  age: number = 6
): ChildProfile {
  return {
    id: `child_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || 'قهرمان کوچک',
    avatar,
    age,
    createdAt: Date.now(),
    totalStars: 0,
    practiceMinutes: 0,
    totalCorrect: 0,
    totalAttempts: 0,
    difficultyLevel: 1,
    lessons: {},
    skills: createEmptySkills(),
    badges: [],
    rewardPoints: 0,
    dailyBonus: createEmptyDailyBonus(),
  };
}

function createInitialData(): StoredAppData {
  const defaultChild = createChildProfile('آرتین', 'owl', 6);
  return {
    profiles: [defaultChild],
    activeProfileId: defaultChild.id,
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function loadAppData(): StoredAppData {
  if (typeof window === 'undefined') {
    return createInitialData();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const init = createInitialData();
      saveAppData(init);
      return init;
    }
    const parsed = JSON.parse(raw) as Partial<StoredAppData>;
    if (!parsed.profiles || parsed.profiles.length === 0) {
      const init = createInitialData();
      saveAppData(init);
      return init;
    }
    const profiles = parsed.profiles.map(normalizeChildProfile);
    const settings: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...(parsed.settings ?? {}),
    };
    const activeProfileId =
      parsed.activeProfileId && profiles.some((p) => p.id === parsed.activeProfileId)
        ? parsed.activeProfileId
        : profiles[0].id;
    return {
      profiles,
      activeProfileId,
      settings,
    };
  } catch {
    return createInitialData();
  }
}

export function saveAppData(data: StoredAppData): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function clearAppData(): StoredAppData {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  const fresh = createInitialData();
  saveAppData(fresh);
  return fresh;
}
