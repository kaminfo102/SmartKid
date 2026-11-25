import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Award,
  Car,
  CheckCircle2,
  Compass,
  Flame,
  Gamepad2,
  Home,
  LogIn,
  Map,
  Moon,
  Play,
  PlayCircle,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Sun,
  Trophy,
  Users,
} from 'lucide-react';
import type {
  ChildProfile,
  DigitDisplayMode,
  LessonDefinition,
  PromotionalBanner,
  ScreenId,
  TermDefinition,
  WordPressUser,
} from '../types/app';
import { formatNumber } from '../lib/numbers';
import { AvatarGraphic } from './MascotDana';
import { KiaAvatar } from './KiaAvatar';
import { KidIconTile } from './KidIconTile';
import { AbacusAdventureIllustration } from './KidIllustrations';
import { AudioButton } from './AudioButton';
import { DailyBonusCard } from './DailyBonusCard';
import { BannerSlot } from './BannerSlot';
import { audioEngine } from '../lib/audioEngine';
import {
  formatRacingClock,
  getNormalizedRacingState,
  RACING_STAGES,
} from '../features/games/racingStages';

interface StartScreenProps {
  terms?: TermDefinition[];
  lessons: LessonDefinition[];
  activeProfile: ChildProfile;
  digitMode: DigitDisplayMode;
  nightMode: boolean;
  reducedMotion: boolean;
  hasProgress: boolean;
  wpUser?: WordPressUser | null;
  wpConnected?: boolean;
  isGuest?: boolean;
  banners?: PromotionalBanner[];
  wpUrl?: string;
  onNavigateScreen?: (screen: ScreenId) => void;
  onContinueMap: () => void;
  onOpenPractice: () => void;
  onOpenGames: () => void;
  onOpenRacing?: () => void;
  onOpenSimulator: () => void;
  onOpenFreeAbacus: () => void;
  onOpenLeaderboard: () => void;
  onOpenShop: () => void;
  onOpenTickets?: () => void;
  onOpenProfiles: () => void;
  onOpenProfileDetails: () => void;
  onOpenLogin?: () => void;
  onOpenWelcome?: () => void;
  onClaimDailyBonus: () => { awardedPoints: number; newBadgeTitles: string[] };
  onToggleNightMode: () => void;
  onOpenParentsHub: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  terms = [],
  lessons,
  activeProfile,
  digitMode,
  nightMode,
  reducedMotion,
  hasProgress,
  wpUser,
  isGuest = false,
  banners = [],
  wpUrl = '',
  onNavigateScreen,
  onContinueMap,
  onOpenPractice,
  onOpenGames,
  onOpenRacing,
  onOpenSimulator,
  onOpenFreeAbacus,
  onOpenLeaderboard,
  onOpenShop,
  onOpenProfiles,
  onOpenProfileDetails,
  onOpenLogin,
  onOpenWelcome,
  onClaimDailyBonus,
  onToggleNightMode,
  onOpenParentsHub,
}) => {
  const [kiaBubble, setKiaBubble] = useState<string>(
    `سلام ${activeProfile.name}! من کیا هستم، بزن بریم چرتکه بازی!`
  );

  const completedLessons = useMemo(
    () => lessons.filter((l) => activeProfile.lessons[l.id]?.completed).length,
    [lessons, activeProfile.lessons]
  );

  const maxStarsGoal = Math.max(
    10,
    Math.ceil((activeProfile.totalStars + 5) / 10) * 10
  );
  const rewardPct = Math.min(
    100,
    Math.max(12, Math.round((activeProfile.totalStars / maxStarsGoal) * 100))
  );

  const todayKey = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const dailyClaimedToday = activeProfile.dailyBonus?.lastClaimDate === todayKey;
  const streakCount = activeProfile.dailyBonus?.streak ?? 0;
  const racingSummary = useMemo(
    () => getNormalizedRacingState(activeProfile),
    [activeProfile]
  );

  const handleKiaTap = () => {
    const cheers = [
      'جیک جیک! تو خیلی باهوشی!',
      'بیا با مهره‌های رنگی چرتکه بازی کنیم!',
      'روی دکمه سبز شروع یادگیری بزن قهرمان!',
    ];
    const msg = cheers[Math.floor(Math.random() * cheers.length)];
    setKiaBubble(msg);
    audioEngine.speakPersian(msg);
  };

  const activities = [
    {
      id: 'act-map',
      title: 'نقشه دوره‌ها',
      subtitle: `${formatNumber(Math.max(1, terms.length), digitMode)} ترم · ${formatNumber(
        completedLessons,
        digitMode
      )} مرحله`,
      color: 'green' as const,
      icon: <Map className="w-7 h-7 sm:w-8 sm:h-8" />,
      onClick: onContinueMap,
      ariaLabel: 'باز کردن نقشه ماجراجویی ترم‌ها',
    },
    {
      id: 'act-games',
      title: 'بازی‌های شاد',
      subtitle: 'بشمار و ستاره بگیر',
      color: 'pink' as const,
      icon: <Gamepad2 className="w-7 h-7 sm:w-8 sm:h-8" />,
      onClick: onOpenGames,
      ariaLabel: 'ورود به بازی‌های چرتکه',
    },
    {
      id: 'act-practice',
      title: 'تمرین چرتکه',
      subtitle: 'تقویت سرعت ذهن',
      color: 'blue' as const,
      icon: <Sparkles className="w-7 h-7 sm:w-8 sm:h-8" />,
      onClick: onOpenPractice,
      ariaLabel: 'شروع تمرین آزاد چرتکه',
    },
    {
      id: 'act-sim',
      title: 'آموزش تصویری',
      subtitle: 'نمایش حرکت مهره‌ها',
      color: 'sky' as const,
      icon: <PlayCircle className="w-7 h-7 sm:w-8 sm:h-8" />,
      onClick: onOpenSimulator,
      ariaLabel: 'شبیه‌ساز حرکت مهره‌های چرتکه',
    },
  ];

  const quests = [
    {
      id: 'q-daily',
      title: 'دریافت جایزه امروز',
      subtitle: dailyClaimedToday
        ? `پاداش امروز دریافت شد (${formatNumber(streakCount, digitMode)} روز استمرار)`
        : 'امتیاز باشگاه و سکه طلای روزانه را بگیر',
      done: dailyClaimedToday,
      color: 'amber' as const,
      icon: <Flame className="w-5 h-5" />,
      actionLabel: dailyClaimedToday ? 'انجام شد' : 'دریافت',
      onAction: () => {
        if (!dailyClaimedToday) {
          onClaimDailyBonus();
        }
      },
    },
    {
      id: 'q-lesson',
      title: 'فتح یک مرحله آموزشی',
      subtitle: `${formatNumber(completedLessons, digitMode)} از ${formatNumber(
        lessons.length,
        digitMode
      )} مرحله تکمیل شده`,
      done: completedLessons > 0,
      color: 'green' as const,
      icon: <Compass className="w-5 h-5" />,
      actionLabel: 'نقشه',
      onAction: onContinueMap,
    },
    {
      id: 'q-practice',
      title: 'تمرین محاسبه با چرتکه',
      subtitle: `${formatNumber(activeProfile.totalCorrect, digitMode)} پاسخ درست تا الان`,
      done: activeProfile.totalCorrect >= 5,
      color: 'blue' as const,
      icon: <Sparkles className="w-5 h-5" />,
      actionLabel: 'تمرین',
      onAction: onOpenPractice,
    },
    {
      id: 'q-game',
      title: 'چالش ستاره‌ای بازی‌ها',
      subtitle: 'بازی شاد با چرتکه و کسب ستاره جدید',
      done: activeProfile.totalStars >= 3,
      color: 'pink' as const,
      icon: <Gamepad2 className="w-5 h-5" />,
      actionLabel: 'بازی',
      onAction: onOpenGames,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F5E4CE] dark:bg-slate-950">
      {/* Sunny Storybook Adventure Header */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#F49A67] via-[#F7B684] to-[#FCE0BE] dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 pb-12">
        <svg
          aria-hidden="true"
          viewBox="0 0 800 200"
          preserveAspectRatio="none"
          className="pointer-events-none absolute bottom-0 left-0 right-0 w-full h-24 opacity-45 dark:opacity-15"
        >
          <path
            d="M0 160 Q 150 60 320 130 T 640 110 T 800 140 L 800 200 L 0 200 Z"
            fill="#E07C47"
          />
          <path
            d="M0 175 Q 200 100 420 155 T 800 135 L 800 200 L 0 200 Z"
            fill="#D46B37"
          />
        </svg>

        {/* Top Bar */}
        <header className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-3.5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onOpenProfiles}
            aria-label={`انتخاب پروفایل کودک، پروفایل فعلی ${activeProfile.name}`}
            className="min-h-[46px] inline-flex items-center gap-2 rounded-2xl bg-white/95 dark:bg-slate-900 border-b-4 border-[#E5D3BE] dark:border-slate-800 px-3 py-1.5 shadow-sm hover:bg-white transition-all active:translate-y-0.5 shrink-0"
          >
            <AvatarGraphic
              avatar={activeProfile.avatar}
              imageUrl={activeProfile.avatarUrl}
              alt={activeProfile.name}
              className="w-8 h-8 rounded-full shrink-0"
            />
            <span className="text-sm font-extrabold text-slate-900 dark:text-white truncate max-w-[84px] sm:max-w-[130px]">
              {activeProfile.name}
            </span>
            <Users className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenLeaderboard}
              aria-label="جدول قهرمانان و ستاره‌ها"
              className="min-h-[46px] inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#FFDC5E] dark:bg-amber-900/70 border-b-4 border-[#DFAD19] dark:border-amber-700 text-[#5C3A00] dark:text-amber-100 text-sm font-extrabold tabular-nums shadow-sm hover:brightness-105 active:translate-y-0.5 transition-all whitespace-nowrap shrink-0"
            >
              <Star className="w-4 h-4 fill-[#F59E0B] text-[#B45309]" />
              <span>{formatNumber(activeProfile.totalStars, digitMode)}</span>
              <Trophy className="w-3.5 h-3.5 text-[#9A5B00] dark:text-amber-300 hidden sm:inline" />
            </button>

            <button
              type="button"
              onClick={onToggleNightMode}
              aria-label={nightMode ? 'تغییر به حالت روشن' : 'تغییر به حالت تاریک'}
              title={nightMode ? 'حالت روشن' : 'حالت تاریک'}
              className="min-h-[46px] min-w-[46px] inline-flex items-center justify-center rounded-2xl bg-white/95 dark:bg-slate-900 border-b-4 border-[#E5D3BE] dark:border-slate-800 text-slate-800 dark:text-amber-300 shadow-sm hover:bg-white transition-all active:translate-y-0.5 shrink-0"
            >
              {nightMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {!wpUser && onOpenLogin && (
              <button
                type="button"
                onClick={onOpenLogin}
                aria-label="ورود یا ثبت‌نام حساب کاربری"
                className="min-h-[46px] inline-flex items-center gap-1.5 rounded-2xl bg-[#4BB543] hover:bg-[#41A23A] border-b-4 border-[#2E8228] px-3 py-2 text-xs font-extrabold text-white shadow-sm transition-all active:translate-y-0.5 whitespace-nowrap shrink-0"
              >
                <LogIn className="w-4 h-4 shrink-0" />
                <span>{isGuest ? 'مهمان · ورود' : 'ورود'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenParentsHub}
              aria-label="ورود به بخش والدین و تنظیمات"
              title="مرکز والدین و تنظیمات"
              className="min-h-[46px] min-w-[46px] inline-flex items-center gap-1.5 rounded-2xl bg-white/95 dark:bg-slate-900 border-b-4 border-[#E5D3BE] dark:border-slate-800 px-3 py-2 text-xs font-extrabold text-slate-800 dark:text-slate-100 shadow-sm hover:bg-white transition-all active:translate-y-0.5 whitespace-nowrap shrink-0"
            >
              <ShieldCheck
                className={`w-4 h-4 shrink-0 ${
                  wpUser ? 'text-[#4BB543]' : 'text-[#5472EB] dark:text-blue-400'
                }`}
              />
              <span className="hidden md:inline whitespace-nowrap">
                {wpUser ? `والدین · ${wpUser.displayName}` : 'والدین'}
              </span>
            </button>
          </div>
        </header>

        {/* Friendly Kia Hero Section */}
        <section className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-3 flex flex-col items-center text-center">
          <div className="mb-1.5 px-4 py-1.5 rounded-2xl bg-white/95 dark:bg-slate-900 border-2 border-white dark:border-slate-700 text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100 shadow-sm max-w-xs sm:max-w-sm">
            {kiaBubble}
          </div>

          <KiaAvatar
            mood="happy"
            interactive
            onTap={handleKiaTap}
            className="w-28 h-28 sm:w-32 sm:h-32"
            reducedMotion={reducedMotion}
          />

          <h1 className="mt-0.5 text-3xl sm:text-4xl font-black text-white drop-shadow-[0_2px_0_rgba(148,70,22,0.55)] tracking-tight">
            کودک نابغه
          </h1>

          <div className="mt-2.5 flex items-center gap-2.5 flex-wrap justify-center">
            <AudioButton
              textToSpeak={`سلام ${activeProfile.name}! من کیا هستم. روی دکمه سبز شروع یادگیری بزن تا چرتکه بازی کنیم.`}
              label="صدای کیا"
              size="sm"
            />
            {onOpenWelcome && (
              <button
                type="button"
                onClick={onOpenWelcome}
                className="min-h-[38px] px-3 rounded-2xl bg-white/85 hover:bg-white dark:bg-slate-900/90 border border-white/70 dark:border-slate-700 text-xs font-extrabold text-[#783F1D] dark:text-amber-200 transition-all whitespace-nowrap shrink-0"
              >
                صفحه معرفی
              </button>
            )}
          </div>
        </section>
      </div>

      {/* Main Responsive Canvas */}
      <main className="relative z-20 -mt-8 flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 pb-28 md:pb-24 space-y-5">
        {/* Primary Adventure Start Banner */}
        <motion.section
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] border-b-4 border-b-[#DFC6A8] dark:border-slate-800 shadow-[0_14px_30px_-10px_rgba(180,115,45,0.25)] p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <AbacusAdventureIllustration className="w-16 h-16 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                  {hasProgress
                    ? `آفرین ${activeProfile.name}! به سفرت ادامه بده`
                    : 'ماجراجویی چرتکه را شروع کن!'}
                </div>
                <span className="text-xs font-bold text-[#9A5B00] dark:text-amber-300 tabular-nums">
                  {formatNumber(streakCount, digitMode)} روز استمرار ·{' '}
                  {formatNumber(activeProfile.rewardPoints ?? 0, digitMode)} امتیاز
                </span>
              </div>
              <div className="relative h-6 rounded-xl bg-amber-100 dark:bg-slate-800 overflow-hidden border border-amber-200 dark:border-slate-700 flex items-center justify-center">
                <div
                  className="absolute inset-y-0 right-0 bg-gradient-to-l from-[#FBBF24] to-[#F59E0B] rounded-xl transition-all"
                  style={{ width: `${rewardPct}%` }}
                />
                <span className="relative z-10 text-xs font-extrabold text-[#593600] dark:text-white tabular-nums flex items-center gap-1">
                  <span>
                    {formatNumber(activeProfile.totalStars, digitMode)} /{' '}
                    {formatNumber(maxStarsGoal, digitMode)}
                  </span>
                  <Star className="w-3.5 h-3.5 fill-current" />
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onContinueMap}
            aria-label="شروع یادگیری و مشاهده نقشه دوره‌ها"
            className="min-h-[54px] px-6 rounded-2xl bg-[#4BB543] hover:bg-[#41A23A] border-b-4 border-[#2E8228] active:border-b-0 active:translate-y-1 text-white font-extrabold text-base flex items-center justify-center gap-2 shrink-0 transition-all shadow-sm whitespace-nowrap"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>شروع یادگیری</span>
          </button>
        </motion.section>

        {banners.length > 0 && onNavigateScreen && (
          <BannerSlot
            banners={banners}
            placement="home_top"
            screen="start"
            wpUrl={wpUrl}
            onNavigateScreen={onNavigateScreen}
          />
        )}

        {/* 2-Column Desktop / Stacked Mobile Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Primary Activities, 3D Soroban & Leaderboard Column */}
          <div className="lg:col-span-7 space-y-4">
            {/* 2x2 Big Kid-Friendly Activity Tiles */}
            <section
              aria-label="فعالیت‌های یادگیری و بازی"
              className="grid grid-cols-2 gap-3"
            >
              {activities.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  aria-label={item.ariaLabel}
                  className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 border-b-4 border-b-[#DFC6A8] hover:border-sky-400 dark:hover:border-blue-500 p-4 flex flex-col items-center text-center gap-2.5 shadow-[0_8px_20px_-8px_rgba(170,104,40,0.16)] active:translate-y-0.5 transition-all"
                >
                  <KidIconTile color={item.color} size="lg">
                    {item.icon}
                  </KidIconTile>
                  <div className="space-y-0.5">
                    <div className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                      {item.title}
                    </div>
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      {item.subtitle}
                    </div>
                  </div>
                </button>
              ))}
            </section>

            {/* Dedicated 3D Soroban Fullscreen Card */}
            <button
              type="button"
              onClick={onOpenFreeAbacus}
              aria-label="باز کردن چرتکه تمام‌صفحه سه بعدی"
              className="w-full rounded-3xl bg-gradient-to-l from-[#1C2522] to-[#2B3934] border-2 border-[#D9B54C]/60 border-b-4 border-b-[#101614] hover:border-[#F0CE6B] p-4 flex items-center justify-between gap-3 text-right shadow-[0_10px_22px_-8px_rgba(20,28,25,0.45)] active:translate-y-0.5 transition-all"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-16 h-14 rounded-2xl bg-[#111514] border border-[#D9B54C]/60 flex items-center justify-center shrink-0 shadow-inner">
                  <svg aria-hidden="true" viewBox="0 0 64 40" className="w-12 h-8">
                    <rect
                      x="3"
                      y="4"
                      width="58"
                      height="32"
                      rx="3"
                      fill="#181A1F"
                      stroke="#D9B54C"
                      strokeWidth="2.4"
                    />
                    <line
                      x1="5"
                      y1="15"
                      x2="59"
                      y2="15"
                      stroke="#47505A"
                      strokeWidth="2.4"
                    />
                    <line
                      x1="15"
                      y1="6"
                      x2="15"
                      y2="34"
                      stroke="#30363E"
                      strokeWidth="1.5"
                    />
                    <line
                      x1="26"
                      y1="6"
                      x2="26"
                      y2="34"
                      stroke="#30363E"
                      strokeWidth="1.5"
                    />
                    <line
                      x1="38"
                      y1="6"
                      x2="38"
                      y2="34"
                      stroke="#30363E"
                      strokeWidth="1.5"
                    />
                    <line
                      x1="49"
                      y1="6"
                      x2="49"
                      y2="34"
                      stroke="#30363E"
                      strokeWidth="1.5"
                    />
                    <ellipse cx="15" cy="10" rx="4" ry="2.4" fill="#F4F6F9" />
                    <ellipse cx="26" cy="10" rx="4" ry="2.4" fill="#F4F6F9" />
                    <ellipse cx="38" cy="10" rx="4" ry="2.4" fill="#F4F6F9" />
                    <ellipse cx="49" cy="10" rx="4" ry="2.4" fill="#F4F6F9" />
                    <ellipse cx="15" cy="22" rx="4" ry="2.4" fill="#F4F6F9" />
                    <ellipse cx="26" cy="22" rx="4" ry="2.4" fill="#EE5267" />
                    <ellipse cx="38" cy="22" rx="4" ry="2.4" fill="#F4F6F9" />
                    <ellipse cx="49" cy="22" rx="4" ry="2.4" fill="#EE5267" />
                    <ellipse cx="15" cy="29" rx="4" ry="2.4" fill="#F4F6F9" />
                    <ellipse cx="26" cy="29" rx="4" ry="2.4" fill="#F4F6F9" />
                    <ellipse cx="38" cy="29" rx="4" ry="2.4" fill="#F4F6F9" />
                    <ellipse cx="49" cy="29" rx="4" ry="2.4" fill="#F4F6F9" />
                  </svg>
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="font-extrabold text-base sm:text-lg text-amber-300">
                    چرتکه
                  </div>
                  <div className="text-xs font-bold text-slate-200/85 truncate">
                    چرتکه سه‌بعدی تمام‌صفحه با حرکت افقی و لمس مهره‌ها
                  </div>
                </div>
              </div>
              <span className="px-3.5 py-2 rounded-xl bg-[#D9B54C] text-[#1A160B] font-extrabold text-xs shrink-0 whitespace-nowrap">
                باز کردن
              </span>
            </button>

            {/* Vivid Champions Leaderboard Launcher Card */}
            <button
              type="button"
              onClick={onOpenLeaderboard}
              aria-label="باز کردن جدول قهرمانان و رتبه‌بندی"
              className="w-full rounded-3xl bg-gradient-to-l from-[#FFF8DF] via-[#FFFDF5] to-white dark:from-amber-950/50 dark:via-slate-900 dark:to-slate-900 border-2 border-[#F5D27B] dark:border-amber-700 border-b-4 border-b-[#DFAD19] hover:brightness-[1.02] p-4 flex items-center justify-between gap-3 text-right shadow-[0_10px_24px_-10px_rgba(202,138,4,0.28)] active:translate-y-0.5 transition-all"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <KidIconTile color="amber" size="lg">
                  <Trophy className="w-8 h-8" />
                </KidIconTile>
                <div className="min-w-0 space-y-0.5">
                  <div className="font-black text-base text-[#593600] dark:text-amber-200">
                    جدول قهرمانان (لیدربورد)
                  </div>
                  <div className="text-xs font-bold text-[#7A4E00] dark:text-amber-100/80 truncate tabular-nums">
                    {formatNumber(activeProfile.totalStars, digitMode)} ستاره ·{' '}
                    {formatNumber(activeProfile.badges.length, digitMode)} مدال · رقابت شاد
                  </div>
                </div>
              </div>
              <span className="px-3.5 py-2 rounded-xl bg-[#F59E0B] text-white font-extrabold text-xs shrink-0 whitespace-nowrap shadow-xs">
                مشاهده رتبه‌ها
              </span>
            </button>

            {onOpenRacing && (
              <button
                type="button"
                onClick={onOpenRacing}
                aria-label="باز کردن بازی ماشین مسابقه‌ای مرحله‌ای"
                className="w-full rounded-3xl bg-gradient-to-l from-[#ECFDF5] via-[#F4FBF8] to-white dark:from-emerald-950/60 dark:via-slate-900 dark:to-slate-900 border-2 border-[#6EE7B7] dark:border-emerald-700 border-b-4 border-b-[#10B981] hover:brightness-[1.02] p-4 flex items-center justify-between gap-3 text-right shadow-[0_10px_24px_-10px_rgba(16,185,129,0.28)] active:translate-y-0.5 transition-all"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <KidIconTile color="green" size="lg">
                    <Car className="w-8 h-8" />
                  </KidIconTile>
                  <div className="min-w-0 space-y-0.5">
                    <div className="font-black text-base text-[#064E3B] dark:text-emerald-200 flex items-center gap-2 flex-wrap">
                      <span>مسابقه ماشین مرحله‌ای</span>
                    </div>
                    <div className="text-xs font-bold text-[#047857] dark:text-emerald-300/90 truncate tabular-nums">
                      مرحله {formatNumber(racingSummary.bestStage, digitMode)} از{' '}
                      {formatNumber(RACING_STAGES.length, digitMode)} · زمان امروز:{' '}
                      {racingSummary.isLimitReached
                        ? 'تکمیل شد'
                        : formatRacingClock(racingSummary.remainingSeconds, digitMode)}
                    </div>
                  </div>
                </div>
                <span
                  className={`px-3.5 py-2 rounded-xl font-extrabold text-xs shrink-0 whitespace-nowrap shadow-xs ${
                    racingSummary.isLimitReached
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      : 'bg-[#10B981] text-white'
                  }`}
                >
                  {racingSummary.isLimitReached ? 'مشاهده رکورد' : 'شروع مسابقه'}
                </span>
              </button>
            )}
          </div>

          {/* Outback-Style Daily Quests Timeline + Rewards + Shortcuts Column */}
          <div className="lg:col-span-5 space-y-4">
            {/* Daily Quests Vertical Checklist */}
            <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] border-b-4 border-b-[#DFC6A8] dark:border-slate-800 p-4 sm:p-5 shadow-[0_10px_24px_-8px_rgba(170,104,40,0.16)] space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-black text-[#4B2D16] dark:text-white">
                    ماموریت‌های امروز
                  </h2>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    هر کار را انجام بده تا ستاره و امتیاز بیشتری بگیری
                  </p>
                </div>
                <span className="text-xs font-black text-[#4BB543] dark:text-emerald-400 tabular-nums whitespace-nowrap">
                  {formatNumber(quests.filter((q) => q.done).length, digitMode)} /{' '}
                  {formatNumber(quests.length, digitMode)}
                </span>
              </div>

              <div className="relative space-y-3 before:content-[''] before:absolute before:top-4 before:bottom-4 before:right-5 before:border-r-2 before:border-dashed before:border-[#E5CCB0] dark:before:border-slate-700">
                {quests.map((quest) => (
                  <div
                    key={quest.id}
                    className="relative flex items-center justify-between gap-3 pr-0.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative z-10 shrink-0">
                        <KidIconTile color={quest.color} size="md">
                          {quest.done ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            quest.icon
                          )}
                        </KidIconTile>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                          {quest.title}
                        </div>
                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
                          {quest.subtitle}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={quest.onAction}
                      className={`min-h-[36px] px-3 rounded-xl font-extrabold text-xs shrink-0 whitespace-nowrap transition-all ${
                        quest.done && quest.id === 'q-daily'
                          ? 'bg-[#E7F9E5] dark:bg-emerald-950/50 text-[#1E6B19] dark:text-emerald-300 border border-[#8EE086] dark:border-emerald-800'
                          : 'bg-[#FFF6EB] hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#783F1D] dark:text-amber-200 border border-[#EEDCC5] dark:border-slate-700'
                      }`}
                    >
                      {quest.actionLabel}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Compact Daily Gift Bar */}
            <DailyBonusCard
              profile={activeProfile}
              digitMode={digitMode}
              compact
              onClaimBonus={onClaimDailyBonus}
              onOpenShop={onOpenShop}
            />

            {/* Secondary Shortcuts: Badges & Shop */}
            <section className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onOpenProfileDetails}
                className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 border-b-4 border-b-[#DFC6A8] hover:border-blue-400 p-3.5 flex items-center gap-2.5 text-right shadow-xs active:translate-y-0.5 transition-all"
              >
                <KidIconTile color="violet" size="md">
                  <Award className="w-5 h-5" />
                </KidIconTile>
                <div className="min-w-0">
                  <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                    کارنامه و مدال‌ها
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate tabular-nums">
                    {formatNumber(activeProfile.badges.length, digitMode)} مدال
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={onOpenShop}
                className="rounded-2xl bg-gradient-to-l from-[#FFDC5E] to-[#FFE88F] dark:from-amber-900/50 dark:to-slate-900 border-2 border-white dark:border-amber-700 border-b-4 border-b-[#DFAD19] p-3.5 flex items-center gap-2.5 text-right shadow-xs active:translate-y-0.5 transition-all"
              >
                <KidIconTile color="amber" size="md">
                  <ShoppingBag className="w-5 h-5" />
                </KidIconTile>
                <div className="min-w-0">
                  <div className="font-extrabold text-xs sm:text-sm text-[#593400] dark:text-amber-100 truncate">
                    فروشگاه و جوایز
                  </div>
                  <div className="text-[11px] font-bold text-[#7A4E00] dark:text-amber-200/80 truncate">
                    خرید چرتکه و مدال
                  </div>
                </div>
              </button>
            </section>
          </div>
        </div>

        {banners.length > 0 && onNavigateScreen && (
          <BannerSlot
            banners={banners}
            placement="home_bottom"
            screen="start"
            wpUrl={wpUrl}
            onNavigateScreen={onNavigateScreen}
          />
        )}
      </main>

      {/* Floating Quick-Access 3D Abacus Button */}
      <motion.button
        type="button"
        onClick={() => {
          audioEngine.play('uiTap');
          onOpenFreeAbacus();
        }}
        initial={reducedMotion ? false : { opacity: 0, scale: 0.9 }}
        animate={reducedMotion ? undefined : { opacity: 1, scale: 1 }}
        whileHover={reducedMotion ? undefined : { y: -3, scale: 1.03 }}
        whileTap={reducedMotion ? undefined : { scale: 0.96 }}
        transition={{ duration: 0.2 }}
        aria-label="دسترسی سریع به چرتکه سه‌بعدی"
        title="باز کردن چرتکه سه‌بعدی"
        className="fixed bottom-20 left-3.5 md:bottom-7 md:left-7 z-40 group flex items-center gap-2.5 rounded-3xl bg-gradient-to-br from-[#1C2522] via-[#263630] to-[#121917] border-2 border-[#E6C35C] border-b-4 border-b-[#9E7C22] pl-3.5 pr-2.5 py-2 shadow-[0_14px_30px_-8px_rgba(20,28,25,0.65)] hover:border-[#F8DC81] focus:outline-none focus:ring-4 focus:ring-amber-400/40"
      >
        <div className="w-10 h-10 rounded-2xl bg-[#101513] border border-[#D9B54C]/70 flex items-center justify-center shrink-0 shadow-inner">
          <svg aria-hidden="true" viewBox="0 0 48 32" className="w-8 h-6">
            <rect
              x="2"
              y="3"
              width="44"
              height="26"
              rx="3"
              fill="#181A1F"
              stroke="#E6C35C"
              strokeWidth="2.2"
            />
            <line
              x1="4"
              y1="12"
              x2="44"
              y2="12"
              stroke="#525B66"
              strokeWidth="2"
            />
            <line x1="12" y1="5" x2="12" y2="27" stroke="#30363E" strokeWidth="1.4" />
            <line x1="24" y1="5" x2="24" y2="27" stroke="#30363E" strokeWidth="1.4" />
            <line x1="36" y1="5" x2="36" y2="27" stroke="#30363E" strokeWidth="1.4" />
            <ellipse cx="12" cy="8.5" rx="3.4" ry="2" fill="#F4F6F9" />
            <ellipse cx="24" cy="8.5" rx="3.4" ry="2" fill="#EE5267" />
            <ellipse cx="36" cy="8.5" rx="3.4" ry="2" fill="#F4F6F9" />
            <ellipse cx="12" cy="18" rx="3.4" ry="2" fill="#F4F6F9" />
            <ellipse cx="24" cy="18" rx="3.4" ry="2" fill="#EE5267" />
            <ellipse cx="36" cy="18" rx="3.4" ry="2" fill="#F4F6F9" />
            <ellipse cx="12" cy="23.5" rx="3.4" ry="2" fill="#F4F6F9" />
            <ellipse cx="24" cy="23.5" rx="3.4" ry="2" fill="#F4F6F9" />
            <ellipse cx="36" cy="23.5" rx="3.4" ry="2" fill="#EE5267" />
          </svg>
        </div>
        <div className="text-right">
          <div className="text-xs sm:text-sm font-black text-amber-300 leading-tight whitespace-nowrap">
            چرتکه ۳بعدی
          </div>
          <div className="text-[10px] font-bold text-slate-200/80 leading-tight whitespace-nowrap">
            شروع سریع
          </div>
        </div>
      </motion.button>

      {/* Ergonomic Mobile Bottom Navigation Dock */}
      <nav
        aria-label="منوی سریع پایین صفحه"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 h-16 bg-white/95 dark:bg-slate-900/95 border-t-2 border-[#EEDCC5] dark:border-slate-800 px-2 flex items-center justify-around gap-1 shadow-[0_-8px_20px_-8px_rgba(140,85,35,0.2)]"
      >
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex-1 min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[#5472EB] dark:text-sky-400 font-extrabold text-[11px] whitespace-nowrap shrink-0"
        >
          <Home className="w-5 h-5" />
          <span>خانه</span>
        </button>

        <button
          type="button"
          onClick={onContinueMap}
          className="flex-1 min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-slate-600 dark:text-slate-300 hover:text-[#4BB543] font-bold text-[11px] whitespace-nowrap shrink-0"
        >
          <Map className="w-5 h-5" />
          <span>نقشه</span>
        </button>

        <button
          type="button"
          onClick={onOpenFreeAbacus}
          className="flex-1 min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-slate-700 dark:text-amber-300 hover:text-amber-600 font-extrabold text-[11px] whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-5 h-5 text-amber-500" />
          <span>چرتکه</span>
        </button>

        <button
          type="button"
          onClick={onOpenLeaderboard}
          className="flex-1 min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-slate-600 dark:text-slate-300 hover:text-amber-600 font-bold text-[11px] whitespace-nowrap shrink-0"
        >
          <Trophy className="w-5 h-5" />
          <span>قهرمانان</span>
        </button>

        <button
          type="button"
          onClick={onOpenShop}
          className="flex-1 min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-slate-600 dark:text-slate-300 hover:text-amber-600 font-bold text-[11px] whitespace-nowrap shrink-0"
        >
          <ShoppingBag className="w-5 h-5" />
          <span>فروشگاه</span>
        </button>
      </nav>
    </div>
  );
};
