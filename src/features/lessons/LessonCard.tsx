import React from 'react';
import {
  Sparkles,
  Layers,
  Plus,
  Minus,
  Puzzle,
  Brain,
  Lock,
  Star,
  Play,
  CheckCircle2,
} from 'lucide-react';
import type { DigitDisplayMode, LessonDefinition, LessonProgress } from '../../types/app';
import { formatNumber } from '../../lib/numbers';
import { KidIconTile, type KidTileColor } from '../../components/KidIconTile';

interface LessonCardProps {
  lesson: LessonDefinition;
  progress?: LessonProgress;
  unlocked: boolean;
  isCurrentNext?: boolean;
  digitMode: DigitDisplayMode;
  onStart: () => void;
}

const STAGE_TILE_COLORS: Record<LessonDefinition['iconName'], KidTileColor> = {
  sparkles: 'sky',
  layers: 'green',
  plus: 'blue',
  minus: 'amber',
  puzzle: 'violet',
  brain: 'pink',
};

export function renderLessonIcon(name: LessonDefinition['iconName'], sizeClass = 'w-7 h-7') {
  switch (name) {
    case 'sparkles':
      return <Sparkles className={sizeClass} />;
    case 'layers':
      return <Layers className={sizeClass} />;
    case 'plus':
      return <Plus className={sizeClass} />;
    case 'minus':
      return <Minus className={sizeClass} />;
    case 'puzzle':
      return <Puzzle className={sizeClass} />;
    case 'brain':
      return <Brain className={sizeClass} />;
  }
}

export const LessonCard: React.FC<LessonCardProps> = ({
  lesson,
  progress,
  unlocked,
  isCurrentNext = false,
  digitMode,
  onStart,
}) => {
  const stars = progress?.stars ?? 0;
  const tileColor: KidTileColor = unlocked
    ? STAGE_TILE_COLORS[lesson.iconName]
    : 'slate';

  return (
    <button
      type="button"
      onClick={onStart}
      disabled={!unlocked}
      aria-label={`مرحله ${formatNumber(lesson.stageNumber, digitMode)}: ${lesson.title}${
        unlocked ? '' : ' (قفل شده)'
      }`}
      className={`w-full text-right rounded-3xl border-2 border-b-4 p-3.5 sm:p-4 flex items-center justify-between gap-3 transition-all ${
        unlocked
          ? isCurrentNext
            ? 'bg-white dark:bg-slate-900 border-amber-400 border-b-amber-500 shadow-lg ring-4 ring-amber-200/70 dark:ring-amber-500/30 active:translate-y-0.5'
            : 'bg-white dark:bg-slate-900 border-white/90 dark:border-slate-800 border-b-emerald-700/20 shadow-md hover:border-amber-300 active:translate-y-0.5'
          : 'bg-white/75 dark:bg-slate-900/60 border-white/60 dark:border-slate-800/60 border-b-slate-300/70 opacity-80 cursor-not-allowed'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <KidIconTile color={tileColor} size="lg">
          {unlocked ? renderLessonIcon(lesson.iconName, 'w-7 h-7') : <Lock className="w-7 h-7" />}
        </KidIconTile>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg">
              مرحله {formatNumber(lesson.stageNumber, digitMode)}
            </span>
            {progress?.completed && (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
          </div>
          <h2 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white mt-0.5 truncate">
            {lesson.title}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-1">
            {lesson.shortGoal}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <div className="flex items-center gap-0.5" aria-label={`${stars} از ۳ ستاره`}>
          {[1, 2, 3].map((idx) => (
            <Star
              key={idx}
              className={`w-4 h-4 ${
                idx <= stars
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-slate-300 dark:text-slate-700'
              }`}
            />
          ))}
        </div>

        {unlocked && (
          <span
            className={`px-3 py-1 rounded-xl text-xs font-extrabold inline-flex items-center gap-1 ${
              isCurrentNext
                ? 'bg-[#46B849] text-white shadow-xs'
                : 'bg-sky-100 text-sky-900 dark:bg-sky-900/50 dark:text-sky-100'
            }`}
          >
            <Play className="w-3 h-3 fill-current" />
            <span>{progress?.completed ? 'مرور' : 'شروع'}</span>
          </span>
        )}
      </div>
    </button>
  );
};
