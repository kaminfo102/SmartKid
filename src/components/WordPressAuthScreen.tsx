import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Compass,
  CreditCard,
  Crown,
  Download,
  Edit3,
  Eye,
  EyeOff,
  Globe,
  Headphones,
  KeyRound,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Package,
  RefreshCw,
  Save,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Trophy,
  User,
  UserCheck,
  Users,
} from 'lucide-react';
import loginPeekImg from '../assets/images/login_kid_peek_1795604964868.jpg';
import type {
  BacsAccount,
  DigitDisplayMode,
  UserOrder,
  WordPressUser,
} from '../types/app';
import { KidIconTile } from './KidIconTile';
import { CloudSyncIllustration } from './KidIllustrations';
import { LatinDigitInput } from './LatinDigitInput';
import { ReceiptUploaderField } from './ReceiptUploaderField';
import { formatNumber } from '../lib/numbers';
import { IRAN_PROVINCES } from '../lib/iranProvinces';
import type { OptimizedImageResult } from '../lib/imageOptimizer';
import {
  checkWordPressHealth,
  fetchAccountMe,
  fetchUserOrders,
  isProfileCompleteForPurchase,
  isValidIranMobile,
  loginWordPress,
  logoutWordPress,
  normalizeIranMobile,
  normalizePersianDigits,
  saveWordPressUrl,
  sendOtpWordPress,
  updateAccountProfile,
  uploadOrderReceipt,
  verifyOtpWordPress,
  WordPressApiError,
  type WordPressAuthResponse,
} from '../lib/wordpressApi';

interface WordPressAuthScreenProps {
  wpUrl: string;
  wpUser: WordPressUser | null;
  wpConnected: boolean;
  stagesCount: number;
  questionsCount: number;
  digitMode: DigitDisplayMode;
  onUpdateWpUrl: (url: string) => void;
  onAuthSuccess: (res: WordPressAuthResponse) => void;
  onUpdateUser?: (user: WordPressUser) => void;
  onLogout: () => void;
  onRefreshFromWordPress: (overrideUrl?: string) => Promise<boolean>;
  onOpenProfiles?: () => void;
  onOpenTickets?: () => void;
  onContinueAsGuest?: () => void;
  authReasonMessage?: string | null;
  isGuestMode?: boolean;
  onBack: () => void;
  embedded?: boolean;
  refreshTrigger?: number;
}

export const WordPressAuthScreen: React.FC<WordPressAuthScreenProps> = ({
  wpUrl,
  wpUser,
  wpConnected,
  stagesCount,
  questionsCount,
  digitMode,
  onUpdateWpUrl,
  onAuthSuccess,
  onUpdateUser,
  onLogout,
  onRefreshFromWordPress,
  onOpenProfiles,
  onOpenTickets,
  onContinueAsGuest,
  authReasonMessage = null,
  isGuestMode = false,
  onBack,
  embedded = false,
  refreshTrigger = 0,
}) => {
  const [siteInput, setSiteInput] = useState(wpUrl);

  // Logged-out auth tabs: mobile+OTP quick auth (default) vs password login
  const [authTab, setAuthTab] = useState<'otp' | 'password'>('otp');
  const [otpMobile, setOtpMobile] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpTargetMobile, setOtpTargetMobile] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Logged-in account tabs
  const [accountTab, setAccountTab] = useState<'orders' | 'profile' | 'admin'>('orders');
  const [profileLoading, setProfileLoading] = useState(false);

  // Profile edit state
  const [editFirstName, setEditFirstName] = useState(wpUser?.firstName || '');
  const [editLastName, setEditLastName] = useState(wpUser?.lastName || '');
  const [editMobile, setEditMobile] = useState(wpUser?.mobile || '');
  const [editEmail, setEditEmail] = useState(wpUser?.email || '');
  const [editState, setEditState] = useState(wpUser?.state || 'تهران');
  const [editCity, setEditCity] = useState(wpUser?.city || '');
  const [editAddress1, setEditAddress1] = useState(wpUser?.address1 || '');
  const [editPostcode, setEditPostcode] = useState(wpUser?.postcode || '');
  const [editNewPassword, setEditNewPassword] = useState('');

  // Orders state
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [bacsAccounts, setBacsAccounts] = useState<BacsAccount[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [uploadingOrderId, setUploadingOrderId] = useState<number | null>(null);
  const [orderReceipts, setOrderReceipts] = useState<Record<number, OptimizedImageResult | null>>({});
  const [orderNotes, setOrderNotes] = useState<Record<number, string>>({});

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const syncEditFieldsFromUser = useCallback((user: WordPressUser) => {
    setEditFirstName(user.firstName || '');
    setEditLastName(user.lastName || '');
    setEditMobile(user.mobile || '');
    setEditEmail(
      user.email || (user.username ? `${user.username}@chootkeh.ir` : '')
    );
    setEditState(user.state && user.state.trim() ? user.state : 'تهران');
    setEditCity(user.city || '');
    setEditAddress1(user.address1 || '');
    setEditPostcode(user.postcode || '');
  }, []);

  useEffect(() => {
    if (wpUser) {
      syncEditFieldsFromUser(wpUser);
    }
  }, [wpUser, syncEditFieldsFromUser]);

  const loadAccountProfile = useCallback(async () => {
    if (!wpUrl || !wpUser) return;
    setProfileLoading(true);
    try {
      const me = await fetchAccountMe(wpUrl);
      if (me?.user) {
        onUpdateUser?.(me.user);
        syncEditFieldsFromUser(me.user);
      }
    } catch {
      // keep existing wpUser values if offline/temporary error
    } finally {
      setProfileLoading(false);
    }
  }, [wpUrl, wpUser, onUpdateUser, syncEditFieldsFromUser]);

  const loadOrders = useCallback(async () => {
    if (!wpUrl || !wpUser) return;
    setOrdersLoading(true);
    try {
      const res = await fetchUserOrders(wpUrl);
      setOrders(res.orders);
      setBacsAccounts(res.bacsAccounts);
    } catch {
      // keep existing state cleanly
    } finally {
      setOrdersLoading(false);
    }
  }, [wpUrl, wpUser]);

  useEffect(() => {
    if (!wpUser || !wpUrl) return;
    if (accountTab === 'orders') {
      void loadOrders();
    } else if (accountTab === 'profile') {
      void loadAccountProfile();
    }
  }, [wpUser, wpUrl, accountTab, refreshTrigger, loadOrders, loadAccountProfile]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = window.setTimeout(() => {
      setResendCountdown((sec) => Math.max(0, sec - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendCountdown]);

  const handleTestAndSaveUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wpUser?.isAdmin) {
      setErrorMsg('تغییر آدرس سرور فقط برای مدیر مجاز است.');
      return;
    }
    setErrorMsg(null);
    setStatusMsg(null);
    const saved = saveWordPressUrl(siteInput);
    if (!saved) {
      setErrorMsg('لطفاً آدرس معتبر سرور را با https:// وارد کنید.');
      return;
    }
    setLoading(true);
    try {
      const health = await checkWordPressHealth(saved);
      onUpdateWpUrl(saved);
      await onRefreshFromWordPress(saved);
      setStatusMsg(
        `اتصال به سرور «${health.siteName || saved}» برقرار شد! (${formatNumber(
          health.stagesCount,
          digitMode
        )} مرحله و ${formatNumber(health.questionsCount, digitMode)} سؤال بارگذاری شد)`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'ارتباط با سرور برقرار نشد.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);

    const cleanIdentifier = normalizePersianDigits(identifier).trim();
    const cleanPassword = normalizePersianDigits(password);
    if (!cleanIdentifier) {
      setErrorMsg('لطفاً شماره موبایل، نام کاربری یا ایمیل خود را وارد کنید.');
      return;
    }
    if (!cleanPassword) {
      setErrorMsg('لطفاً رمز عبور خود را وارد کنید.');
      return;
    }

    const activeUrl = wpUrl;
    if (!activeUrl) {
      setErrorMsg('سرویس ورود هنوز توسط مدیر سیستم پیکربندی نشده است.');
      return;
    }
    setLoading(true);
    try {
      const res = await loginWordPress(
        activeUrl,
        cleanIdentifier,
        cleanPassword
      );
      onUpdateWpUrl(activeUrl);
      onAuthSuccess(res);
      setStatusMsg(`خوش آمدید ${res.user.displayName}! حساب کاربری شما با موفقیت متصل شد.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ورود به حساب کاربری ناموفق بود.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);

    const normalized = normalizeIranMobile(otpMobile);
    if (!isValidIranMobile(normalized)) {
      setErrorMsg('شماره موبایل معتبر نیست. لطفاً شماره ۱۱ رقمی با شروع ۰۹ وارد کنید (مثلاً 09123456789).');
      return;
    }

    const activeUrl = wpUrl;
    if (!activeUrl) {
      setErrorMsg('سرویس ورود پیامکی هنوز توسط مدیر سیستم پیکربندی نشده است.');
      return;
    }

    setLoading(true);
    try {
      const res = await sendOtpWordPress(activeUrl, normalized);
      setOtpTargetMobile(res.mobile || normalized);
      setOtpSent(true);
      setOtpCode('');
      setResendCountdown(res.resendAfterSeconds || 60);
      setStatusMsg(res.message);
    } catch (err) {
      if (err instanceof WordPressApiError && err.retryAfter && err.retryAfter > 0) {
        setResendCountdown(err.retryAfter);
        setOtpTargetMobile(normalized);
        setOtpSent(true);
      }
      setErrorMsg(err instanceof Error ? err.message : 'ارسال کد تایید ناموفق بود.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);

    const targetMobile = normalizeIranMobile(otpTargetMobile || otpMobile);
    if (!isValidIranMobile(targetMobile)) {
      setErrorMsg('شماره موبایل معتبر نیست.');
      return;
    }

    const cleanCode = normalizePersianDigits(otpCode).replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setErrorMsg('لطفاً کد تایید ۶ رقمی پیامک‌شده را کامل وارد کنید.');
      return;
    }

    const activeUrl = wpUrl;
    if (!activeUrl) {
      setErrorMsg('سرویس ورود پیامکی هنوز توسط مدیر سیستم پیکربندی نشده است.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOtpWordPress(activeUrl, targetMobile, cleanCode);
      onUpdateWpUrl(activeUrl);
      syncEditFieldsFromUser(res.user);
      onAuthSuccess(res);
      setOtpSent(false);
      setOtpCode('');
      setResendCountdown(0);
      setStatusMsg(
        res.isNewUser
          ? 'ثبت‌نام سریع با موفقیت انجام شد! پروفایل کودک «کیا» آماده است. هنگام سفارش می‌توانید مشخصات پستی را تکمیل کنید.'
          : `خوش آمدید ${res.user.displayName}! حساب کاربری شما متصل شد.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'کد تایید معتبر نیست یا منقضی شده است.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wpUrl || !wpUser) return;
    setErrorMsg(null);
    setStatusMsg(null);

    if (!editFirstName.trim() || !editLastName.trim()) {
      setErrorMsg('لطفاً نام و نام خانوادگی را وارد کنید.');
      return;
    }

    const normalizedMobile = normalizeIranMobile(editMobile);
    if (!isValidIranMobile(normalizedMobile)) {
      setErrorMsg('شماره موبایل معتبر نیست. لطفاً شماره ۱۱ رقمی با شروع ۰۹ وارد کنید (مثلاً 09123456789).');
      return;
    }

    const cleanEmail = normalizePersianDigits(editEmail).trim();
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('فرمت ایمیل واردشده معتبر نیست.');
      return;
    }

    if (!editCity.trim() || !editAddress1.trim()) {
      setErrorMsg('لطفاً نام شهر و آدرس کامل پستی را وارد کنید.');
      return;
    }

    const cleanPostcode = normalizePersianDigits(editPostcode.trim()).replace(/\D/g, '');
    if (cleanPostcode.length !== 10) {
      setErrorMsg('کد پستی باید دقیقاً ۱۰ رقم باشد.');
      return;
    }

    const cleanNewPassword = normalizePersianDigits(editNewPassword).trim();
    if (cleanNewPassword && cleanNewPassword.length < 6) {
      setErrorMsg('رمز عبور جدید باید حداقل ۶ کاراکتر باشد.');
      return;
    }

    const fallbackEmail = wpUser.username ? `${wpUser.username}@chootkeh.ir` : undefined;

    setLoading(true);
    try {
      const res = await updateAccountProfile(wpUrl, {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        displayName: `${editFirstName.trim()} ${editLastName.trim()}`.trim() || wpUser.displayName,
        mobile: normalizedMobile,
        email: cleanEmail || fallbackEmail,
        state: editState.trim(),
        city: editCity.trim(),
        address1: editAddress1.trim(),
        postcode: cleanPostcode,
        newPassword: cleanNewPassword || undefined,
      });
      onUpdateUser?.(res.user);
      syncEditFieldsFromUser(res.user);
      setEditNewPassword('');
      setStatusMsg(res.message);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ذخیره اطلاعات ناموفق بود.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadOrderReceipt = async (orderId: number) => {
    if (!wpUrl || !wpUser) return;
    const img = orderReceipts[orderId] ?? null;
    const note = orderNotes[orderId] ?? '';
    if (!img && !note.trim()) {
      setErrorMsg('لطفاً تصویر فیش بانکی یا توضیحات واریز را وارد کنید.');
      return;
    }

    setUploadingOrderId(orderId);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const res = await uploadOrderReceipt(wpUrl, orderId, img?.file ?? null, note);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? res.order : o)));
      setOrderReceipts((prev) => ({ ...prev, [orderId]: null }));
      setStatusMsg(res.message);
      void onRefreshFromWordPress();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ارسال فیش بانکی ناموفق بود.');
    } finally {
      setUploadingOrderId(null);
    }
  };

  const handleLogoutClick = async () => {
    setLoading(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      await logoutWordPress(wpUrl);
      onLogout();
      setStatusMsg('با موفقیت از حساب کاربری خود خارج شدید.');
    } finally {
      setLoading(false);
    }
  };

  const containerClass = embedded
    ? 'space-y-4'
    : wpUser
      ? 'flex-1 w-full max-w-3xl mx-auto p-4 sm:p-6 space-y-5 pb-12'
      : 'flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-5 pb-12';

  const contentBody = (
      <div className={containerClass}>
        {statusMsg && (
          <div className="rounded-2xl bg-[#E7F9E5] border-2 border-[#8EE086] border-b-4 p-3 text-xs sm:text-sm font-extrabold text-[#1E6B19] flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="rounded-2xl bg-[#FEE2E2] border-2 border-[#FCA5A5] border-b-4 p-3 text-xs sm:text-sm font-extrabold text-[#991B1B]">
            {errorMsg}
          </div>
        )}

        {wpUser ? (
          <>
            {/* Authenticated Commercial User Header Card */}
            <section className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] border-b-4 border-b-[#DFC6A8] dark:border-slate-800 shadow-[0_10px_24px_-8px_rgba(170,104,40,0.16)] p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <KidIconTile color="green" size="lg">
                    <CheckCircle2 className="w-7 h-7" />
                  </KidIconTile>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-[#1E6B19] dark:text-emerald-400">
                      حساب کاربری فعال
                    </div>
                    <div className="text-base sm:text-lg font-extrabold text-[#3B2618] dark:text-white truncate">
                      {wpUser.displayName}
                    </div>
                    <div className="text-xs text-[#785942] dark:text-slate-400 flex items-center gap-2 flex-wrap">
                      {wpUser.mobile && <span dir="ltr">{wpUser.mobile}</span>}
                      {wpUser.email && <span>· {wpUser.email}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {onOpenProfiles && (
                    <button
                      type="button"
                      onClick={onOpenProfiles}
                      className="min-h-[42px] px-3 rounded-2xl bg-[#FFF6EB] hover:bg-amber-100 dark:bg-slate-800 border-b-4 border-[#DFC6A8] text-[#783F1D] dark:text-slate-200 font-extrabold text-xs inline-flex items-center gap-1.5"
                    >
                      <Users className="w-4 h-4 text-[#5472EB]" />
                      <span>فرزندان</span>
                    </button>
                  )}
                  {onOpenTickets && (
                    <button
                      type="button"
                      onClick={onOpenTickets}
                      className="min-h-[42px] px-3 rounded-2xl bg-[#EFF6FF] hover:bg-sky-100 dark:bg-slate-800 border-b-4 border-sky-200 text-sky-900 dark:text-sky-200 font-extrabold text-xs inline-flex items-center gap-1.5"
                    >
                      <Headphones className="w-4 h-4 text-sky-600" />
                      <span>پشتیبانی و تیکت</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleLogoutClick}
                    disabled={loading}
                    className="min-h-[42px] px-3 rounded-2xl bg-[#FEE2E2] hover:bg-rose-200 border-b-4 border-[#FCA5A5] text-[#991B1B] font-extrabold text-xs inline-flex items-center gap-1.5"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>خروج</span>
                  </button>
                </div>
              </div>

              {/* Navigation Sub-tabs */}
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAccountTab('orders')}
                  className={`min-h-[44px] px-4 rounded-2xl font-extrabold text-xs inline-flex items-center justify-center gap-1.5 transition-all ${
                    accountTab === 'orders'
                      ? 'bg-[#5472EB] text-white border-b-4 border-[#354EB8]'
                      : 'bg-[#FFF6EB] dark:bg-slate-800 text-[#783F1D] dark:text-slate-300'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>سفارش‌ها و وضعیت پرداخت</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAccountTab('profile')}
                  className={`min-h-[44px] px-4 rounded-2xl font-extrabold text-xs inline-flex items-center justify-center gap-1.5 transition-all ${
                    accountTab === 'profile'
                      ? 'bg-[#4BB543] text-white border-b-4 border-[#2E8228]'
                      : 'bg-[#FFF6EB] dark:bg-slate-800 text-[#783F1D] dark:text-slate-300'
                  }`}
                >
                  <Edit3 className="w-4 h-4" />
                  <span>ویرایش مشخصات و آدرس</span>
                </button>

                {wpUser.isAdmin && (
                  <button
                    type="button"
                    onClick={() => setAccountTab('admin')}
                    className={`col-span-2 sm:col-span-1 min-h-[44px] px-4 rounded-2xl font-extrabold text-xs inline-flex items-center justify-center gap-1.5 transition-all ${
                      accountTab === 'admin'
                        ? 'bg-[#8E63EB] text-white border-b-4 border-[#6339C4]'
                        : 'bg-[#F5F3FF] dark:bg-slate-800 text-violet-900 dark:text-violet-300'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>مدیریت سرور و پلاگین</span>
                  </button>
                )}
              </div>

              {!isProfileCompleteForPurchase(wpUser) && (
                <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-200 dark:border-amber-800 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start gap-2 text-xs font-bold text-amber-950 dark:text-amber-200 leading-relaxed">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      حساب شما با ثبت‌نام سریع موبایل ساخته شده است. برای سفارش یا خرید دوره، ابتدا مشخصات و نشانی ارسال را تکمیل کنید.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAccountTab('profile')}
                    className="min-h-[38px] px-3.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white font-extrabold text-xs shrink-0 whitespace-nowrap"
                  >
                    تکمیل مشخصات خرید
                  </button>
                </div>
              )}
            </section>

            {/* Tab 1: Orders History & Bank Receipt Uploader */}
            {accountTab === 'orders' && (
              <section className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm sm:text-base font-extrabold text-[#5B3A1D] dark:text-white">
                    تاریخچه سفارش‌ها و وضعیت تایید
                  </h2>
                  <button
                    type="button"
                    onClick={() => void loadOrders()}
                    disabled={ordersLoading}
                    className="min-h-[38px] px-3 rounded-xl bg-white dark:bg-slate-800 border border-[#EEDCC5] dark:border-slate-700 text-xs font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${ordersLoading ? 'animate-spin' : ''}`} />
                    <span>به‌روزرسانی</span>
                  </button>
                </div>

                {ordersLoading && orders.length === 0 ? (
                  <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] p-8 flex flex-col items-center gap-2 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin text-[#5472EB]" />
                    <span className="text-xs font-bold">در حال دریافت فهرست سفارش‌ها...</span>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 p-6 text-center space-y-2">
                    <Package className="w-10 h-10 text-amber-400 mx-auto" />
                    <div className="text-sm font-extrabold text-slate-800 dark:text-white">
                      هنوز سفارشی ثبت نکرده‌اید
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      پس از تهیه دوره‌ها یا خرید از فروشگاه کودک نابغه، وضعیت و جزئیات هر سفارش در اینجا نمایش داده می‌شود.
                    </p>
                  </div>
                ) : (
                  orders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] border-b-4 border-b-[#DFC6A8] dark:border-slate-800 p-4 space-y-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                              سفارش #{formatNumber(order.orderNumber, digitMode)}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-xl text-[11px] font-extrabold ${
                                order.pendingReview
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : order.status === 'completed' || order.status === 'processing'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {order.statusLabel}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            {order.dateCreated} · {order.paymentMethodTitle}
                          </div>
                        </div>

                        <div className="text-sm font-extrabold text-[#4BB543] dark:text-emerald-400">
                          {order.totalFormatted}
                        </div>
                      </div>

                      <div className="rounded-xl bg-[#FFF9F2] dark:bg-slate-800/70 p-2.5 space-y-1">
                        {order.items.map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200"
                          >
                            <span>
                              {item.name} × {formatNumber(item.qty, digitMode)}
                            </span>
                            <span>{item.totalFormatted}</span>
                          </div>
                        ))}
                      </div>

                      {order.pendingReview && (
                        <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-200 dark:border-amber-800 p-3 space-y-3">
                          <div className="text-xs font-extrabold text-amber-900 dark:text-amber-200">
                            سفارش در حال بررسی و تایید توسط مدیر می‌باشد.
                          </div>

                          {bacsAccounts.length > 0 && (
                            <div className="rounded-xl bg-white/90 dark:bg-slate-900/80 border border-amber-200 p-2.5 space-y-1.5">
                              <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700 dark:text-slate-200">
                                <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                                <span>اطلاعات حساب بانکی جهت واریز:</span>
                              </div>
                              {bacsAccounts.map((acc, idx) => (
                                <div key={idx} className="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                                  <div>
                                    <strong>{acc.bankName || 'حساب بانکی'}:</strong> {acc.accountName}
                                  </div>
                                  {acc.accountNumber && (
                                    <div dir="ltr" className="text-right font-mono font-bold">
                                      شماره حساب/کارت: {acc.accountNumber}
                                    </div>
                                  )}
                                  {acc.iban && (
                                    <div dir="ltr" className="text-right font-mono">
                                      شبا: {acc.iban}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {order.receiptUrl && (
                            <div className="flex items-center gap-2.5">
                              <a
                                href={order.receiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0"
                              >
                                <img
                                  src={order.receiptUrl}
                                  alt="رسید ثبت‌شده"
                                  className="w-14 h-14 rounded-xl object-cover border-2 border-emerald-400"
                                />
                              </a>
                              <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold">
                                رسید بانکی قبلاً ثبت شده است. در صورت نیاز می‌توانید تصویر جدید جایگزین کنید.
                              </div>
                            </div>
                          )}

                          {order.paymentNote && (
                            <div className="text-[11px] text-slate-700 dark:text-slate-300 font-bold bg-white/80 dark:bg-slate-900 rounded-xl px-2.5 py-1.5">
                              توضیحات ثبت‌شده: {order.paymentNote}
                            </div>
                          )}

                          <ReceiptUploaderField
                            digitMode={digitMode}
                            selectedImage={orderReceipts[order.id] ?? null}
                            onImageChange={(img) =>
                              setOrderReceipts((prev) => ({ ...prev, [order.id]: img }))
                            }
                            noteValue={orderNotes[order.id] ?? order.paymentNote ?? ''}
                            onNoteChange={(val) =>
                              setOrderNotes((prev) => ({ ...prev, [order.id]: val }))
                            }
                            imageLabel="ارسال یا تغییر تصویر فیش واریزی (اختیاری)"
                          />

                          <button
                            type="button"
                            disabled={uploadingOrderId === order.id}
                            onClick={() => void handleUploadOrderReceipt(order.id)}
                            className="w-full min-h-[44px] rounded-2xl bg-[#4BB543] hover:bg-[#41A23A] border-b-4 border-[#2E8228] text-white font-extrabold text-xs inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
                          >
                            {uploadingOrderId === order.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            <span>ثبت رسید و توضیحات برای مدیر</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </section>
            )}

            {/* Tab 2: Account & Billing/Shipping Edit Form */}
            {accountTab === 'profile' && (
              <section className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] border-b-4 border-b-[#DFC6A8] dark:border-slate-800 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                  <h2 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                    ویرایش مشخصات ثبت‌نام و آدرس ارسال
                  </h2>
                  <button
                    type="button"
                    onClick={() => void loadAccountProfile()}
                    disabled={profileLoading}
                    className="min-h-[36px] px-3 rounded-xl bg-[#FFF6EB] dark:bg-slate-800 border border-[#EEDCC5] dark:border-slate-700 text-xs font-extrabold text-[#783F1D] dark:text-slate-200 inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${profileLoading ? 'animate-spin' : ''}`} />
                    <span>{profileLoading ? 'در حال فراخوانی...' : 'فراخوانی اطلاعات از سرور'}</span>
                  </button>
                </div>

                <form onSubmit={handleSaveProfile} noValidate className="space-y-3">
                  <div className="rounded-2xl bg-[#FFF9F2] dark:bg-slate-800/70 border border-[#EEDCC5] dark:border-slate-700 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
                    <span className="font-extrabold text-slate-600 dark:text-slate-300">نام کاربری حساب (ثابت):</span>
                    <span dir="ltr" className="font-mono font-extrabold text-[#5472EB] dark:text-sky-300">
                      {wpUser.username}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        نام
                      </label>
                      <input
                        type="text"
                        required
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        className="w-full min-h-[46px] px-3.5 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        نام خانوادگی
                      </label>
                      <input
                        type="text"
                        required
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        className="w-full min-h-[46px] px-3.5 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        شماره موبایل *
                      </label>
                      <LatinDigitInput
                        type="text"
                        inputMode="tel"
                        autoComplete="tel"
                        dir="ltr"
                        transformMode="mobile"
                        value={editMobile}
                        onValueChange={setEditMobile}
                        placeholder="09123456789"
                        className="w-full min-h-[46px] px-3.5 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                      />
                      {editMobile.trim() && !isValidIranMobile(editMobile) && (
                        <p className="text-[11px] font-bold text-rose-600 mt-1">
                          شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        ایمیل (اختیاری — پیش‌فرض @chootkeh.ir)
                      </label>
                      <LatinDigitInput
                        type="text"
                        inputMode="email"
                        autoComplete="email"
                        dir="ltr"
                        transformMode="latin-digits"
                        value={editEmail}
                        onValueChange={setEditEmail}
                        placeholder={`${wpUser.username}@chootkeh.ir`}
                        className="w-full min-h-[46px] px-3.5 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        استان
                      </label>
                      <select
                        value={editState}
                        onChange={(e) => setEditState(e.target.value)}
                        className="w-full min-h-[46px] px-3.5 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                      >
                        {editState && !IRAN_PROVINCES.includes(editState) && (
                          <option value={editState}>{editState}</option>
                        )}
                        {IRAN_PROVINCES.map((prov) => (
                          <option key={prov} value={prov}>
                            {prov}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        شهر
                      </label>
                      <input
                        type="text"
                        required
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        placeholder="مثلاً تهران"
                        className="w-full min-h-[46px] px-3.5 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        آدرس کامل پستی
                      </label>
                      <input
                        type="text"
                        required
                        value={editAddress1}
                        onChange={(e) => setEditAddress1(e.target.value)}
                        placeholder="خیابان، کوچه، پلاک، واحد"
                        className="w-full min-h-[46px] px-3.5 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        کد پستی (۱۰ رقمی)
                      </label>
                      <LatinDigitInput
                        type="text"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        dir="ltr"
                        transformMode="postcode"
                        value={editPostcode}
                        onValueChange={setEditPostcode}
                        placeholder="1234567890"
                        className={`w-full min-h-[46px] px-3.5 rounded-2xl border-2 bg-[#FFF9F2] dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white ${
                          editPostcode.trim() && editPostcode.trim().length !== 10
                            ? 'border-rose-400 dark:border-rose-500'
                            : 'border-[#EEDCC5] dark:border-slate-700'
                        }`}
                      />
                      {editPostcode.trim() && editPostcode.trim().length !== 10 && (
                        <p className="text-[11px] font-bold text-rose-600 mt-1">
                          کد پستی باید دقیقاً ۱۰ رقم باشد.
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                      تغییر رمز عبور (در صورت عدم نیاز خالی بگذارید)
                    </label>
                    <LatinDigitInput
                      type="password"
                      dir="ltr"
                      transformMode="latin-digits"
                      value={editNewPassword}
                      onValueChange={setEditNewPassword}
                      placeholder="حداقل ۶ کاراکتر"
                      className="w-full min-h-[46px] px-3.5 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full min-h-[50px] rounded-2xl bg-[#4BB543] hover:bg-[#41A23A] border-b-4 border-[#2E8228] text-white font-extrabold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <Save className="w-4 h-4" />
                    <span>ذخیره تغییرات حساب</span>
                  </button>
                </form>
              </section>
            )}

            {/* Tab 3: STRICTLY ADMIN ONLY — Backend URL & WordPress Plugin Download */}
            {accountTab === 'admin' && wpUser.isAdmin && (
              <div className="space-y-4">
                <section className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] border-b-4 border-b-[#DFC6A8] dark:border-slate-800 p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-3">
                      <CloudSyncIllustration className="w-12 h-12 shrink-0" />
                      <div>
                        <h2 className="font-extrabold text-sm sm:text-base text-[#3B2618] dark:text-white">
                          اتصال به سرور مدیریت محتوا (ویژه مدیر)
                        </h2>
                        <p className="text-xs text-[#785942] dark:text-slate-400">
                          {wpConnected
                            ? `متصل · ${formatNumber(stagesCount, digitMode)} مرحله · ${formatNumber(
                                questionsCount,
                                digitMode
                              )} سؤال`
                            : 'در حال انتظار اتصال'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleTestAndSaveUrl} noValidate className="flex flex-col sm:flex-row gap-2">
                    <LatinDigitInput
                      type="text"
                      inputMode="url"
                      dir="ltr"
                      transformMode="latin-digits"
                      value={siteInput}
                      onValueChange={setSiteInput}
                      placeholder="https://yoursite.com"
                      className="flex-1 min-h-[46px] px-4 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="min-h-[46px] px-5 rounded-2xl bg-[#5472EB] hover:bg-[#425FD6] border-b-4 border-[#354EB8] text-white font-extrabold text-sm inline-flex items-center justify-center gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      <span>اتصال و همگام‌سازی</span>
                    </button>
                  </form>
                </section>

                <section className="rounded-2xl bg-gradient-to-br from-[#F5F3FF] to-[#EDE9FE] dark:from-slate-900 dark:to-slate-900 border-2 border-[#D4C5FC] dark:border-slate-800 p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <KidIconTile color="violet" size="md">
                      <Globe className="w-6 h-6" />
                    </KidIconTile>
                    <div>
                      <h2 className="font-extrabold text-sm sm:text-base text-[#35207A] dark:text-white">
                        بسته افزونه مدیریت سرور (نسخه ۲.۹.۰)
                      </h2>
                      <p className="text-xs text-[#59449E] dark:text-slate-300">
                        تم مدیریتی بهینه و راست‌چین با تقویم و دیت‌پیکر شمسی، گزارشات و تحلیل بازدید وب/اپ موبایل، بنرها و دیالوگ‌های زمان‌بندی‌شده، مدیریت کامل سفارش‌ها، محصولات، کاربران، sms.ir و تیکتینگ
                      </p>
                    </div>
                  </div>
                  <a
                    href="/downloads/koodak-nabegheh-soroban.zip"
                    download="koodak-nabegheh-soroban.zip"
                    className="w-full min-h-[48px] px-4 rounded-2xl bg-[#8E63EB] hover:bg-[#7A4EE0] border-b-4 border-[#6339C4] text-white font-extrabold text-sm inline-flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    <span>دانلود فایل نصب افزونه (ZIP)</span>
                  </a>
                </section>
              </div>
            )}
          </>
        ) : (
          <div className={embedded ? 'space-y-4' : 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'}>
            {/* Left Showcase & Guest vs Member Comparison (Standalone Desktop/Tablet) */}
            {!embedded && (
              <section className="lg:col-span-5 rounded-3xl bg-gradient-to-b from-[#FFF9EE] to-white dark:from-slate-900 dark:to-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 border-b-4 border-b-[#DFC6A8] dark:border-b-slate-700 p-5 sm:p-6 space-y-5 shadow-[0_14px_30px_-12px_rgba(170,104,40,0.18)]">
                <div className="flex items-center gap-3.5">
                  <CloudSyncIllustration className="w-16 h-16 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-[#D97706] dark:text-amber-400">
                      حساب خانواده کودک نابغه
                    </p>
                    <h2 className="text-lg sm:text-xl font-black text-[#3B2618] dark:text-white leading-snug">
                      ورود سریع با شماره موبایل
                    </h2>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  با یک شماره موبایل در کمتر از چند ثانیه وارد شوید؛ ستاره‌ها، پروفایل فرزندان، مدال‌ها و سفارش‌های شما به‌صورت امن بین موبایل و وب ذخیره می‌شوند.
                </p>

                <div className="space-y-2.5">
                  <div className="text-xs font-black text-[#6E3D1C] dark:text-amber-200">
                    مقایسه حساب کاربری و حالت مهمان
                  </div>

                  <div className="rounded-2xl bg-[#EEF8EC] dark:bg-emerald-950/30 border border-[#BCE5B4] dark:border-emerald-800/60 p-3.5 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-black text-[#1E6B19] dark:text-emerald-300">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>امکانات با ورود به حساب کاربری</span>
                    </div>
                    <ul className="space-y-1.5 text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300">
                      <li className="flex items-center gap-2">
                        <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>ثبت رکورد کودک در جدول قهرمانان (لیدربورد)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <ShoppingBag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>باز کردن ترم‌های جدید، خرید از فروشگاه و پیگیری سفارش</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Headphones className="w-3.5 h-3.5 text-[#5472EB] shrink-0" />
                        <span>ذخیره ابری پیشرفت روی همه دستگاه‌ها و پشتیبانی تیکتی</span>
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-2xl bg-[#FFF6EB] dark:bg-slate-800/70 border border-[#EEDCC5] dark:border-slate-700 p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-black text-[#783F1D] dark:text-amber-200">
                      <Compass className="w-4 h-4 shrink-0 text-[#E07C47]" />
                      <span>امکانات حالت مهمان (بدون نیاز به ثبت‌نام)</span>
                    </div>
                    <p className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed">
                      بازدید کامل صفحه اصلی · ترم اول رایگان · تمرین چرتکه · بازی‌های شاد · چرتکه سه‌بعدی تمام‌صفحه · مشاهده لیدربورد و فروشگاه
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Right Auth Card with 3D Peeking Characters + OTP / Password + Guest CTA */}
            <div className={embedded ? 'space-y-4' : 'lg:col-span-7 space-y-4'}>
              {authReasonMessage && (
                <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-300 dark:border-amber-700 p-3.5 flex items-start gap-2.5 text-xs sm:text-sm font-extrabold text-amber-950 dark:text-amber-100 shadow-sm">
                  <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{authReasonMessage}</span>
                </div>
              )}

              {/* Storybook Header + Peeking Characters directly atop white login card (Standalone) */}
              {!embedded && (
                <div className="pt-1">
                  <div className="text-center space-y-1 mb-2.5">
                    <div className="inline-flex items-center justify-center">
                      <Crown className="w-7 h-7 text-amber-400 fill-amber-300 drop-shadow-xs" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-[#15429E] dark:text-sky-200 drop-shadow-[0_1px_0_rgba(255,255,255,0.85)] dark:drop-shadow-none">
                      خوش برگشتی!
                    </h2>
                    <p className="text-xs sm:text-sm font-bold text-[#1E4B9E]/85 dark:text-slate-300">
                      برای ادامه ماجراجویی چرتکه وارد شو
                    </p>
                  </div>

                  <div className="relative mx-auto max-w-[380px] rounded-t-[28px] overflow-hidden border-2 border-b-0 border-white/80 dark:border-slate-700 shadow-sm">
                    <img
                      src={loginPeekImg}
                      alt="کودک شاد و جغد مهربان بالای کارت ورود"
                      referrerPolicy="no-referrer"
                      className="w-full h-44 sm:h-48 object-cover object-top"
                    />
                  </div>
                </div>
              )}

              {/* Quick Mobile + SMS.ir OTP Auth (Default) & Password Login */}
              <section
                className={`relative z-10 rounded-[32px] bg-white dark:bg-slate-900 border-2 border-white dark:border-slate-800 border-b-4 border-b-[#C9DDF6] dark:border-b-slate-700 shadow-[0_20px_44px_-14px_rgba(37,99,235,0.22)] overflow-hidden ${
                  !embedded ? '-mt-7' : ''
                }`}
              >
                <div className="grid grid-cols-2 bg-[#EFF5FD] dark:bg-slate-800 p-1.5 gap-1.5 border-b border-[#DCE7F7] dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('otp');
                      setErrorMsg(null);
                    }}
                    className={`min-h-[46px] px-2.5 rounded-2xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                      authTab === 'otp'
                        ? 'bg-[#2574F5] text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 shrink-0" />
                    <span>ورود / ثبت‌نام با موبایل</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('password');
                      setErrorMsg(null);
                    }}
                    className={`min-h-[46px] px-2.5 rounded-2xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                      authTab === 'password'
                        ? 'bg-[#2574F5] text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <KeyRound className="w-4 h-4 shrink-0" />
                    <span>ورود با رمز عبور</span>
                  </button>
                </div>

                {authTab === 'otp' ? (
                  <div className="p-5 sm:p-6 space-y-4">
                    <div className="rounded-2xl bg-[#F4F8FF] dark:bg-slate-800/70 border border-[#DCE7FB] dark:border-slate-700 p-3.5 text-xs font-bold text-[#1E4B9E] dark:text-slate-300 leading-relaxed">
                      بدون نیاز به رمز عبور و فرم طولانی! فقط شماره موبایل خود را وارد کنید تا کد تایید یک‌بارمصرف برایتان پیامک شود.
                    </div>

                    {!otpSent ? (
                      <form onSubmit={handleSendOtp} noValidate className="space-y-4">
                        <div>
                          <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
                            شماره موبایل (۱۱ رقم با شروع ۰۹)
                          </label>
                          <div
                            className={`flex items-center gap-2.5 p-1.5 rounded-full border-2 bg-[#F2F6FC] dark:bg-slate-800 transition-colors ${
                              otpMobile.trim() && !isValidIranMobile(otpMobile)
                                ? 'border-rose-400 dark:border-rose-500'
                                : 'border-[#E1EAF8] dark:border-slate-700 focus-within:border-[#2574F5]'
                            }`}
                          >
                            <span className="w-10 h-10 rounded-full bg-[#2574F5] text-white flex items-center justify-center shrink-0 shadow-xs">
                              <Smartphone className="w-5 h-5" />
                            </span>
                            <LatinDigitInput
                              type="text"
                              inputMode="tel"
                              autoComplete="tel"
                              dir="ltr"
                              transformMode="mobile"
                              value={otpMobile}
                              onValueChange={setOtpMobile}
                              placeholder="09123456789"
                              className="flex-1 min-h-[42px] px-3 bg-transparent text-base font-extrabold tracking-wider text-slate-900 dark:text-white text-center tabular-nums focus:outline-none"
                            />
                          </div>
                          {otpMobile.trim() && (
                            <p
                              className={`text-[11px] font-bold mt-1.5 ${
                                isValidIranMobile(otpMobile)
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {isValidIranMobile(otpMobile)
                                ? `شماره موبایل آماده ارسال کد است (${normalizeIranMobile(otpMobile)})`
                                : 'شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود.'}
                            </p>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full min-h-[54px] rounded-full bg-[#2574F5] hover:bg-[#1963DE] border-b-4 border-[#144CB2] active:border-b-0 active:translate-y-0.5 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 disabled:opacity-60 transition-all shadow-md whitespace-nowrap"
                        >
                          {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Smartphone className="w-5 h-5" />
                          )}
                          <span>دریافت کد تایید پیامکی</span>
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyOtp} noValidate className="space-y-4">
                        <div className="flex items-center justify-between gap-2 rounded-2xl bg-[#EFF6FF] dark:bg-slate-800 border border-sky-200 dark:border-slate-700 px-3.5 py-2.5 text-xs">
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            کد ۶ رقمی به{' '}
                            <strong dir="ltr" className="font-mono text-[#1E4B9E] dark:text-sky-300 tabular-nums">
                              {otpTargetMobile || normalizeIranMobile(otpMobile)}
                            </strong>{' '}
                            ارسال شد
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setOtpSent(false);
                              setOtpCode('');
                              setErrorMsg(null);
                              setStatusMsg(null);
                            }}
                            className="font-extrabold text-[#2574F5] hover:underline shrink-0 whitespace-nowrap"
                          >
                            تغییر شماره
                          </button>
                        </div>

                        {/* Visual 6-digit OTP indicator boxes synced with accessible input */}
                        <div className="space-y-2">
                          <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">
                            کد تایید ۶ رقمی پیامک‌شده
                          </label>
                          <div dir="ltr" aria-hidden="true" className="grid grid-cols-6 gap-2">
                            {Array.from({ length: 6 }).map((_, idx) => {
                              const char = otpCode[idx] || '';
                              const isCurrent = otpCode.length === idx;
                              return (
                                <div
                                  key={idx}
                                  className={`h-12 rounded-2xl border-2 flex items-center justify-center font-mono text-lg font-black tabular-nums transition-all ${
                                    char
                                      ? 'bg-[#EEF8EC] dark:bg-emerald-950/40 border-[#4BB543] text-[#1E6B19] dark:text-emerald-300'
                                      : isCurrent
                                      ? 'bg-white dark:bg-slate-800 border-[#2574F5] text-slate-400'
                                      : 'bg-[#F2F6FC] dark:bg-slate-800/70 border-[#E1EAF8] dark:border-slate-700 text-slate-400'
                                  }`}
                                >
                                  {char || '•'}
                                </div>
                              );
                            })}
                          </div>
                          <LatinDigitInput
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            dir="ltr"
                            transformMode="digits-only"
                            value={otpCode}
                            onValueChange={(val) => setOtpCode(val.slice(0, 6))}
                            placeholder="کد ۶ رقمی را وارد کنید"
                            className="w-full min-h-[50px] px-4 rounded-full border-2 border-[#E1EAF8] dark:border-slate-700 bg-[#F2F6FC] dark:bg-slate-800 text-xl font-mono font-extrabold tracking-[0.35em] text-center text-slate-900 dark:text-white tabular-nums"
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                          {resendCountdown > 0 ? (
                            <span className="tabular-nums">
                              ارسال مجدد کد تا {formatNumber(resendCountdown, digitMode)} ثانیه دیگر
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() => void handleSendOtp()}
                              className="font-extrabold text-[#2574F5] hover:underline disabled:opacity-50"
                            >
                              ارسال مجدد کد تایید
                            </button>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full min-h-[54px] rounded-full bg-[#4BB543] hover:bg-[#41A23A] border-b-4 border-[#2E8228] active:border-b-0 active:translate-y-0.5 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 disabled:opacity-60 transition-all shadow-md whitespace-nowrap"
                        >
                          {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-5 h-5" />
                          )}
                          <span>تایید کد و ورود به حساب</span>
                        </button>
                      </form>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleLogin} noValidate className="p-5 sm:p-6 space-y-4">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
                        شماره موبایل، نام کاربری یا ایمیل
                      </label>
                      <div className="flex items-center gap-2.5 p-1.5 rounded-full border-2 border-[#E1EAF8] dark:border-slate-700 focus-within:border-[#2574F5] bg-[#F2F6FC] dark:bg-slate-800">
                        <span className="w-10 h-10 rounded-full bg-[#2574F5] text-white flex items-center justify-center shrink-0 shadow-xs">
                          <User className="w-5 h-5" />
                        </span>
                        <LatinDigitInput
                          type="text"
                          inputMode="text"
                          autoComplete="username"
                          dir="ltr"
                          transformMode="latin-digits"
                          value={identifier}
                          onValueChange={setIdentifier}
                          placeholder="09123456789 یا parent@example.com"
                          className="flex-1 min-h-[42px] px-3 bg-transparent text-sm font-bold text-slate-900 dark:text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
                        رمز عبور
                      </label>
                      <div className="flex items-center gap-2.5 p-1.5 rounded-full border-2 border-[#E1EAF8] dark:border-slate-700 focus-within:border-[#2574F5] bg-[#F2F6FC] dark:bg-slate-800">
                        <span className="w-10 h-10 rounded-full bg-[#2574F5] text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Lock className="w-5 h-5" />
                        </span>
                        <LatinDigitInput
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          dir="ltr"
                          transformMode="latin-digits"
                          value={password}
                          onValueChange={setPassword}
                          placeholder="••••••••"
                          className="flex-1 min-h-[42px] px-3 bg-transparent text-sm font-bold text-slate-900 dark:text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={showPassword ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors shrink-0"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full min-h-[54px] rounded-full bg-[#2574F5] hover:bg-[#1963DE] border-b-4 border-[#144CB2] active:border-b-0 active:translate-y-0.5 text-white font-extrabold text-base flex items-center justify-center gap-2 disabled:opacity-60 transition-all shadow-md whitespace-nowrap"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                      <span>ورود به حساب کاربری</span>
                    </button>
                  </form>
                )}
              </section>

              {/* Prominent Guest Mode Option */}
              {onContinueAsGuest && (
                <section className="rounded-[28px] bg-white/95 dark:bg-slate-900/95 border-2 border-white dark:border-slate-800 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-black text-[#15429E] dark:text-white">
                      {isGuestMode
                        ? 'ادامه کار با حالت مهمان'
                        : 'می‌خواهید ابتدا بدون ثبت‌نام محیط برنامه را ببینید؟'}
                    </div>
                    <p className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                      صفحه اصلی، ترم اول، بازی‌ها و چرتکه سه‌بعدی در دسترس شماست.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onContinueAsGuest}
                    className="min-h-[48px] px-5 rounded-full bg-[#FFF6EB] hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-slate-700 border-2 border-[#EEDCC5] dark:border-slate-700 text-[#6D3B19] dark:text-amber-200 font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shrink-0 whitespace-nowrap active:translate-y-0.5 transition-all"
                  >
                    <UserCheck className="w-4 h-4 text-[#E07C47]" />
                    <span>ورود به عنوان مهمان</span>
                  </button>
                </section>
              )}
            </div>
          </div>
        )}
      </div>
  );

  if (embedded) {
    return contentBody;
  }

  return (
    <div
      className={`min-h-screen flex flex-col ${
        wpUser
          ? 'bg-[#F5E4CE] dark:bg-slate-950'
          : 'bg-gradient-to-b from-[#6FB2FF] via-[#B4DAFF] to-[#EAF4FF] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950'
      }`}
    >
      <header
        className={`sticky top-0 z-20 px-4 h-16 flex items-center justify-between ${
          wpUser
            ? 'bg-gradient-to-b from-[#F49A67] to-[#F8BA88] dark:from-slate-900 dark:to-slate-900 border-b-2 border-[#E3B488] dark:border-slate-800'
            : 'bg-white/25 dark:bg-slate-900/80 border-b border-white/40 dark:border-slate-800'
        }`}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="بازگشت"
          className="min-h-[44px] min-w-[44px] rounded-2xl bg-white/95 hover:bg-white dark:bg-slate-800 border-b-4 border-[#DFC6A8] dark:border-slate-700 flex items-center justify-center text-[#783F1D] dark:text-slate-200"
        >
          <ArrowRight className="w-5 h-5" />
        </button>

        <h1
          className={`text-base sm:text-lg font-black ${
            wpUser
              ? 'text-white drop-shadow-[0_2px_0_rgba(148,70,22,0.45)]'
              : 'text-[#15429E] dark:text-white'
          }`}
        >
          {wpUser ? 'حساب کاربری و سفارش‌ها' : 'ورود و ثبت‌نام'}
        </h1>

        <div className="w-11" />
      </header>

      <main className="flex-1 flex flex-col">
        {contentBody}
      </main>
    </div>
  );
};
