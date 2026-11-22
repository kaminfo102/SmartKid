import type {
  ChildProfile,
  DailyBonusState,
  LessonDefinition,
  RewardMedalDefinition,
} from '../types/app';
import { LESSONS } from '../data/lessons';

export const MEDAL_CATALOG: RewardMedalDefinition[] = [
  {
    id: 'first_step',
    title: 'اولین قدم چرتکه‌ای',
    description: 'تکمیل اولین مرحله در نقشه ماجراجویی',
    category: 'learning',
    categoryLabel: 'آموزشی',
    icon: 'compass',
    accentColor: '#10B981',
  },
  {
    id: 'star_collector',
    title: 'ستاره‌چین درخشان',
    description: 'کسب حداقل ۱۰ ستاره از درس‌ها و تمرین‌ها',
    category: 'learning',
    categoryLabel: 'آموزشی',
    icon: 'star',
    accentColor: '#F59E0B',
  },
  {
    id: 'golden_champion',
    title: 'قهرمان طلایی',
    description: 'کسب حداقل ۵۰ ستاره در ماجراجویی چرتکه',
    category: 'learning',
    categoryLabel: 'آموزشی',
    icon: 'trophy',
    accentColor: '#D97706',
  },
  {
    id: 'sharp_mind',
    title: 'تیرانداز دقیق',
    description: 'ثبت حداقل ۱۰ پاسخ با دقت بالای ۸۰ درصد',
    category: 'learning',
    categoryLabel: 'آموزشی',
    icon: 'target',
    accentColor: '#2563EB',
  },
  {
    id: 'complements_hero',
    title: 'دوست ۵ و ۱۰',
    description: 'ثبت حداقل ۵ پاسخ درست در مکمل‌های ۵ و ۱۰',
    category: 'learning',
    categoryLabel: 'آموزشی',
    icon: 'brain',
    accentColor: '#7C3AED',
  },
  {
    id: 'mental_wizard',
    title: 'نابغه محاسبه ذهنی',
    description: 'ثبت حداقل ۵ پاسخ درست در محاسبات ذهنی',
    category: 'learning',
    categoryLabel: 'آموزشی',
    icon: 'brain',
    accentColor: '#DB2777',
  },
  {
    id: 'daily_starter',
    title: 'شروع پرانرژی',
    description: 'دریافت اولین پاداش حضور روزانه',
    category: 'streak',
    categoryLabel: 'حضور روزانه',
    icon: 'flame',
    accentColor: '#EA580C',
  },
  {
    id: 'streak_3',
    title: 'همراه ۳ روزه',
    description: '۳ روز متوالی سر زدن به اپلیکیشن',
    category: 'streak',
    categoryLabel: 'حضور روزانه',
    icon: 'flame',
    accentColor: '#E11D48',
  },
  {
    id: 'streak_7',
    title: 'قهرمان هفتگی',
    description: '۷ روز متوالی حضور و دریافت پاداش روزانه',
    category: 'streak',
    categoryLabel: 'حضور روزانه',
    icon: 'crown',
    accentColor: '#B45309',
  },
  {
    id: 'shop_sun_medal',
    title: 'نشان طلایی خورشید',
    description: 'نشان ویژه قابل دریافت با امتیاز پاداش روزانه در فروشگاه',
    category: 'shop',
    categoryLabel: 'غرفه فروشگاه',
    icon: 'sun',
    accentColor: '#F59E0B',
    pointsCost: 60,
  },
  {
    id: 'shop_owl_crown',
    title: 'تاج جغد دانا',
    description: 'تاج افتخار دوستان دانا در فروشگاه کودک نابغه',
    category: 'shop',
    categoryLabel: 'غرفه فروشگاه',
    icon: 'crown',
    accentColor: '#6366F1',
    pointsCost: 100,
  },
  {
    id: 'shop_rocket_badge',
    title: 'نشان موشک نابغه‌ها',
    description: 'نشان سرعت و پرواز در مسیر ریاضی',
    category: 'shop',
    categoryLabel: 'غرفه فروشگاه',
    icon: 'rocket',
    accentColor: '#0284C7',
    pointsCost: 150,
  },
  {
    id: 'shop_diamond_star',
    title: 'مدال الماس ریاضی',
    description: 'کمیاب‌ترین مدال افتخار کلکسیون کودک نابغه',
    category: 'shop',
    categoryLabel: 'غرفه فروشگاه',
    icon: 'gem',
    accentColor: '#059669',
    pointsCost: 220,
  },
];

export const SHOP_VIRTUAL_MEDALS = MEDAL_CATALOG.filter(
  (m): m is RewardMedalDefinition & { pointsCost: number } =>
    m.category === 'shop' && typeof m.pointsCost === 'number'
);

export interface DailyBonusDaySpec {
  day: number; // 1..7
  points: number;
  label: string;
  bonusMedalId?: string;
}

export const DAILY_BONUS_DAYS: DailyBonusDaySpec[] = [
  { day: 1, points: 20, label: 'روز اول' },
  { day: 2, points: 30, label: 'روز دوم' },
  { day: 3, points: 40, label: 'روز سوم', bonusMedalId: 'streak_3' },
  { day: 4, points: 50, label: 'روز چهارم' },
  { day: 5, points: 65, label: 'روز پنجم' },
  { day: 6, points: 80, label: 'روز ششم' },
  { day: 7, points: 100, label: 'جایزه بزرگ', bonusMedalId: 'streak_7' },
];

export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getYesterdayDateKey(date: Date = new Date()): string {
  const prev = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
  return getLocalDateKey(prev);
}

function getNormalizedDailyBonus(profile: ChildProfile): DailyBonusState {
  return {
    streak: profile.dailyBonus?.streak ?? 0,
    lastClaimDate: profile.dailyBonus?.lastClaimDate ?? '',
    totalDaysClaimed: profile.dailyBonus?.totalDaysClaimed ?? 0,
    history: Array.isArray(profile.dailyBonus?.history) ? profile.dailyBonus.history : [],
  };
}

export interface DailyBonusPreview {
  canClaimToday: boolean;
  claimedTodayDate: string;
  currentStreak: number;
  nextCycleDay: number; // 1..7
  todayRewardPoints: number;
  todayBonusMedalId?: string;
  rewardPointsBalance: number;
  totalDaysClaimed: number;
}

export function getDailyBonusPreview(
  profile: ChildProfile,
  now: Date = new Date()
): DailyBonusPreview {
  const bonus = getNormalizedDailyBonus(profile);
  const today = getLocalDateKey(now);
  const yesterday = getYesterdayDateKey(now);

  const alreadyClaimedToday = bonus.lastClaimDate === today;
  const continuesStreak =
    bonus.lastClaimDate === today || bonus.lastClaimDate === yesterday;
  const effectiveStreak = continuesStreak ? bonus.streak : 0;

  const nextStreak = alreadyClaimedToday
    ? Math.max(1, bonus.streak)
    : effectiveStreak + 1;
  const nextCycleDay = ((nextStreak - 1) % 7) + 1;
  const spec = DAILY_BONUS_DAYS[nextCycleDay - 1] ?? DAILY_BONUS_DAYS[0];

  return {
    canClaimToday: !alreadyClaimedToday,
    claimedTodayDate: today,
    currentStreak: alreadyClaimedToday ? Math.max(1, bonus.streak) : effectiveStreak,
    nextCycleDay,
    todayRewardPoints: spec.points,
    todayBonusMedalId: spec.bonusMedalId,
    rewardPointsBalance: Math.max(0, profile.rewardPoints ?? 0),
    totalDaysClaimed: bonus.totalDaysClaimed,
  };
}

export function evaluateProfileBadges(
  profile: ChildProfile,
  lessons: LessonDefinition[] = LESSONS
): string[] {
  const existing = new Set<string>(Array.isArray(profile.badges) ? profile.badges : []);
  const completedCount = lessons.filter((l) => profile.lessons[l.id]?.completed).length;
  const accuracy =
    profile.totalAttempts > 0
      ? Math.round((profile.totalCorrect / profile.totalAttempts) * 100)
      : 0;
  const streak = profile.dailyBonus?.streak ?? 0;
  const totalDays = profile.dailyBonus?.totalDaysClaimed ?? 0;

  if (completedCount >= 1) existing.add('first_step');
  if (profile.totalStars >= 10) existing.add('star_collector');
  if (profile.totalStars >= 50) existing.add('golden_champion');
  if (profile.totalCorrect >= 10 && accuracy >= 80) existing.add('sharp_mind');
  if ((profile.skills.complements?.correct ?? 0) >= 5) existing.add('complements_hero');
  if ((profile.skills.mentalMath?.correct ?? 0) >= 5) existing.add('mental_wizard');
  if (totalDays >= 1 || streak >= 1) existing.add('daily_starter');
  if (streak >= 3) existing.add('streak_3');
  if (streak >= 7) existing.add('streak_7');

  return Array.from(existing);
}

export interface ClaimDailyBonusResult {
  updatedProfile: ChildProfile;
  awardedPoints: number;
  newBadges: RewardMedalDefinition[];
  nextStreak: number;
  alreadyClaimed: boolean;
}

export function claimDailyBonusOnProfile(
  profile: ChildProfile,
  lessons: LessonDefinition[] = LESSONS,
  now: Date = new Date()
): ClaimDailyBonusResult {
  const preview = getDailyBonusPreview(profile, now);
  if (!preview.canClaimToday) {
    return {
      updatedProfile: profile,
      awardedPoints: 0,
      newBadges: [],
      nextStreak: preview.currentStreak,
      alreadyClaimed: true,
    };
  }

  const prevBadges = new Set(profile.badges ?? []);
  const bonus = getNormalizedDailyBonus(profile);
  const today = getLocalDateKey(now);
  const yesterday = getYesterdayDateKey(now);
  const nextStreak = bonus.lastClaimDate === yesterday ? bonus.streak + 1 : 1;
  const nextCycleDay = ((nextStreak - 1) % 7) + 1;
  const spec = DAILY_BONUS_DAYS[nextCycleDay - 1] ?? DAILY_BONUS_DAYS[0];

  const candidateBadges = new Set(profile.badges ?? []);
  candidateBadges.add('daily_starter');
  if (nextStreak >= 3) candidateBadges.add('streak_3');
  if (nextStreak >= 7) candidateBadges.add('streak_7');
  if (spec.bonusMedalId) candidateBadges.add(spec.bonusMedalId);

  const nextProfileDraft: ChildProfile = {
    ...profile,
    rewardPoints: Math.max(0, profile.rewardPoints ?? 0) + spec.points,
    badges: Array.from(candidateBadges),
    dailyBonus: {
      streak: nextStreak,
      lastClaimDate: today,
      totalDaysClaimed: bonus.totalDaysClaimed + 1,
      history: [...bonus.history.filter((d) => d !== today), today].slice(-14),
    },
  };

  const finalBadges = evaluateProfileBadges(nextProfileDraft, lessons);
  const updatedProfile: ChildProfile = {
    ...nextProfileDraft,
    badges: finalBadges,
  };

  const newBadges = MEDAL_CATALOG.filter(
    (m) => finalBadges.includes(m.id) && !prevBadges.has(m.id)
  );

  return {
    updatedProfile,
    awardedPoints: spec.points,
    newBadges,
    nextStreak,
    alreadyClaimed: false,
  };
}

export function redeemShopMedalOnProfile(
  profile: ChildProfile,
  medalId: string,
  lessons: LessonDefinition[] = LESSONS
): { ok: boolean; error?: string; updatedProfile: ChildProfile } {
  const medal = SHOP_VIRTUAL_MEDALS.find((m) => m.id === medalId);
  if (!medal) {
    return { ok: false, error: 'مدال مورد نظر یافت نشد.', updatedProfile: profile };
  }
  const currentBadges = Array.isArray(profile.badges) ? profile.badges : [];
  if (currentBadges.includes(medal.id)) {
    return { ok: false, error: 'این مدال قبلاً دریافت شده است.', updatedProfile: profile };
  }
  const balance = Math.max(0, profile.rewardPoints ?? 0);
  if (balance < medal.pointsCost) {
    return {
      ok: false,
      error: `امتیاز کافی نیست (${medal.pointsCost} امتیاز لازم است).`,
      updatedProfile: profile,
    };
  }

  const draft: ChildProfile = {
    ...profile,
    rewardPoints: balance - medal.pointsCost,
    badges: [...currentBadges, medal.id],
  };

  return {
    ok: true,
    updatedProfile: {
      ...draft,
      badges: evaluateProfileBadges(draft, lessons),
    },
  };
}

export function getMedalProgress(
  profile: ChildProfile,
  medalId: string,
  lessons: LessonDefinition[] = LESSONS
): { current: number; target: number; percent: number } {
  const isOwned = (profile.badges ?? []).includes(medalId);
  if (isOwned) {
    return { current: 1, target: 1, percent: 100 };
  }

  const completedCount = lessons.filter((l) => profile.lessons[l.id]?.completed).length;
  const streak = profile.dailyBonus?.streak ?? 0;

  let current = 0;
  let target = 1;

  switch (medalId) {
    case 'first_step':
      current = Math.min(1, completedCount);
      target = 1;
      break;
    case 'star_collector':
      current = Math.min(10, profile.totalStars);
      target = 10;
      break;
    case 'golden_champion':
      current = Math.min(50, profile.totalStars);
      target = 50;
      break;
    case 'sharp_mind':
      current = Math.min(10, profile.totalCorrect);
      target = 10;
      break;
    case 'complements_hero':
      current = Math.min(5, profile.skills.complements?.correct ?? 0);
      target = 5;
      break;
    case 'mental_wizard':
      current = Math.min(5, profile.skills.mentalMath?.correct ?? 0);
      target = 5;
      break;
    case 'daily_starter':
      current = Math.min(1, profile.dailyBonus?.totalDaysClaimed ?? 0);
      target = 1;
      break;
    case 'streak_3':
      current = Math.min(3, streak);
      target = 3;
      break;
    case 'streak_7':
      current = Math.min(7, streak);
      target = 7;
      break;
    default: {
      const shopItem = SHOP_VIRTUAL_MEDALS.find((m) => m.id === medalId);
      if (shopItem) {
        current = Math.min(shopItem.pointsCost, Math.max(0, profile.rewardPoints ?? 0));
        target = shopItem.pointsCost;
      }
      break;
    }
  }

  const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return { current, target, percent };
}
