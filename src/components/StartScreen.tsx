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
  Check,
  ChevronLeft,
  Zap,
} from 'lucide-react';
import type { ChildProfile, DigitDisplayMode } from '../types/app';
import { LESSONS } from '../data/lessons';
import { formatNumber } from '../lib/numbers';
import { AvatarGraphic } from './MascotDana';
import { KiaAvatar } from './KiaAvatar';
import { KidIconTile } from './KidIconTile';
import { AudioButton } from './AudioButton';
import { PWAInstallButton } from './PWAInstallButton';
import { BuyCoffeeButton } from './BuyCoffeeButton';
import { audioEngine } from '../lib/audioEngine';

interface StartScreenProps {
  activeProfile: ChildProfile;
  digitMode: DigitDisplayMode;
  reducedMotion: boolean;
  hasProgress: boolean;
  onStartFirstLesson: () => void;
  onContinueMap: () => void;
  onOpenPractice: () => void;
  onOpenGames: () => void;
  onOpenSimulator: () => void;
  onOpenProfiles: () => void;
  onOpenParents: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  activeProfile,
  digitMode,
  reducedMotion,
  hasProgress,
  onStartFirstLesson,
  onContinueMap,
  onOpenPractice,
  onOpenGames,
  onOpenSimulator,
  onOpenProfiles,
  onOpenParents,
}) => {
  const [kiaBubble, setKiaBubble] = useState<string>(
    `سلام ${activeProfile.name}! من کیا هستم، آماده‌ای با هم چرتکه بازی کنیم؟`
  );

  const completedLessons = LESSONS.filter(
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

  const quests = [
    {
      id: 'quest-map',
      title: 'جاده یادگیری چرتکه',
      subtitle: `${formatNumber(completedLessons, digitMode)} از ${formatNumber(
        LESSONS.length,
        digitMode
      )} مرحله کامل شده`,
      done: completedLessons > 0,
      color: 'green' as const,
      icon: <Map className="w-8 h-8" />,
      onClick: onContinueMap,
      ariaLabel: 'باز کردن جاده یادگیری مراحل',
    },
    {
      id: 'quest-games',
      title: 'بازی‌های شاد و امتیازی',
      subtitle: 'بشمار، بساز و ستاره‌های بیشتر بگیر',
      done: activeProfile.totalStars >= 3,
      color: 'pink' as const,
      icon: <Gamepad2 className="w-8 h-8" />,
      onClick: onOpenGames,
      ariaLabel: 'ورود به بازی‌های چرتکه',
    },
    {
      id: 'quest-practice',
      title: 'تمرین آزاد و هوشمند',
      subtitle: 'تقویت سرعت ذهن با چرتکه سه‌بعدی',
      done: activeProfile.totalCorrect >= 5,
      color: 'blue' as const,
      icon: <Sparkles className="w-8 h-8" />,
      onClick: onOpenPractice,
      ariaLabel: 'شروع تمرین آزاد چرتکه',
    },
    {
      id: 'quest-sim',
      title: 'آموزش انیمیشنی با کیا',
      subtitle: 'نمایش حرکت قدم‌به‌قدم مهره‌ها با فلش',
      done: false,
      color: 'sky' as const,
      icon: <PlayCircle className="w-8 h-8" />,
      onClick: onOpenSimulator,
      ariaLabel: 'شبیه‌ساز حرکت مهره‌های چرتکه',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F5E4CE] dark:bg-slate-950">
      {/* Top Sunny Peach Adventure Hero Banner (inspired by kids adventure UI) */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#F49A67] via-[#F7B684] to-[#FCE0BE] dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 pb-12">
        {/* Decorative background hills & clouds */}
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
        <header className="relative z-10 w-full max-w-4xl mx-auto px-4 pt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onOpenProfiles}
            aria-label={`انتخاب پروفایل کودک، پروفایل فعلی ${activeProfile.name}`}
            className="min-h-[46px] inline-flex items-center gap-2 rounded-2xl bg-white/95 dark:bg-slate-900 border-b-4 border-[#E5D3BE] dark:border-slate-800 px-3 py-1.5 shadow-sm hover:bg-white transition-all active:translate-y-0.5"
          >
            <AvatarGraphic avatar={activeProfile.avatar} className="w-8 h-8 shrink-0" />
            <div className="text-right leading-tight">
              <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                قهرمان
              </div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate max-w-[96px]">
                {activeProfile.name}
              </div>
            </div>
            <Users className="w-4 h-4 text-slate-400" />
          </button>

          <div className="flex items-center gap-2">
            <div className="min-h-[46px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#FFDC5E] dark:bg-amber-900/70 border-b-4 border-[#DFAD19] dark:border-amber-700 text-[#5C3A00] dark:text-amber-100 text-sm font-extrabold tabular-nums shadow-sm">
              <Star className="w-4 h-4 fill-[#F59E0B] text-[#B45309]" />
              <span>{formatNumber(activeProfile.totalStars, digitMode)}</span>
            </div>

            <button
              type="button"
              onClick={onOpenParents}
              aria-label="ورود به بخش والدین و تنظیمات"
              className="min-h-[46px] min-w-[46px] inline-flex items-center gap-1.5 rounded-2xl bg-white/95 dark:bg-slate-900 border-b-4 border-[#E5D3BE] dark:border-slate-800 px-3 py-2 text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100 shadow-sm hover:bg-white transition-all active:translate-y-0.5"
            >
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="hidden sm:inline">بخش والدین</span>
            </button>
          </div>
        </header>

        {/* Hero Kia Scene */}
        <section className="relative z-10 w-full max-w-4xl mx-auto px-4 pt-4 flex flex-col items-center text-center">
          <div className="mb-2 px-4 py-2 rounded-2xl bg-white/95 dark:bg-slate-900 border-2 border-white dark:border-slate-700 text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100 shadow-md max-w-xs">
            {kiaBubble}
          </div>

          <KiaAvatar
            mood="happy"
            interactive
            onTap={handleKiaTap}
            className="w-32 h-32 sm:w-40 sm:h-40"
            reducedMotion={reducedMotion}
          />

          <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold text-white drop-shadow-[0_2px_0_rgba(148,70,22,0.55)] tracking-tight">
            کودک نابغه
          </h1>
          <p className="mt-1 text-sm sm:text-base font-bold text-[#6A2E0B] dark:text-slate-200 max-w-sm">
            سفر شاد یادگیری چرتکه ژاپنی و محاسبات ذهنی با کیا
          </p>

          <div className="mt-3 flex items-center gap-2 flex-wrap justify-center">
            <AudioButton
              textToSpeak={`سلام ${activeProfile.name}! من کیا هستم. روی دکمه سبز شروع یادگیری بزن تا سفر چرتکه‌ای را شروع کنیم.`}
              label="صدای کیا"
              size="sm"
            />
            <PWAInstallButton />
          </div>
        </section>
      </div>

      {/* Main Content Area on Creamy Sand Canvas */}
      <main className="relative z-20 -mt-7 flex-1 w-full max-w-2xl mx-auto px-4 pb-8 space-y-5">
        {/* Reward & Primary Play Card (mirrors "Hooray, you earned a reward! + Claim >") */}
        <motion.section
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 shadow-[0_6px_0_rgba(213,182,143,0.45)] p-3.5 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <KidIconTile color="amber" size="lg">
              <Zap className="w-7 h-7 fill-white" />
            </KidIconTile>

            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                {hasProgress
                  ? `آفرین ${activeProfile.name}! به سفر چرتکه ادامه بده`
                  : 'سفر ماجراجویی چرتکه را شروع کن!'}
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
            onClick={onStartFirstLesson}
            aria-label="شروع یادگیری درس چرتکه"
            className="min-h-[54px] px-5 rounded-2xl bg-[#4BB543] hover:bg-[#41A23A] border-b-4 border-[#2E8228] active:border-b-0 active:translate-y-1 text-white font-extrabold text-base flex items-center justify-center gap-2 shrink-0 transition-all shadow-sm"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>شروع یادگیری</span>
          </button>
        </motion.section>

        {/* Daily Quests / Adventure Missions with Dotted Track & Big Colorful Icons */}
        <section aria-label="ماموریت‌های شاد امروز" className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base sm:text-lg font-extrabold text-[#5B3A1D] dark:text-white">
              ماموریت‌های شاد امروز
            </h2>
            <span className="text-xs font-bold text-[#8B623D] dark:text-slate-400">
              یک گزینه را انتخاب کن
            </span>
          </div>

          <div className="relative space-y-3">
            {/* Vertical dashed quest line along the start edge */}
            <div
              aria-hidden="true"
              className="hidden xs:block absolute top-7 bottom-7 right-[17px] border-r-2 border-dashed border-[#D3B694] dark:border-slate-700"
            />

            {quests.map((q) => (
              <div key={q.id} className="flex items-center gap-2.5 sm:gap-3">
                {/* Quest Timeline Node */}
                <div
                  aria-hidden="true"
                  className={`hidden xs:flex relative z-10 w-9 h-9 rounded-full items-center justify-center shrink-0 border-2 shadow-xs ${
                    q.done
                      ? 'bg-[#46B849] border-white text-white'
                      : 'bg-white dark:bg-slate-800 border-[#D8BE9F] dark:border-slate-600'
                  }`}
                >
                  {q.done && <Check className="w-5 h-5 stroke-[3]" />}
                </div>

                {/* Big Colorful Quest Card */}
                <button
                  type="button"
                  onClick={q.onClick}
                  aria-label={q.ariaLabel}
                  className="flex-1 min-w-0 rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 border-b-4 border-b-[#DFC6A8] hover:border-blue-400 dark:hover:border-blue-500 p-3 sm:p-3.5 flex items-center justify-between gap-3 text-right shadow-xs active:translate-y-0.5 transition-all"
                >
                  <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                    <KidIconTile color={q.color} size="lg">
                      {q.icon}
                    </KidIconTile>

                    <div className="min-w-0">
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                        {q.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                        {q.subtitle}
                      </p>
                    </div>
                  </div>

                  <span className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0">
                    <ChevronLeft className="w-5 h-5" />
                  </span>
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Warm Support CTA */}
        <BuyCoffeeButton
          variant="compact"
          reducedMotion={reducedMotion}
          className="pt-1"
        />
      </main>
    </div>
  );
};
