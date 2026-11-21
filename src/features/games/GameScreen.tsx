import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  CheckCircle2,
  Gamepad2,
  Star,
  Sparkles,
  Search,
  Apple,
  Wrench,
} from 'lucide-react';
import type {
  AppSettings,
  ChildProfile,
  GameModeId,
  SessionResult,
  SkillKey,
  SorobanGuidedMove,
  SorobanState,
} from '../../types/app';
import {
  numberToSorobanState,
  planSorobanSteps,
  sorobanStateToNumber,
} from '../abacus/sorobanEngine';
import { AbacusStage } from '../abacus/AbacusStage';
import { AudioButton } from '../../components/AudioButton';
import { FeedbackMessage } from '../../components/FeedbackMessage';
import { CartoonObjectIcon } from '../../components/MascotDana';
import { KiaAvatar } from '../../components/KiaAvatar';
import { GameHubIllustration } from '../../components/KidIllustrations';
import { KidIconTile, type KidTileColor } from '../../components/KidIconTile';
import { audioEngine } from '../../lib/audioEngine';
import { formatNumber } from '../../lib/numbers';

interface GameScreenProps {
  profile: ChildProfile;
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onRecordAnswer: (skill: SkillKey, correct: boolean) => void;
  onFinishGame: (result: SessionResult) => void;
  onBack: () => void;
}

interface GameRound {
  mode: GameModeId;
  columns: number;
  targetNumber: number;
  initialNumber: number;
  choices?: number[];
  addA?: number;
  addB?: number;
  emoji?: 'apple' | 'star' | 'balloon' | 'pencil';
  prompt: string;
  spoken: string;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createRound(mode: GameModeId, difficulty: number): GameRound {
  const maxVal = difficulty <= 1 ? 9 : difficulty === 2 ? 29 : 79;
  const cols = maxVal > 9 ? 2 : 1;

  if (mode === 'build') {
    const target = randInt(1, maxVal);
    return {
      mode,
      columns: cols,
      targetNumber: target,
      initialNumber: 0,
      prompt: `عدد ${target} را روی چرتکه بساز!`,
      spoken: `عدد ${target} را با مهره‌ها بساز.`,
    };
  }

  if (mode === 'find-number') {
    const target = randInt(1, maxVal);
    const set = new Set<number>([target]);
    while (set.size < 4) {
      const candidate = Math.max(1, target + randInt(-4, 5));
      set.add(candidate);
    }
    const choices = Array.from(set).sort(() => Math.random() - 0.5);
    return {
      mode,
      columns: cols,
      targetNumber: target,
      initialNumber: target,
      choices,
      prompt: 'چرتکه چه عددی را نشان می‌دهد؟',
      spoken: 'به چرتکه نگاه کن و عدد درست را انتخاب کن.',
    };
  }

  if (mode === 'count-add') {
    const emojis: Array<'apple' | 'star' | 'balloon' | 'pencil'> = [
      'apple',
      'star',
      'balloon',
      'pencil',
    ];
    const emoji = emojis[randInt(0, emojis.length - 1)];
    const a = randInt(1, 5);
    const b = randInt(1, 4);
    return {
      mode,
      columns: 1,
      targetNumber: a + b,
      initialNumber: 0,
      addA: a,
      addB: b,
      emoji,
      prompt: 'همه شکل‌ها را بشمار و مجموع را بساز!',
      spoken: `${a} به اضافه ${b} چند می‌شود؟ روی چرتکه بساز.`,
    };
  }

  // spot-mistake
  const target = randInt(2, maxVal);
  const wrongOffset = Math.random() > 0.5 ? 1 : -1;
  const initialNumber = Math.max(0, target + wrongOffset);
  return {
    mode,
    columns: cols,
    targetNumber: target,
    initialNumber,
    prompt: `اشتباه چرتکه را پیدا کن! باید ${target} باشد.`,
    spoken: `این چرتکه اشتباه دارد! آن را به عدد ${target} تبدیل کن.`,
  };
}

const TOTAL_ROUNDS = 4;

const GAME_CATALOG: {
  id: GameModeId;
  title: string;
  desc: string;
  tileColor: KidTileColor;
  icon: React.ReactNode;
}[] = [
  {
    id: 'build',
    title: 'عدد را بساز',
    desc: 'عدد گفته‌شده را با مهره‌ها بساز',
    tileColor: 'blue',
    icon: <Sparkles className="w-8 h-8" />,
  },
  {
    id: 'find-number',
    title: 'عدد درست کدام است؟',
    desc: 'چرتکه را بخوان و کارت درست را بزن',
    tileColor: 'green',
    icon: <Search className="w-8 h-8" />,
  },
  {
    id: 'count-add',
    title: 'بشمار و جمع کن',
    desc: 'اشیای کارتونی را با چرتکه جمع کن',
    tileColor: 'pink',
    icon: <Apple className="w-8 h-8" />,
  },
  {
    id: 'spot-mistake',
    title: 'پیدا کردن اشتباه',
    desc: 'عدد اشتباه روی چرتکه را درست کن',
    tileColor: 'amber',
    icon: <Wrench className="w-8 h-8" />,
  },
];

export const GameScreen: React.FC<GameScreenProps> = ({
  profile,
  settings,
  onUpdateSettings,
  onRecordAnswer,
  onFinishGame,
  onBack,
}) => {
  const [activeMode, setActiveMode] = useState<GameModeId | null>(null);
  const [roundIdx, setRoundIdx] = useState(0);
  const [round, setRound] = useState<GameRound | null>(null);
  const [abacusState, setAbacusState] = useState<SorobanState>(() => numberToSorobanState(0, 1));
  const [score, setScore] = useState(0);
  const [fails, setFails] = useState(0);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'encourage';
    title: string;
    subtitle?: string;
  } | null>(null);

  const startGameMode = (mode: GameModeId) => {
    audioEngine.play('uiTap');
    const first = createRound(mode, profile.difficultyLevel);
    setActiveMode(mode);
    setRoundIdx(0);
    setRound(first);
    setAbacusState(numberToSorobanState(first.initialNumber, first.columns));
    setScore(0);
    setFails(0);
    setFeedback(null);
    audioEngine.speakPersian(first.spoken);
  };

  const guidedMove = useMemo<SorobanGuidedMove | null>(() => {
    if (!round || fails < 2 || round.mode === 'find-number') return null;
    const cur = sorobanStateToNumber(abacusState);
    if (cur === round.targetNumber) return null;
    return planSorobanSteps(cur, round.targetNumber, round.columns)[0]?.move ?? null;
  }, [abacusState, fails, round]);

  const advanceRound = (wasFirstTry: boolean) => {
    if (!activeMode) return;
    const nextScore = wasFirstTry ? score + 1 : score;
    setScore(nextScore);

    window.setTimeout(() => {
      if (roundIdx + 1 < TOTAL_ROUNDS) {
        const nextRound = createRound(activeMode, profile.difficultyLevel);
        setRoundIdx((i) => i + 1);
        setRound(nextRound);
        setAbacusState(numberToSorobanState(nextRound.initialNumber, nextRound.columns));
        setFails(0);
        setFeedback(null);
        audioEngine.speakPersian(nextRound.spoken);
      } else {
        audioEngine.play('levelComplete');
        const stars = nextScore >= 3 ? 3 : nextScore >= 2 ? 2 : 1;
        onFinishGame({
          title: 'بازی با موفقیت تمام شد!',
          skill: activeMode === 'count-add' ? 'simpleAddition' : 'recognition',
          stars,
          correctCount: nextScore,
          totalCount: TOTAL_ROUNDS,
          message: 'هم سرعتت عالی بود هم دقتت! کیا خیلی خوشحاله!',
          nextAction: 'games',
        });
      }
    }, 1050);
  };

  const handleCheckAbacus = () => {
    if (!round) return;
    const val = sorobanStateToNumber(abacusState);
    const skill: SkillKey = round.mode === 'count-add' ? 'simpleAddition' : 'recognition';
    if (val === round.targetNumber) {
      audioEngine.play('success');
      onRecordAnswer(skill, true);
      setFeedback({
        type: 'success',
        title: 'آفرین! دقیقاً درست بود!',
      });
      audioEngine.speakPersian('آفرین! عالی بود.');
      advanceRound(fails === 0);
    } else {
      setFails((f) => f + 1);
      onRecordAnswer(skill, false);
      audioEngine.play('tryAgain');
      setFeedback({
        type: 'encourage',
        title: 'یک بار دیگر امتحان کن!',
        subtitle: `الان روی چرتکه ${formatNumber(val, settings.digitMode)} است.`,
      });
      audioEngine.speakPersian('اشکالی ندارد، دوباره تلاش کن!');
    }
  };

  const handlePickChoice = (choice: number) => {
    if (!round) return;
    if (choice === round.targetNumber) {
      audioEngine.play('success');
      onRecordAnswer('recognition', true);
      setFeedback({
        type: 'success',
        title: `آفرین! عدد ${formatNumber(choice, settings.digitMode)} کاملاً درست است.`,
      });
      audioEngine.speakPersian('آفرین! کاملاً درست است.');
      advanceRound(fails === 0);
    } else {
      setFails((f) => f + 1);
      onRecordAnswer('recognition', false);
      audioEngine.play('tryAgain');
      setFeedback({
        type: 'encourage',
        title: 'مهره‌های چرتکه را دوباره بشمار و تلاش کن!',
      });
      audioEngine.speakPersian('مهره‌ها را دوباره بشمار و تلاش کن!');
    }
  };

  // Game Hub Selector with Kia & Large Colorful Kid Tiles
  if (!activeMode || !round) {
    return (
      <div className="min-h-screen bg-[#F5E4CE] dark:bg-slate-950 flex flex-col">
        <header className="sticky top-0 z-20 bg-gradient-to-b from-[#F49A67] to-[#F8BA88] dark:from-slate-900 dark:to-slate-900 border-b-2 border-[#E3B488] dark:border-slate-800 px-4 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            aria-label="بازگشت"
            className="min-h-[44px] min-w-[44px] rounded-2xl bg-white/95 hover:bg-white dark:bg-slate-800 border-b-4 border-[#DFC6A8] dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <h1 className="text-lg sm:text-xl font-extrabold text-white drop-shadow-[0_2px_0_rgba(148,70,22,0.45)] flex items-center gap-2">
            <Gamepad2 className="w-6 h-6" />
            <span>بازی‌های چرتکه</span>
          </h1>
          <div className="w-11" />
        </header>

        <main className="flex-1 w-full max-w-2xl mx-auto p-4 space-y-4">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 border-b-4 border-b-[#DFC6A8] p-4 flex items-center justify-between gap-3 shadow-[0_10px_24px_-6px_rgba(170,104,40,0.16)]">
            <div className="flex items-center gap-3 min-w-0">
              <KiaAvatar
                mood="happy"
                interactive
                className="w-16 h-16 sm:w-20 sm:h-20 shrink-0"
                reducedMotion={settings.reducedMotion}
              />
              <div>
                <p className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                  کیا می‌گه: کدوم بازی رو با هم شروع کنیم؟
                </p>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                  روی یکی از کارت‌های رنگارنگ بزن تا بازی و ستاره‌گیری شروع بشه!
                </p>
              </div>
            </div>
            <GameHubIllustration className="hidden xs:block w-16 h-16 shrink-0" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {GAME_CATALOG.map((g, idx) => (
              <motion.button
                key={g.id}
                type="button"
                initial={settings.reducedMotion ? false : { opacity: 0, y: 10 }}
                animate={settings.reducedMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ delay: settings.reducedMotion ? 0 : idx * 0.05 }}
                onClick={() => startGameMode(g.id)}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 border-b-4 border-b-[#DFC6A8] hover:border-sky-400 text-right flex items-center gap-3.5 shadow-[0_10px_22px_-6px_rgba(170,104,40,0.16)] transition-all active:translate-y-0.5"
              >
                <KidIconTile color={g.tileColor} size="xl">
                  {g.icon}
                </KidIconTile>
                <div className="min-w-0">
                  <h2 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {g.title}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{g.desc}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-[#F5E4CE] dark:bg-slate-950 overflow-hidden">
      <header className="shrink-0 bg-gradient-to-b from-[#F49A67] to-[#F8BA88] dark:from-slate-900 dark:to-slate-900 border-b-2 border-[#E3B488] dark:border-slate-800 px-3 h-14 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            audioEngine.stopSpeech();
            setActiveMode(null);
          }}
          aria-label="بازگشت به فهرست بازی‌ها"
          className="min-h-[44px] min-w-[44px] rounded-2xl bg-white/95 hover:bg-white dark:bg-slate-800 border-b-4 border-[#DFC6A8] dark:border-slate-700 active:border-b-0 active:translate-y-0.5 flex items-center justify-center text-[#783F1D] dark:text-slate-200 transition-all"
        >
          <ArrowRight className="w-5 h-5" />
        </button>

        <div className="px-3.5 py-1 rounded-2xl bg-white/95 dark:bg-slate-800 border-b-2 border-[#DFC6A8] dark:border-slate-700 flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-[#4A2E1B] dark:text-white tabular-nums">
          <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
          <span>
            مرحله {formatNumber(roundIdx + 1, settings.digitMode)} از{' '}
            {formatNumber(TOTAL_ROUNDS, settings.digitMode)}
          </span>
        </div>

        <AudioButton textToSpeak={round.spoken} label="صدا" size="sm" />
      </header>

      {/* Game Prompt */}
      <div className="shrink-0 bg-[#FFF9F2] dark:bg-slate-900 border-b-2 border-[#EEDCC5] dark:border-slate-800 px-4 py-2.5 text-center">
        <h1 className="text-base sm:text-xl font-extrabold text-[#3B2618] dark:text-white">
          {formatNumber(round.prompt, settings.digitMode)}
        </h1>

        {round.mode === 'count-add' && round.emoji && (
          <div className="flex items-center justify-center gap-1.5 flex-wrap mt-2">
            {Array.from({ length: round.addA ?? 0 }).map((_, idx) => (
              <CartoonObjectIcon key={`ga_${idx}`} type={round.emoji!} className="w-7 h-7" />
            ))}
            <span className="text-lg font-extrabold text-[#5472EB] mx-1.5">+</span>
            {Array.from({ length: round.addB ?? 0 }).map((_, idx) => (
              <CartoonObjectIcon key={`gb_${idx}`} type={round.emoji!} className="w-7 h-7" />
            ))}
          </div>
        )}
      </div>

      {/* Main Abacus */}
      <div className="flex-1 min-h-0 flex flex-col">
        <AbacusStage
          state={abacusState}
          onChange={(next) => {
            setAbacusState(next);
            setFeedback(null);
          }}
          onBeadMove={() => audioEngine.play('beadClick')}
          onReset={() => {
            audioEngine.play('uiTap');
            setFeedback(null);
          }}
          guidedMove={guidedMove}
          disabled={round.mode === 'find-number'}
          hideValue={round.mode === 'find-number'}
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

      {/* Bottom Controls */}
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

          {round.mode === 'find-number' && round.choices ? (
            <div className="grid grid-cols-4 gap-2">
              {round.choices.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handlePickChoice(c)}
                  className="min-h-[52px] rounded-2xl bg-[#5472EB] hover:bg-[#425FD6] border-b-4 border-[#354EB8] active:border-b-0 active:translate-y-0.5 text-white font-extrabold text-xl tabular-nums shadow-xs transition-all"
                >
                  {formatNumber(c, settings.digitMode)}
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleCheckAbacus}
              className="w-full min-h-[52px] rounded-2xl bg-[#5472EB] hover:bg-[#425FD6] border-b-4 border-[#354EB8] active:border-b-0 active:translate-y-0.5 text-white font-extrabold text-base flex items-center justify-center gap-2 transition-all"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>بررسی پاسخ</span>
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
