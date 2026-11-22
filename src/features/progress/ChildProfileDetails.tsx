import React, { useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  Brain,
  CheckCircle2,
  Clock,
  Coins,
  Compass,
  Crown,
  Flame,
  Gem,
  Lock,
  Play,
  Radar,
  Rocket,
  Star,
  Sun,
  Target,
  Trophy,
} from 'lucide-react';
import type {
  ChildProfile,
  DigitDisplayMode,
  LessonDefinition,
  RewardMedalDefinition,
  SkillKey,
} from '../../types/app';
import { LESSONS, SKILL_LABELS } from '../../data/lessons';
import { formatNumber } from '../../lib/numbers';
import {
  evaluateProfileBadges,
  getMedalProgress,
  MEDAL_CATALOG,
} from '../../lib/rewards';
import { AvatarGraphic } from '../../components/MascotDana';

interface ChildProfileDetailsProps {
  profile: ChildProfile;
  digitMode: DigitDisplayMode;
  lessons?: LessonDefinition[];
  onPracticeSkill?: (skill: SkillKey) => void;
  onOpenShop?: () => void;
}

const SKILL_SHORT_LABELS: Record<SkillKey, string> = {
  recognition: 'شناخت ۰ تا ۹',
  placeValue: 'ارزش مکانی',
  simpleAddition: 'جمع ساده',
  simpleSubtraction: 'تفریق ساده',
  complements: 'مکمل‌های ۵ و ۱۰',
  mentalMath: 'محاسبه ذهنی',
};

const SKILL_COLORS: Record<SkillKey, string> = {
  recognition: '#2563EB',
  placeValue: '#0D9488',
  simpleAddition: '#16A34A',
  simpleSubtraction: '#EA580C',
  complements: '#7C3AED',
  mentalMath: '#DB2777',
};

const LEVEL_TITLES: Record<number, string> = {
  1: 'کاوشگر نوپا',
  2: 'دوست چرتکه',
  3: 'ماهر محاسبه',
  4: 'قهرمان اعداد',
  5: 'نابغه سوروبان',
};

export const MedalIconGlyph: React.FC<{
  icon: RewardMedalDefinition['icon'];
  className?: string;
}> = ({ icon, className = 'w-6 h-6' }) => {
  switch (icon) {
    case 'star':
      return <Star className={className} />;
    case 'trophy':
      return <Trophy className={className} />;
    case 'target':
      return <Target className={className} />;
    case 'brain':
      return <Brain className={className} />;
    case 'flame':
      return <Flame className={className} />;
    case 'sun':
      return <Sun className={className} />;
    case 'crown':
      return <Crown className={className} />;
    case 'rocket':
      return <Rocket className={className} />;
    case 'gem':
      return <Gem className={className} />;
    case 'compass':
    default:
      return <Compass className={className} />;
  }
};

export const ChildProfileDetails: React.FC<ChildProfileDetailsProps> = ({
  profile,
  digitMode,
  lessons = LESSONS,
  onPracticeSkill,
  onOpenShop,
}) => {
  const [chartMode, setChartMode] = useState<'bar' | 'radar'>('bar');
  const [selectedSkill, setSelectedSkill] = useState<SkillKey>('recognition');
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'earned' | 'locked'>('all');

  const completedLessonsCount = useMemo(
    () => lessons.filter((l) => profile.lessons[l.id]?.completed).length,
    [lessons, profile.lessons]
  );

  const accuracy =
    profile.totalAttempts > 0
      ? Math.round((profile.totalCorrect / profile.totalAttempts) * 100)
      : 0;

  const skillRows = useMemo(() => {
    return (Object.keys(SKILL_LABELS) as SkillKey[]).map((key) => {
      const stat = profile.skills[key] ?? { correct: 0, attempts: 0 };
      const pct =
        stat.attempts > 0 ? Math.round((stat.correct / stat.attempts) * 100) : 0;
      const statusLabel =
        stat.attempts === 0
          ? 'شروع نشده'
          : pct >= 80
            ? 'تسلط عالی'
            : pct >= 55
              ? 'در حال پیشرفت'
              : 'نیازمند تمرین';
      return {
        key,
        label: SKILL_LABELS[key],
        shortLabel: SKILL_SHORT_LABELS[key],
        color: SKILL_COLORS[key],
        correct: stat.correct,
        attempts: stat.attempts,
        pct,
        statusLabel,
      };
    });
  }, [profile.skills]);

  const activeSkillRow =
    skillRows.find((s) => s.key === selectedSkill) ?? skillRows[0];

  const earnedBadgeSet = useMemo(() => {
    return new Set(evaluateProfileBadges(profile, lessons));
  }, [profile, lessons]);

  const earnedCount = MEDAL_CATALOG.filter((m) => earnedBadgeSet.has(m.id)).length;

  const filteredMedals = useMemo(() => {
    return MEDAL_CATALOG.filter((m) => {
      const owned = earnedBadgeSet.has(m.id);
      if (badgeFilter === 'earned') return owned;
      if (badgeFilter === 'locked') return !owned;
      return true;
    });
  }, [badgeFilter, earnedBadgeSet]);

  // Radar SVG geometry (6 vertices around center 160, 145)
  const radarGeometry = useMemo(() => {
    const cx = 160;
    const cy = 145;
    const maxR = 90;
    const count = skillRows.length;

    const pointAt = (index: number, ratio: number) => {
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
      return {
        x: cx + Math.cos(angle) * maxR * ratio,
        y: cy + Math.sin(angle) * maxR * ratio,
      };
    };

    const gridPolygons = [0.25, 0.5, 0.75, 1].map((ring) =>
      skillRows
        .map((_, idx) => {
          const p = pointAt(idx, ring);
          return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
        })
        .join(' ')
    );

    const dataPoints = skillRows.map((row, idx) => {
      const ratio = row.attempts > 0 ? Math.max(0.12, row.pct / 100) : 0.06;
      const pt = pointAt(idx, ratio);
      const labelPt = pointAt(idx, 1.24);
      const axisEnd = pointAt(idx, 1);
      return {
        row,
        x: pt.x,
        y: pt.y,
        lx: labelPt.x,
        ly: labelPt.y,
        ax: axisEnd.x,
        ay: axisEnd.y,
      };
    });

    const dataPolygon = dataPoints
      .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');

    return { cx, cy, gridPolygons, dataPoints, dataPolygon };
  }, [skillRows]);

  const rewardPoints = Math.max(0, profile.rewardPoints ?? 0);
  const currentStreak = profile.dailyBonus?.streak ?? 0;

  return (
    <div className="space-y-5">
      {/* Child Profile Summary Header */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 shadow-[0_12px_28px_-10px_rgba(170,104,40,0.2)] p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#F2E5D5] dark:border-slate-800">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-[#FFF6EB] dark:bg-slate-800 border-2 border-[#EEDCC5] dark:border-slate-700 flex items-center justify-center shrink-0">
              <AvatarGraphic avatar={profile.avatar} className="w-14 h-14 sm:w-16 sm:h-16" />
            </div>
            <div className="min-w-0 space-y-1">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white truncate">
                کارنامه و مدال‌های {profile.name}
              </h2>
              <div className="flex items-center flex-wrap gap-2 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">
                <span>{formatNumber(profile.age, digitMode)} ساله</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#5472EB] dark:text-blue-400">
                  سطح {formatNumber(profile.difficultyLevel, digitMode)}:{' '}
                  {LEVEL_TITLES[profile.difficultyLevel] ?? 'کاوشگر'}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  رشته حضور: {formatNumber(currentStreak, digitMode)} روز
                </span>
              </div>
            </div>
          </div>

          {onOpenShop && (
            <button
              type="button"
              onClick={onOpenShop}
              className="min-h-[44px] px-4 py-2 rounded-2xl bg-[#FFDC5E] hover:bg-[#F5CE3D] border-b-4 border-[#DFAD19] text-[#5C3A00] font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shrink-0 transition-transform active:translate-y-0.5"
            >
              <Coins className="w-4 h-4" />
              <span className="tabular-nums">
                {formatNumber(rewardPoints, digitMode)} امتیاز در فروشگاه
              </span>
            </button>
          )}
        </div>

        {/* 4 Single-Row Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
          <div className="p-3 rounded-2xl bg-[#FFF9F2] dark:bg-slate-800/70 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
              <Star className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />
              <span>مجموع ستاره‌ها</span>
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {formatNumber(profile.totalStars, digitMode)}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#FFF9F2] dark:bg-slate-800/70 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>دقت پاسخ‌ها</span>
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {profile.totalAttempts > 0
                ? `${formatNumber(accuracy, digitMode)}٪`
                : '۰٪'}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#FFF9F2] dark:bg-slate-800/70 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
              <Award className="w-4 h-4 text-[#5472EB] shrink-0" />
              <span>مراحل تکمیل‌شده</span>
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {formatNumber(completedLessonsCount, digitMode)} از{' '}
              {formatNumber(lessons.length, digitMode)}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#FFF9F2] dark:bg-slate-800/70 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
              <Clock className="w-4 h-4 text-sky-600 shrink-0" />
              <span>زمان تمرین</span>
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {formatNumber(profile.practiceMinutes, digitMode)} دقیقه
            </div>
          </div>
        </div>
      </section>

      {/* Skills Progress Chart Section */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 shadow-[0_12px_28px_-10px_rgba(170,104,40,0.18)] p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              نمودار پیشرفت مهارت‌های چرتکه
            </h3>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              روی هر مهارت بزن تا جزئیات پاسخ‌های درست و پیشنهاد تمرین را ببینی
            </p>
          </div>

          <div
            role="tablist"
            aria-label="نوع نمایش نمودار مهارت‌ها"
            className="inline-flex items-center gap-1 p-1 rounded-2xl bg-[#FFF6EB] dark:bg-slate-800 border border-[#EEDCC5] dark:border-slate-700 self-start sm:self-auto"
          >
            <button
              type="button"
              role="tab"
              aria-selected={chartMode === 'bar'}
              onClick={() => setChartMode('bar')}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                chartMode === 'bar'
                  ? 'bg-[#5472EB] text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>نمودار ستونی</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={chartMode === 'radar'}
              onClick={() => setChartMode('radar')}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                chartMode === 'radar'
                  ? 'bg-[#5472EB] text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Radar className="w-4 h-4" />
              <span>نمودار راداری</span>
            </button>
          </div>
        </div>

        {chartMode === 'bar' ? (
          <div className="space-y-3">
            {/* SVG Horizontal Bar Chart for clean RTL Persian legibility */}
            <div className="space-y-2.5">
              {skillRows.map((row) => {
                const isSelected = row.key === activeSkillRow.key;
                const barWidth = row.attempts > 0 ? Math.max(6, row.pct) : 0;
                return (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => setSelectedSkill(row.key)}
                    className={`w-full text-right p-3 rounded-2xl border transition-colors ${
                      isSelected
                        ? 'bg-[#F4F7FF] dark:bg-blue-950/30 border-[#5472EB] dark:border-blue-500'
                        : 'bg-[#FFFBF5] dark:bg-slate-800/50 border-[#EFE0CE] dark:border-slate-800 hover:border-[#D9BFA0]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs sm:text-sm mb-2">
                      <span className="font-extrabold text-slate-900 dark:text-white truncate">
                        {row.label}
                      </span>
                      <div className="flex items-center gap-2 shrink-0 text-xs font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                        <span>{row.statusLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {formatNumber(row.correct, digitMode)} از{' '}
                          {formatNumber(row.attempts, digitMode)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className="font-extrabold"
                          style={{ color: row.attempts > 0 ? row.color : undefined }}
                        >
                          {formatNumber(row.pct, digitMode)}٪
                        </span>
                      </div>
                    </div>

                    <div className="h-3.5 w-full rounded-full bg-slate-200/80 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: row.color,
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-full max-w-[340px] mx-auto shrink-0">
              <svg
                viewBox="0 0 320 290"
                className="w-full h-auto overflow-visible"
                role="img"
                aria-label="نمودار راداری مهارت‌های چرتکه"
              >
                {/* Concentric hexagonal grid */}
                {radarGeometry.gridPolygons.map((pts, idx) => (
                  <polygon
                    key={idx}
                    points={pts}
                    fill={idx % 2 === 0 ? 'rgba(84,114,235,0.03)' : 'none'}
                    stroke="#E2D2BF"
                    className="dark:stroke-slate-700"
                    strokeWidth="1.2"
                  />
                ))}

                {/* Radial Axes */}
                {radarGeometry.dataPoints.map((pt) => (
                  <line
                    key={pt.row.key}
                    x1={radarGeometry.cx}
                    y1={radarGeometry.cy}
                    x2={pt.ax}
                    y2={pt.ay}
                    stroke="#E2D2BF"
                    className="dark:stroke-slate-700"
                    strokeWidth="1"
                  />
                ))}

                {/* Data Area */}
                <polygon
                  points={radarGeometry.dataPolygon}
                  fill="rgba(84, 114, 235, 0.25)"
                  stroke="#5472EB"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />

                {/* Interactive Vertices & Labels */}
                {radarGeometry.dataPoints.map((pt) => {
                  const isSelected = pt.row.key === activeSkillRow.key;
                  return (
                    <g
                      key={pt.row.key}
                      className="cursor-pointer"
                      onClick={() => setSelectedSkill(pt.row.key)}
                    >
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isSelected ? 7 : 5}
                        fill={pt.row.color}
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      <text
                        x={pt.lx}
                        y={pt.ly}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-slate-800 dark:fill-slate-200 text-[10px] font-bold select-none"
                      >
                        {pt.row.shortLabel}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="flex-1 w-full space-y-2">
              {skillRows.map((row) => {
                const isSelected = row.key === activeSkillRow.key;
                return (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => setSelectedSkill(row.key)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-xs transition-colors ${
                      isSelected
                        ? 'bg-[#F4F7FF] dark:bg-blue-950/30 border-[#5472EB]'
                        : 'bg-[#FFFBF5] dark:bg-slate-800/50 border-[#EFE0CE] dark:border-slate-800'
                    }`}
                  >
                    <span className="font-extrabold text-slate-800 dark:text-white">
                      {row.shortLabel}
                    </span>
                    <span className="font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                      {formatNumber(row.pct, digitMode)}٪ ({row.statusLabel})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected Skill Detail Callout + Direct Practice Action */}
        <div className="rounded-2xl bg-[#FFF6EB] dark:bg-slate-800/80 border border-[#EEDCC5] dark:border-slate-700 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-sm font-extrabold text-slate-900 dark:text-white">
              {activeSkillRow.label}
            </div>
            <div className="text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums">
              {activeSkillRow.attempts > 0
                ? `${formatNumber(activeSkillRow.correct, digitMode)} پاسخ درست از ${formatNumber(
                    activeSkillRow.attempts,
                    digitMode
                  )} تلاش (${formatNumber(activeSkillRow.pct, digitMode)}٪ موفقیت)`
                : 'هنوز در این مهارت تمرینی انجام نشده است — همین الان شروع کن!'}
            </div>
          </div>

          {onPracticeSkill && (
            <button
              type="button"
              onClick={() => onPracticeSkill(activeSkillRow.key)}
              className="min-h-[44px] px-4 py-2 rounded-2xl bg-[#4BB543] hover:bg-[#41A23A] border-b-4 border-[#2E8228] text-white font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-transform active:translate-y-0.5"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>تمرین این مهارت</span>
            </button>
          )}
        </div>
      </section>

      {/* Earned Medals & Badges Showcase */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 shadow-[0_12px_28px_-10px_rgba(170,104,40,0.18)] p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              تالار مدال‌ها و نشان‌های افتخار
            </h3>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
              {formatNumber(earnedCount, digitMode)} از{' '}
              {formatNumber(MEDAL_CATALOG.length, digitMode)} مدال کسب شده است
            </p>
          </div>

          <div
            role="tablist"
            aria-label="فیلتر مدال‌ها"
            className="inline-flex items-center gap-1 p-1 rounded-2xl bg-[#FFF6EB] dark:bg-slate-800 border border-[#EEDCC5] dark:border-slate-700 self-start sm:self-auto"
          >
            {(
              [
                { id: 'all', label: 'همه مدال‌ها' },
                { id: 'earned', label: 'کسب‌شده' },
                { id: 'locked', label: 'در انتظار' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={badgeFilter === tab.id}
                onClick={() => setBadgeFilter(tab.id)}
                className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap shrink-0 transition-colors ${
                  badgeFilter === tab.id
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredMedals.length === 0 ? (
          <div className="rounded-2xl bg-[#FFFBF5] dark:bg-slate-800/50 border border-[#EFE0CE] dark:border-slate-800 p-8 text-center space-y-2">
            <Trophy className="w-10 h-10 text-amber-400 mx-auto" />
            <div className="text-sm font-extrabold text-slate-800 dark:text-white">
              {badgeFilter === 'earned'
                ? 'هنوز مدالی در این بخش کسب نشده است'
                : 'همه مدال‌ها کسب شده‌اند — فوق‌العاده است!'}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              با انجام درس‌ها، دریافت پاداش روزانه و خرید نشان‌های فروشگاه مدال‌های جدید باز کن.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredMedals.map((medal) => {
              const owned = earnedBadgeSet.has(medal.id);
              const progress = getMedalProgress(profile, medal.id, lessons);

              return (
                <article
                  key={medal.id}
                  className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all ${
                    owned
                      ? 'bg-[#FFFDF8] dark:bg-slate-800/90 border-[#E9C97B] dark:border-amber-600/70 shadow-sm'
                      : 'bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-85'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-white shadow-sm"
                      style={{
                        backgroundColor: owned ? medal.accentColor : '#94A3B8',
                      }}
                    >
                      <MedalIconGlyph icon={medal.icon} className="w-6 h-6" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        <span>{medal.categoryLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            owned
                              ? 'text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1'
                              : 'text-slate-500 inline-flex items-center gap-1'
                          }
                        >
                          {owned ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>کسب شده</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3" />
                              <span>قفل</span>
                            </>
                          )}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-snug">
                        {medal.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {medal.description}
                      </p>
                    </div>
                  </div>

                  {!owned && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                        <span>پیشرفت تا باز شدن</span>
                        <span>
                          {formatNumber(progress.current, digitMode)} از{' '}
                          {formatNumber(progress.target, digitMode)}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#5472EB] transition-all"
                          style={{ width: `${progress.percent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
