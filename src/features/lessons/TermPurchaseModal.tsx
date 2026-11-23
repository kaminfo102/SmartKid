import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  Landmark,
  Loader2,
  Lock,
  RefreshCw,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import type {
  BacsAccount,
  DigitDisplayMode,
  PendingOrderInfo,
  TermDefinition,
  WordPressUser,
} from '../../types/app';
import { formatNumber } from '../../lib/numbers';
import {
  startWooCommerceTermCheckout,
  submitOfflineOrder,
  uploadOrderReceipt,
  validateSafeHttpUrl,
  verifyWooCommercePurchase,
} from '../../lib/wordpressApi';
import type { OptimizedImageResult } from '../../lib/imageOptimizer';
import { getTermCoverImage } from '../../data/lessons';
import { KiaAvatar } from '../../components/KiaAvatar';
import { ReceiptUploaderField } from '../../components/ReceiptUploaderField';
import { SaleCountdown } from '../../components/SaleCountdown';
import { audioEngine } from '../../lib/audioEngine';

interface TermPurchaseModalProps {
  term: TermDefinition;
  wpUrl: string;
  wpUser: WordPressUser | null;
  bacsAccounts?: BacsAccount[];
  digitMode: DigitDisplayMode;
  onClose: () => void;
  onOpenAuth: () => void;
  onUnlocked: (termDbId?: number) => void;
  onOrderPending?: () => void;
}

export const TermPurchaseModal: React.FC<TermPurchaseModalProps> = ({
  term,
  wpUrl,
  wpUser,
  bacsAccounts = [],
  digitMode,
  onClose,
  onOpenAuth,
  onUnlocked,
  onOrderPending,
}) => {
  const canStartCheckout = Boolean(wpUrl && wpUser && term.dbId);

  const [paymentTab, setPaymentTab] = useState<'online' | 'bacs'>('online');
  const [checkoutUrl, setCheckoutUrl] = useState<string>('');
  const [serverBacsAccounts, setServerBacsAccounts] = useState<BacsAccount[]>(bacsAccounts);
  const [priceLabel, setPriceLabel] = useState<string>(term.priceFormatted);
  const [regularPriceLabel, setRegularPriceLabel] = useState<string>(
    term.regularPriceFormatted || ''
  );
  const [isOnSale, setIsOnSale] = useState<boolean>(Boolean(term.onSale));
  const [discountPct, setDiscountPct] = useState<number>(term.discountPercent || 0);
  const [saleEndTs, setSaleEndTs] = useState<number | null>(term.saleEndTimestamp ?? null);

  const [loadingCheckout, setLoadingCheckout] = useState<boolean>(canStartCheckout);
  const [verifying, setVerifying] = useState(false);
  const [submittingOffline, setSubmittingOffline] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [hasOpenedCheckout, setHasOpenedCheckout] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [unlockedDone, setUnlockedDone] = useState(Boolean(term.unlocked || term.isFree));
  const [pendingOrder, setPendingOrder] = useState<PendingOrderInfo | null>(
    term.pendingOrder ?? null
  );

  const [receiptImage, setReceiptImage] = useState<OptimizedImageResult | null>(null);
  const [paymentNote, setPaymentNote] = useState<string>(term.pendingOrder?.paymentNote || '');
  const [copiedIdx, setCopiedIdx] = useState<string | null>(null);

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

  useEffect(() => {
    if (bacsAccounts.length > 0 && serverBacsAccounts.length === 0) {
      setServerBacsAccounts(bacsAccounts);
    }
  }, [bacsAccounts, serverBacsAccounts.length]);

  const activeBacsAccounts = useMemo(
    () => (serverBacsAccounts.length > 0 ? serverBacsAccounts : bacsAccounts),
    [serverBacsAccounts, bacsAccounts]
  );

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
          setPendingOrder(null);
          setStatusMessage('این دوره هم‌اکنون برای حساب شما فعال است!');
          onUnlocked(term.dbId);
          return;
        }

        if (res.pendingOrder) {
          setPendingOrder(res.pendingOrder);
        }

        const safe = validateSafeHttpUrl(res.checkoutUrl);
        setCheckoutUrl(safe);
        if (res.priceFormatted) setPriceLabel(res.priceFormatted);
        if (res.regularPriceFormatted !== undefined) {
          setRegularPriceLabel(res.regularPriceFormatted);
        }
        if (res.onSale !== undefined) setIsOnSale(Boolean(res.onSale));
        if (res.discountPercent !== undefined) setDiscountPct(res.discountPercent);
        if (res.saleEndTimestamp !== undefined) setSaleEndTs(res.saleEndTimestamp ?? null);
        if (Array.isArray(res.bacsAccounts) && res.bacsAccounts.length > 0) {
          setServerBacsAccounts(res.bacsAccounts);
        }
      } catch (err) {
        if (!mountedRef.current || silent) return;
        setErrorMessage(
          err instanceof Error ? err.message : 'خطا در آماده‌سازی اطلاعات پرداخت.'
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
    if (!canStartCheckout) {
      setCheckoutUrl('');
      setLoadingCheckout(false);
      return;
    }
    setCheckoutUrl('');
    void fetchAuthenticatedCheckoutUrl(false);
  }, [canStartCheckout, fetchAuthenticatedCheckoutUrl]);

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
          setPendingOrder(null);
          setStatusMessage(res.message);
          audioEngine.play('levelComplete');
          audioEngine.speakPersian(`هورا! ${term.title} باز شد! بریم ماجراجویی کنیم.`);
          onUnlocked(term.dbId);
        } else if (res.pendingReview && res.orderId) {
          setPendingOrder({
            orderId: res.orderId,
            orderNumber: res.orderNumber || String(res.orderId),
            orderStatus: res.orderStatus || 'on-hold',
            receiptUrl: res.receiptUrl,
            paymentNote: res.paymentNote,
          });
          setStatusMessage('سفارش در حال بررسی و تایید توسط مدیر می‌باشد.');
          onOrderPending?.();
        } else if (!isAutoCheck) {
          setStatusMessage(res.message);
        }
      } catch (err) {
        if (!mountedRef.current || isAutoCheck) return;
        setErrorMessage(
          err instanceof Error ? err.message : 'بررسی وضعیت سفارش ناموفق بود.'
        );
      } finally {
        verifyingRef.current = false;
        if (mountedRef.current) {
          setVerifying(false);
        }
      }
    },
    [wpUrl, wpUser, term.dbId, term.title, unlockedDone, onUnlocked, onOrderPending]
  );

  useEffect(() => {
    if (!hasOpenedCheckout || unlockedDone || !canStartCheckout) return;

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
  }, [hasOpenedCheckout, unlockedDone, canStartCheckout, handleVerifyPurchase]);

  const handleCheckoutLinkClick = () => {
    setHasOpenedCheckout(true);
    setErrorMessage(null);
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = window.setTimeout(() => {
      void fetchAuthenticatedCheckoutUrl(true);
    }, 1500);
  };

  const handleSubmitOfflineOrder = async () => {
    if (!wpUrl || !wpUser || !term.dbId) return;
    setSubmittingOffline(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const res = await submitOfflineOrder(wpUrl, {
        termDbId: term.dbId,
        productId: term.wooProductId,
        note: paymentNote.trim() || undefined,
        receiptFile: receiptImage?.file ?? null,
      });
      if (!mountedRef.current) return;
      setPendingOrder({
        orderId: res.order.id,
        orderNumber: res.order.orderNumber,
        orderStatus: res.order.status,
        receiptUrl: res.order.receiptUrl,
        paymentNote: res.order.paymentNote,
        totalFormatted: res.order.totalFormatted,
        dateCreated: res.order.dateCreated,
      });
      setReceiptImage(null);
      setStatusMessage('سفارش شما ثبت شد و در حال بررسی و تایید توسط مدیر می‌باشد.');
      audioEngine.play('success');
      onOrderPending?.();
    } catch (err) {
      if (!mountedRef.current) return;
      setErrorMessage(err instanceof Error ? err.message : 'ثبت سفارش کارت به کارت ناموفق بود.');
    } finally {
      if (mountedRef.current) {
        setSubmittingOffline(false);
      }
    }
  };

  const handleUploadPendingReceipt = async () => {
    if (!wpUrl || !wpUser || !pendingOrder) return;
    if (!receiptImage && !paymentNote.trim()) {
      setErrorMessage('لطفاً تصویر فیش واریزی یا توضیحات پرداخت را وارد کنید.');
      return;
    }
    setUploadingReceipt(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const res = await uploadOrderReceipt(
        wpUrl,
        pendingOrder.orderId,
        receiptImage?.file ?? null,
        paymentNote.trim()
      );
      if (!mountedRef.current) return;
      setPendingOrder((prev) =>
        prev
          ? {
              ...prev,
              receiptUrl: res.order.receiptUrl ?? prev.receiptUrl,
              paymentNote: res.order.paymentNote ?? prev.paymentNote,
            }
          : prev
      );
      setReceiptImage(null);
      setStatusMessage(res.message);
      audioEngine.play('success');
      onOrderPending?.();
    } catch (err) {
      if (!mountedRef.current) return;
      setErrorMessage(err instanceof Error ? err.message : 'بارگذاری رسید بانکی ناموفق بود.');
    } finally {
      if (mountedRef.current) {
        setUploadingReceipt(false);
      }
    }
  };

  const handleCopy = (val: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(val).catch(() => {});
    }
    setCopiedIdx(key);
    window.setTimeout(() => setCopiedIdx(null), 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kn-purchase-title"
    >
      <div className="w-full max-w-lg my-auto rounded-2xl sm:rounded-3xl bg-[#FFF9F2] dark:bg-slate-900 border-4 border-white dark:border-slate-700 shadow-[0_24px_56px_-12px_rgba(140,80,20,0.34)] overflow-hidden">
        {/* Sunny Joyful Modal Header */}
        <div className="bg-gradient-to-b from-[#FFCC33] to-[#FFE066] dark:from-slate-800 dark:to-slate-800 px-5 pt-4 pb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <KiaAvatar
              mood={unlockedDone ? 'cheering' : 'happy'}
              className="w-14 h-14 sm:w-16 sm:h-16 shrink-0"
              showEmblem={false}
            />
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-amber-950 dark:text-amber-300">
                {pendingOrder
                  ? 'وضعیت سفارش دوره آموزشی'
                  : 'تهیه و فعال‌سازی نقشه داستانی'}
              </div>
              <h2
                id="kn-purchase-title"
                className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white mt-0.5 truncate"
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
        <div className="p-4 sm:p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Course Summary & Sale Pricing */}
          <div className="rounded-2xl bg-white dark:bg-slate-800 border-2 border-[#EEDCC5] dark:border-slate-700 shadow-xs p-3.5 sm:p-4 flex items-start gap-3.5">
            <img
              src={getTermCoverImage(term)}
              alt={term.title}
              referrerPolicy="no-referrer"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-[#EEDCC5] dark:border-slate-700 shadow-xs shrink-0"
            />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                  داستان این دوره
                </span>
                <div className="text-left">
                  {isOnSale && regularPriceLabel ? (
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <span className="text-xs text-slate-400 line-through tabular-nums">
                        {regularPriceLabel}
                      </span>
                      {discountPct > 0 && (
                        <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 text-[11px] font-extrabold tabular-nums">
                          {formatNumber(discountPct, digitMode)}٪ تخفیف
                        </span>
                      )}
                      <span className="text-sm font-extrabold text-[#4BB543] dark:text-emerald-400">
                        {priceLabel}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm font-extrabold text-[#4BB543] dark:text-emerald-400">
                      {priceLabel}
                    </span>
                  )}
                </div>
              </div>

              {isOnSale && (
                <div>
                  <SaleCountdown saleEndTimestamp={saleEndTs} digitMode={digitMode} />
                </div>
              )}

              <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                {term.storyTitle}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {term.storyDescription}
              </p>
              <div className="pt-0.5 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  شامل {formatNumber(term.stages.length, digitMode)} مرحله داستانی و تمرین تعاملی
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
              <span>شروع ماجراجویی در نقشه دوره!</span>
            </button>
          ) : !wpUrl || !wpUser ? (
            <div className="space-y-3">
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-200 dark:border-amber-800 p-3 text-xs font-bold text-amber-900 dark:text-amber-200 flex items-start gap-2 leading-relaxed">
                <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  برای خرید دوره و ثبت دائمی دسترسی روی حساب کودک نابغه، ابتدا وارد حساب کاربری خود شوید یا ثبت‌نام کنید.
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
                <span>ورود / ثبت نام</span>
              </button>
            </div>
          ) : pendingOrder ? (
            /* Pending Admin Review State (Bank Transfer / Awaiting Approval) */
            <div className="space-y-3.5">
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-300 dark:border-amber-700 p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-extrabold text-sm">
                    <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>سفارش در حال بررسی و تایید توسط مدیر می‌باشد</span>
                  </div>
                  <span className="text-xs font-extrabold text-amber-800 dark:text-amber-300 tabular-nums">
                    سفارش #{formatNumber(pendingOrder.orderNumber, digitMode)}
                  </span>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
                  درخواست شما ثبت شده است. پس از بررسی و تایید پرداخت توسط مدیریت، این دوره به‌صورت خودکار برای کودک شما باز خواهد شد.
                </p>

                {pendingOrder.receiptUrl && (
                  <div className="flex items-center gap-2.5 pt-1">
                    <a
                      href={pendingOrder.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      <img
                        src={pendingOrder.receiptUrl}
                        alt="رسید بانکی ثبت‌شده"
                        className="w-14 h-14 rounded-xl object-cover border-2 border-emerald-400"
                      />
                    </a>
                    <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      تصویر فیش بانکی برای این سفارش ثبت شده است. در صورت نیاز می‌توانید تصویر جدید جایگزین کنید.
                    </div>
                  </div>
                )}
              </div>

              {activeBacsAccounts.length > 0 && (
                <div className="rounded-2xl bg-white dark:bg-slate-800 border-2 border-[#EEDCC5] dark:border-slate-700 p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-slate-100">
                    <Landmark className="w-4 h-4 text-[#5472EB]" />
                    <span>شماره کارت / حساب بانکی جهت واریز وجه:</span>
                  </div>
                  {activeBacsAccounts.map((acc, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl bg-[#FFF9F2] dark:bg-slate-900 p-2.5 text-xs space-y-1 border border-[#EFE0CE] dark:border-slate-700"
                    >
                      <div className="font-extrabold text-slate-800 dark:text-white">
                        {acc.bankName || 'بانک'} — {acc.accountName}
                      </div>
                      {acc.accountNumber && (
                        <div className="flex items-center justify-between gap-2">
                          <span dir="ltr" className="font-mono font-extrabold text-slate-900 dark:text-slate-200">
                            {acc.accountNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(acc.accountNumber, `p-acc-${idx}`)}
                            className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-[#EEDCC5] text-[11px] font-bold text-[#5472EB] inline-flex items-center gap-1"
                          >
                            {copiedIdx === `p-acc-${idx}` ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>کپی شد</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>کپی</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                      {acc.iban && (
                        <div dir="ltr" className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {acc.iban}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-2xl bg-white dark:bg-slate-800 border-2 border-[#EEDCC5] dark:border-slate-700 p-3.5 space-y-3">
                <ReceiptUploaderField
                  digitMode={digitMode}
                  selectedImage={receiptImage}
                  onImageChange={setReceiptImage}
                  noteValue={paymentNote}
                  onNoteChange={setPaymentNote}
                  imageLabel="ارسال یا به‌روزرسانی تصویر رسید بانکی (اختیاری)"
                />
                <button
                  type="button"
                  onClick={() => void handleUploadPendingReceipt()}
                  disabled={uploadingReceipt}
                  className="w-full min-h-[46px] rounded-2xl bg-[#4BB543] hover:bg-[#41A23A] border-b-4 border-[#2E8228] text-white font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {uploadingReceipt ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>ارسال رسید و توضیحات برای مدیر</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => void handleVerifyPurchase(false)}
                disabled={verifying}
                className="w-full min-h-[46px] rounded-2xl bg-[#5472EB] hover:bg-[#425FD6] border-b-4 border-[#354EB8] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${verifying ? 'animate-spin' : ''}`} />
                <span>
                  {verifying ? 'در حال بررسی...' : 'به‌روزرسانی وضعیت تایید سفارش'}
                </span>
              </button>
            </div>
          ) : (
            /* Active Checkout Options: Tab 1 (Online Gateway) vs Tab 2 (Bank Transfer / Receipt) */
            <div className="space-y-3">
              {/* Seamless Connected Account Banner */}
              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-200 dark:border-emerald-800 p-3 text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-start gap-2 leading-relaxed">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                <span>
                  حساب <strong>«{wpUser.displayName}»</strong> متصل است؛ نیازی به ورود مجدد یا پر کردن فرم اطلاعات نیست.
                </span>
              </div>

              {/* Payment Method Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[#FFF2E0] dark:bg-slate-800 border border-[#EEDCC5] dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentTab('online');
                    setErrorMessage(null);
                  }}
                  className={`min-h-[44px] px-2 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    paymentTab === 'online'
                      ? 'bg-[#4BB543] text-white shadow-xs'
                      : 'text-[#783F1D] dark:text-slate-300'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 shrink-0" />
                  <span>پرداخت آنلاین</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentTab('bacs');
                    setErrorMessage(null);
                  }}
                  className={`min-h-[44px] px-2 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    paymentTab === 'bacs'
                      ? 'bg-[#5472EB] text-white shadow-xs'
                      : 'text-[#783F1D] dark:text-slate-300'
                  }`}
                >
                  <CreditCard className="w-4 h-4 shrink-0" />
                  <span>واریز به حساب / کارت به کارت</span>
                </button>
              </div>

              {paymentTab === 'online' ? (
                <div className="space-y-2.5">
                  {loadingCheckout ? (
                    <div className="w-full min-h-[50px] rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-extrabold text-sm flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>در حال آماده‌سازی درگاه پرداخت...</span>
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
                      <span>پرداخت آنلاین و فعال‌سازی فوری</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-200 dark:border-amber-800 p-3 text-xs font-bold text-amber-900 dark:text-amber-200">
                      امکان پرداخت آنلاین برای این دوره هنوز فعال نشده است. می‌توانید از روش کارت به کارت استفاده کنید.
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => void handleVerifyPurchase(false)}
                    disabled={verifying}
                    className="w-full min-h-[46px] rounded-2xl bg-[#5472EB] hover:bg-[#425FD6] border-b-4 border-[#354EB8] active:border-b-0 active:translate-y-0.5 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm transition-all"
                  >
                    <RefreshCw className={`w-4 h-4 ${verifying ? 'animate-spin' : ''}`} />
                    <span>
                      {verifying
                        ? 'در حال بررسی وضعیت سفارش...'
                        : 'پرداخت را انجام دادم — بررسی و فعال‌سازی دوره'}
                    </span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeBacsAccounts.length > 0 ? (
                    <div className="rounded-2xl bg-white dark:bg-slate-800 border-2 border-[#EEDCC5] dark:border-slate-700 p-3 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-slate-100">
                        <Landmark className="w-4 h-4 text-[#5472EB]" />
                        <span>مشخصات حساب بانکی برای واریز ({priceLabel}):</span>
                      </div>
                      {activeBacsAccounts.map((acc, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl bg-[#FFF9F2] dark:bg-slate-900 p-2.5 text-xs space-y-1 border border-[#EFE0CE] dark:border-slate-700"
                        >
                          <div className="font-extrabold text-slate-800 dark:text-white">
                            {acc.bankName || 'حساب بانکی'} — {acc.accountName}
                          </div>
                          {acc.accountNumber && (
                            <div className="flex items-center justify-between gap-2">
                              <span dir="ltr" className="font-mono font-extrabold text-slate-900 dark:text-slate-200">
                                {acc.accountNumber}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(acc.accountNumber, `acc-${idx}`)}
                                className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-[#EEDCC5] text-[11px] font-bold text-[#5472EB] inline-flex items-center gap-1"
                              >
                                {copiedIdx === `acc-${idx}` ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>کپی شد</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>کپی</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                          {acc.iban && (
                            <div dir="ltr" className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              {acc.iban}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 p-3 text-xs font-bold text-amber-900 dark:text-amber-200">
                      مبلغ قابل پرداخت: <strong>{priceLabel}</strong>. پس از واریز، رسید و توضیحات را ثبت کنید تا مدیر تایید نماید.
                    </div>
                  )}

                  <div className="rounded-2xl bg-white dark:bg-slate-800 border-2 border-[#EEDCC5] dark:border-slate-700 p-3.5">
                    <ReceiptUploaderField
                      digitMode={digitMode}
                      selectedImage={receiptImage}
                      onImageChange={setReceiptImage}
                      noteValue={paymentNote}
                      onNoteChange={setPaymentNote}
                    />
                  </div>

                  <button
                    type="button"
                    disabled={submittingOffline}
                    onClick={() => void handleSubmitOfflineOrder()}
                    className="w-full min-h-[50px] rounded-2xl bg-[#5472EB] hover:bg-[#425FD6] border-b-4 border-[#354EB8] active:border-b-0 active:translate-y-0.5 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm transition-all"
                  >
                    {submittingOffline ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>ثبت سفارش و ارسال برای تایید مدیر</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
