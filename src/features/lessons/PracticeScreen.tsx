import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  HelpCircle,
  ChevronLeft,
  PlayCircle,
} from 'lucide-react';
import type {
  AppSettings,
  ChildProfile,
  KiaMood,
  PracticeQuestion,
  SessionResult,
  SkillKey,
  SorobanGuidedMove,
  SorobanState,
} from '../../types/app';
import { generatePracticeQuestion } from '../../data/practiceGenerator';
import { SKILL_LABELS } from '../../data/lessons';
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
import { CartoonObjectIcon } from '../../components/MascotDana';
import { audioEngine } from '../../lib/audioEngine';
import { formatNumber } from '../../lib/numbers';

interface PracticeScreenProps {
  profile: ChildProfile;
  settings: AppSettings;
  initialSkill?: SkillKey;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onRecordAnswer: (skill: SkillKey, correct: boolean) => void;
  onCompleteSession: (result: SessionResult) => void;
  onBack: () => void;
}

const TOTAL_QUESTIONS = 5;

export const PracticeScreen: React.FC<PracticeScreenProps> = ({
  profile,
  settings,
  initialSkill = 'recognition',
  onUpdateSettings,
  onRecordAnswer,
  onCompleteSession,
  onBack,
}) => {
  const [selectedSkill, setSelectedSkill] = useState<SkillKey>(initialSkill);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [question, setQuestion] = useState<PracticeQuestion>(() =>
    generatePracticeQuestion(initialSkill, profile.difficultyLevel)
  );
  const [abacusState, setAbacusState] = useState<SorobanState>(() =>
    numberToSorobanState(question.startValue, question.columns)
  );
  const [failsOnCurrent, setFailsOnCurrent] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showStepSim, setShowStepSim] = useState(false);
  const [solved, setSolved] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [flashHidden, setFlashHidden] = useState(false);
  const [kiaMood, setKiaMood] = useState<KiaMood>('teaching');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'encourage';
    title: string;
    subtitle?: string;
  } | null>(null);

  const loadQuestion = (skill: SkillKey, level: number) => {
    const q = generatePracticeQuestion(skill, level);
    setQuestion(q);
    setAbacusState(numberToSorobanState(q.startValue, q.columns));
    setFailsOnCurrent(0);
    setShowHint(false);
    setShowStepSim(false);
    setSolved(false);
    setKiaMood('teaching');
    setFeedback(null);
    setFlashHidden(false);
    audioEngine.speakPersian(q.spokenText);
  };

  useEffect(() => {
    audioEngine.speakPersian(question.spokenText);
    return () => audioEngine.stopSpeech();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mental flash brief peek effect for mentalMath skill
  useEffect(() => {
    if (question.visualType === 'mental-flash') {
      setFlashHidden(false);
      const timer = window.setTimeout(() => {
        setFlashHidden(true);
      }, 2500);
      return () => window.clearTimeout(timer);
    }
    setFlashHidden(false);
  }, [question]);

  const guidedMove = useMemo<SorobanGuidedMove | null>(() => {
    if (!showHint || solved) return null;
    const curVal = sorobanStateToNumber(abacusState);
    if (curVal === question.targetValue) return null;
    const steps = planSorobanSteps(curVal, question.targetValue, question.columns);
    return steps[0]?.move ?? null;
  }, [abacusState, question, showHint, solved]);

  const handleCheck = () => {
    const userVal = sorobanStateToNumber(abacusState);
    if (userVal === question.targetValue) {
      audioEngine.play('success');
      onRecordAnswer(question.skill, true);
      if (failsOnCurrent === 0) {
        setCorrectCount((c) => c + 1);
      }
      setSolved(true);
      setKiaMood('cheering');
      setFlashHidden(false);
      setFeedback({
        type: 'success',
        title: 'آفرین! کیا برات دست می‌زنه!',
        subtitle: `جواب درست عدد ${formatNumber(question.targetValue, settings.digitMode)} است.`,
      });
      audioEngine.speakPersian('آفرین! خیلی خوب بود.');
    } else {
      const nextFails = failsOnCurrent + 1;
      setFailsOnCurrent(nextFails);
      onRecordAnswer(question.skill, false);
      audioEngine.play('tryAgain');
      setKiaMood('sad');
      if (nextFails >= 2) {
        setShowHint(true);
        setFeedback({
          type: 'encourage',
          title: 'غصه نخور! بیا با هم حلش کنیم',
          subtitle: 'مهره‌ای که فلش طلایی دارد را حرکت بده یا شبیه‌ساز حل را ببین.',
        });
        audioEngine.speakPersian('دوباره تلاش کن قهرمان! فلش طلایی کمکت می‌کند.');
      } else {
        setFeedback({
          type: 'encourage',
          title: 'یه کوچولو دیگه مونده! دوباره تلاش کن',
          subtitle: `الان عدد ${formatNumber(userVal, settings.digitMode)} روی چرتکه است.`,
        });
        audioEngine.speakPersian('دوباره تلاش کن!');
      }
    }
  };

  const handleNext = () => {
    audioEngine.play('uiTap');
    if (questionIdx + 1 < TOTAL_QUESTIONS) {
      setQuestionIdx((i) => i + 1);
      loadQuestion(selectedSkill, profile.difficultyLevel);
    } else {
      audioEngine.play('levelComplete');
      const stars = correctCount >= 4 ? 3 : correctCount >= 2 ? 2 : 1;
      onCompleteSession({
        title: 'تمرین عالی تمام شد!',
        skill: selectedSkill,
        stars,
        correctCount,
        totalCount: TOTAL_QUESTIONS,
        message: 'هر تمرین تو را در حساب ذهنی قوی‌تر می‌کند!',
        nextAction: 'practice',
      });
    }
  };

  if (showStepSim) {
    return (
      <SorobanStepSimulator
        initialStartValue={question.startValue}
        initialTargetValue={question.targetValue}
        initialColumns={question.columns}
        title={`شبیه‌ساز حل: ${question.promptText}`}
        allowProblemPicker={false}
        autoPlay={true}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
        onClose={() => setShowStepSim(false)}
      />
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-[#F7F9FC] dark:bg-slate-950 overflow-hidden">
      <header className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 h-14 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            audioEngine.stopSpeech();
            onBack();
          }}
          aria-label="بازگشت"
          className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200"
        >
          <ArrowRight className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <select
            aria-label="انتخاب مهارت تمرین"
            value={selectedSkill}
            onChange={(e) => {
              const sk = e.target.value as SkillKey;
              setSelectedSkill(sk);
              setQuestionIdx(0);
              setCorrectCount(0);
              loadQuestion(sk, profile.difficultyLevel);
            }}
            className="min-h-[40px] px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
          >
            {(Object.keys(SKILL_LABELS) as SkillKey[]).map((sk) => (
              <option key={sk} value={sk}>
                {SKILL_LABELS[sk]}
              </option>
            ))}
          </select>

          <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums">
            {formatNumber(questionIdx + 1, settings.digitMode)}/{formatNumber(TOTAL_QUESTIONS, settings.digitMode)}
          </span>
        </div>

        <AudioButton textToSpeak={question.spokenText} label="صدا" size="sm" />
      </header>

      {/* Question Prompt Card with Expressive KiaAvatar */}
      <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <KiaAvatar
              mood={kiaMood}
              interactive
              className="w-12 h-12 sm:w-14 sm:h-14 shrink-0"
              reducedMotion={settings.reducedMotion}
            />
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white">
                {question.promptText}
              </h1>
              {question.visualType === 'objects' && question.visualEmoji && (
                <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                  {Array.from({ length: question.visualCountA ?? 0 }).map((_, i) => (
                    <CartoonObjectIcon key={`a_${i}`} type={question.visualEmoji!} className="w-6 h-6" />
                  ))}
                  {question.operation === '+' && (
                    <>
                      <span className="font-extrabold text-blue-600 mx-1">+</span>
                      {Array.from({ length: question.visualCountB ?? 0 }).map((_, i) => (
                        <CartoonObjectIcon key={`b_${i}`} type={question.visualEmoji!} className="w-6 h-6" />
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowStepSim(true)}
              aria-label="نمایش انیمیشن حل گام به گام"
              className="min-h-[44px] px-3 rounded-xl bg-violet-100 hover:bg-violet-200 dark:bg-violet-900/40 text-violet-900 dark:text-violet-100 text-xs font-bold inline-flex items-center gap-1.5"
            >
              <PlayCircle className="w-4 h-4" />
              <span>روش حل</span>
            </button>

            <button
              type="button"
              onClick={() => setShowHint((h) => !h)}
              aria-label="نمایش راهنمای حرکت مهره"
              className="min-h-[44px] px-3 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 text-xs font-bold inline-flex items-center gap-1.5"
            >
              <HelpCircle className="w-4 h-4" />
              <span>راهنما</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dominant Abacus */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        {flashHidden && !solved && (
          <div className="px-4 py-2 bg-violet-100 dark:bg-violet-950 text-violet-900 dark:text-violet-100 text-xs sm:text-sm font-bold text-center flex items-center justify-center gap-3">
            <span>حالا در ذهن تصور کن و عدد نهایی را بساز!</span>
            <button
              type="button"
              onClick={() => setFlashHidden(false)}
              className="underline inline-flex items-center gap-1"
            >
              <Eye className="w-4 h-4" />
              دیدن دوباره
            </button>
          </div>
        )}

        <AbacusStage
          state={abacusState}
          onChange={(next) => {
            setAbacusState(next);
            setFeedback(null);
            if (!solved) setKiaMood('teaching');
          }}
          onBeadMove={() => audioEngine.play('beadClick')}
          onReset={() => {
            audioEngine.play('uiTap');
            setFeedback(null);
            if (!solved) setKiaMood('teaching');
          }}
          guidedMove={guidedMove}
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

      <footer className="shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-2.5 pb-safe space-y-2">
        <div className="max-w-3xl mx-auto space-y-2">
          {feedback && (
            <FeedbackMessage
              type={feedback.type}
              title={feedback.title}
              subtitle={feedback.subtitle}
              reducedMotion={settings.reducedMotion}
            />
          )}

          {!solved ? (
            <button
              type="button"
              onClick={handleCheck}
              className="w-full min-h-[52px] rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>بررسی پاسخ</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="w-full min-h-[52px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base flex items-center justify-center gap-2"
            >
              <span>{questionIdx + 1 < TOTAL_QUESTIONS ? 'سؤال بعدی' : 'دیدن نتیجه'}</span>
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
