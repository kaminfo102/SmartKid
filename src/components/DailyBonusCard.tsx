import React, { useMemo, useState } from 'react';
import { Check, Flame, Star } from 'lucide-react';
import type { ChildProfile, DigitDisplayMode } from '../types/app';
import { formatNumber } from '../lib/numbers';
import { getDailyBonusPreview, getLocalDateKey } from '../lib/rewards';
import { audioEngine } from '../lib/audioEngine';

interface DailyBonusCardProps {
  profile: ChildProfile;
  digitMode: DigitDisplayMode;
  compact?: boolean;
  onClaimBonus: () => {
    awardedPoints: number;
    newBadgeTitles: string[];
  };
  onOpenShop: () => void;
}

const PERSIAN_WEEKDAYS = [
  { index: 0, short: 'ش', full: 'شنبه' },
  { index: 1, short: 'ی', full: 'یک‌شنبه' },
  { index: 2, short: 'د', full: 'دوشنبه' },
  { index: 3, short: 'س', full: 'سه‌شنبه' },
  { index: 4, short: 'چ', full: 'چهارشنبه' },
  { index: 5, short: 'پ', full: 'پنج‌شنبه' },
  { index: 6, short: 'ج', full: 'جمعه' },
] as const;

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

  const weekNodes = useMemo(() => {
    const now = new Date();
    // JS getDay(): 0=Sun..6=Sat -> Persian week index: 0=Sat(ش)..6=Fri(ج)
    const todayPersianIdx = (now.getDay() + 1) % 7;

    const claimedDates = new Set<string>(
      Array.isArray(profile.dailyBonus?.history) ? profile.dailyBonus.history : []
    );
    if (profile.dailyBonus?.lastClaimDate) {
      claimedDates.add(profile.dailyBonus.lastClaimDate);
    }

    // Legacy fallback: infer recent streak dates if history wasn't populated yet
    if (
      claimedDates.size <= 1 &&
      profile.dailyBonus?.lastClaimDate &&
      (profile.dailyBonus?.streak ?? 0) > 1
    ) {
      const parts = profile.dailyBonus.lastClaimDate.split('-').map(Number);
      if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
        const base = new Date(parts[0], parts[1] - 1, parts[2]);
        for (let i = 0; i < Math.min(7, profile.dailyBonus.streak); i++) {
          const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i);
          claimedDates.add(getLocalDateKey(d));
        }
      }
    }

    return PERSIAN_WEEKDAYS.map((day) => {
      const offset = day.index - todayPersianIdx;
      const dateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      const key = getLocalDateKey(dateObj);
      return {
        ...day,
        dateKey: key,
        isToday: day.index === todayPersianIdx,
        isClaimed: claimedDates.has(key),
      };
    });
  }, [profile.dailyBonus]);

  const handleRewardBoxClick = () => {
    if (preview.canClaimToday) {
      const result = onClaimBonus();
      if (result.awardedPoints > 0) {
        setJustClaimedInfo({
          points: result.awardedPoints,
          badgeTitles: result.newBadgeTitles,
        });
      }
      return;
    }
    audioEngine.play('uiTap');
    onOpenShop();
  };

  const displayPoints = preview.canClaimToday
    ? preview.todayRewardPoints
    : preview.rewardPointsBalance;

  return (
    <section
      aria-label="استمرار یادگیری و پاداش روزانه"
      className="rounded-[28px] bg-[#F3EFFE] dark:bg-slate-900 border-2 border-[#E5DCFA] dark:border-violet-900/70 shadow-[0_10px_28px_-10px_rgba(109,77,246,0.2)] p-4 sm:p-5 space-y-3"
    >
      <div className="flex flex-col min-[430px]:flex-row min-[430px]:items-center justify-between gap-3.5">
        {/* Right Block: Streak Title + 7 Persian Weekday Circles */}
        <div className="space-y-3 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tabular-nums">
              استمرار یادگیری تو: {formatNumber(preview.currentStreak, digitMode)} روز پیاپی
            </h2>
            <Flame
              aria-hidden="true"
              className="w-4 h-4 sm:w-5 sm:h-5 text-[#F97316] fill-[#FBBF24] shrink-0"
            />
          </div>

          <div className="flex items-center justify-between min-[430px]:justify-start gap-1.5 sm:gap-2">
            {weekNodes.map((node) => {
              const canTapToday = node.isToday && preview.canClaimToday;
              return (
                <div
                  key={node.short}
                  title={node.full}
                  className="flex flex-col items-center gap-1"
                >
                  <button
                    type="button"
                    disabled={!canTapToday}
                    onClick={() => {
                      if (canTapToday) handleRewardBoxClick();
                    }}
                    aria-label={
                      canTapToday
                        ? `${node.full} — دریافت پاداش امروز`
                        : `${node.full}${node.isClaimed ? ' (انجام شده)' : ''}`
                    }
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-black transition-all shrink-0 ${
                      node.isClaimed
                        ? `bg-[#6D4DF6] text-white shadow-xs ${
                            node.isToday ? 'ring-2 ring-[#FBBF24] ring-offset-1 ring-offset-[#F3EFFE] dark:ring-offset-slate-900' : ''
                          }`
                        : node.isToday
                        ? 'bg-[#FFF3C4] dark:bg-amber-950/70 border-2 border-[#F59E0B] text-[#78350F] dark:text-amber-200 shadow-xs hover:scale-105 cursor-pointer'
                        : 'bg-[#E3DDF4] dark:bg-slate-800 text-[#6F6887] dark:text-slate-400 cursor-default'
                    }`}
                  >
                    {node.isClaimed ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <span>{node.short}</span>
                    )}
                  </button>

                  <span
                    className={`text-[11px] leading-none ${
                      node.isToday
                        ? 'font-black text-[#6D4DF6] dark:text-violet-300'
                        : 'font-bold text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {node.short}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Left Block: Crisp White Star + Points Reward Card */}
        <button
          type="button"
          onClick={handleRewardBoxClick}
          aria-label={
            preview.canClaimToday
              ? `دریافت ${formatNumber(preview.todayRewardPoints, digitMode)} امتیاز جایزه امروز`
              : `موجودی ${formatNumber(preview.rewardPointsBalance, digitMode)} امتیاز — ورود به فروشگاه`
          }
          className={`rounded-2xl bg-white dark:bg-slate-800 border-2 px-3.5 py-2.5 min-w-[92px] sm:min-w-[100px] flex min-[430px]:flex-col items-center justify-center gap-2 min-[430px]:gap-1 shadow-[0_8px_20px_-8px_rgba(109,77,246,0.28)] transition-all shrink-0 active:translate-y-0.5 ${
            preview.canClaimToday
              ? 'border-[#FBBF24] hover:scale-[1.03] ring-2 ring-[#FDE68A]/70 dark:ring-amber-500/30'
              : 'border-white dark:border-slate-700 hover:border-[#C4B5FD]'
          }`}
        >
          <Star className="w-7 h-7 sm:w-8 sm:h-8 fill-[#FACC15] text-[#D97706] shrink-0 drop-shadow-xs" />
          <div className="text-center">
            <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-amber-200 tabular-nums whitespace-nowrap">
              {formatNumber(displayPoints, digitMode)} امتیاز
            </div>
            <div
              className={`text-[10px] font-extrabold whitespace-nowrap ${
                preview.canClaimToday
                  ? 'text-[#6D4DF6] dark:text-amber-300'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {preview.canClaimToday ? 'بزن و بگیر!' : 'دریافت شد · فروشگاه'}
            </div>
          </div>
        </button>
      </div>

      {justClaimedInfo && (
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 px-3 py-2 text-xs font-extrabold text-emerald-900 dark:text-emerald-200">
          آفرین! +{formatNumber(justClaimedInfo.points, digitMode)} امتیاز جایزه به حسابت اضافه شد
          {justClaimedInfo.badgeTitles.length > 0
            ? ` و مدال «${justClaimedInfo.badgeTitles.join('، ')}» باز شد!`
            : '!'}
        </div>
      )}
    </section>
  );
};
