import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  PlayCircle,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import type {
  AppSettings,
  KiaMood,
  LessonDefinition,
  SessionResult,
  SorobanGuidedMove,
  SorobanState,
} from '../../types/app';
import {
  numberToSorobanState,
  planSorobanSteps,
  sorobanStateToNumber,
} from '../abacus/sorobanEngine';
import { AbacusStage } from '../abacus/AbacusStage';
import { SorobanStepSimulator } from '../abacus/SorobanStepSimulator';
import { AudioButton } from '../../components/AudioButton';
import { FeedbackMessage } from '../../components/FeedbackMessage';
import { KiaAvatar } from '../../components/KiaAvatar';
import { audioEngine } from '../../lib/audioEngine';
import { formatNumber } from '../../lib/numbers';

interface LessonScreenProps {
  lesson: LessonDefinition;
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onCompleteLesson: (result: SessionResult, score: number, attempts: number) => void;
  onBack: () => void;
}

export const LessonScreen: React.FC<LessonScreenProps> = ({
  lesson,
  settings,
  onUpdateSettings,
  onCompleteLesson,
  onBack,
}) => {
  const [stepIdx, setStepIdx] = useState(0);
  const currentStep = lesson.steps[stepIdx];

  const [abacusState, setAbacusState] = useState<SorobanState>(() =>
    numberToSorobanState(currentStep.initialValue ?? 0, currentStep.columns)
  );
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'encourage' | 'info';
    title: string;
    subtitle?: string;
  } | null>(null);
  const [kiaMood, setKiaMood] = useState<KiaMood>('teaching');
  const [stepSolved, setStepSolved] = useState(false);
  const [attemptsOnStep, setAttemptsOnStep] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [firstTryCount, setFirstTryCount] = useState(0);
  const [showSimulatorModal, setShowSimulatorModal] = useState(false);

  // Reset abacus and Kia mood when step changes
  useEffect(() => {
    const startVal = currentStep.initialValue ?? 0;
    setAbacusState(numberToSorobanState(startVal, currentStep.columns));
    setFeedback(null);
    setKiaMood('teaching');
    setStepSolved(false);
    setAttemptsOnStep(0);
    setShowSimulatorModal(false);
    audioEngine.speakPersian(currentStep.spokenText);
  }, [stepIdx, currentStep]);

  // Compute next guided hint move automatically from current abacus state toward target
  const nextGuidedMove = useMemo<SorobanGuidedMove | null>(() => {
    if (stepSolved || currentStep.targetValue === undefined) return null;
    const currentVal = sorobanStateToNumber(abacusState);
    if (currentVal === currentStep.targetValue) return null;
    const planned = planSorobanSteps(currentVal, currentStep.targetValue, currentStep.columns);
    return planned[0]?.move ?? null;
  }, [abacusState, currentStep, stepSolved]);

  const currentNumeric = sorobanStateToNumber(abacusState);

  const handleCheckAnswer = () => {
    setTotalAttempts((n) => n + 1);

    if (currentStep.targetValue === undefined || currentNumeric === currentStep.targetValue) {
      audioEngine.play('success');
      if (attemptsOnStep === 0) {
        setFirstTryCount((c) => c + 1);
      }
      setStepSolved(true);
      setKiaMood('cheering');
      setFeedback({
        type: 'success',
        title: 'آفرین! کیا خیلی خوشحال شد!',
        subtitle: `عدد ${formatNumber(currentNumeric, settings.digitMode)} را عالی ساختی.`,
      });
      audioEngine.speakPersian('آفرین! کاملاً درست است.');
    } else {
      setAttemptsOnStep((a) => a + 1);
      audioEngine.play('tryAgain');
      setKiaMood('sad');
      setFeedback({
        type: 'encourage',
        title: 'نزدیک بودی! دوباره تلاش کن',
        subtitle: `الان چرتکه عدد ${formatNumber(
          currentNumeric,
          settings.digitMode
        )} را نشان می‌دهد؛ ما عدد ${formatNumber(
          currentStep.targetValue,
          settings.digitMode
        )} را می‌خواهیم.`,
      });
      audioEngine.speakPersian('اشکالی ندارد قهرمان! دوباره تلاش کن.');
    }
  };

  const handleNextStep = () => {
    audioEngine.play('uiTap');
    if (stepIdx < lesson.steps.length - 1) {
      setStepIdx((i) => i + 1);
    } else {
      audioEngine.play('levelComplete');
      const totalSteps = lesson.steps.length;
      const ratio = firstTryCount / Math.max(1, totalSteps);
      const stars = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;
      onCompleteLesson(
        {
          title: `تبریک! ${lesson.title} تمام شد`,
          skill: lesson.skill,
          stars,
          correctCount: totalSteps,
          totalCount: Math.max(totalSteps, totalAttempts),
          message: 'مهره‌ها را عالی جابه‌جا کردی! کیا بهت افتخار می‌کنه.',
          nextAction: 'next-lesson',
          lessonId: lesson.id,
        },
        totalSteps,
        Math.max(totalSteps, totalAttempts)
      );
    }
  };

  if (showSimulatorModal && currentStep.targetValue !== undefined) {
    return (
      <SorobanStepSimulator
        initialStartValue={currentStep.initialValue ?? 0}
        initialTargetValue={currentStep.targetValue}
        initialColumns={currentStep.columns}
        title={`آموزش انیمیشنی: ${currentStep.title}`}
        allowProblemPicker={false}
        autoPlay={true}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
        onClose={() => setShowSimulatorModal(false)}
      />
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-[#F5E4CE] dark:bg-slate-950 overflow-hidden">
      {/* Compact Header */}
      <header className="shrink-0 bg-gradient-to-b from-[#F49A67] to-[#F8BA88] dark:from-slate-900 dark:to-slate-900 border-b-2 border-[#E3B488] dark:border-slate-800 px-3 h-14 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            audioEngine.stopSpeech();
            onBack();
          }}
          aria-label="بازگشت به نقشه آموزش"
          className="min-h-[44px] min-w-[44px] rounded-2xl bg-white/95 hover:bg-white dark:bg-slate-800 border-b-4 border-[#DFC6A8] dark:border-slate-700 active:border-b-0 active:translate-y-0.5 flex items-center justify-center text-[#783F1D] dark:text-slate-200 transition-all"
        >
          <ArrowRight className="w-5 h-5" />
        </button>

        <div className="min-w-0 flex-1 text-center">
          <div className="text-xs sm:text-sm font-extrabold text-white drop-shadow-[0_1px_0_rgba(148,70,22,0.45)] truncate">
            {lesson.title}
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            {lesson.steps.map((st, idx) => (
              <span
                key={st.id}
                className={`h-2.5 rounded-full transition-all ${
                  idx === stepIdx
                    ? 'w-7 bg-[#FFDC5E] border border-[#DFAD19]'
                    : idx < stepIdx
                    ? 'w-2.5 bg-[#4BB543] border border-[#2E8228]'
                    : 'w-2.5 bg-white/65 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        <AudioButton textToSpeak={currentStep.spokenText} label="تکرار" size="sm" />
      </header>

      {/* Instruction Bar with Interactive KiaAvatar */}
      <div className="shrink-0 bg-[#FFF9F2] dark:bg-slate-900 border-b-2 border-[#EEDCC5] dark:border-slate-800 px-3 sm:px-4 py-2">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <KiaAvatar
              mood={kiaMood}
              interactive
              className="w-12 h-12 sm:w-14 sm:h-14 shrink-0"
              reducedMotion={settings.reducedMotion}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-extrabold text-[#3B2618] dark:text-white">
                  {currentStep.title}
                </h1>
                {currentStep.targetValue !== undefined && (
                  <span className="px-2 py-0.5 rounded-xl bg-[#DDF2FF] dark:bg-sky-950/60 border border-[#B2DEFA] dark:border-sky-800 text-xs font-extrabold text-[#1E6BA8] dark:text-sky-300">
                    هدف: {formatNumber(currentStep.targetValue, settings.digitMode)}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-[#6B4A35] dark:text-slate-300 mt-0.5 leading-relaxed">
                {currentStep.instruction}
              </p>
            </div>
          </div>

          {currentStep.targetValue !== undefined && (
            <button
              type="button"
              onClick={() => {
                audioEngine.play('uiTap');
                setShowSimulatorModal(true);
              }}
              aria-label="نمایش انیمیشن حل مرحله به مرحله"
              className="min-h-[44px] shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#EAD8FF] hover:bg-[#DFC6FF] dark:bg-violet-900/50 dark:hover:bg-violet-900/70 border-b-4 border-[#C7A6F5] dark:border-violet-800 active:border-b-0 active:translate-y-0.5 text-[#58289C] dark:text-violet-100 font-extrabold text-xs sm:text-sm transition-all"
            >
              <PlayCircle className="w-4 h-4" />
              <span>نمایش انیمیشن حل</span>
            </button>
          )}
        </div>
      </div>

      {/* Dominant 3D/2D Abacus Stage */}
      <div className="flex-1 min-h-0 flex flex-col">
        <AbacusStage
          state={abacusState}
          onChange={(next) => {
            setAbacusState(next);
            setFeedback(null);
            setKiaMood('teaching');
          }}
          onBeadMove={() => audioEngine.play('beadClick')}
          onReset={() => {
            audioEngine.play('uiTap');
            setFeedback(null);
            setStepSolved(false);
            setKiaMood('teaching');
          }}
          guidedMove={nextGuidedMove}
          highlightColumn={currentStep.highlightColumn}
          scale={settings.abacusScale}
          onToggleScale={() =>
            onUpdateSettings({
              abacusScale: settings.abacusScale === 'large' ? 'normal' : 'large',
            })
          }
          prefer2D={settings.prefer2D}
          onToggle2D={() => onUpdateSettings({ prefer2D: !settings.prefer2D })}
          digitMode={settings.digitMode}
          reducedMotion={settings.reducedMotion}
          nightMode={settings.nightMode}
        />
      </div>

      {/* Bottom Feedback + Primary Thumb Action */}
      <footer className="shrink-0 bg-[#FFF9F2] dark:bg-slate-900 border-t-2 border-[#EEDCC5] dark:border-slate-800 px-4 py-2.5 pb-safe space-y-2">
        <div className="max-w-3xl mx-auto space-y-2">
          {feedback && (
            <FeedbackMessage
              type={feedback.type}
              title={feedback.title}
              subtitle={feedback.subtitle}
              reducedMotion={settings.reducedMotion}
            />
          )}

          {!stepSolved ? (
            <button
              type="button"
              onClick={handleCheckAnswer}
              className="w-full min-h-[52px] rounded-2xl bg-[#5472EB] hover:bg-[#425FD6] border-b-4 border-[#354EB8] active:border-b-0 active:translate-y-0.5 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>بررسی پاسخ</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextStep}
              className="w-full min-h-[52px] rounded-2xl bg-[#4BB543] hover:bg-[#41A23A] border-b-4 border-[#2E8228] active:border-b-0 active:translate-y-0.5 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Sparkles className="w-5 h-5" />
              <span>
                {stepIdx < lesson.steps.length - 1 ? 'مرحله بعد' : 'پایان و دریافت ستاره'}
              </span>
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
