import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  Coins,
  Crown,
  Flame,
  LogIn,
  RefreshCw,
  Star,
  Trophy,
} from 'lucide-react';
import type {
  ChildProfile,
  DigitDisplayMode,
  LeaderboardEntry,
  LeaderboardSortKey,
  WordPressUser,
} from '../../types/app';
import { formatNumber } from '../../lib/numbers';
import { fetchWordPressLeaderboard } from '../../lib/wordpressApi';
import { AvatarGraphic } from '../../components/MascotDana';
import { audioEngine } from '../../lib/audioEngine';
import leaderboardPodiumImg from '../../assets/images/leaderboard_podium_scene_1795553020200.jpg';

interface LeaderboardScreenProps {
  wpUrl: string;
  wpUser: WordPressUser | null;
  profiles: ChildProfile[];
  activeProfile: ChildProfile;
  digitMode: DigitDisplayMode;
  onOpenAuth: () => void;
  onBack: () => void;
}

const SORT_TABS: Array<{ key: LeaderboardSortKey; label: string }> = [
  { key: 'stars', label: 'ستاره‌ها' },
  { key: 'points', label: 'امتیاز باشگاه' },
  { key: 'streak', label: 'استمرار روزانه' },
];

function getMetricValue(entry: LeaderboardEntry, sort: LeaderboardSortKey): number {
  if (sort === 'points') return entry.rewardPoints;
  if (sort === 'streak') return entry.streak;
  return entry.totalStars;
}

function getMetricUnitLabel(sort: LeaderboardSortKey): string {
  if (sort === 'points') return 'امتیاز';
  if (sort === 'streak') return 'روز';
  return 'ستاره';
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({
  wpUrl,
  wpUser,
  profiles,
  activeProfile,
  digitMode,
  onOpenAuth,
  onBack,
}) => {
  const [sort, setSort] = useState<LeaderboardSortKey>('stars');
  const [remoteEntries, setRemoteEntries] = useState<LeaderboardEntry[]>([]);
  const [remoteMyBest, setRemoteMyBest] = useState<LeaderboardEntry | null>(null);
  const [totalParticipants, setTotalParticipants] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bannerImgFailed, setBannerImgFailed] = useState(false);

  const loadLeaderboard = useCallback(
    async (activeSort: LeaderboardSortKey) => {
      if (!wpUrl) {
        setRemoteEntries([]);
        setRemoteMyBest(null);
        setTotalParticipants(0);
        return;
      }
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetchWordPressLeaderboard(wpUrl, activeSort, 30);
        setRemoteEntries(res.entries);
        setRemoteMyBest(res.myBestEntry ?? null);
        setTotalParticipants(res.totalParticipants);
      } catch (err) {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'دریافت جدول قهرمانان آنلاین با خطا مواجه شد.'
        );
      } finally {
        setLoading(false);
      }
    },
    [wpUrl]
  );

  useEffect(() => {
    void loadLeaderboard(sort);
  }, [sort, loadLeaderboard]);

  const localEntries = useMemo<LeaderboardEntry[]>(() => {
    return profiles.map((p) => {
      const accuracy =
        p.totalAttempts > 0
          ? Math.min(100, Math.round((p.totalCorrect / p.totalAttempts) * 100))
          : 0;
      return {
        rank: 1,
        profileId: p.id,
        name: p.name,
        avatar: p.avatar,
        avatarUrl: p.avatarUrl,
        age: p.age,
        totalStars: p.totalStars,
        rewardPoints: Math.max(0, p.rewardPoints ?? 0),
        badgesCount: Array.isArray(p.badges) ? p.badges.length : 0,
        streak: p.dailyBonus?.streak ?? 0,
        practiceMinutes: p.practiceMinutes,
        accuracy,
        isCurrentUser: p.id === activeProfile.id,
      };
    });
  }, [profiles, activeProfile.id]);

  // Merge remote leaderboard with active child profile seamlessly when guest/offline
  const displayEntries = useMemo<LeaderboardEntry[]>(() => {
    if (remoteEntries.length === 0) {
      const sorted = [...localEntries].sort(
        (a, b) => getMetricValue(b, sort) - getMetricValue(a, sort)
      );
      return sorted.map((item, idx) => ({ ...item, rank: idx + 1 }));
    }
    return remoteEntries.map((entry) => ({
      ...entry,
      isCurrentUser:
        Boolean(entry.isCurrentUser) && entry.profileId === activeProfile.id
          ? true
          : Boolean(entry.isCurrentUser),
    }));
  }, [remoteEntries, localEntries, sort, activeProfile.id]);

  const activeLocalEntry = useMemo<LeaderboardEntry>(() => {
    return (
      localEntries.find((e) => e.profileId === activeProfile.id) ?? {
        rank: 1,
        profileId: activeProfile.id,
        name: activeProfile.name,
        avatar: activeProfile.avatar,
        avatarUrl: activeProfile.avatarUrl,
        age: activeProfile.age,
        totalStars: activeProfile.totalStars,
        rewardPoints: Math.max(0, activeProfile.rewardPoints ?? 0),
        badgesCount: activeProfile.badges.length,
        streak: activeProfile.dailyBonus?.streak ?? 0,
        practiceMinutes: activeProfile.practiceMinutes,
        accuracy:
          activeProfile.totalAttempts > 0
            ? Math.round((activeProfile.totalCorrect / activeProfile.totalAttempts) * 100)
            : 0,
        isCurrentUser: true,
      }
    );
  }, [localEntries, activeProfile]);

  const myStanding = useMemo<LeaderboardEntry>(() => {
    const matchedRemote = displayEntries.find(
      (e) => e.profileId === activeProfile.id || e.isCurrentUser
    );
    if (matchedRemote) return matchedRemote;
    if (remoteMyBest) return remoteMyBest;
    return activeLocalEntry;
  }, [displayEntries, remoteMyBest, activeLocalEntry, activeProfile.id]);

  const podiumTop3 = displayEntries.slice(0, 3);
  const restEntries = displayEntries.slice(3);

  // Visual podium order: [2nd (right in RTL), 1st (center), 3rd (left in RTL)]
  const firstPlace = podiumTop3[0] ?? null;
  const secondPlace = podiumTop3[1] ?? null;
  const thirdPlace = podiumTop3[2] ?? null;

  return (
    <div className="min-h-screen flex flex-col bg-[#F6E6CF] dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Compact Sticky Top Bar */}
      <header className="sticky top-0 z-30 bg-gradient-to-b from-[#F49A67] to-[#F7B684] dark:from-slate-900 dark:to-slate-900 border-b-2 border-[#E3B488] dark:border-slate-800 px-4 h-16 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            audioEngine.play('uiTap');
            onBack();
          }}
          aria-label="بازگشت به صفحه اصلی"
          className="min-h-[44px] min-w-[44px] rounded-2xl bg-white/95 hover:bg-white dark:bg-slate-800 border-b-4 border-[#DFC6A8] dark:border-slate-700 flex items-center justify-center text-[#783F1D] dark:text-slate-200 shrink-0"
        >
          <ArrowRight className="w-5 h-5" />
        </button>

        <h1 className="text-base sm:text-lg font-black text-white drop-shadow-[0_2px_0_rgba(148,70,22,0.45)] truncate">
          جدول قهرمانان چرتکه
        </h1>

        <button
          type="button"
          onClick={() => {
            audioEngine.play('uiTap');
            void loadLeaderboard(sort);
          }}
          disabled={loading}
          aria-label="به‌روزرسانی جدول قهرمانان"
          className="min-h-[44px] min-w-[44px] rounded-2xl bg-white/95 hover:bg-white dark:bg-slate-800 border-b-4 border-[#DFC6A8] dark:border-slate-700 flex items-center justify-center text-[#783F1D] dark:text-slate-200 disabled:opacity-60 shrink-0"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-5 space-y-5 pb-14">
        {/* Champions Podium Scene */}
        <section className="relative rounded-3xl overflow-hidden border-2 border-[#EEDCC5] dark:border-slate-800 shadow-[0_16px_34px_-12px_rgba(170,104,40,0.28)] bg-gradient-to-b from-[#8ED5F8] via-[#CFEFFF] to-[#98DC62] dark:from-slate-800 dark:to-slate-900">
          {!bannerImgFailed && (
            <img
              src={leaderboardPodiumImg}
              alt="سکوی قهرمانان چرتکه کودک نابغه"
              referrerPolicy="no-referrer"
              onError={() => setBannerImgFailed(true)}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-slate-950/35"
          />

          <div className="relative z-10 p-4 sm:p-6 space-y-5">
            {/* Top Controls Row: Filter Tabs + Participant Count */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-white space-y-0.5">
                <div className="text-xs font-bold text-amber-200">
                  رتبه‌بندی زنده دانش‌آموزان
                  {totalParticipants > 0 && (
                    <>
                      {' · '}
                      <span className="tabular-nums">
                        {formatNumber(totalParticipants, digitMode)} قهرمان
                      </span>
                    </>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-black">
                  برترین‌های چرتکه کودک نابغه
                </h2>
              </div>

              <div
                role="tablist"
                aria-label="مرتب‌سازی لیدربورد"
                className="inline-flex items-center gap-1 p-1 rounded-2xl bg-slate-950/65 border border-white/15 self-start sm:self-auto"
              >
                {SORT_TABS.map((tab) => {
                  const active = sort === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        audioEngine.play('uiTap');
                        setSort(tab.key);
                      }}
                      className={`min-h-[40px] px-3 sm:px-3.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-amber-400 text-slate-950 shadow-sm'
                          : 'text-slate-100 hover:bg-white/10'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3-Step Champions Podium */}
            {podiumTop3.length > 0 && (
              <div className="grid grid-cols-3 gap-2.5 sm:gap-5 items-end pt-4">
                {/* Rank #2 */}
                <div className="flex flex-col items-center text-center">
                  {secondPlace ? (
                    <>
                      <div className="relative mb-2">
                        <AvatarGraphic
                          avatar={secondPlace.avatar}
                          imageUrl={secondPlace.avatarUrl}
                          alt={secondPlace.name}
                          className="w-14 h-14 sm:w-18 sm:h-18 rounded-full border-4 border-slate-200 shadow-lg bg-white"
                        />
                        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-slate-200 border-2 border-white text-slate-800 font-black text-xs flex items-center justify-center shadow">
                          {formatNumber(2, digitMode)}
                        </span>
                      </div>
                      <div className="w-full rounded-t-2xl bg-white/95 dark:bg-slate-900/95 border-2 border-slate-200 dark:border-slate-700 border-b-0 pt-3 pb-3 px-2 min-h-[92px] sm:min-h-[104px] flex flex-col items-center justify-center gap-1 shadow-md">
                        <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate max-w-full">
                          {secondPlace.name}
                        </div>
                        <div className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-200 tabular-nums">
                          {formatNumber(getMetricValue(secondPlace, sort), digitMode)}{' '}
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            {getMetricUnitLabel(sort)}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full min-h-[84px] rounded-t-2xl bg-white/25 border border-white/20" />
                  )}
                </div>

                {/* Rank #1 Champion */}
                <div className="flex flex-col items-center text-center">
                  {firstPlace && (
                    <>
                      <div className="relative mb-2">
                        <div className="flex justify-center mb-1">
                          <Crown className="w-7 h-7 sm:w-8 sm:h-8 text-amber-300 fill-amber-400 drop-shadow" />
                        </div>
                        <AvatarGraphic
                          avatar={firstPlace.avatar}
                          imageUrl={firstPlace.avatarUrl}
                          alt={firstPlace.name}
                          className="w-18 h-18 sm:w-22 sm:h-22 rounded-full border-4 border-amber-300 shadow-xl bg-white"
                        />
                        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-amber-400 border-2 border-white text-amber-950 font-black text-xs flex items-center justify-center shadow">
                          {formatNumber(1, digitMode)}
                        </span>
                      </div>
                      <div className="w-full rounded-t-2xl bg-gradient-to-b from-[#FFF9E3] to-white dark:from-amber-950/90 dark:to-slate-900 border-2 border-amber-300 dark:border-amber-600 border-b-0 pt-3.5 pb-4 px-2 min-h-[112px] sm:min-h-[126px] flex flex-col items-center justify-center gap-1 shadow-xl">
                        <div className="font-black text-sm sm:text-base text-slate-900 dark:text-amber-100 truncate max-w-full">
                          {firstPlace.name}
                        </div>
                        <div className="text-sm sm:text-base font-black text-amber-700 dark:text-amber-300 tabular-nums">
                          {formatNumber(getMetricValue(firstPlace, sort), digitMode)}{' '}
                          <span className="text-xs font-bold">
                            {getMetricUnitLabel(sort)}
                          </span>
                        </div>
                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                          {formatNumber(firstPlace.badgesCount, digitMode)} مدال
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Rank #3 */}
                <div className="flex flex-col items-center text-center">
                  {thirdPlace ? (
                    <>
                      <div className="relative mb-2">
                        <AvatarGraphic
                          avatar={thirdPlace.avatar}
                          imageUrl={thirdPlace.avatarUrl}
                          alt={thirdPlace.name}
                          className="w-14 h-14 sm:w-18 sm:h-18 rounded-full border-4 border-[#E69A5E] shadow-lg bg-white"
                        />
                        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#E69A5E] border-2 border-white text-white font-black text-xs flex items-center justify-center shadow">
                          {formatNumber(3, digitMode)}
                        </span>
                      </div>
                      <div className="w-full rounded-t-2xl bg-white/95 dark:bg-slate-900/95 border-2 border-[#EBC09D] dark:border-slate-700 border-b-0 pt-3 pb-3 px-2 min-h-[82px] sm:min-h-[94px] flex flex-col items-center justify-center gap-1 shadow-md">
                        <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate max-w-full">
                          {thirdPlace.name}
                        </div>
                        <div className="text-xs sm:text-sm font-black text-[#9A4E16] dark:text-amber-300 tabular-nums">
                          {formatNumber(getMetricValue(thirdPlace, sort), digitMode)}{' '}
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            {getMetricUnitLabel(sort)}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full min-h-[76px] rounded-t-2xl bg-white/25 border border-white/20" />
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Active Child Standing + Guest Sign-in Callout */}
        <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 border-b-4 border-b-[#DFC6A8] dark:border-b-slate-700 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_10px_24px_-10px_rgba(170,104,40,0.18)]">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[#5472EB] text-white font-black text-base flex items-center justify-center shrink-0 tabular-nums shadow-sm">
              #{formatNumber(myStanding.rank, digitMode)}
            </div>
            <AvatarGraphic
              avatar={activeProfile.avatar}
              imageUrl={activeProfile.avatarUrl}
              alt={activeProfile.name}
              className="w-12 h-12 rounded-full shrink-0 border-2 border-[#EEDCC5]"
            />
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-[#5472EB] dark:text-sky-400">
                جایگاه فعلی {activeProfile.name}
              </div>
              <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                {formatNumber(activeLocalEntry.totalStars, digitMode)} ستاره
                {' · '}
                {formatNumber(activeLocalEntry.rewardPoints, digitMode)} امتیاز باشگاه
                {' · '}
                {formatNumber(activeLocalEntry.streak, digitMode)} روز استمرار
              </div>
            </div>
          </div>

          {!wpUser && (
            <button
              type="button"
              onClick={() => {
                audioEngine.play('uiTap');
                onOpenAuth();
              }}
              className="min-h-[46px] px-4 rounded-2xl bg-[#4BB543] hover:bg-[#41A23A] border-b-4 border-[#2E8228] text-white font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shrink-0 whitespace-nowrap active:translate-y-0.5 transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span>ورود برای ثبت رکورد آنلاین</span>
            </button>
          )}
        </section>

        {errorMsg && (
          <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3.5 text-xs sm:text-sm font-bold text-rose-800 dark:text-rose-200">
            {errorMsg}
          </div>
        )}

        {/* Ranked Leaderboard Rows */}
        <section className="space-y-2.5" aria-label="فهرست کامل رتبه‌بندی">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm sm:text-base font-black text-[#5B3A1D] dark:text-white">
              سایر قهرمانان جدول
            </h3>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {wpUser
                ? 'رتبه شما به‌صورت خودکار همگام‌سازی می‌شود'
                : 'نمایش آنلاین جدول قهرمانان'}
            </span>
          </div>

          {displayEntries.length <= 3 && remoteEntries.length === 0 ? (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 p-6 sm:p-8 text-center space-y-2.5">
              <Trophy className="w-10 h-10 text-amber-500 mx-auto" />
              <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                {wpUrl
                  ? 'اولین ستاره‌های آنلاین در حال ثبت هستند!'
                  : 'جدول آفلاین با پروفایل‌های دستگاه شما نمایش داده شده است.'}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                هرچه بیشتر تمرین کنی و ستاره بگیری، در رتبه بالاتری از جدول قهرمانان کودک نابغه قرار می‌گیری.
              </p>
            </div>
          ) : restEntries.length === 0 ? (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 p-5 text-center text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">
              همه قهرمانان فعلی در سکوی سه‌نفره بالا قرار دارند!
            </div>
          ) : (
            <div className="space-y-2.5">
              {restEntries.map((entry) => {
                const isMine = entry.profileId === activeProfile.id || entry.isCurrentUser;
                return (
                  <div
                    key={`${entry.rank}-${entry.profileId}-${entry.name}`}
                    className={`rounded-2xl p-3.5 sm:px-5 flex items-center justify-between gap-3 border-2 transition-all ${
                      isMine
                        ? 'bg-[#EEF4FF] dark:bg-blue-950/40 border-[#5472EB] dark:border-blue-600 shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-[#EEDCC5] dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-xl bg-[#FFF6EB] dark:bg-slate-800 border border-[#EEDCC5] dark:border-slate-700 text-xs sm:text-sm font-black text-[#783F1D] dark:text-slate-200 flex items-center justify-center shrink-0 tabular-nums">
                        {formatNumber(entry.rank, digitMode)}
                      </span>

                      <AvatarGraphic
                        avatar={entry.avatar}
                        imageUrl={entry.avatarUrl}
                        alt={entry.name}
                        className="w-11 h-11 rounded-full shrink-0 border border-[#EEDCC5] dark:border-slate-700"
                      />

                      <div className="min-w-0">
                        <div className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                          {entry.name}
                          {isMine && (
                            <span className="text-xs font-extrabold text-[#5472EB] dark:text-sky-400 mr-1.5">
                              (شما)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap tabular-nums">
                          <span>{formatNumber(entry.age, digitMode)} ساله</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatNumber(entry.badgesCount, digitMode)} مدال</span>
                          {entry.accuracy > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>دقت {formatNumber(entry.accuracy, digitMode)}٪</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 tabular-nums">
                      <div className="text-left">
                        <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center justify-end gap-1">
                          {sort === 'stars' && (
                            <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                          )}
                          {sort === 'points' && (
                            <Coins className="w-4 h-4 text-amber-500" />
                          )}
                          {sort === 'streak' && (
                            <Flame className="w-4 h-4 text-orange-500" />
                          )}
                          <span>{formatNumber(getMetricValue(entry, sort), digitMode)}</span>
                        </div>
                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-end gap-1">
                          <Award className="w-3 h-3 text-violet-500" />
                          <span>{getMetricUnitLabel(sort)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
