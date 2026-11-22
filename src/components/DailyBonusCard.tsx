import React, { useState } from 'react';
import {
  Check,
  Coins,
  Flame,
  Gift,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import type { ChildProfile, DigitDisplayMode } from '../types/app';
import { formatNumber } from '../lib/numbers';
import {
  DAILY_BONUS_DAYS,
  getDailyBonusPreview,
  MEDAL_CATALOG,
} from '../lib/rewards';

interface DailyBonusCardProps {
  profile: ChildProfile;
  digitMode: DigitDisplayMode;
  onClaimBonus: () => {
    awardedPoints: number;
    newBadgeTitles: string[];
  };
  onOpenShop: () => void;
}

export const DailyBonusCard: React.FC<DailyBonusCardProps> = ({
  profile,
  digitMode,
  onClaimBonus,
  onOpenShop,
}) => {
  const [justClaimedInfo, setJustClaimedInfo] = useState<{
    points: number;
    badgeTitles: string[];
  } | null>(null);

  const preview = getDailyBonusPreview(profile);

  const handleClaim = () => {
    if (!preview.canClaimToday) return;
    const result = onClaimBonus();
    if (result.awardedPoints > 0) {
      setJustClaimedInfo({
        points: result.awardedPoints,
        badgeTitles: result.newBadgeTitles,
      });
    }
  };

  return (
    <section
      aria-label="پاداش حضور روزانه"
      className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 border-b-4 border-b-[#DFC6A8] shadow-[0_12px_28px_-10px_rgba(170,104,40,0.2)] p-4 sm:p-5 space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
            <span className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400 font-extrabold">
              <Flame className="w-4 h-4" />
              <span>
                رشته حضور: {formatNumber(preview.currentStreak, digitMode)} روز متوالی
              </span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 font-extrabold tabular-nums">
              <Coins className="w-4 h-4" />
              <span>
                موجودی باشگاه: {formatNumber(preview.rewardPointsBalance, digitMode)} امتیاز
              </span>
            </span>
          </div>
          <h2 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
            جایزه سر زدن روزانه برای خرید در فروشگاه
          </h2>
        </div>

        <button
          type="button"
          onClick={onOpenShop}
          className="min-h-[42px] px-3.5 py-2 rounded-2xl bg-[#FFF6EB] hover:bg-amber-100 dark:bg-slate-800 border border-[#EEDCC5] dark:border-slate-700 text-xs font-extrabold text-[#783F1D] dark:text-amber-200 inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
        >
          <ShoppingBag className="w-4 h-4 text-[#5472EB]" />
          <span>خرج امتیاز در فروشگاه</span>
        </button>
      </div>

      {/* 7-Day Reward Ladder */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {DAILY_BONUS_DAYS.map((step) => {
          const isCompletedDay = preview.canClaimToday
            ? step.day < preview.nextCycleDay
            : step.day <= preview.nextCycleDay;
          const isTodayTarget = preview.canClaimToday && step.day === preview.nextCycleDay;
          const medalName = step.bonusMedalId
            ? MEDAL_CATALOG.find((m) => m.id === step.bonusMedalId)?.title
            : undefined;

          return (
            <div
              key={step.day}
              title={medalName ? `${step.label} + مدال ${medalName}` : step.label}
              className={`rounded-2xl p-2 text-center flex flex-col items-center justify-between gap-1 border transition-all ${
                isCompletedDay
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                  : isTodayTarget
                    ? 'bg-[#FFF5D6] dark:bg-amber-950/50 border-[#F59E0B] ring-2 ring-amber-300/60 text-amber-950 dark:text-amber-100'
                    : 'bg-[#FFFBF5] dark:bg-slate-800/60 border-[#EFE0CE] dark:border-slate-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              <span className="text-[10px] font-bold whitespace-nowrap">
                روز {formatNumber(step.day, digitMode)}
              </span>

              <div className="w-7 h-7 rounded-xl flex items-center justify-center">
                {isCompletedDay ? (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                ) : step.bonusMedalId ? (
                  <Sparkles className="w-4 h-4 text-amber-500" />
                ) : (
                  <Coins className="w-4 h-4 text-amber-500" />
                )}
              </div>

              <span className="text-[11px] font-extrabold tabular-nums">
                +{formatNumber(step.points, digitMode)}
              </span>
            </div>
          );
        })}
      </div>

      {justClaimedInfo && (
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 p-3 text-xs font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-2 flex-wrap">
          <span>
            عالی بود! +{formatNumber(justClaimedInfo.points, digitMode)} امتیاز فروشگاه به حساب{' '}
            {profile.name} اضافه شد
            {justClaimedInfo.badgeTitles.length > 0
              ? ` و مدال «${justClaimedInfo.badgeTitles.join('، ')}» آزاد شد!`
              : '!'}
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        {preview.canClaimToday ? (
          <button
            type="button"
            onClick={handleClaim}
            className="flex-1 min-h-[48px] px-4 py-2.5 rounded-2xl bg-[#FF9500] hover:bg-[#EA8800] border-b-4 border-[#C56E00] active:border-b-0 active:translate-y-0.5 text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <Gift className="w-5 h-5" />
            <span className="tabular-nums">
              دریافت پاداش امروز (+{formatNumber(preview.todayRewardPoints, digitMode)} امتیاز
              {preview.todayBonusMedalId ? ' + مدال ویژه' : ''})
            </span>
          </button>
        ) : (
          <div className="flex-1 min-h-[46px] px-4 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>پاداش امروز دریافت شد — فردا برای جایزه بزرگ‌تر برگرد!</span>
          </div>
        )}
      </div>
    </section>
  );
};
