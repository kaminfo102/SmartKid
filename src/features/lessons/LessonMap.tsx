import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Gamepad2,
  Target,
  Star,
  PlayCircle,
  Lock,
  Check,
  Zap,
  RefreshCw,
} from 'lucide-react';
import type { ChildProfile, DigitDisplayMode, LessonDefinition } from '../../types/app';
import { formatNumber } from '../../lib/numbers';
import { LessonCard, renderLessonIcon } from './LessonCard';
import { KiaAvatar } from '../../components/KiaAvatar';
import { KidIconTile, MeadowDecorFlower } from '../../components/KidIconTile';
import { BuyCoffeeButton } from '../../components/BuyCoffeeButton';

interface LessonMapProps {
  lessons: LessonDefinition[];
  profile: ChildProfile;
  digitMode: DigitDisplayMode;
  reducedMotion?: boolean;
  dailyChallengeCount?: number;
  wpConnected?: boolean;
  isRefreshing?: boolean;
  onRefreshCurriculum?: () => void;
  onSelectLesson: (lesson: LessonDefinition) => void;
  onOpenPractice: () => void;
  onOpenGames: () => void;
  onOpenSimulator: () => void;
  onBack: () => void;
}

const PIN_COLORS: Record<
  LessonDefinition['iconName'],
  { bg: string; border: string; iconBg: string }
> = {
  sparkles: {
    bg: 'bg-[#EE5D48]',
    border: 'border-white',
    iconBg: 'bg-[#4ABAF5]',
  },
  layers: {
    bg: 'bg-[#F59E0B]',
    border: 'border-white',
    iconBg: 'bg-[#46B849]',
  },
  plus: {
    bg: 'bg-[#5472EB]',
    border: 'border-white',
    iconBg: 'bg-[#5472EB]',
  },
  minus: {
    bg: 'bg-[#EC5E95]',
    border: 'border-white',
    iconBg: 'bg-[#F6A623]',
  },
  puzzle: {
    bg: 'bg-[#8E63EB]',
    border: 'border-white',
    iconBg: 'bg-[#8E63EB]',
  },
  brain: {
    bg: 'bg-[#E11D48]',
    border: 'border-white',
    iconBg: 'bg-[#EC5E95]',
  },
};

function buildDynamicRoadPath(count: number): { path: string; height: number } {
  const safeCount = Math.max(2, count);
  const segH = 160;
  const totalH = safeCount * segH;
  const rightX = 285;
  const leftX = 115;

  let d = `M ${rightX} 20`;
  for (let i = 0; i < safeCount - 1; i++) {
    const startX = i % 2 === 0 ? rightX : leftX;
    const endX = (i + 1) % 2 === 0 ? rightX : leftX;
    const startY = 20 + i * segH;
    const endY = startY + segH;
    const midY1 = startY + segH * 0.55;
    const midY2 = startY + segH * 0.45;
    d += ` C ${startX} ${midY1}, ${endX} ${midY2}, ${endX} ${endY}`;
  }
  const lastY = 20 + (safeCount - 1) * segH;
  d += ` L ${((safeCount - 1) % 2 === 0 ? rightX : leftX)} ${lastY + 90}`;

  return { path: d, height: totalH };
}

export const LessonMap: React.FC<LessonMapProps> = ({
  lessons,
  profile,
  digitMode,
  reducedMotion = false,
  dailyChallengeCount = 5,
  wpConnected = false,
  isRefreshing = false,
  onRefreshCurriculum,
  onSelectLesson,
  onOpenPractice,
  onOpenGames,
  onOpenSimulator,
  onBack,
}) => {
  const completedCount = lessons.filter(
    (l) => profile.lessons[l.id]?.completed
  ).length;
  const progressPct =
    lessons.length > 0
      ? Math.max(10, Math.round((completedCount / lessons.length) * 100))
      : 0;

  const nextActiveLessonId =
    lessons.find((l) => {
      const req = l.unlockRequirement;
      const unlocked = !req || Boolean(profile.lessons[req]?.completed);
      return unlocked && !profile.lessons[l.id]?.completed;
    })?.id ?? lessons[0]?.id;

  const roadGeometry = useMemo(
    () => buildDynamicRoadPath(lessons.length),
    [lessons.length]
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#66B22D] dark:bg-slate-950">
      {/* Sunny Sky Header with Sprout, Clouds & Glossy Grass Progress Bar */}
      <header className="relative overflow-hidden bg-gradient-to-b from-[#9AD9FA] via-[#C3EBFE] to-[#E4F7FF] dark:from-slate-900 dark:to-slate-950 px-4 pt-3 pb-7">
        {/* Fluffy clouds */}
        <svg
          aria-hidden="true"
          viewBox="0 0 600 120"
          className="pointer-events-none absolute inset-x-0 bottom-0 w-full h-24 opacity-80 dark:opacity-15"
          preserveAspectRatio="none"
        >
          <circle cx="90" cy="62" r="28" fill="#FFFFFF" />
          <circle cx="122" cy="54" r="34" fill="#FFFFFF" />
          <circle cx="156" cy="64" r="24" fill="#FFFFFF" />
          <circle cx="480" cy="52" r="26" fill="#FFFFFF" />
          <circle cx="512" cy="44" r="32" fill="#FFFFFF" />
          <circle cx="545" cy="56" r="22" fill="#FFFFFF" />
          {/* Curved Meadow Horizon */}
          <path
            d="M0 95 Q 150 65 300 85 T 600 82 L 600 120 L 0 120 Z"
            fill="#92D254"
          />
        </svg>

        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onBack}
              aria-label="بازگشت به خانه"
              className="min-h-[44px] min-w-[44px] rounded-2xl bg-white/90 hover:bg-white dark:bg-slate-800 border-b-4 border-sky-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-xs"
            >
              <ArrowRight className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center">
              <MeadowDecorFlower variant="sprout" className="w-9 h-9 -mb-1" />
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                جاده یادگیری چرتکه
              </h1>
            </div>

            <div className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#FFDC5E] dark:bg-amber-900/70 border-b-4 border-[#DFAD19] dark:border-amber-700 text-[#5C3A00] dark:text-amber-100 font-extrabold text-sm tabular-nums shadow-xs">
              <Star className="w-4 h-4 fill-[#F59E0B] text-[#B45309]" />
              <span>{formatNumber(profile.totalStars, digitMode)}</span>
            </div>
          </div>

          {/* Glossy Green Progress Bar */}
          <div className="mt-3 max-w-sm mx-auto">
            <div className="h-6 rounded-2xl bg-white/90 dark:bg-slate-800 p-1 border-2 border-white dark:border-slate-700 shadow-sm flex items-center">
              <div
                className="h-full rounded-xl bg-gradient-to-l from-[#7AE043] to-[#46B849] transition-all flex items-center justify-end px-2"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-center text-xs font-extrabold text-emerald-950 dark:text-emerald-200 mt-1 flex items-center justify-center gap-2 flex-wrap">
              <span>
                {formatNumber(completedCount, digitMode)} از{' '}
                {formatNumber(lessons.length, digitMode)} مرحله با موفقیت طی شده!
              </span>
              {wpConnected && onRefreshCurriculum && (
                <button
                  type="button"
                  onClick={onRefreshCurriculum}
                  aria-label="به‌روزرسانی مراحل از وردپرس"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/80 hover:bg-white text-emerald-900 text-[11px] font-extrabold border border-emerald-300"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>همگام‌سازی جاده</span>
                </button>
              )}
            </p>
          </div>
        </div>
      </header>

      {/* Rolling Meadow with Dynamic Winding Sandy-Gold Road & Teardrop Stage Pins */}
      <main className="relative flex-1 w-full bg-gradient-to-b from-[#92D254] via-[#78C23B] to-[#62AD2A] dark:from-emerald-950 dark:to-slate-950 pt-4 pb-10">
        <div className="relative max-w-xl mx-auto px-3 sm:px-5">
          {/* Dynamic Winding Sandy-Gold S-Curve SVG Road behind any number of stages */}
          <svg
            aria-hidden="true"
            viewBox={`0 0 400 ${roadGeometry.height}`}
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 w-full h-full opacity-95 dark:opacity-35"
          >
            <path
              d={roadGeometry.path}
              fill="none"
              stroke="#539821"
              strokeWidth="84"
              strokeLinecap="round"
            />
            <path
              d={roadGeometry.path}
              fill="none"
              stroke="#D89B3C"
              strokeWidth="68"
              strokeLinecap="round"
            />
            <path
              d={roadGeometry.path}
              fill="none"
              stroke="#F8D892"
              strokeWidth="56"
              strokeLinecap="round"
            />
            <path
              d={roadGeometry.path}
              fill="none"
              stroke="#FFF7E2"
              strokeWidth="4"
              strokeDasharray="14 14"
              strokeLinecap="round"
            />
          </svg>

          {/* Decorative Meadow Flowers */}
          <MeadowDecorFlower
            variant="sunflower"
            className="pointer-events-none absolute top-14 left-3 w-12 h-12 sm:w-14 sm:h-14"
          />
          <MeadowDecorFlower
            variant="daisy"
            className="pointer-events-none absolute top-[28%] right-2 w-11 h-11 sm:w-12 sm:h-12"
          />
          <MeadowDecorFlower
            variant="tulip"
            className="pointer-events-none absolute top-[54%] left-2 w-11 h-11 sm:w-13 sm:h-13"
          />
          <MeadowDecorFlower
            variant="sunflower"
            className="pointer-events-none absolute top-[78%] right-3 w-12 h-12 sm:w-14 sm:h-14"
          />

          {/* Dynamic Road Stage Stations */}
          <div className="relative z-10 space-y-6">
            {lessons.map((lesson, idx) => {
              const req = lesson.unlockRequirement;
              const unlocked = !req || Boolean(profile.lessons[req]?.completed);
              const progress = profile.lessons[lesson.id];
              const isCompleted = Boolean(progress?.completed);
              const isActive = lesson.id === nextActiveLessonId;
              const alignOpposite = idx % 2 === 1;
              const pinTheme = PIN_COLORS[lesson.iconName] ?? PIN_COLORS.sparkles;

              return (
                <div
                  key={lesson.id}
                  className={`flex items-center gap-2.5 sm:gap-3.5 ${
                    alignOpposite ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {/* Teardrop Map Pin on the Road */}
                  <div className="relative shrink-0 flex flex-col items-center">
                    {isActive && (
                      <motion.div
                        animate={
                          reducedMotion
                            ? undefined
                            : { y: [0, -6, 0] }
                        }
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                        className="mb-1"
                      >
                        <KiaAvatar
                          mood="happy"
                          className="w-12 h-12 sm:w-14 sm:h-14"
                          reducedMotion={reducedMotion}
                          showEmblem={false}
                        />
                      </motion.div>
                    )}

                    <button
                      type="button"
                      onClick={() => unlocked && onSelectLesson(lesson)}
                      disabled={!unlocked}
                      aria-label={`نقشه مرحله ${formatNumber(
                        lesson.stageNumber,
                        digitMode
                      )}`}
                      className={`relative w-16 h-16 sm:w-[72px] sm:h-[72px] flex items-center justify-center transition-transform ${
                        unlocked ? 'hover:scale-105 active:scale-95' : 'opacity-80 cursor-not-allowed'
                      }`}
                    >
                      {/* Teardrop pin shape */}
                      <span
                        className={`absolute inset-1 rounded-t-full rounded-bl-full -rotate-45 border-[3px] border-white shadow-lg ${
                          unlocked
                            ? pinTheme.bg
                            : 'bg-slate-400 dark:bg-slate-700'
                        }`}
                      />
                      {/* Inner colorful circular emblem */}
                      <span
                        className={`relative z-10 -mt-1 w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-white shadow-inner ${
                          unlocked
                            ? pinTheme.iconBg
                            : 'bg-slate-500 dark:bg-slate-600'
                        }`}
                      >
                        {unlocked ? (
                          renderLessonIcon(lesson.iconName, 'w-5 h-5 sm:w-6 sm:h-6')
                        ) : (
                          <Lock className="w-5 h-5" />
                        )}
                      </span>

                      {isCompleted && (
                        <span className="absolute -top-1 -right-1 z-20 w-6 h-6 rounded-full bg-[#46B849] border-2 border-white text-white flex items-center justify-center shadow">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Stage Card alongside the pin */}
                  <div className="flex-1 min-w-0">
                    <LessonCard
                      lesson={lesson}
                      progress={progress}
                      unlocked={unlocked}
                      isCurrentNext={isActive}
                      digitMode={digitMode}
                      onStart={() => onSelectLesson(lesson)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Bottom White Sheet: "چالش روزانه" (Daily Challenge) & Quick Colorful Tiles */}
      <section
        aria-label="چالش روزانه و فعالیت‌های سریع"
        className="relative z-20 -mt-4 rounded-t-[2rem] bg-white dark:bg-slate-900 border-t-4 border-white/80 dark:border-slate-800 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] px-4 pt-5 pb-6"
      >
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500 fill-amber-400" />
              <span>چالش روزانه</span>
            </h2>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-xl">
              {formatNumber(dailyChallengeCount, digitMode)} سؤال شاد
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenPractice}
            className="w-full rounded-2xl bg-[#FFF6EB] dark:bg-slate-800 border-2 border-[#EFE0CE] dark:border-slate-700 p-3 flex items-center justify-between gap-3 text-right hover:border-amber-400 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <KidIconTile color="amber" size="md">
                <Target className="w-6 h-6" />
              </KidIconTile>
              <div className="min-w-0">
                <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                  چالش سرعت و دقت امروز با چرتکه
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  امتیاز و ستاره بیشتر بگیر!
                </div>
              </div>
            </div>
            <span className="px-3.5 py-2 rounded-xl bg-[#46B849] border-b-4 border-[#2E8228] text-white font-extrabold text-xs shrink-0">
              شروع
            </span>
          </button>

          {/* 3 Big Colorful Quick-Launch Tiles */}
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={onOpenPractice}
              className="rounded-2xl bg-sky-50 hover:bg-sky-100 dark:bg-slate-800 border-2 border-sky-200 dark:border-slate-700 p-3 flex flex-col items-center gap-2 transition-colors"
            >
              <KidIconTile color="blue" size="md">
                <Target className="w-6 h-6" />
              </KidIconTile>
              <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                تمرین آزاد
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenSimulator}
              className="rounded-2xl bg-violet-50 hover:bg-violet-100 dark:bg-slate-800 border-2 border-violet-200 dark:border-slate-700 p-3 flex flex-col items-center gap-2 transition-colors"
            >
              <KidIconTile color="violet" size="md">
                <PlayCircle className="w-6 h-6" />
              </KidIconTile>
              <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                شبیه‌ساز
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenGames}
              className="rounded-2xl bg-pink-50 hover:bg-pink-100 dark:bg-slate-800 border-2 border-pink-200 dark:border-slate-700 p-3 flex flex-col items-center gap-2 transition-colors"
            >
              <KidIconTile color="pink" size="md">
                <Gamepad2 className="w-6 h-6" />
              </KidIconTile>
              <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                بازی‌ها
              </span>
            </button>
          </div>

          <BuyCoffeeButton variant="compact" reducedMotion={reducedMotion} />
        </div>
      </section>
    </div>
  );
};
