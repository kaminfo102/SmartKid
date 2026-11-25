import type { ChildProfile, DailyRacingState, DigitDisplayMode } from '../../types/app';
import { formatNumber } from '../../lib/numbers';
import { getLocalDateKey } from '../../lib/rewards';
import { DEFAULT_DAILY_RACING_LIMIT_SECONDS } from '../../lib/storage';

export interface RaceCarSpec {
  id: string;
  name: string;
  subtitle: string;
  bodyColor: string;
  shadeColor: string;
  stripeColor: string;
  spoilerColor: string;
  glowColor: string;
}

export const RACING_CARS: RaceCarSpec[] = [
  {
    id: 'turbo-red',
    name: 'توربو قرمز',
    subtitle: 'سریع و پرانرژی',
    bodyColor: '#EF4444',
    shadeColor: '#B91C1C',
    stripeColor: '#FFFFFF',
    spoilerColor: '#FBBF24',
    glowColor: 'rgba(239, 68, 68, 0.35)',
  },
  {
    id: 'lightning-blue',
    name: 'صاعقه آبی',
    subtitle: 'چابک در پیچ‌ها',
    bodyColor: '#3B82F6',
    shadeColor: '#1D4ED8',
    stripeColor: '#38BDF8',
    spoilerColor: '#F8FAFC',
    glowColor: 'rgba(59, 130, 246, 0.35)',
  },
  {
    id: 'sunny-gold',
    name: 'ستاره طلایی',
    subtitle: 'شکارچی امتیاز',
    bodyColor: '#F59E0B',
    shadeColor: '#B45309',
    stripeColor: '#FEF3C7',
    spoilerColor: '#1E293B',
    glowColor: 'rgba(245, 158, 11, 0.35)',
  },
  {
    id: 'emerald-ranger',
    name: 'رالی سبز',
    subtitle: 'فرمان‌پذیر و نرم',
    bodyColor: '#10B981',
    shadeColor: '#047857',
    stripeColor: '#A7F3D0',
    spoilerColor: '#FDE047',
    glowColor: 'rgba(16, 185, 129, 0.35)',
  },
];

export type RoadPropType =
  | 'oak-tree'
  | 'pine-tree'
  | 'barn'
  | 'windmill'
  | 'fence'
  | 'cabin'
  | 'palm'
  | 'umbrella'
  | 'lighthouse'
  | 'cliff-rock'
  | 'snow-pine'
  | 'chevron-sign'
  | 'cactus'
  | 'mesa'
  | 'streetlamp'
  | 'city-tower';

export type StageEnvironmentTheme =
  | 'countryside'
  | 'forest'
  | 'coastal'
  | 'mountain'
  | 'desert'
  | 'night-city';

export interface RacingStageSpec {
  stageNumber: number;
  title: string;
  roadType: string;
  description: string;
  environment: StageEnvironmentTheme;
  lanes: number;
  distanceGoal: number; // in virtual meters
  baseSpeed: number; // world Z units / sec
  maxSpeed: number;
  boostSpeed: number;
  curveIntensity: number; // 0..1.4
  hillIntensity: number; // 0..1
  trafficInterval: number; // seconds between traffic spawns (lower = harder)
  obstacleChance: number; // 0..0.45
  coinMultiplier: number;
  completionStars: number;
  completionBonusPoints: number;
  // Visual palette
  skyTop: string;
  skyBottom: string;
  sunOrMoonColor: string;
  isNight: boolean;
  hasOceanSide?: boolean;
  hasMist?: boolean;
  hasHeadlights?: boolean;
  hasCatEyes?: boolean;
  hasGuardrails?: boolean;
  mountainFar: string;
  mountainNear: string;
  groundLight: string;
  groundDark: string;
  shoulderLight: string;
  shoulderDark: string;
  asphaltLight: string;
  asphaltDark: string;
  laneLineColor: string;
  edgeLineColor: string;
  curbLight: string;
  curbDark: string;
  propsLeft: RoadPropType[];
  propsRight: RoadPropType[];
}

export const RACING_STAGES: RacingStageSpec[] = [
  {
    stageNumber: 1,
    title: 'جاده روستایی آفتابی',
    roadType: 'جاده آسفالت دشت و مزرعه',
    description: 'مسیر هموار کنار مزرعه‌ها، آسیاب بادی و درختان سرسبز',
    environment: 'countryside',
    lanes: 2,
    distanceGoal: 1200,
    baseSpeed: 210,
    maxSpeed: 295,
    boostSpeed: 390,
    curveIntensity: 0.38,
    hillIntensity: 0.25,
    trafficInterval: 1.55,
    obstacleChance: 0.22,
    coinMultiplier: 1,
    completionStars: 1,
    completionBonusPoints: 15,
    skyTop: '#38BDF8',
    skyBottom: '#BAE6FD',
    sunOrMoonColor: '#FDE047',
    isNight: false,
    mountainFar: '#7DD3FC',
    mountainNear: '#4ADE80',
    groundLight: '#7CC643',
    groundDark: '#68B233',
    shoulderLight: '#D6B98C',
    shoulderDark: '#C6A678',
    asphaltLight: '#525B66',
    asphaltDark: '#47505A',
    laneLineColor: '#F8FAFC',
    edgeLineColor: '#FFFFFF',
    curbLight: '#FFFFFF',
    curbDark: '#EF4444',
    propsLeft: ['oak-tree', 'fence', 'barn', 'oak-tree'],
    propsRight: ['oak-tree', 'windmill', 'fence', 'oak-tree'],
  },
  {
    stageNumber: 2,
    title: 'جاده جنگلی مه‌آلود',
    roadType: 'مسیر جنگلی با پیچ‌های ملایم',
    description: 'درختان کاج بلند، کلبه‌های چوبی و پیچ‌های جذاب جنگلی',
    environment: 'forest',
    lanes: 2,
    distanceGoal: 1450,
    baseSpeed: 235,
    maxSpeed: 330,
    boostSpeed: 430,
    curveIntensity: 0.62,
    hillIntensity: 0.42,
    trafficInterval: 1.32,
    obstacleChance: 0.28,
    coinMultiplier: 1.2,
    completionStars: 1,
    completionBonusPoints: 20,
    skyTop: '#5B9BD5',
    skyBottom: '#CBE6E2',
    sunOrMoonColor: '#FEF9C3',
    isNight: false,
    hasMist: true,
    mountainFar: '#5D897B',
    mountainNear: '#2E6F5E',
    groundLight: '#2E7D32',
    groundDark: '#256628',
    shoulderLight: '#7A6348',
    shoulderDark: '#67523A',
    asphaltLight: '#404854',
    asphaltDark: '#363E49',
    laneLineColor: '#FACC15',
    edgeLineColor: '#E2E8F0',
    curbLight: '#D6D3D1',
    curbDark: '#57534E',
    propsLeft: ['pine-tree', 'cabin', 'pine-tree', 'chevron-sign'],
    propsRight: ['pine-tree', 'pine-tree', 'cabin', 'pine-tree'],
  },
  {
    stageNumber: 3,
    title: 'اتوبان ساحلی خلیج',
    roadType: 'بزرگراه ۳ بانده ساحلی',
    description: 'جاده وسیع کنار دریای آبی، نخل‌های ساحلی و فانوس دریایی',
    environment: 'coastal',
    lanes: 3,
    distanceGoal: 1700,
    baseSpeed: 265,
    maxSpeed: 365,
    boostSpeed: 470,
    curveIntensity: 0.55,
    hillIntensity: 0.2,
    trafficInterval: 1.12,
    obstacleChance: 0.25,
    coinMultiplier: 1.5,
    completionStars: 2,
    completionBonusPoints: 25,
    skyTop: '#0284C7',
    skyBottom: '#E0F2FE',
    sunOrMoonColor: '#FACC15',
    isNight: false,
    hasOceanSide: true,
    hasGuardrails: true,
    mountainFar: '#38BDF8',
    mountainNear: '#0EA5E9',
    groundLight: '#F4D58D',
    groundDark: '#E9C46A',
    shoulderLight: '#E2E8F0',
    shoulderDark: '#CBD5E1',
    asphaltLight: '#475569',
    asphaltDark: '#3B4758',
    laneLineColor: '#FFFFFF',
    edgeLineColor: '#FDE047',
    curbLight: '#FFFFFF',
    curbDark: '#0284C7',
    propsLeft: ['palm', 'umbrella', 'lighthouse', 'palm'],
    propsRight: ['palm', 'palm', 'umbrella', 'palm'],
  },
  {
    stageNumber: 4,
    title: 'گردنه کوهستانی برفی',
    roadType: 'جاده کوهستانی پرپیچ‌وخم',
    description: 'قله‌های برفی، صخره‌های بلند، گاردریل ایمنی و پیچ‌های تند',
    environment: 'mountain',
    lanes: 3,
    distanceGoal: 1950,
    baseSpeed: 285,
    maxSpeed: 395,
    boostSpeed: 505,
    curveIntensity: 0.92,
    hillIntensity: 0.72,
    trafficInterval: 1.0,
    obstacleChance: 0.34,
    coinMultiplier: 1.8,
    completionStars: 2,
    completionBonusPoints: 30,
    skyTop: '#3B82F6',
    skyBottom: '#DBEAFE',
    sunOrMoonColor: '#FFFFFF',
    isNight: false,
    hasGuardrails: true,
    mountainFar: '#94A3B8',
    mountainNear: '#475569',
    groundLight: '#78716C',
    groundDark: '#57534E',
    shoulderLight: '#A8A29E',
    shoulderDark: '#78716C',
    asphaltLight: '#374151',
    asphaltDark: '#2D3748',
    laneLineColor: '#FDE047',
    edgeLineColor: '#FFFFFF',
    curbLight: '#FACC15',
    curbDark: '#1E293B',
    propsLeft: ['cliff-rock', 'snow-pine', 'chevron-sign', 'cliff-rock'],
    propsRight: ['snow-pine', 'cliff-rock', 'snow-pine', 'chevron-sign'],
  },
  {
    stageNumber: 5,
    title: 'بزرگراه کویری غروب',
    roadType: 'جاده سریع بیابانی در غروب',
    description: 'تپه‌های شنی طلایی، کاکتوس‌ها و چشم‌گربه‌های نورانی در غروب آفتاب',
    environment: 'desert',
    lanes: 3,
    distanceGoal: 2250,
    baseSpeed: 315,
    maxSpeed: 430,
    boostSpeed: 545,
    curveIntensity: 0.78,
    hillIntensity: 0.48,
    trafficInterval: 0.88,
    obstacleChance: 0.32,
    coinMultiplier: 2,
    completionStars: 2,
    completionBonusPoints: 35,
    skyTop: '#7C2D12',
    skyBottom: '#FDBA74',
    sunOrMoonColor: '#FB923C',
    isNight: false,
    hasCatEyes: true,
    mountainFar: '#C2410C',
    mountainNear: '#9A3412',
    groundLight: '#EAB676',
    groundDark: '#D99B52',
    shoulderLight: '#C88D4B',
    shoulderDark: '#B37A3C',
    asphaltLight: '#33363D',
    asphaltDark: '#272A30',
    laneLineColor: '#FDBA74',
    edgeLineColor: '#FDE68A',
    curbLight: '#F97316',
    curbDark: '#431407',
    propsLeft: ['cactus', 'mesa', 'cactus', 'chevron-sign'],
    propsRight: ['mesa', 'cactus', 'cactus', 'mesa'],
  },
  {
    stageNumber: 6,
    title: 'اتوبان شبانه کلان‌شهر',
    roadType: 'بزرگراه ۴ بانده پیشرفته شبانه',
    description: 'چراغ‌های خیابان، آسمان‌خراش‌های نورانی، نور جلو و رقابت قهرمانانه',
    environment: 'night-city',
    lanes: 4,
    distanceGoal: 2600,
    baseSpeed: 345,
    maxSpeed: 470,
    boostSpeed: 590,
    curveIntensity: 0.85,
    hillIntensity: 0.35,
    trafficInterval: 0.76,
    obstacleChance: 0.36,
    coinMultiplier: 2.5,
    completionStars: 3,
    completionBonusPoints: 50,
    skyTop: '#0B1026',
    skyBottom: '#1E2952',
    sunOrMoonColor: '#FEF08A',
    isNight: true,
    hasHeadlights: true,
    hasCatEyes: true,
    hasGuardrails: true,
    mountainFar: '#1E293B',
    mountainNear: '#0F172A',
    groundLight: '#172033',
    groundDark: '#111827',
    shoulderLight: '#283548',
    shoulderDark: '#1E293B',
    asphaltLight: '#1F2937',
    asphaltDark: '#161E2B',
    laneLineColor: '#38BDF8',
    edgeLineColor: '#FACC15',
    curbLight: '#22D3EE',
    curbDark: '#312E81',
    propsLeft: ['streetlamp', 'city-tower', 'streetlamp', 'city-tower'],
    propsRight: ['streetlamp', 'city-tower', 'streetlamp', 'city-tower'],
  },
];

export interface TodayRacingSummary {
  todayKey: string;
  usedSeconds: number;
  dailyLimitSeconds: number;
  remainingSeconds: number;
  isLimitReached: boolean;
  bestStage: number;
  bestScore: number;
  totalCoinsEarned: number;
  selectedCarId: string;
}

export function getNormalizedRacingState(
  profile: ChildProfile,
  now: Date = new Date()
): DailyRacingState & { todayKey: string; remainingSeconds: number; isLimitReached: boolean } {
  const todayKey = getLocalDateKey(now);
  const raw = profile.dailyRacing;
  const isSameDay = raw?.date === todayKey;
  const dailyLimitSeconds =
    typeof raw?.dailyLimitSeconds === 'number' && raw.dailyLimitSeconds >= 120
      ? Math.round(raw.dailyLimitSeconds)
      : DEFAULT_DAILY_RACING_LIMIT_SECONDS;
  const usedSeconds = isSameDay ? Math.max(0, Math.round(raw?.usedSeconds ?? 0)) : 0;
  const remainingSeconds = Math.max(0, dailyLimitSeconds - usedSeconds);
  const bestStage = Math.max(1, Math.min(RACING_STAGES.length, raw?.bestStage ?? 1));
  const bestScore = Math.max(0, raw?.bestScore ?? 0);
  const totalCoinsEarned = Math.max(0, raw?.totalCoinsEarned ?? 0);
  const selectedCarId =
    raw?.selectedCarId && RACING_CARS.some((c) => c.id === raw.selectedCarId)
      ? raw.selectedCarId
      : RACING_CARS[0].id;

  return {
    date: todayKey,
    todayKey,
    usedSeconds,
    dailyLimitSeconds,
    remainingSeconds,
    isLimitReached: remainingSeconds <= 0,
    bestStage,
    bestScore,
    totalCoinsEarned,
    selectedCarId,
  };
}

export function formatRacingClock(seconds: number, digitMode: DigitDisplayMode): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  const raw = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return formatNumber(raw, digitMode);
}
