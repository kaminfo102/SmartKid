import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Gamepad2,
  Target,
  Star,
  PlayCircle,
  Lock,
  RefreshCw,
  ShoppingBag,
  Unlock,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import type {
  BacsAccount,
  ChildProfile,
  DigitDisplayMode,
  LessonDefinition,
  TermDefinition,
  WordPressUser,
} from '../../types/app';
import { formatNumber } from '../../lib/numbers';
import { getTermCoverImage } from '../../data/lessons';
import { AudioButton } from '../../components/AudioButton';
import { BuyCoffeeButton } from '../../components/BuyCoffeeButton';
import { SaleCountdown } from '../../components/SaleCountdown';
import { AdventureMap } from './AdventureMap';
import { StoryCardMascot } from './StoryLandmarkSvg';
import { TermPurchaseModal } from './TermPurchaseModal';

interface LessonMapProps {
  terms: TermDefinition[];
  activeTermId: string;
  onSelectTerm: (termId: string) => void;
  profile: ChildProfile;
  digitMode: DigitDisplayMode;
  reducedMotion?: boolean;
  dailyChallengeCount?: number;
  wpUrl?: string;
  wpUser?: WordPressUser | null;
  wpConnected?: boolean;
  bacsAccounts?: BacsAccount[];
  isRefreshing?: boolean;
  onRefreshCurriculum?: () => void;
  onTermUnlocked?: (termDbId?: number) => void;
  onOpenAuth: () => void;
  onSelectLesson: (lesson: LessonDefinition) => void;
  onOpenPractice: () => void;
  onOpenGames: () => void;
  onOpenSimulator: () => void;
  onBack: () => void;
  returnNotice?: { type: 'success' | 'info' | 'error'; text: string } | null;
  onDismissReturnNotice?: () => void;
}

export const LessonMap: React.FC<LessonMapProps> = ({
  terms,
  activeTermId,
  onSelectTerm,
  profile,
  digitMode,
  reducedMotion = false,
  dailyChallengeCount = 5,
  wpUrl = '',
  wpUser = null,
  wpConnected = false,
  bacsAccounts = [],
  isRefreshing = false,
  onRefreshCurriculum,
  onTermUnlocked,
  onOpenAuth,
  onSelectLesson,
  onOpenPractice,
  onOpenGames,
  onOpenSimulator,
  onBack,
  returnNotice = null,
  onDismissReturnNotice,
}) => {
  const [purchasingTerm, setPurchasingTerm] = useState<TermDefinition | null>(null);

  const activeTerm = useMemo(() => {
    return terms.find((t) => t.id === activeTermId) ?? terms[0];
  }, [terms, activeTermId]);

  const termStages = activeTerm?.stages ?? [];
  const completedInTerm = termStages.filter(
    (s) => profile.lessons[s.id]?.completed
  ).length;
  const completionPct =
    termStages.length > 0
      ? Math.round((completedInTerm / termStages.length) * 100)
      : 0;

  const isTermUnlocked = Boolean(activeTerm?.isFree || activeTerm?.unlocked);
  const activePendingOrder = !isTermUnlocked ? activeTerm?.pendingOrder : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF7EB] dark:bg-slate-950">
      {/* Golden Sunny Header with Puffy Cream Clouds */}
      <header className="relative overflow-hidden bg-gradient-to-b from-[#FFCC33] via-[#FFD859] to-[#FFE899] dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 px-4 pt-3 pb-8">
        <svg
          aria-hidden="true"
          viewBox="0 0 600 90"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-x-0 bottom-0 w-full h-14 text-[#FFF7EB] dark:text-slate-950 fill-current"
        >
          <path d="M0 90 L0 52 Q35 20 80 48 Q125 18 175 46 Q230 12 290 48 Q345 14 405 46 Q465 18 525 46 Q565 25 600 50 L600 90 Z" />
        </svg>

        <div className="relative z-10 max-w-4xl mx-auto space-y-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onBack}
              aria-label="بازگشت به خانه"
              className="min-h-[44px] min-w-[44px] rounded-2xl bg-white/95 hover:bg-white dark:bg-slate-800 border-b-4 border-amber-300 dark:border-slate-700 active:border-b-0 active:translate-y-0.5 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-[0_6px_14px_rgba(180,120,20,0.18)] transition-all"
            >
              <ArrowRight className="w-5 h-5" />
            </button>

            <div className="text-center min-w-0">
              <h1 className="text-lg sm:text-xl font-extrabold text-[#593400] dark:text-white truncate">
                نقشه ماجراجویی و دوره‌ها
              </h1>
            </div>

            <div className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/95 dark:bg-amber-900/70 border-b-4 border-amber-300 dark:border-amber-700 text-[#5C3A00] dark:text-amber-100 font-extrabold text-sm tabular-nums shadow-[0_6px_14px_rgba(180,120,20,0.18)] shrink-0">
              <Star className="w-4 h-4 fill-[#F59E0B] text-[#B45309]" />
              <span>{formatNumber(profile.totalStars, digitMode)}</span>
            </div>
          </div>

          {/* Interactive Term Selector Tabs */}
          <div
            role="tablist"
            aria-label="انتخاب ترم آموزشی"
            className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar"
          >
            {terms.map((term) => {
              const selected = term.id === activeTerm?.id;
              const unlocked = term.isFree || term.unlocked;
              const isPending = !unlocked && Boolean(term.pendingOrder);
              return (
                <button
                  key={term.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => onSelectTerm(term.id)}
                  className={`min-h-[44px] px-3.5 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap shrink-0 flex items-center gap-2 border-b-4 transition-all shadow-[0_6px_14px_rgba(180,120,20,0.14)] active:translate-y-0.5 ${
                    selected
                      ? 'bg-[#5472EB] border-[#354EB8] text-white'
                      : 'bg-white/95 hover:bg-white dark:bg-slate-800 border-amber-300 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <img
                    src={getTermCoverImage(term)}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-lg object-cover border border-white/70 shrink-0"
                  />
                  {unlocked ? (
                    <Unlock className="w-3.5 h-3.5 shrink-0" />
                  ) : isPending ? (
                    <Clock className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{term.title}</span>
                  <span
                    className={`text-[11px] font-extrabold ${
                      selected
                        ? 'text-amber-200'
                        : term.isFree
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : isPending
                        ? 'text-amber-700 dark:text-amber-300'
                        : 'text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    (
                    {term.isFree
                      ? 'رایگان'
                      : unlocked
                      ? 'فعال'
                      : isPending
                      ? 'در انتظار تایید'
                      : term.priceFormatted}
                    )
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="relative z-10 -mt-3 flex-1 w-full max-w-4xl mx-auto px-3 sm:px-5 pb-10 space-y-5">
        {returnNotice && (
          <div
            role="status"
            className={`rounded-2xl border-2 p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-sm ${
              returnNotice.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100'
                : returnNotice.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-100'
                : 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0 text-xs sm:text-sm font-extrabold">
              {returnNotice.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : returnNotice.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              ) : (
                <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              )}
              <span>{returnNotice.text}</span>
            </div>
            {onDismissReturnNotice && (
              <button
                type="button"
                onClick={onDismissReturnNotice}
                aria-label="بستن پیام"
                className="p-1.5 rounded-xl bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Term Progress Dashboard Card */}
        {activeTerm && (
          <section className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-[#EFE0CE] dark:border-slate-800 shadow-[0_10px_26px_-8px_rgba(170,104,40,0.16)] p-4 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={getTermCoverImage(activeTerm)}
                  alt={activeTerm.title}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-[#EFE0CE] dark:border-slate-700 shadow-xs shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-bold">
                    <BookOpen className="w-4 h-4 text-[#F59E0B] shrink-0" />
                    <span className="truncate">{activeTerm.title}</span>
                    <span aria-hidden="true">·</span>
                    <span className="whitespace-nowrap">
                      {formatNumber(termStages.length, digitMode)} مرحله داستانی
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {activeTerm.storyTitle}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <AudioButton
                  textToSpeak={`${activeTerm.title}. ${activeTerm.storyDescription}`}
                  label="شنیدن داستان"
                  size="sm"
                />
                {wpConnected && onRefreshCurriculum && (
                  <button
                    type="button"
                    onClick={onRefreshCurriculum}
                    aria-label="به‌روزرسانی وضعیت دوره‌ها و مراحل"
                    className="min-h-[44px] px-3 rounded-2xl bg-[#FFF6EB] hover:bg-amber-100 dark:bg-slate-800 border-2 border-[#EFE0CE] border-b-4 border-b-[#DFC6A8] dark:border-slate-700 text-xs font-extrabold text-slate-800 dark:text-slate-200 inline-flex items-center gap-1.5 active:translate-y-0.5 transition-all"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
                    />
                    <span>به‌روزرسانی</span>
                  </button>
                )}
              </div>
            </div>

            {/* Progress Tracker Bar + Large % Readout */}
            <div className="rounded-2xl bg-[#FFF9F2] dark:bg-slate-800/80 border border-[#EFE0CE] dark:border-slate-700 p-3 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                  <span>روند پیشرفت این ترم</span>
                  <span>
                    {formatNumber(completedInTerm, digitMode)} از{' '}
                    {formatNumber(termStages.length, digitMode)} ایستگاه
                  </span>
                </div>
                <div className="h-3.5 rounded-full bg-slate-200/80 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-[#4BB543] to-[#7AE043] transition-all duration-300"
                    style={{ width: `${Math.max(completionPct, 6)}%` }}
                  />
                </div>
              </div>

              <div className="text-left shrink-0 pl-1">
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums leading-none">
                  {formatNumber(completionPct, digitMode)}٪
                </div>
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                  تکمیل شده
                </div>
              </div>
            </div>

            {/* Paid Term Callout: Pending Admin Review vs. Purchase CTA */}
            {!isTermUnlocked && activePendingOrder && (
              <div className="rounded-2xl bg-gradient-to-l from-amber-50 to-amber-100/80 dark:from-amber-950/60 dark:to-slate-800 border-2 border-amber-300 dark:border-amber-700 p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Clock className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-extrabold text-sm text-amber-950 dark:text-amber-200">
                      سفارش در حال بررسی و تایید توسط مدیر می‌باشد
                    </div>
                    <div className="text-xs text-amber-800 dark:text-amber-300/90 mt-0.5">
                      سفارش #{formatNumber(activePendingOrder.orderNumber, digitMode)} ثبت شده است. می‌توانید وضعیت سفارش را بررسی یا رسید واریزی را ارسال کنید.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPurchasingTerm(activeTerm)}
                  className="min-h-[46px] px-4 rounded-2xl bg-[#5472EB] hover:bg-[#425FD6] border-b-4 border-[#354EB8] active:border-b-0 active:translate-y-0.5 text-white font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shrink-0 shadow-sm transition-all"
                >
                  <Clock className="w-4 h-4" />
                  <span>مشاهده وضعیت / ارسال رسید واریزی</span>
                </button>
              </div>
            )}

            {!isTermUnlocked && !activePendingOrder && (
              <div className="rounded-2xl bg-gradient-to-l from-[#FFF4D6] to-[#FFE7B3] dark:from-amber-950/60 dark:to-slate-800 border-2 border-[#F5C55B] p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-11 h-11 rounded-2xl bg-[#F59E0B] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Lock className="w-5 h-5" />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <div className="font-extrabold text-sm text-[#5C3A00] dark:text-amber-200 flex items-center gap-2 flex-wrap">
                      <span>این نقشه داستانی نیازمند تهیه دوره است</span>
                      {activeTerm.onSale && activeTerm.regularPriceFormatted ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="text-xs text-amber-800/70 dark:text-amber-300/70 line-through">
                            {activeTerm.regularPriceFormatted}
                          </span>
                          <span className="text-emerald-800 dark:text-emerald-300">
                            ({activeTerm.priceFormatted})
                          </span>
                          {activeTerm.discountPercent && activeTerm.discountPercent > 0 ? (
                            <span className="px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[10px]">
                              {formatNumber(activeTerm.discountPercent, digitMode)}٪ تخفیف
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span>({activeTerm.priceFormatted})</span>
                      )}
                    </div>
                    {activeTerm.onSale && (
                      <div>
                        <SaleCountdown
                          saleEndTimestamp={activeTerm.saleEndTimestamp}
                          digitMode={digitMode}
                        />
                      </div>
                    )}
                    <div className="text-xs text-[#7A4E00] dark:text-amber-300/90">
                      ایستگاه‌های داستان را ببینید و با پرداخت آنلاین یا کارت به کارت کل این دوره را باز کنید.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPurchasingTerm(activeTerm)}
                  className="min-h-[46px] px-4 rounded-2xl bg-[#4BB543] hover:bg-[#41A23A] border-b-4 border-[#2E8228] active:border-b-0 active:translate-y-0.5 text-white font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shrink-0 shadow-sm transition-all"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>خرید و فعال‌سازی دوره</span>
                </button>
              </div>
            )}
          </section>
        )}

        {/* Dedicated Animated Storybook AdventureMap driven by TermDefinition */}
        {activeTerm && (
          <AdventureMap
            term={activeTerm}
            profile={profile}
            digitMode={digitMode}
            reducedMotion={reducedMotion}
            onSelectLesson={onSelectLesson}
            onRequestUnlockTerm={(term) => setPurchasingTerm(term)}
          />
        )}

        {/* Bottom Resource & Activity Storybook Cards */}
        <section aria-label="تمرین و بازی‌های تکمیلی" className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              کتابخانه تمرین و باشگاه بازی
            </h2>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {formatNumber(dailyChallengeCount, digitMode)} چالش امروز
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Warm Golden Card: Practice & Daily Challenge */}
            <button
              type="button"
              onClick={onOpenPractice}
              className="rounded-2xl bg-gradient-to-br from-[#FFD65B] to-[#FFB830] p-4 flex items-center justify-between gap-3 text-right border-b-4 border-[#DF9D19] shadow-[0_10px_22px_-6px_rgba(205,140,20,0.28)] hover:brightness-[1.02] active:translate-y-0.5 transition-all"
            >
              <div className="min-w-0 space-y-1.5">
                <div className="font-extrabold text-base text-[#5C3A00]">
                  تمرین و چالش روزانه
                </div>
                <div className="text-xs font-bold text-[#784D00]">
                  تقویت سرعت و دقت با چرتکه سه‌بعدی
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-white bg-[#4BB543] border-b-2 border-[#2E8228] px-3 py-1.5 rounded-2xl shadow-xs">
                  <Target className="w-3.5 h-3.5" />
                  <span>شروع تمرین</span>
                </span>
              </div>
              <StoryCardMascot variant="cow" className="w-16 h-16 shrink-0" />
            </button>

            {/* Sky Blue Card: Games & Simulator */}
            <div className="rounded-2xl bg-gradient-to-br from-[#99DCFA] to-[#68C4F2] p-4 flex items-center justify-between gap-3 border-b-4 border-[#3E9ED2] shadow-[0_10px_22px_-6px_rgba(40,145,205,0.28)]">
              <div className="min-w-0 space-y-2.5 text-right">
                <div className="font-extrabold text-base text-[#0A3A59]">
                  باشگاه بازی و شبیه‌ساز
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={onOpenGames}
                    className="min-h-[40px] px-3.5 py-1.5 rounded-2xl bg-white hover:bg-sky-50 border-b-2 border-sky-200 text-[#0A3A59] font-extrabold text-xs inline-flex items-center gap-1.5 shadow-xs active:translate-y-0.5 transition-all"
                  >
                    <Gamepad2 className="w-4 h-4 text-[#EC5E95]" />
                    <span>بازی‌ها</span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenSimulator}
                    className="min-h-[40px] px-3.5 py-1.5 rounded-2xl bg-[#5472EB] hover:bg-[#425FD6] border-b-2 border-[#354EB8] text-white font-extrabold text-xs inline-flex items-center gap-1.5 shadow-xs active:translate-y-0.5 transition-all"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>شبیه‌ساز</span>
                  </button>
                </div>
              </div>
              <StoryCardMascot variant="sheep" className="w-16 h-16 shrink-0" />
            </div>
          </div>

          <BuyCoffeeButton variant="compact" reducedMotion={reducedMotion} />
        </section>
      </main>

      {purchasingTerm && (
        <TermPurchaseModal
          term={purchasingTerm}
          wpUrl={wpUrl}
          wpUser={wpUser}
          bacsAccounts={bacsAccounts}
          digitMode={digitMode}
          onClose={() => setPurchasingTerm(null)}
          onOpenAuth={onOpenAuth}
          onUnlocked={(termDbId) => {
            onTermUnlocked?.(termDbId);
          }}
          onOrderPending={onRefreshCurriculum}
        />
      )}
    </div>
  );
};
