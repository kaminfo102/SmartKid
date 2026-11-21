import React from 'react';
import { Award, CheckCircle2, Clock, Star } from 'lucide-react';
import type { ChildProfile, DigitDisplayMode, SkillKey } from '../../types/app';
import { LESSONS, SKILL_LABELS } from '../../data/lessons';
import { formatNumber } from '../../lib/numbers';
import { KidIconTile } from '../../components/KidIconTile';

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
      {/* Top 4 Metrics with Colorful KidIconTiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 border-b-4 border-b-[#DFC6A8] p-3.5 flex items-center gap-3">
          <KidIconTile color="green" size="md">
            <CheckCircle2 className="w-6 h-6" />
          </KidIconTile>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
              درس‌های کامل
            </div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
              {formatNumber(completedLessons, digitMode)} / {formatNumber(LESSONS.length, digitMode)}
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 border-b-4 border-b-[#DFC6A8] p-3.5 flex items-center gap-3">
          <KidIconTile color="sky" size="md">
            <Clock className="w-6 h-6" />
          </KidIconTile>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
              زمان تمرین
            </div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
              {formatNumber(Math.max(1, profile.practiceMinutes), digitMode)} دقیقه
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 border-b-4 border-b-[#DFC6A8] p-3.5 flex items-center gap-3">
          <KidIconTile color="violet" size="md">
            <Award className="w-6 h-6" />
          </KidIconTile>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
              پاسخ درست
            </div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
              {formatNumber(profile.totalCorrect, digitMode)} (%{formatNumber(accuracy, digitMode)})
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 border-b-4 border-b-[#DFC6A8] p-3.5 flex items-center gap-3">
          <KidIconTile color="amber" size="md">
            <Star className="w-6 h-6 fill-white" />
          </KidIconTile>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
              ستاره‌ها
            </div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
              {formatNumber(profile.totalStars, digitMode)}
            </div>
          </div>
        </div>
      </div>

      {/* Strong & Weak Skills Analysis */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 border-b-4 border-b-[#DFC6A8] p-4 space-y-3">
        <h2 className="font-extrabold text-sm text-slate-900 dark:text-white">
          تحلیل مهارت‌های {profile.name}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3">
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

          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3">
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
