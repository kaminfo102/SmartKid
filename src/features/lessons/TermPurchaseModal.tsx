import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Lock,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import type { DigitDisplayMode, TermDefinition, WordPressUser } from '../../types/app';
import { formatNumber } from '../../lib/numbers';
import {
  startWooCommerceTermCheckout,
  validateSafeHttpUrl,
  verifyWooCommercePurchase,
} from '../../lib/wordpressApi';
import { KiaAvatar } from '../../components/KiaAvatar';
import { TreasureUnlockIllustration } from '../../components/KidIllustrations';
import { audioEngine } from '../../lib/audioEngine';

interface TermPurchaseModalProps {
  term: TermDefinition;
  wpUrl: string;
  wpUser: WordPressUser | null;
  digitMode: DigitDisplayMode;
  onClose: () => void;
  onOpenAuth: () => void;
  onUnlocked: (termDbId?: number) => void;
}

export const TermPurchaseModal: React.FC<TermPurchaseModalProps> = ({
  term,
  wpUrl,
  wpUser,
  digitMode,
  onClose,
  onOpenAuth,
  onUnlocked,
}) => {
  const canStartSsoCheckout = Boolean(wpUrl && wpUser && term.dbId);

  const [checkoutUrl, setCheckoutUrl] = useState<string>('');
  const [priceLabel, setPriceLabel] = useState<string>(term.priceFormatted);
  const [loadingCheckout, setLoadingCheckout] = useState<boolean>(canStartSsoCheckout);
  const [verifying, setVerifying] = useState(false);
  const [hasOpenedCheckout, setHasOpenedCheckout] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [unlockedDone, setUnlockedDone] = useState(false);

  const mountedRef = useRef(true);
  const verifyingRef = useRef(false);
  const lastAutoCheckRef = useRef(0);
  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  const fetchAuthenticatedCheckoutUrl = useCallback(
    async (silent = false) => {
      if (!wpUrl || !wpUser || !term.dbId) return;
      if (!silent) {
        setLoadingCheckout(true);
        setErrorMessage(null);
      }
      try {
        const res = await startWooCommerceTermCheckout(wpUrl, term.dbId);
        if (!mountedRef.current) return;

        if (res.alreadyUnlocked) {
          setUnlockedDone(true);
          setStatusMessage('این ترم هم‌اکنون برای حساب شما فعال است!');
          onUnlocked(term.dbId);
          return;
        }

        const safe = validateSafeHttpUrl(res.checkoutUrl);
        setCheckoutUrl(safe);
        if (res.priceFormatted) {
          setPriceLabel(res.priceFormatted);
        }
      } catch (err) {
        if (!mountedRef.current || silent) return;
        setErrorMessage(
          err instanceof Error ? err.message : 'خطا در دریافت لینک پرداخت ووکامرس.'
        );
      } finally {
        if (mountedRef.current && !silent) {
          setLoadingCheckout(false);
        }
      }
    },
    [wpUrl, wpUser, term.dbId, onUnlocked]
  );

  useEffect(() => {
    if (!canStartSsoCheckout) {
      setCheckoutUrl('');
      setLoadingCheckout(false);
      return;
    }
    setCheckoutUrl('');
    void fetchAuthenticatedCheckoutUrl(false);
  }, [canStartSsoCheckout, fetchAuthenticatedCheckoutUrl]);

  const handleVerifyPurchase = useCallback(
    async (isAutoCheck = false) => {
      if (!wpUrl || !wpUser || !term.dbId || verifyingRef.current || unlockedDone) {
        return;
      }
      verifyingRef.current = true;
      setVerifying(true);
      if (!isAutoCheck) {
        setErrorMessage(null);
        setStatusMessage(null);
      }
      try {
        const res = await verifyWooCommercePurchase(wpUrl, term.dbId);
        if (!mountedRef.current) return;
        if (res.unlocked) {
          setUnlockedDone(true);
          setStatusMessage(res.message);
          audioEngine.play('levelComplete');
          audioEngine.speakPersian(`هورا! ${term.title} باز شد! بریم ماجراجویی کنیم.`);
          onUnlocked(term.dbId);
        } else if (!isAutoCheck) {
          setStatusMessage(res.message);
        }
      } catch (err) {
        if (!mountedRef.current || isAutoCheck) return;
        setErrorMessage(
          err instanceof Error ? err.message : 'بررسی سفارش ووکامرس ناموفق بود.'
        );
      } finally {
        verifyingRef.current = false;
        if (mountedRef.current) {
          setVerifying(false);
        }
      }
    },
    [wpUrl, wpUser, term.dbId, term.title, unlockedDone, onUnlocked]
  );

  // When parent returns to app after completing WooCommerce checkout in the new tab, auto-verify order
  useEffect(() => {
    if (!hasOpenedCheckout || unlockedDone || !canStartSsoCheckout) return;

    const triggerAutoVerify = () => {
      if (document.visibilityState === 'hidden') return;
      const now = Date.now();
      if (now - lastAutoCheckRef.current < 3000) return;
      lastAutoCheckRef.current = now;
      void handleVerifyPurchase(true);
    };

    window.addEventListener('focus', triggerAutoVerify);
    document.addEventListener('visibilitychange', triggerAutoVerify);
    return () => {
      window.removeEventListener('focus', triggerAutoVerify);
      document.removeEventListener('visibilitychange', triggerAutoVerify);
    };
  }, [hasOpenedCheckout, unlockedDone, canStartSsoCheckout, handleVerifyPurchase]);

  const handleCheckoutLinkClick = () => {
    setHasOpenedCheckout(true);
    setErrorMessage(null);
    // Single-use SSO token is consumed when checkout opens; silently issue a fresh token afterward in case user re-clicks
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = window.setTimeout(() => {
      void fetchAuthenticatedCheckoutUrl(true);
    }, 1500);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kn-purchase-title"
    >
      <div className="w-full max-w-md rounded-2xl sm:rounded-3xl bg-[#FFF9F2] dark:bg-slate-900 border-4 border-white dark:border-slate-700 shadow-[0_24px_56px_-12px_rgba(140,80,20,0.34)] overflow-hidden">
        {/* Sunny Joyful Modal Header */}
        <div className="bg-gradient-to-b from-[#FFCC33] to-[#FFE066] dark:from-slate-800 dark:to-slate-800 px-5 pt-4 pb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <KiaAvatar
              mood={unlockedDone ? 'cheering' : 'happy'}
              className="w-16 h-16 shrink-0"
              showEmblem={false}
            />
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-amber-950 dark:text-amber-300">
                باز کردن ماجراجویی جدید با ووکامرس
              </div>
              <h2
                id="kn-purchase-title"
                className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5 truncate"
              >
                {term.title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن پنجره"
            className="min-h-[44px] min-w-[44px] rounded-2xl bg-white/95 hover:bg-white dark:bg-slate-700 border-b-2 border-amber-300 dark:border-slate-600 text-slate-700 dark:text-slate-100 flex items-center justify-center shadow-xs shrink-0 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <div className="rounded-2xl bg-white dark:bg-slate-800 border-2 border-[#EEDCC5] dark:border-slate-700 shadow-[0_8px_18px_-6px_rgba(170,104,40,0.14)] p-4 flex items-center gap-3.5">
            <TreasureUnlockIllustration className="w-16 h-16 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                  داستان این ترم
                </span>
                <span className="text-sm font-extrabold text-[#4BB543] dark:text-emerald-400">
                  {priceLabel}
                </span>
              </div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                {term.storyTitle}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {term.storyDescription}
              </p>
              <div className="pt-1 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  شامل {formatNumber(term.stages.length, digitMode)} مرحله داستانی و تمرین اختصاصی
                </span>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-200 dark:border-rose-800 p-3 text-xs font-bold text-rose-800 dark:text-rose-200">
              {errorMessage}
            </div>
          )}

          {statusMessage && (
            <div
              className={`rounded-2xl border-2 p-3 text-xs font-bold flex items-start gap-2 ${
                unlockedDone
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 text-emerald-900 dark:text-emerald-200'
                  : 'bg-sky-50 dark:bg-sky-950/50 border-sky-200 text-sky-900 dark:text-sky-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{statusMessage}</span>
            </div>
          )}

          {unlockedDone ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[50px] rounded-2xl bg-[#4BB543] hover:bg-[#41A23A] border-b-4 border-[#2E8228] active:border-b-0 active:translate-y-0.5 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span>شروع ماجراجویی در نقشه ترم!</span>
            </button>
          ) : !wpUrl || !wpUser ? (
            <div className="space-y-3">
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-200 dark:border-amber-800 p-3 text-xs font-bold text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  برای خرید از فروشگاه ووکامرس و ثبت دائمی ترم روی حساب کودک، ابتدا وارد حساب وردپرس خود شوید یا ثبت‌نام کنید.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="w-full min-h-[50px] rounded-2xl bg-[#5472EB] hover:bg-[#425FD6] border-b-4 border-[#354EB8] active:border-b-0 active:translate-y-0.5 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <UserCheck className="w-5 h-5" />
                <span>ورود / ثبت‌نام در سایت وردپرس</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Express Seamless Account Notice */}
              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-200 dark:border-emerald-800 p-3 text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-start gap-2 leading-relaxed">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                <span>
                  حساب <strong>«{wpUser.displayName}»</strong> ({wpUser.email}) به صورت خودکار متصل می‌شود؛ در ووکامرس نیازی به ورود مجدد یا پر کردن فرم آدرس نیست.
                </span>
              </div>

              {loadingCheckout ? (
                <div className="w-full min-h-[50px] rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-extrabold text-sm flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>در حال اتصال امن حساب به صفحه پرداخت...</span>
                </div>
              ) : checkoutUrl ? (
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleCheckoutLinkClick}
                  className="w-full min-h-[50px] rounded-2xl bg-[#4BB543] hover:bg-[#41A23A] border-b-4 border-[#2E8228] active:border-b-0 active:translate-y-0.5 text-white font-extrabold text-sm flex items-center justify-center gap-2 no-underline shadow-sm transition-all"
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span>پرداخت سریع در ووکامرس (بدون فرم و ورود مجدد)</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              ) : (
                <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-200 dark:border-amber-800 p-3 text-xs font-bold text-amber-900 dark:text-amber-200">
                  لینک محصول ووکامرس برای این ترم در پیشخوان وردپرس تنظیم نشده است (پیشخوان ← کودک نابغه ← ترم‌ها و ووکامرس).
                </div>
              )}

              <button
                type="button"
                onClick={() => void handleVerifyPurchase(false)}
                disabled={verifying}
                className="w-full min-h-[48px] rounded-2xl bg-[#5472EB] hover:bg-[#425FD6] border-b-4 border-[#354EB8] active:border-b-0 active:translate-y-0.5 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${verifying ? 'animate-spin' : ''}`} />
                <span>
                  {verifying
                    ? 'در حال استعلام سفارش از ووکامرس...'
                    : 'پرداخت را انجام دادم — بررسی و فعال‌سازی ترم'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
