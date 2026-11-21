import React from 'react';
import { ArrowRight, Gamepad2, Target, Star, PlayCircle } from 'lucide-react';
import type { ChildProfile, DigitDisplayMode, LessonDefinition } from '../../types/app';
import { LESSONS } from '../../data/lessons';
import { formatNumber } from '../../lib/numbers';
import { LessonCard } from './LessonCard';
import { KiaMascot } from '../../components/KiaMascot';
import { BuyCoffeeButton } from '../../components/BuyCoffeeButton';

interface LessonMapProps {
  profile: ChildProfile;
  digitMode: DigitDisplayMode;
  reducedMotion?: boolean;
  onSelectLesson: (lesson: LessonDefinition) => void;
  onOpenPractice: () => void;
  onOpenGames: () => void;
  onOpenSimulator: () => void;
  onBack: () => void;
}

export const LessonMap: React.FC<LessonMapProps> = ({
  profile,
  digitMode,
  reducedMotion = false,
  onSelectLesson,
  onOpenPractice,
  onOpenGames,
  onOpenSimulator,
  onBack,
}) => {
  const completedCount = LESSONS.filter((l) => profile.lessons[l.id]?.completed).length;

  return (
    <div className="min-h-screen bg-[#F7F9FC] dark:bg-slate-950 flex flex-col">
      <header className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 px-4 h-14 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          aria-label="بازگشت به خانه"
          className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200"
        >
          <ArrowRight className="w-5 h-5" />
        </button>

        <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
          نقشه یادگیری
        </h1>

        <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 font-extrabold text-sm tabular-nums">
          <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
          <span>{formatNumber(profile.totalStars, digitMode)}</span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto p-4 space-y-4 pb-24">
        {/* Progress summary with Kia */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <KiaMascot
              mood="happy"
              className="w-12 h-12 shrink-0"
              reducedMotion={reducedMotion}
            />
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                مسیر پیشرفت {profile.name}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {formatNumber(completedCount, digitMode)} از {formatNumber(LESSONS.length, digitMode)} مرحله کامل شده
              </div>
            </div>
          </div>
          <div className="w-24 sm:w-28 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${(completedCount / LESSONS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Visual Stepped Path */}
        <div className="space-y-3">
          {LESSONS.map((lesson) => {
            const req = lesson.unlockRequirement;
            const unlocked = !req || Boolean(profile.lessons[req]?.completed);
            return (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                progress={profile.lessons[lesson.id]}
                unlocked={unlocked}
                digitMode={digitMode}
                onStart={() => onSelectLesson(lesson)}
              />
            );
          })}
        </div>

        <BuyCoffeeButton variant="card" reducedMotion={reducedMotion} />
      </main>

      {/* Bottom Thumb Action Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 px-3 py-2 pb-safe">
        <div className="max-w-2xl mx-auto grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={onOpenPractice}
            className="min-h-[48px] rounded-xl bg-sky-100 hover:bg-sky-200 dark:bg-sky-900/50 text-sky-950 dark:text-sky-100 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5"
          >
            <Target className="w-4 h-4 shrink-0" />
            <span>تمرین</span>
          </button>
          <button
            type="button"
            onClick={onOpenSimulator}
            className="min-h-[48px] rounded-xl bg-violet-100 hover:bg-violet-200 dark:bg-violet-900/50 text-violet-950 dark:text-violet-100 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5"
          >
            <PlayCircle className="w-4 h-4 shrink-0" />
            <span>شبیه‌ساز</span>
          </button>
          <button
            type="button"
            onClick={onOpenGames}
            className="min-h-[48px] rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/50 text-amber-950 dark:text-amber-100 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5"
          >
            <Gamepad2 className="w-4 h-4 shrink-0" />
            <span>بازی‌ها</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
