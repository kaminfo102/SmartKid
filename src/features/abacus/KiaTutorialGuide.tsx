import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Pause,
  Play,
  Sparkles,
} from 'lucide-react';
import type { DigitDisplayMode, SorobanMoveStep } from '../../types/app';
import { formatNumber, getColumnColor, getPlaceName } from '../../lib/numbers';
import { audioEngine } from '../../lib/audioEngine';
import { AudioButton } from '../../components/AudioButton';

export interface KiaTutorialGuideProps {
  /** Ordered step-by-step Soroban movements */
  steps: SorobanMoveStep[];
  /** Zero-based index of the active step (when >= steps.length, tutorial is complete) */
  currentStepIndex: number;
  /** Invoked when a step finishes (either by user click or auto-play tick) */
  onStepComplete: (stepIndex: number) => void;
  /** Number of Soroban columns on the wrapped abacus (auto-inferred if omitted) */
  columns?: number;
  /** Persian or English digits */
  digitMode?: DigitDisplayMode;
  /** Respect sensory reduced motion */
  reducedMotion?: boolean;
  /** Whether to auto-advance steps on mount */
  autoPlay?: boolean;
  /** Optional callback to jump to a specific step chip */
  onSelectStep?: (stepIndex: number) => void;
  /** Abacus visual component rendered underneath the absolute arrow/highlight overlay */
  children?: React.ReactNode;
}

/**
 * KiaTutorialGuide
 * Renders an RTL-friendly step-by-step guide led by Kia (/assets/kia_269d7c8e.png)
 * and projects animated directional arrows + bead highlights via absolute positioning
 * directly over the wrapped Abacus visual component.
 */
export const KiaTutorialGuide: React.FC<KiaTutorialGuideProps> = ({
  steps,
  currentStepIndex,
  onStepComplete,
  columns,
  digitMode = 'fa',
  reducedMotion = false,
  autoPlay = false,
  onSelectStep,
  children,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay);
  const timerRef = useRef<number | null>(null);

  const inferredColumns = useMemo(() => {
    if (columns && columns > 0) return columns;
    const firstCols = steps[0]?.stateAfter.length;
    if (firstCols && firstCols > 0) return firstCols;
    const maxColIdx = steps.reduce((mx, s) => Math.max(mx, s.move.columnIndex), 0);
    return maxColIdx + 1;
  }, [columns, steps]);

  const isFinished = steps.length === 0 || currentStepIndex >= steps.length;
  const activeStep: SorobanMoveStep | null =
    !isFinished && currentStepIndex >= 0 && steps[currentStepIndex]
      ? steps[currentStepIndex]
      : null;

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    setIsPlaying(autoPlay);
  }, [autoPlay, steps]);

  // Speak Persian instruction whenever active step changes
  useEffect(() => {
    if (steps.length === 0) return;
    if (isFinished) {
      audioEngine.play('success');
      audioEngine.speakPersian('آفرین! تمام مراحل با موفقیت انجام شد.');
    } else if (activeStep) {
      audioEngine.speakPersian(activeStep.spokenText);
    }
  }, [activeStep, isFinished, steps.length]);

  // Auto-play progression loop
  useEffect(() => {
    clearTimer();
    if (!isPlaying || isFinished || !activeStep) {
      if (isFinished && isPlaying) {
        setIsPlaying(false);
      }
      return;
    }

    const delayMs = reducedMotion ? 1400 : 1850;
    timerRef.current = window.setTimeout(() => {
      audioEngine.play('beadClick');
      onStepComplete(currentStepIndex);
    }, delayMs);

    return () => clearTimer();
  }, [isPlaying, isFinished, activeStep, currentStepIndex, onStepComplete, reducedMotion]);

  // Compute absolute percentage coordinates over the Abacus visual container.
  // Abacus columns are laid out LTR (Units column 0 on the RIGHT, highest column on the LEFT).
  const overlayCoords = useMemo(() => {
    if (!activeStep) return null;
    const { columnIndex, beadType, beadIndex, direction } = activeStep.move;
    const visualIndex = Math.max(0, inferredColumns - 1 - columnIndex);
    const spanPct =
      inferredColumns === 1
        ? 26
        : inferredColumns === 2
        ? 46
        : Math.min(74, inferredColumns * 22);
    const startLeft = 50 - spanPct / 2;
    const leftPct = startLeft + ((visualIndex + 0.5) / inferredColumns) * spanPct;

    const topPct =
      beadType === 'heaven'
        ? 39
        : 58 + Math.min(3, Math.max(0, beadIndex ?? 0)) * 7.2;

    const goingUp =
      (beadType === 'earth' && direction === 'toward-beam') ||
      (beadType === 'heaven' && direction === 'away-from-beam');

    return {
      leftPct,
      topPct,
      goingUp,
      columnColor: getColumnColor(columnIndex),
      placeName: getPlaceName(columnIndex),
    };
  }, [activeStep, inferredColumns]);

  const narrationText = isFinished
    ? 'هورا! همه مراحل تمام شد و جواب نهایی روی چرتکه آماده است!'
    : activeStep?.spokenText ??
      'روی دکمه گام بعدی بزن تا کیا حرکت مهره را نشان دهد.';

  const handleManualStep = () => {
    clearTimer();
    setIsPlaying(false);
    if (!isFinished) {
      audioEngine.play('beadClick');
      onStepComplete(currentStepIndex);
    }
  };

  return (
    <div
      dir="rtl"
      className="flex flex-col flex-1 min-h-0 w-full gap-2"
      aria-label="راهنمای تصویری و انیمیشنی کیا"
    >
      {/* RTL Kia Tutorial Instruction Card */}
      <div className="shrink-0 rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] border-b-4 border-b-[#DFC6A8] dark:border-slate-800 px-3 py-2.5 shadow-sm space-y-2">
        <div className="flex items-center gap-3">
          {/* Required Kia <img> using optimized /assets/kia_269d7c8e.png */}
          <motion.div
            animate={
              reducedMotion
                ? undefined
                : isFinished
                ? { y: [0, -8, 0], scale: [1, 1.07, 1] }
                : { y: [0, -4, 0], rotate: [0, 2.5, 0] }
            }
            transition={{
              duration: isFinished ? 1.1 : 2.6,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className={`relative w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-2xl flex items-center justify-center p-1 border-2 ${
              isFinished
                ? 'bg-[#E7F9E5] border-[#8EE086] dark:bg-emerald-950/50 dark:border-emerald-700'
                : 'bg-[#FFF6EB] border-[#EEDCC5] dark:bg-sky-950/50 dark:border-sky-800'
            }`}
          >
            <img
              src={isFinished ? '/assets/kia-happy.png' : '/assets/kia_269d7c8e.png'}
              alt="پرنده کیا راهنمای آموزشی"
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
              draggable={false}
              className="w-full h-full object-contain"
            />
          </motion.div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-extrabold text-[#2E8228] dark:text-emerald-300">
                  راهنمای مرحله‌به‌مرحله کیا
                </span>
                {steps.length > 0 && (
                  <span className="text-[11px] font-extrabold text-[#783F1D] dark:text-slate-300 bg-[#FFF6EB] border border-[#EEDCC5] dark:bg-slate-800 dark:border-slate-700 px-2 py-0.5 rounded-xl tabular-nums">
                    گام {formatNumber(Math.min(currentStepIndex + 1, steps.length), digitMode)} از{' '}
                    {formatNumber(steps.length, digitMode)}
                  </span>
                )}
                {activeStep?.formulaLabel && (
                  <span
                    dir="ltr"
                    className="text-xs font-extrabold text-[#58289C] dark:text-violet-300 bg-[#EAD8FF] border border-[#C7A6F5] dark:bg-violet-950/60 dark:border-violet-800 px-2 py-0.5 rounded-xl"
                  >
                    {activeStep.formulaLabel}
                  </span>
                )}
              </div>

              <AudioButton textToSpeak={narrationText} label="تکرار صدا" size="sm" />
            </div>

            <p className="text-xs sm:text-sm font-extrabold text-[#3B2618] dark:text-slate-100 leading-relaxed">
              {narrationText}
            </p>
          </div>
        </div>

        {/* Step Chips + Action Controls */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-1.5 border-t border-[#F4E7D7] dark:border-slate-800">
          {steps.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-0.5">
              {steps.map((s, idx) => {
                const isDone = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                const goingUp =
                  (s.move.beadType === 'earth' && s.move.direction === 'toward-beam') ||
                  (s.move.beadType === 'heaven' && s.move.direction === 'away-from-beam');

                return (
                  <button
                    key={`guide_chip_${idx}`}
                    type="button"
                    onClick={() => {
                      clearTimer();
                      setIsPlaying(false);
                      audioEngine.play('uiTap');
                      onSelectStep?.(idx);
                    }}
                    disabled={!onSelectStep}
                    className={`min-h-[38px] px-2.5 py-1 rounded-xl border-2 text-[11px] sm:text-xs font-extrabold inline-flex items-center gap-1 shrink-0 transition-all ${
                      isCurrent
                        ? 'bg-[#FFDC5E] border-[#DFAD19] border-b-4 text-[#5C3A00] dark:bg-amber-900/60 dark:border-amber-500 dark:text-amber-100'
                        : isDone
                        ? 'bg-[#E7F9E5] border-[#8EE086] text-[#1E6B19] dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
                        : 'bg-[#FFF9F2] border-[#EEDCC5] text-[#6B4A35] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="tabular-nums">{formatNumber(idx + 1, digitMode)}</span>
                    {goingUp ? (
                      <ArrowUp className="w-3.5 h-3.5 text-[#5472EB] dark:text-blue-400" />
                    ) : (
                      <ArrowDown className="w-3.5 h-3.5 text-[#E06A2E] dark:text-orange-400" />
                    )}
                    <span>{getPlaceName(s.move.columnIndex)}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-1.5 mr-auto">
            {!isFinished && (
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                aria-label={isPlaying ? 'توقف پخش خودکار' : 'پخش خودکار مراحل'}
                className="min-h-[44px] px-3 rounded-2xl bg-[#FFF6EB] hover:bg-[#FCEBD6] dark:bg-slate-800 dark:hover:bg-slate-700 border-2 border-[#EEDCC5] border-b-4 border-b-[#DFC6A8] dark:border-slate-700 active:border-b-2 active:translate-y-0.5 text-[#5C3A00] dark:text-slate-100 font-extrabold text-xs inline-flex items-center gap-1.5 transition-all"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>توقف</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>خودکار</span>
                  </>
                )}
              </button>
            )}

            {!isFinished ? (
              <button
                type="button"
                onClick={handleManualStep}
                className="min-h-[44px] px-3.5 rounded-2xl bg-[#5472EB] hover:bg-[#425FD6] border-b-4 border-[#354EB8] active:border-b-0 active:translate-y-0.5 text-white font-extrabold text-xs sm:text-sm inline-flex items-center gap-1.5 shadow-xs transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>انجام این گام</span>
              </button>
            ) : (
              <span className="min-h-[40px] px-3 rounded-2xl bg-[#E7F9E5] border-2 border-[#8EE086] dark:bg-emerald-950/60 dark:border-emerald-700 text-[#1E6B19] dark:text-emerald-200 font-extrabold text-xs inline-flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>پایان آموزش</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Wrapped Abacus Visual + Absolute Directional Arrows & Bead Highlights Overlay */}
      <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden rounded-3xl border-2 border-[#EEDCC5] dark:border-slate-800">
        {children}

        {overlayCoords && activeStep && (
          <div
            aria-hidden="true"
            dir="ltr"
            className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
          >
            {/* Glowing active bead target highlight + bouncing arrow positioned over the abacus */}
            <motion.div
              key={`overlay_step_${currentStepIndex}`}
              initial={reducedMotion ? false : { opacity: 0, scale: 0.7 }}
              animate={
                reducedMotion
                  ? { opacity: 1, scale: 1 }
                  : { opacity: 1, scale: [0.95, 1.08, 0.95] }
              }
              transition={
                reducedMotion
                  ? { duration: 0.15 }
                  : { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
              }
              style={{
                left: `${overlayCoords.leftPct}%`,
                top: `${overlayCoords.topPct}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className="absolute flex flex-col items-center"
            >
              {/* Animated directional arrow pointing up or down */}
              <motion.div
                animate={
                  reducedMotion
                    ? undefined
                    : {
                        y: overlayCoords.goingUp ? [0, -10, 0] : [0, 10, 0],
                      }
                }
                transition={{ duration: 0.75, repeat: Infinity, ease: 'easeInOut' }}
                className={`mb-1 px-2 py-1 rounded-xl shadow-lg border-2 border-white flex items-center gap-1 text-[11px] font-extrabold ${
                  overlayCoords.goingUp
                    ? 'bg-blue-600 text-white'
                    : 'bg-amber-400 text-slate-950'
                }`}
              >
                {overlayCoords.goingUp ? (
                  <ArrowUp className="w-4 h-4 stroke-[2.75]" />
                ) : (
                  <ArrowDown className="w-4 h-4 stroke-[2.75]" />
                )}
                <span dir="rtl">{overlayCoords.goingUp ? 'بالا' : 'پایین'}</span>
              </motion.div>

              {/* Glowing bead highlight ring */}
              <div
                className="w-16 h-9 sm:w-20 sm:h-11 rounded-full border-4 border-amber-400 bg-amber-300/20 shadow-[0_0_24px_rgba(251,191,36,0.8)] flex items-center justify-center"
                style={{ boxShadow: `0 0 22px ${overlayCoords.columnColor}80` }}
              >
                <span className="w-3 h-3 rounded-full bg-amber-400 shadow" />
              </div>

              {/* Place label anchor */}
              <div
                dir="rtl"
                className="mt-1 px-2 py-0.5 rounded-lg bg-slate-900/85 text-white text-[10px] font-bold shadow"
              >
                {overlayCoords.placeName}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};
