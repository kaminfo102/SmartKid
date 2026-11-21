import React from 'react';
import { Award, CheckCircle2, Clock, Star } from 'lucide-react';
import type { ChildProfile, DigitDisplayMode, SkillKey } from '../../types/app';
import { LESSONS, SKILL_LABELS } from '../../data/lessons';
import { formatNumber } from '../../lib/numbers';

interface ProgressPanelProps {
  profile: ChildProfile;
  digitMode: DigitDisplayMode;
}

export const ProgressPanel: React.FC<ProgressPanelProps> = ({ profile, digitMode }) => {
  const completedLessons = LESSONS.filter((l) => profile.lessons[l.id]?.completed).length;
  const accuracy =
    profile.totalAttempts > 0
      ? Math.round((profile.totalCorrect / profile.totalAttempts) * 100)
      : 100;

  const skillEntries = (Object.keys(SKILL_LABELS) as SkillKey[]).map((key) => {
    const stat = profile.skills[key] ?? { correct: 0, attempts: 0 };
    const pct = stat.attempts > 0 ? Math.round((stat.correct / stat.attempts) * 100) : null;
    return { key, label: SKILL_LABELS[key], stat, pct };
  });

  const strongSkills = skillEntries.filter((s) => s.pct !== null && s.pct >= 75);
  const weakSkills = skillEntries.filter((s) => s.pct !== null && s.pct < 75);

  return (
    <div className="space-y-4">
      {/* Top 4 Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>درس‌های کامل‌شده</span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
            {formatNumber(completedLessons, digitMode)} / {formatNumber(LESSONS.length, digitMode)}
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="w-4 h-4 text-blue-500" />
            <span>زمان تمرین</span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
            {formatNumber(Math.max(1, profile.practiceMinutes), digitMode)} دقیقه
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Award className="w-4 h-4 text-violet-500" />
            <span>پاسخ‌های صحیح</span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
            {formatNumber(profile.totalCorrect, digitMode)} (%{formatNumber(accuracy, digitMode)})
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Star className="w-4 h-4 text-amber-500" />
            <span>مجموع ستاره‌ها</span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
            {formatNumber(profile.totalStars, digitMode)}
          </div>
        </div>
      </div>

      {/* Strong & Weak Skills Analysis */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
        <h2 className="font-extrabold text-sm text-slate-900 dark:text-white">
          تحلیل مهارت‌های {profile.name}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3">
            <div className="font-bold text-emerald-800 dark:text-emerald-200 mb-1">
              نقاط قوت:
            </div>
            {strongSkills.length > 0 ? (
              <ul className="space-y-1 text-emerald-900 dark:text-emerald-100">
                {strongSkills.map((s) => (
                  <li key={s.key}>
                    • {s.label} (%{formatNumber(s.pct!, digitMode)})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-emerald-700 dark:text-emerald-300">
                با ادامه تمرین، نقاط قوت نمایش داده می‌شوند.
              </p>
            )}
          </div>

          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 p-3">
            <div className="font-bold text-amber-900 dark:text-amber-200 mb-1">
              نیازمند تمرین بیشتر:
            </div>
            {weakSkills.length > 0 ? (
              <ul className="space-y-1 text-amber-950 dark:text-amber-100">
                {weakSkills.map((s) => (
                  <li key={s.key}>
                    • {s.label} (%{formatNumber(s.pct!, digitMode)})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-amber-800 dark:text-amber-300">
                همه مهارت‌های تمرین‌شده در وضعیت خوبی هستند!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
