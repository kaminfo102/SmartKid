import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Download,
  Edit3,
  Globe,
  Headphones,
  Loader2,
  LogIn,
  LogOut,
  Package,
  RefreshCw,
  Save,
  Shield,
  UserPlus,
  Users,
} from 'lucide-react';
import type {
  AvatarId,
  BacsAccount,
  DigitDisplayMode,
  UserOrder,
  WordPressUser,
} from '../types/app';
import { AVATAR_OPTIONS, AvatarGraphic } from './MascotDana';
import { KidIconTile } from './KidIconTile';
import { CloudSyncIllustration } from './KidIllustrations';
import { ReceiptUploaderField } from './ReceiptUploaderField';
import { formatNumber } from '../lib/numbers';
import { IRAN_PROVINCES } from '../lib/iranProvinces';
import type { OptimizedImageResult } from '../lib/imageOptimizer';
import {
  checkWordPressHealth,
  fetchAccountMe,
  fetchUserOrders,
  isValidIranMobile,
  loginWordPress,
  logoutWordPress,
  normalizeIranMobile,
  normalizePersianDigits,
  registerWordPress,
  saveWordPressUrl,
  updateAccountProfile,
  uploadOrderReceipt,
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
  onBack: () => void;
  embedded?: boolean;
  refreshTrigger?: number;
}

const CHILD_AGES = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

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
  onBack,
  embedded = false,
  refreshTrigger = 0,
}) => {
  const [siteInput, setSiteInput] = useState(wpUrl);

  // Logged-out auth tabs
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Registration fields
  const [regUsername, setRegUsername] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regState, setRegState] = useState('تهران');
  const [regCity, setRegCity] = useState('');
  const [regAddress1, setRegAddress1] = useState('');
  const [regPostcode, setRegPostcode] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regChildName, setRegChildName] = useState('');
  const [regChildAge, setRegChildAge] = useState(6);
  const [regAvatar, setRegAvatar] = useState<AvatarId>('owl');

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
    const activeUrl = wpUrl;
    if (!activeUrl) {
      setErrorMsg('سرویس ورود هنوز توسط مدیر سیستم پیکربندی نشده است.');
      return;
    }
    setLoading(true);
    try {
      const res = await loginWordPress(
        activeUrl,
        normalizePersianDigits(identifier).trim(),
        normalizePersianDigits(password)
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);

    const normalizedMobile = normalizeIranMobile(regMobile);
    if (!isValidIranMobile(normalizedMobile)) {
      setErrorMsg('شماره موبایل معتبر نیست. لطفاً شماره ۱۱ رقمی صحیح با شروع ۰۹ وارد کنید (مثلاً 09123456789).');
      return;
    }

    const cleanUsername = normalizePersianDigits(regUsername.trim()).replace(/[^a-zA-Z0-9._-]/g, '');
    if (regUsername.trim() && cleanUsername.length < 3) {
      setErrorMsg('نام کاربری باید حداقل ۳ کاراکتر انگلیسی (حروف یا عدد) باشد یا این فیلد را خالی بگذارید تا شماره موبایل ثبت شود.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg('رمز عبور باید حداقل ۶ کاراکتر باشد.');
      return;
    }

    const activeUrl = wpUrl;
    if (!activeUrl) {
      setErrorMsg('سرویس ثبت‌نام هنوز توسط مدیر سیستم پیکربندی نشده است.');
      return;
    }

    const cleanPostcode = normalizePersianDigits(regPostcode.trim()).replace(/\D/g, '');
    if (cleanPostcode.length !== 10) {
      setErrorMsg('کد پستی باید دقیقاً ۱۰ رقم باشد.');
      return;
    }

    const finalUsernameForEmail = cleanUsername || normalizedMobile;
    const defaultEmail = `${finalUsernameForEmail.toLowerCase()}@chootkeh.ir`;

    setLoading(true);
    try {
      const res = await registerWordPress(activeUrl, {
        mobile: normalizedMobile,
        username: cleanUsername || undefined,
        email: normalizePersianDigits(regEmail).trim() || defaultEmail,
        password: normalizePersianDigits(regPassword),
        firstName: regFirstName.trim(),
        lastName: regLastName.trim(),
        displayName: `${regFirstName.trim()} ${regLastName.trim()}`.trim() || regChildName.trim(),
        state: regState.trim(),
        city: regCity.trim(),
        address1: regAddress1.trim(),
        postcode: cleanPostcode,
        childName: regChildName.trim() || 'کیا',
        childAge: regChildAge,
        childAvatar: regAvatar,
      });
      onUpdateWpUrl(activeUrl);
      syncEditFieldsFromUser(res.user);
      onAuthSuccess(res);
      setStatusMsg('ثبت‌نام با موفقیت انجام شد و پروفایل کودک شما ساخته شد!');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ثبت‌نام انجام نشد.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wpUrl || !wpUser) return;
    setErrorMsg(null);
    setStatusMsg(null);

    const normalizedMobile = normalizeIranMobile(editMobile);
    if (!isValidIranMobile(normalizedMobile)) {
      setErrorMsg('شماره موبایل معتبر نیست. لطفاً شماره ۱۱ رقمی با شروع ۰۹ وارد کنید (مثلاً 09123456789).');
      return;
    }

    const cleanPostcode = normalizePersianDigits(editPostcode.trim()).replace(/\D/g, '');
    if (cleanPostcode.length !== 10) {
      setErrorMsg('کد پستی باید دقیقاً ۱۰ رقم باشد.');
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
        email: normalizePersianDigits(editEmail).trim() || fallbackEmail,
        state: editState.trim(),
        city: editCity.trim(),
        address1: editAddress1.trim(),
        postcode: cleanPostcode,
        newPassword: normalizePersianDigits(editNewPassword).trim() || undefined,
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

  const contentBody = (
      <div className={embedded ? 'space-y-4' : 'flex-1 w-full max-w-2xl mx-auto p-4 space-y-5 pb-12'}>
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

                <form onSubmit={handleSaveProfile} className="space-y-3">
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
                      <input
                        type="tel"
                        inputMode="tel"
                        dir="ltr"
                        required
                        maxLength={14}
                        value={editMobile}
                        onChange={(e) =>
                          setEditMobile(normalizePersianDigits(e.target.value).replace(/[^\d+]/g, ''))
                        }
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
                      <input
                        type="email"
                        dir="ltr"
                        value={editEmail}
                        onChange={(e) => setEditEmail(normalizePersianDigits(e.target.value))}
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
                      <input
                        type="text"
                        inputMode="numeric"
                        dir="ltr"
                        required
                        maxLength={10}
                        value={editPostcode}
                        onChange={(e) =>
                          setEditPostcode(
                            normalizePersianDigits(e.target.value).replace(/\D/g, '').slice(0, 10)
                          )
                        }
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
                    <input
                      type="password"
                      dir="ltr"
                      minLength={6}
                      value={editNewPassword}
                      onChange={(e) => setEditNewPassword(normalizePersianDigits(e.target.value))}
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

                  <form onSubmit={handleTestAndSaveUrl} className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="url"
                      dir="ltr"
                      value={siteInput}
                      onChange={(e) => setSiteInput(normalizePersianDigits(e.target.value))}
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
                        بسته افزونه مدیریت سرور (نسخه ۲.۷.۰)
                      </h2>
                      <p className="text-xs text-[#59449E] dark:text-slate-300">
                        دارای صفحه پرداخت اختصاصی بدون هدر/فوتر وردپرس، بازگشت خودکار به اپلیکیشن، قالب ایمیل HTML فارسی، فروشگاه، تایید فیش، تیکتینگ و جاده مراحل
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
          <>
            {/* Logged Out: Commercial Login & Full Registration Tabs */}
            <section className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] border-b-4 border-b-[#DFC6A8] dark:border-slate-800 shadow-[0_10px_24px_-8px_rgba(170,104,40,0.16)] overflow-hidden">
              <div className="grid grid-cols-2 bg-[#FFF6EB] dark:bg-slate-800 p-1.5 gap-1.5 border-b border-[#EEDCC5] dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('login');
                    setErrorMsg(null);
                  }}
                  className={`min-h-[46px] rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all ${
                    authTab === 'login'
                      ? 'bg-[#5472EB] text-white shadow-sm'
                      : 'text-[#783F1D] dark:text-slate-300'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  <span>ورود به حساب</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('register');
                    setErrorMsg(null);
                  }}
                  className={`min-h-[46px] rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all ${
                    authTab === 'register'
                      ? 'bg-[#4BB543] text-white shadow-sm'
                      : 'text-[#783F1D] dark:text-slate-300'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>ثبت نام</span>
                </button>
              </div>

              {authTab === 'login' ? (
                <form onSubmit={handleLogin} className="p-4 sm:p-5 space-y-3.5">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                      شماره موبایل یا ایمیل
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(normalizePersianDigits(e.target.value))}
                      placeholder="09123456789 یا parent@example.com"
                      className="w-full min-h-[48px] px-4 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                      رمز عبور
                    </label>
                    <input
                      type="password"
                      dir="ltr"
                      required
                      value={password}
                      onChange={(e) => setPassword(normalizePersianDigits(e.target.value))}
                      placeholder="••••••••"
                      className="w-full min-h-[48px] px-4 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full min-h-[52px] rounded-2xl bg-[#5472EB] hover:bg-[#425FD6] border-b-4 border-[#354EB8] text-white font-extrabold text-base flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                    <span>ورود به حساب کاربری</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="p-4 sm:p-5 space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        نام *
                      </label>
                      <input
                        type="text"
                        required
                        value={regFirstName}
                        onChange={(e) => setRegFirstName(e.target.value)}
                        placeholder="مثلاً سارا"
                        className="w-full min-h-[46px] px-3.5 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        نام خانوادگی *
                      </label>
                      <input
                        type="text"
                        required
                        value={regLastName}
                        onChange={(e) => setRegLastName(e.target.value)}
                        placeholder="مثلاً محمدی"
                        className="w-full min-h-[46px] px-3.5 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        شماره موبایل (۱۱ رقم با شروع ۰۹) *
                      </label>
                      <input
                        type="tel"
                        inputMode="tel"
                        dir="ltr"
                        required
                        maxLength={14}
                        value={regMobile}
                        onChange={(e) =>
                          setRegMobile(normalizePersianDigits(e.target.value).replace(/[^\d+]/g, ''))
                        }
                        placeholder="09123456789"
                        className={`w-full min-h-[46px] px-3.5 rounded-2xl border-2 bg-[#FFF9F2] dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white ${
                          regMobile.trim() && !isValidIranMobile(regMobile)
                            ? 'border-rose-400 dark:border-rose-500'
                            : 'border-[#EEDCC5] dark:border-slate-700'
                        }`}
                      />
                      {regMobile.trim() && (
                        <p
                          className={`text-[11px] font-bold mt-1 ${
                            isValidIranMobile(regMobile) ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {isValidIranMobile(regMobile)
                            ? `شماره موبایل معتبر است (${normalizeIranMobile(regMobile)})`
                            : 'لطفاً شماره موبایل معتبر ۱۱ رقمی با شروع 09 وارد کنید.'}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        نام کاربری انگلیسی (اختیاری — پیش‌فرض موبایل)
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        value={regUsername}
                        onChange={(e) =>
                          setRegUsername(
                            normalizePersianDigits(e.target.value).replace(/[^a-zA-Z0-9._-]/g, '')
                          )
                        }
                        placeholder={normalizeIranMobile(regMobile) || 'مثلاً artin123'}
                        className="w-full min-h-[46px] px-3.5 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                      رمز عبور (حداقل ۶ کاراکتر) *
                    </label>
                    <input
                      type="password"
                      dir="ltr"
                      required
                      minLength={6}
                      value={regPassword}
                      onChange={(e) => setRegPassword(normalizePersianDigits(e.target.value))}
                      placeholder="••••••••"
                      className="w-full min-h-[46px] px-3.5 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        استان *
                      </label>
                      <select
                        value={regState}
                        onChange={(e) => setRegState(e.target.value)}
                        className="w-full min-h-[46px] px-3.5 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                      >
                        {IRAN_PROVINCES.map((prov) => (
                          <option key={prov} value={prov}>
                            {prov}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        شهر *
                      </label>
                      <input
                        type="text"
                        required
                        value={regCity}
                        onChange={(e) => setRegCity(e.target.value)}
                        placeholder="مثلاً تهران"
                        className="w-full min-h-[46px] px-3.5 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        آدرس کامل *
                      </label>
                      <input
                        type="text"
                        required
                        value={regAddress1}
                        onChange={(e) => setRegAddress1(e.target.value)}
                        placeholder="خیابان، کوچه، پلاک، واحد"
                        className="w-full min-h-[46px] px-3.5 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        کد پستی (۱۰ رقمی) *
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        dir="ltr"
                        required
                        maxLength={10}
                        value={regPostcode}
                        onChange={(e) =>
                          setRegPostcode(
                            normalizePersianDigits(e.target.value).replace(/\D/g, '').slice(0, 10)
                          )
                        }
                        placeholder="1234567890"
                        className={`w-full min-h-[46px] px-3.5 rounded-2xl border-2 bg-[#FFF9F2] dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white ${
                          regPostcode.trim() && regPostcode.trim().length !== 10
                            ? 'border-rose-400 dark:border-rose-500'
                            : 'border-[#EEDCC5] dark:border-slate-700'
                        }`}
                      />
                      {regPostcode.trim() && regPostcode.trim().length !== 10 && (
                        <p className="text-[11px] font-bold text-rose-600 mt-1">
                          کد پستی باید دقیقاً ۱۰ رقم باشد.
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                      ایمیل (اختیاری)
                    </label>
                    <input
                      type="email"
                      dir="ltr"
                      value={regEmail}
                      onChange={(e) => setRegEmail(normalizePersianDigits(e.target.value))}
                      placeholder={`${(
                        regUsername.trim() ||
                        normalizeIranMobile(regMobile) ||
                        'username'
                      ).toLowerCase()}@chootkeh.ir`}
                      className="w-full min-h-[46px] px-3.5 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                    />
                    {!regEmail.trim() && (
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                        در صورت خالی ماندن، ایمیل پیش‌فرض به‌صورت{' '}
                        <span dir="ltr" className="font-mono text-[#5472EB]">
                          {(
                            regUsername.trim() ||
                            normalizeIranMobile(regMobile) ||
                            'username'
                          ).toLowerCase()}
                          @chootkeh.ir
                        </span>{' '}
                        ثبت خواهد شد.
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#EFE0CE] dark:border-slate-800 space-y-3">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        نام کودک *
                      </label>
                      <input
                        type="text"
                        required
                        value={regChildName}
                        onChange={(e) => setRegChildName(e.target.value)}
                        placeholder="مثلاً کیا یا باران"
                        className="w-full min-h-[46px] px-3.5 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        سن کودک ({formatNumber(regChildAge, digitMode)} سال — مناسب ۴ تا ۱۵ سال)
                      </label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {CHILD_AGES.map((a) => (
                          <button
                            key={a}
                            type="button"
                            onClick={() => setRegChildAge(a)}
                            className={`min-h-[38px] min-w-[38px] rounded-xl font-extrabold text-xs ${
                              regChildAge === a
                                ? 'bg-[#5472EB] text-white'
                                : 'bg-[#FFF6EB] dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {formatNumber(a, digitMode)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
                        شخصیت همراه کودک
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {AVATAR_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setRegAvatar(opt.id)}
                            className={`p-2 rounded-2xl border-2 flex flex-col items-center gap-1 ${
                              regAvatar === opt.id
                                ? 'border-[#5472EB] bg-sky-50 dark:bg-blue-950/40'
                                : 'border-[#EFE0CE] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800'
                            }`}
                          >
                            <AvatarGraphic avatar={opt.id} className="w-9 h-9" />
                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">
                              {opt.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full min-h-[52px] rounded-2xl bg-[#4BB543] hover:bg-[#41A23A] border-b-4 border-[#2E8228] text-white font-extrabold text-base flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                    <span>ثبت نام</span>
                  </button>
                </form>
              )}
            </section>
          </>
        )}
      </div>
  );

  if (embedded) {
    return contentBody;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5E4CE] dark:bg-slate-950">
      <header className="sticky top-0 z-20 bg-gradient-to-b from-[#F49A67] to-[#F8BA88] dark:from-slate-900 dark:to-slate-900 border-b-2 border-[#E3B488] dark:border-slate-800 px-4 h-16 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          aria-label="بازگشت"
          className="min-h-[44px] min-w-[44px] rounded-2xl bg-white/95 hover:bg-white dark:bg-slate-800 border-b-4 border-[#DFC6A8] dark:border-slate-700 flex items-center justify-center text-[#783F1D] dark:text-slate-200"
        >
          <ArrowRight className="w-5 h-5" />
        </button>

        <h1 className="text-base sm:text-lg font-extrabold text-white drop-shadow-[0_2px_0_rgba(148,70,22,0.45)]">
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
