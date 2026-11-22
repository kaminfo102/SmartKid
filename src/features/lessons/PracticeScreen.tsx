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
  wpQuestions?: PracticeQuestion[];
  totalQuestions?: number;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onRecordAnswer: (skill: SkillKey, correct: boolean) => void;
  onCompleteSession: (result: SessionResult) => void;
  onBack: () => void;
}

function pickPracticeQuestion(
  skill: SkillKey,
  level: number,
  wpQuestions: PracticeQuestion[] = [],
  usedIds: Set<string> = new Set()
): PracticeQuestion {
  const candidates = wpQuestions.filter(
    (q) => q.skill === skill && !usedIds.has(q.id)
  );
  if (candidates.length > 0) {
    const levelMatched = candidates.filter(
      (q) => (q.difficulty ?? 1) <= level + 1
    );
    const pool = levelMatched.length > 0 ? levelMatched : candidates;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    return picked;
  }
  return generatePracticeQuestion(skill, level);
}

export const PracticeScreen: React.FC<PracticeScreenProps> = ({
  profile,
  settings,
  initialSkill = 'recognition',
  wpQuestions = [],
  totalQuestions = 5,
  onUpdateSettings,
  onRecordAnswer,
  onCompleteSession,
  onBack,
}) => {
  const totalCount = Math.max(1, totalQuestions);
  const [selectedSkill, setSelectedSkill] = useState<SkillKey>(initialSkill);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [usedQuestionIds, setUsedQuestionIds] = useState<Set<string>>(new Set());
  const [question, setQuestion] = useState<PracticeQuestion>(() =>
    pickPracticeQuestion(initialSkill, profile.difficultyLevel, wpQuestions)
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

  const loadQuestion = (skill: SkillKey, level: number, nextUsed?: Set<string>) => {
    const usedSet = nextUsed ?? usedQuestionIds;
    const q = pickPracticeQuestion(skill, level, wpQuestions, usedSet);
    const updatedUsed = new Set(usedSet);
    updatedUsed.add(q.id);
    setUsedQuestionIds(updatedUsed);
    setQuestion(q);
    setAbacusState(numberToSorobanState(q.startValue, q.columns));
    setFailsOnCurrent(0);
    setShowHint(false);
    setShowStepSim(false);
    setSolved(false);
    setKiaMood('teaching');
    setFeedback(null);
    setFlashHidden(false);
    audioEngine.speakPersian(q.spokenText, undefined, q.audioUrl);
  };

  useEffect(() => {
    setUsedQuestionIds(new Set([question.id]));
    audioEngine.speakPersian(question.spokenText, undefined, question.audioUrl);
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
      audioEngine.speakPersian('آفرین! خیلی خوب بود.', 'cheer', undefined, 'praise_correct');
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
        audioEngine.speakPersian('دوباره تلاش کن قهرمان! فلش طلایی کمکت می‌کند.', 'encourage', undefined, 'try_again');
      } else {
        setFeedback({
          type: 'encourage',
          title: 'یه کوچولو دیگه مونده! دوباره تلاش کن',
          subtitle: `الان عدد ${formatNumber(userVal, settings.digitMode)} روی چرتکه است.`,
        });
        audioEngine.speakPersian('دوباره تلاش کن!', 'encourage', undefined, 'try_again');
      }
    }
  };

  const handleNext = () => {
    audioEngine.play('uiTap');
    if (questionIdx + 1 < totalCount) {
      setQuestionIdx((i) => i + 1);
      loadQuestion(selectedSkill, profile.difficultyLevel);
    } else {
      audioEngine.play('levelComplete');
      const ratio = correctCount / totalCount;
      const stars = ratio >= 0.8 ? 3 : ratio >= 0.4 ? 2 : 1;
      onCompleteSession({
        title: 'تمرین عالی تمام شد!',
        skill: selectedSkill,
        stars,
        correctCount,
        totalCount,
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
    <div className="h-[100dvh] flex flex-col bg-[#F5E4CE] dark:bg-slate-950 overflow-hidden">
      <header className="shrink-0 bg-gradient-to-b from-[#F49A67] to-[#F8BA88] dark:from-slate-900 dark:to-slate-900 border-b-2 border-[#E3B488] dark:border-slate-800 px-3 h-14 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            audioEngine.stopSpeech();
            onBack();
          }}
          aria-label="بازگشت"
          className="min-h-[44px] min-w-[44px] rounded-2xl bg-white/95 hover:bg-white dark:bg-slate-800 border-b-4 border-[#DFC6A8] dark:border-slate-700 active:border-b-0 active:translate-y-0.5 flex items-center justify-center text-[#783F1D] dark:text-slate-200 transition-all"
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
              loadQuestion(sk, profile.difficultyLevel, new Set());
            }}
            className="min-h-[40px] px-2.5 rounded-2xl bg-white/95 dark:bg-slate-800 text-xs sm:text-sm font-extrabold text-[#4A2E1B] dark:text-slate-100 border-2 border-[#EEDCC5] border-b-4 border-b-[#DFC6A8] dark:border-slate-700"
          >
            {(Object.keys(SKILL_LABELS) as SkillKey[]).map((sk) => (
              <option key={sk} value={sk}>
                {SKILL_LABELS[sk]}
              </option>
            ))}
          </select>

          <span className="px-2.5 py-1 rounded-xl bg-white/90 dark:bg-slate-800 text-xs font-extrabold text-[#783F1D] dark:text-slate-200 whitespace-nowrap tabular-nums">
            {formatNumber(questionIdx + 1, settings.digitMode)}/{formatNumber(totalCount, settings.digitMode)}
          </span>
        </div>

        <AudioButton
          textToSpeak={question.spokenText}
          audioUrl={question.audioUrl}
          label="صدا"
          size="sm"
        />
      </header>

      {/* Question Prompt Card with Expressive KiaAvatar */}
      <div className="shrink-0 bg-[#FFF9F2] dark:bg-slate-900 border-b-2 border-[#EEDCC5] dark:border-slate-800 px-4 py-2.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <KiaAvatar
              mood={kiaMood}
              interactive
              className="w-12 h-12 sm:w-14 sm:h-14 shrink-0"
              reducedMotion={settings.reducedMotion}
            />
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-extrabold text-[#3B2618] dark:text-white">
                {question.promptText}
              </h1>
              {question.visualType === 'objects' && question.visualEmoji && (
                <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                  {Array.from({ length: question.visualCountA ?? 0 }).map((_, i) => (
                    <CartoonObjectIcon key={`a_${i}`} type={question.visualEmoji!} className="w-6 h-6" />
                  ))}
                  {question.operation === '+' && (
                    <>
                      <span className="font-extrabold text-[#5472EB] mx-1">+</span>
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
              className="min-h-[44px] px-3 rounded-2xl bg-[#EAD8FF] hover:bg-[#DFC6FF] dark:bg-violet-900/50 border-b-4 border-[#C7A6F5] dark:border-violet-800 active:border-b-0 active:translate-y-0.5 text-[#58289C] dark:text-violet-100 text-xs font-extrabold inline-flex items-center gap-1.5 transition-all"
            >
              <PlayCircle className="w-4 h-4" />
              <span>روش حل</span>
            </button>

            <button
              type="button"
              onClick={() => setShowHint((h) => !h)}
              aria-label="نمایش راهنمای حرکت مهره"
              className="min-h-[44px] px-3 rounded-2xl bg-[#FFDC5E] hover:bg-[#F5CE3D] dark:bg-amber-900/50 border-b-4 border-[#DFAD19] dark:border-amber-800 active:border-b-0 active:translate-y-0.5 text-[#5C3A00] dark:text-amber-100 text-xs font-extrabold inline-flex items-center gap-1.5 transition-all"
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
          <div className="px-4 py-2 bg-[#EAD8FF] dark:bg-violet-950 border-b-2 border-[#C7A6F5] dark:border-violet-800 text-[#58289C] dark:text-violet-100 text-xs sm:text-sm font-extrabold text-center flex items-center justify-center gap-3">
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

          {!solved ? (
            <button
              type="button"
              onClick={handleCheck}
              className="w-full min-h-[52px] rounded-2xl bg-[#5472EB] hover:bg-[#425FD6] border-b-4 border-[#354EB8] active:border-b-0 active:translate-y-0.5 text-white font-extrabold text-base flex items-center justify-center gap-2 transition-all"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>بررسی پاسخ</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="w-full min-h-[52px] rounded-2xl bg-[#4BB543] hover:bg-[#41A23A] border-b-4 border-[#2E8228] active:border-b-0 active:translate-y-0.5 text-white font-extrabold text-base flex items-center justify-center gap-2 transition-all"
            >
              <span>{questionIdx + 1 < totalCount ? 'سؤال بعدی' : 'دیدن نتیجه'}</span>
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
