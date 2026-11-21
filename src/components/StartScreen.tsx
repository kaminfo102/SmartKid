import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Play,
  Map,
  Gamepad2,
  ShieldCheck,
  Users,
  Star,
  Target,
  PlayCircle,
} from 'lucide-react';
import type { ChildProfile, DigitDisplayMode } from '../types/app';
import { formatNumber } from '../lib/numbers';
import { AvatarGraphic } from './MascotDana';
import { KiaMascot } from './KiaMascot';
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

  const handleKiaTap = () => {
    const cheers = [
      'جیک جیک! تو خیلی باهوشی!',
      'بیا با مهره‌ها بازی کنیم!',
      'روی شروع یادگیری بزن قهرمان!',
    ];
    const msg = cheers[Math.floor(Math.random() * cheers.length)];
    setKiaBubble(msg);
    audioEngine.speakPersian(msg);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9FC] dark:bg-slate-950">
      {/* Compact Top Bar */}
      <header className="w-full max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onOpenProfiles}
          aria-label={`انتخاب پروفایل کودک، پروفایل فعلی ${activeProfile.name}`}
          className="min-h-[44px] inline-flex items-center gap-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <AvatarGraphic avatar={activeProfile.avatar} className="w-8 h-8 shrink-0" />
          <div className="text-right leading-tight">
            <div className="text-xs text-slate-500 dark:text-slate-400">قهرمان</div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate max-w-[96px]">
              {activeProfile.name}
            </div>
          </div>
          <Users className="w-4 h-4 text-slate-400" />
        </button>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm font-extrabold tabular-nums">
            <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
            <span>{formatNumber(activeProfile.totalStars, digitMode)}</span>
          </div>

          <button
            type="button"
            onClick={onOpenParents}
            aria-label="ورود به بخش والدین و تنظیمات"
            className="min-h-[44px] min-w-[44px] inline-flex items-center gap-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">بخش والدین</span>
          </button>
        </div>
      </header>

      {/* Main Hero Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 pb-6 flex flex-col lg:grid lg:grid-cols-12 lg:items-center lg:gap-10 justify-center">
        {/* Interactive Kia Bird Mascot + Title */}
        <section className="lg:col-span-6 flex flex-col items-center text-center py-3">
          <div className="mb-2 px-4 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800 text-xs sm:text-sm font-bold text-sky-900 dark:text-sky-100 shadow-xs max-w-xs">
            {kiaBubble}
          </div>

          <div className="relative flex items-center justify-center">
            <KiaMascot
              mood="happy"
              interactive
              onTap={handleKiaTap}
              className="w-32 h-32 sm:w-40 sm:h-40"
              reducedMotion={reducedMotion}
            />
          </div>

          <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            کودک نابغه
          </h1>
          <p className="mt-1.5 text-sm sm:text-base font-medium text-slate-600 dark:text-slate-300 max-w-sm">
            آموزش شاد چرتکه ژاپنی و محاسبات ذهنی همراه با کیا پرنده
          </p>

          <div className="mt-3.5 flex items-center gap-2 flex-wrap justify-center">
            <AudioButton
              textToSpeak={`سلام ${activeProfile.name}! من کیا هستم. روی دکمه شروع یادگیری بزن تا با چرتکه سه‌بعدی بازی کنیم.`}
              label="صدای کیا"
              size="sm"
            />
            <PWAInstallButton />
          </div>
        </section>

        {/* Primary Action Buttons */}
        <motion.section
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="lg:col-span-6 w-full max-w-md mx-auto space-y-3 mt-2 lg:mt-0"
        >
          <button
            type="button"
            onClick={onStartFirstLesson}
            aria-label="شروع یادگیری درس چرتکه"
            className="w-full min-h-[60px] rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-extrabold text-lg shadow-md shadow-blue-600/20 flex items-center justify-center gap-3 transition-all"
          >
            <Play className="w-6 h-6 fill-white" />
            <span>شروع یادگیری</span>
          </button>

          <button
            type="button"
            onClick={onContinueMap}
            aria-label="ادامه آموزش و نقشه مراحل"
            className="w-full min-h-[54px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-bold text-base flex items-center justify-center gap-3 shadow-xs transition-colors"
          >
            <Map className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>{hasProgress ? 'ادامه آموزش (نقشه مراحل)' : 'نقشه مراحل آموزش'}</span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onOpenGames}
              aria-label="بازی‌های چرتکه"
              className="min-h-[54px] rounded-2xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 text-amber-950 dark:text-amber-100 font-bold text-base flex items-center justify-center gap-2 transition-colors"
            >
              <Gamepad2 className="w-5 h-5" />
              <span>بازی‌ها</span>
            </button>

            <button
              type="button"
              onClick={onOpenPractice}
              aria-label="تمرین هوشمند چرتکه"
              className="min-h-[54px] rounded-2xl bg-sky-100 hover:bg-sky-200 dark:bg-sky-900/40 dark:hover:bg-sky-900/60 text-sky-950 dark:text-sky-100 font-bold text-base flex items-center justify-center gap-2 transition-colors"
            >
              <Target className="w-5 h-5" />
              <span>تمرین آزاد</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenSimulator}
            aria-label="شبیه‌ساز انیمیشنی حل گام‌به‌گام مسائل چرتکه"
            className="w-full min-h-[52px] rounded-2xl bg-violet-100 hover:bg-violet-200 dark:bg-violet-900/40 dark:hover:bg-violet-900/60 text-violet-950 dark:text-violet-100 font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-colors"
          >
            <PlayCircle className="w-5 h-5" />
            <span>شبیه‌ساز حل گام‌به‌گام (انیمیشن مراحل)</span>
          </button>

          <BuyCoffeeButton
            variant="compact"
            reducedMotion={reducedMotion}
            className="mt-1"
          />
        </motion.section>
      </main>
    </div>
  );
};
