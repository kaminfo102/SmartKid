import React from 'react';
import type {
  ChildProfile,
  DigitDisplayMode,
  LessonDefinition,
  SkillKey,
} from '../../types/app';
import { LESSONS, SKILL_LABELS } from '../../data/lessons';
import { formatNumber } from '../../lib/numbers';
import { ChildProfileDetails } from './ChildProfileDetails';

interface ProgressPanelProps {
  profile: ChildProfile;
  digitMode: DigitDisplayMode;
  lessons?: LessonDefinition[];
}

export const ProgressPanel: React.FC<ProgressPanelProps> = ({
  profile,
  digitMode,
  lessons = LESSONS,
}) => {
  const skillEntries = (Object.keys(SKILL_LABELS) as SkillKey[]).map((key) => {
    const stat = profile.skills[key] ?? { correct: 0, attempts: 0 };
    const pct = stat.attempts > 0 ? Math.round((stat.correct / stat.attempts) * 100) : null;
    return { key, label: SKILL_LABELS[key], stat, pct };
  });

  const strongSkills = skillEntries.filter((s) => s.pct !== null && s.pct >= 75);
  const weakSkills = skillEntries.filter((s) => s.pct !== null && s.pct < 75);

  return (
    <div className="space-y-4">
      <ChildProfileDetails
        profile={profile}
        digitMode={digitMode}
        lessons={lessons}
      />

      {/* Strong & Weak Skills Quick Summary for Parents */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 border-b-4 border-b-[#DFC6A8] shadow-[0_8px_20px_-6px_rgba(170,104,40,0.14)] p-4 space-y-3">
        <h2 className="font-extrabold text-sm text-slate-900 dark:text-white">
          خلاصه تحلیل مهارت‌های {profile.name}
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
