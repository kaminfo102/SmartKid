import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { RotateCcw, ChevronLeft, Map } from 'lucide-react';
import type { DigitDisplayMode, SessionResult } from '../../types/app';
import { SKILL_LABELS } from '../../data/lessons';
import { formatNumber } from '../../lib/numbers';
import { KiaMascot } from '../../components/KiaMascot';
import { ConfettiOrRewardAnimation } from '../../components/ConfettiOrRewardAnimation';
import { BuyCoffeeButton } from '../../components/BuyCoffeeButton';
import { audioEngine } from '../../lib/audioEngine';

interface ResultScreenProps {
  result: SessionResult;
  digitMode: DigitDisplayMode;
  reducedMotion: boolean;
  onRetry: () => void;
  onNext: () => void;
  onMap: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  result,
  digitMode,
  reducedMotion,
  onRetry,
  onNext,
  onMap,
}) => {
  useEffect(() => {
    audioEngine.play('birdChirp');
    audioEngine.speakPersian(result.title);
  }, [result.title]);

  const kiaMood = result.stars >= 2 ? 'cheering' : 'happy';

  return (
    <div className="min-h-screen bg-[#F5E4CE] dark:bg-slate-950 flex items-center justify-center p-4">
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, scale: 0.94, y: 14 }}
        animate={reducedMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 border-b-4 border-b-[#DFC6A8] p-6 text-center shadow-lg space-y-4"
      >
        <div className="flex justify-center">
          <KiaMascot
            mood={kiaMood}
            interactive
            className="w-32 h-32"
            reducedMotion={reducedMotion}
          />
        </div>

        <ConfettiOrRewardAnimation stars={result.stars} reducedMotion={reducedMotion} />

        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          {result.title}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">{result.message}</p>

        <div className="rounded-2xl bg-[#FFF6EB] dark:bg-slate-800/70 border border-[#EFE0CE] dark:border-slate-700 p-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">مهارت تمرین‌شده:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {SKILL_LABELS[result.skill]}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">پاسخ‌های درست:</span>
            <span className="font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatNumber(result.correctCount, digitMode)} از{' '}
              {formatNumber(result.totalCount, digitMode)}
            </span>
          </div>
        </div>

        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={onNext}
            className="w-full min-h-[54px] rounded-2xl bg-[#4BB543] hover:bg-[#41A23A] border-b-4 border-[#2E8228] active:border-b-0 active:translate-y-1 text-white font-extrabold text-base flex items-center justify-center gap-2 transition-all"
          >
            <span>مرحله بعد</span>
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onRetry}
              className="min-h-[48px] rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-sm flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>دوباره تلاش کن</span>
            </button>

            <button
              type="button"
              onClick={onMap}
              className="min-h-[48px] rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-sm flex items-center justify-center gap-1.5"
            >
              <Map className="w-4 h-4" />
              <span>نقشه مراحل</span>
            </button>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <BuyCoffeeButton variant="compact" reducedMotion={reducedMotion} />
          </div>
        </div>
      </motion.div>
    </div>
  );
};
