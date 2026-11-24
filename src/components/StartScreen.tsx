import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Play,
  Map,
  Gamepad2,
  ShieldCheck,
  Users,
  Star,
  Sparkles,
  PlayCircle,
  ShoppingBag,
  Award,
  Sun,
  Moon,
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
  banners?: PromotionalBanner[];
  wpUrl?: string;
  onNavigateScreen?: (screen: ScreenId) => void;
  onContinueMap: () => void;
  onOpenPractice: () => void;
  onOpenGames: () => void;
  onOpenSimulator: () => void;
  onOpenFreeAbacus: () => void;
  onOpenShop: () => void;
  onOpenTickets?: () => void;
  onOpenProfiles: () => void;
  onOpenProfileDetails: () => void;
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
  banners = [],
  wpUrl = '',
  onNavigateScreen,
  onContinueMap,
  onOpenPractice,
  onOpenGames,
  onOpenSimulator,
  onOpenFreeAbacus,
  onOpenShop,
  onOpenProfiles,
  onOpenProfileDetails,
  onClaimDailyBonus,
  onToggleNightMode,
  onOpenParentsHub,
}) => {
  const [kiaBubble, setKiaBubble] = useState<string>(
    `سلام ${activeProfile.name}! من کیا هستم، بزن بریم چرتکه بازی!`
  );

  const completedLessons = lessons.filter(
    (l) => activeProfile.lessons[l.id]?.completed
  ).length;
  const maxStarsGoal = Math.max(10, Math.ceil((activeProfile.totalStars + 5) / 10) * 10);
  const rewardPct = Math.min(
    100,
    Math.max(12, Math.round((activeProfile.totalStars / maxStarsGoal) * 100))
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
      icon: <Map className="w-8 h-8" />,
      onClick: onContinueMap,
      ariaLabel: 'باز کردن نقشه ماجراجویی ترم‌ها',
    },
    {
      id: 'act-games',
      title: 'بازی‌های شاد',
      subtitle: 'بشمار و ستاره بگیر',
      color: 'pink' as const,
      icon: <Gamepad2 className="w-8 h-8" />,
      onClick: onOpenGames,
      ariaLabel: 'ورود به بازی‌های چرتکه',
    },
    {
      id: 'act-practice',
      title: 'تمرین چرتکه',
      subtitle: 'تقویت سرعت ذهن',
      color: 'blue' as const,
      icon: <Sparkles className="w-8 h-8" />,
      onClick: onOpenPractice,
      ariaLabel: 'شروع تمرین آزاد چرتکه',
    },
    {
      id: 'act-sim',
      title: 'آموزش تصویری',
      subtitle: 'نمایش حرکت مهره‌ها',
      color: 'sky' as const,
      icon: <PlayCircle className="w-8 h-8" />,
      onClick: onOpenSimulator,
      ariaLabel: 'شبیه‌ساز حرکت مهره‌های چرتکه',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F5E4CE] dark:bg-slate-950">
      {/* Clean Sunny Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#F49A67] via-[#F7B684] to-[#FCE0BE] dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 pb-11">
        <svg
          aria-hidden="true"
          viewBox="0 0 800 200"
          preserveAspectRatio="none"
          className="pointer-events-none absolute bottom-0 left-0 right-0 w-full h-20 opacity-40 dark:opacity-15"
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

        {/* Simple Top Navigation Bar */}
        <header className="relative z-10 w-full max-w-3xl mx-auto px-4 pt-3 flex items-center justify-between gap-2">
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
            <span className="text-sm font-extrabold text-slate-900 dark:text-white truncate max-w-[96px]">
              {activeProfile.name}
            </span>
            <Users className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <div className="min-h-[46px] inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#FFDC5E] dark:bg-amber-900/70 border-b-4 border-[#DFAD19] dark:border-amber-700 text-[#5C3A00] dark:text-amber-100 text-sm font-extrabold tabular-nums shadow-sm whitespace-nowrap shrink-0">
              <Star className="w-4 h-4 fill-[#F59E0B] text-[#B45309]" />
              <span>{formatNumber(activeProfile.totalStars, digitMode)}</span>
            </div>

            <button
              type="button"
              onClick={onToggleNightMode}
              aria-label={nightMode ? 'تغییر به حالت روشن' : 'تغییر به حالت تاریک'}
              title={nightMode ? 'حالت روشن' : 'حالت تاریک'}
              className="min-h-[46px] min-w-[46px] inline-flex items-center justify-center rounded-2xl bg-white/95 dark:bg-slate-900 border-b-4 border-[#E5D3BE] dark:border-slate-800 text-slate-800 dark:text-amber-300 shadow-sm hover:bg-white transition-all active:translate-y-0.5 shrink-0"
            >
              {nightMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              type="button"
              onClick={onOpenParentsHub}
              aria-label="ورود به بخش والدین و حساب کاربری"
              className="min-h-[46px] min-w-[46px] inline-flex items-center gap-1.5 rounded-2xl bg-white/95 dark:bg-slate-900 border-b-4 border-[#E5D3BE] dark:border-slate-800 px-3 py-2 text-xs font-extrabold text-slate-800 dark:text-slate-100 shadow-sm hover:bg-white transition-all active:translate-y-0.5 whitespace-nowrap shrink-0"
            >
              <ShieldCheck
                className={`w-4 h-4 shrink-0 ${
                  wpUser ? 'text-[#4BB543]' : 'text-[#5472EB] dark:text-blue-400'
                }`}
              />
              <span className="hidden sm:inline whitespace-nowrap">
                {wpUser ? `والدین · ${wpUser.displayName}` : 'والدین و حساب'}
              </span>
            </button>
          </div>
        </header>

        {/* Friendly Minimal Kia Hero */}
        <section className="relative z-10 w-full max-w-3xl mx-auto px-4 pt-3 flex flex-col items-center text-center">
          <div className="mb-1.5 px-4 py-1.5 rounded-2xl bg-white/95 dark:bg-slate-900 border-2 border-white dark:border-slate-700 text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100 shadow-sm max-w-xs">
            {kiaBubble}
          </div>

          <KiaAvatar
            mood="happy"
            interactive
            onTap={handleKiaTap}
            className="w-28 h-28 sm:w-32 sm:h-32"
            reducedMotion={reducedMotion}
          />

          <h1 className="mt-0.5 text-3xl sm:text-4xl font-extrabold text-white drop-shadow-[0_2px_0_rgba(148,70,22,0.55)] tracking-tight">
            کودک نابغه
          </h1>

          <div className="mt-2.5">
            <AudioButton
              textToSpeak={`سلام ${activeProfile.name}! من کیا هستم. روی دکمه سبز شروع یادگیری بزن تا چرتکه بازی کنیم.`}
              label="صدای کیا"
              size="sm"
            />
          </div>
        </section>
      </div>

      {/* Spacious Child-Friendly Home Canvas */}
      <main className="relative z-20 -mt-7 flex-1 w-full max-w-2xl mx-auto px-4 pb-8 space-y-4">
        {/* Primary Adventure Start Card */}
        <motion.section
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 shadow-[0_12px_28px_-8px_rgba(180,115,45,0.22)] p-3.5 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <AbacusAdventureIllustration className="w-14 h-14 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                {hasProgress
                  ? `آفرین ${activeProfile.name}! به سفرت ادامه بده`
                  : 'ماجراجویی چرتکه را شروع کن!'}
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
            className="min-h-[54px] px-6 rounded-2xl bg-[#4BB543] hover:bg-[#41A23A] border-b-4 border-[#2E8228] active:border-b-0 active:translate-y-1 text-white font-extrabold text-base flex items-center justify-center gap-2 shrink-0 transition-all shadow-sm"
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

        {/* Big 2x2 Kid-Friendly Activity Tiles + Dedicated Soroban Tile */}
        <section aria-label="فعالیت‌های یادگیری و بازی" className="grid grid-cols-2 gap-3">
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

          <button
            type="button"
            onClick={onOpenFreeAbacus}
            aria-label="باز کردن چرتکه تمام‌صفحه سه بعدی"
            className="col-span-2 rounded-3xl bg-gradient-to-l from-[#1C2522] to-[#2B3934] border-2 border-[#D9B54C]/60 border-b-4 border-b-[#101614] hover:border-[#F0CE6B] p-4 flex items-center justify-between gap-3 text-right shadow-[0_10px_22px_-8px_rgba(20,28,25,0.45)] active:translate-y-0.5 transition-all"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-16 h-14 rounded-2xl bg-[#111514] border border-[#D9B54C]/60 flex items-center justify-center shrink-0 shadow-inner">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 64 40"
                  className="w-12 h-8"
                >
                  <rect x="3" y="4" width="58" height="32" rx="3" fill="#181A1F" stroke="#D9B54C" strokeWidth="2.4" />
                  <line x1="5" y1="15" x2="59" y2="15" stroke="#47505A" strokeWidth="2.4" />
                  <line x1="15" y1="6" x2="15" y2="34" stroke="#30363E" strokeWidth="1.5" />
                  <line x1="26" y1="6" x2="26" y2="34" stroke="#30363E" strokeWidth="1.5" />
                  <line x1="38" y1="6" x2="38" y2="34" stroke="#30363E" strokeWidth="1.5" />
                  <line x1="49" y1="6" x2="49" y2="34" stroke="#30363E" strokeWidth="1.5" />
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
                  چرتکه حرفه‌ای تمام‌صفحه با حرکت افقی و لمس مهره‌ها
                </div>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-[#D9B54C] text-[#1A160B] font-extrabold text-xs shrink-0">
              باز کردن
            </span>
          </button>
        </section>

        {/* Compact Daily Gift Bar */}
        <DailyBonusCard
          profile={activeProfile}
          digitMode={digitMode}
          compact
          onClaimBonus={onClaimDailyBonus}
          onOpenShop={onOpenShop}
        />

        {/* Clean 2-Item Secondary Shortcuts: Badges & Rewards Store */}
        <section className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onOpenProfileDetails}
            className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 border-b-4 border-b-[#DFC6A8] hover:border-blue-400 p-3 flex items-center gap-2.5 text-right shadow-xs active:translate-y-0.5 transition-all"
          >
            <KidIconTile color="violet" size="md">
              <Award className="w-5 h-5" />
            </KidIconTile>
            <div className="min-w-0">
              <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                کارنامه و مدال‌ها
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {formatNumber(activeProfile.badges.length, digitMode)} مدال
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenShop}
            className="rounded-2xl bg-gradient-to-l from-[#FFDC5E] to-[#FFE88F] dark:from-amber-900/50 dark:to-slate-900 border-2 border-white dark:border-amber-700 border-b-4 border-b-[#DFAD19] p-3 flex items-center gap-2.5 text-right shadow-xs active:translate-y-0.5 transition-all"
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
    </div>
  );
};
