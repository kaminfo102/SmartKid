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
} from 'lucide-react';
import type { DigitDisplayMode, LessonDefinition, LessonProgress } from '../../types/app';
import { formatNumber } from '../../lib/numbers';

interface LessonCardProps {
  lesson: LessonDefinition;
  progress?: LessonProgress;
  unlocked: boolean;
  digitMode: DigitDisplayMode;
  onStart: () => void;
}

function renderIcon(name: LessonDefinition['iconName']) {
  switch (name) {
    case 'sparkles':
      return <Sparkles className="w-6 h-6" />;
    case 'layers':
      return <Layers className="w-6 h-6" />;
    case 'plus':
      return <Plus className="w-6 h-6" />;
    case 'minus':
      return <Minus className="w-6 h-6" />;
    case 'puzzle':
      return <Puzzle className="w-6 h-6" />;
    case 'brain':
      return <Brain className="w-6 h-6" />;
  }
}

export const LessonCard: React.FC<LessonCardProps> = ({
  lesson,
  progress,
  unlocked,
  digitMode,
  onStart,
}) => {
  const stars = progress?.stars ?? 0;

  return (
    <button
      type="button"
      onClick={onStart}
      disabled={!unlocked}
      aria-label={`مرحله ${formatNumber(lesson.stageNumber, digitMode)}: ${lesson.title}${
        unlocked ? '' : ' (قفل شده)'
      }`}
      className={`w-full text-right rounded-3xl border p-4 flex items-center justify-between gap-3 transition-all ${
        unlocked
          ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400 shadow-xs active:scale-[0.99]'
          : 'bg-slate-100/80 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800/60 opacity-75 cursor-not-allowed'
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs"
          style={{ backgroundColor: unlocked ? lesson.accentColor : '#94A3B8' }}
        >
          {unlocked ? renderIcon(lesson.iconName) : <Lock className="w-6 h-6" />}
        </div>

        <div className="min-w-0">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
            مرحله {formatNumber(lesson.stageNumber, digitMode)}
          </div>
          <h2 className="font-extrabold text-base text-slate-900 dark:text-white truncate">
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
          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-600 dark:text-blue-400">
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{progress?.completed ? 'مرور' : 'شروع'}</span>
          </span>
        )}
      </div>
    </button>
  );
};
