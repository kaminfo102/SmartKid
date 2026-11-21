import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Cloud,
  Download,
  Globe,
  LogIn,
  LogOut,
  RefreshCw,
  UserPlus,
} from 'lucide-react';
import type { AvatarId, DigitDisplayMode, WordPressUser } from '../types/app';
import { AVATAR_OPTIONS, AvatarGraphic } from './MascotDana';
import { KidIconTile } from './KidIconTile';
import { formatNumber } from '../lib/numbers';
import {
  checkWordPressHealth,
  loginWordPress,
  logoutWordPress,
  registerWordPress,
  saveWordPressUrl,
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
  onLogout: () => void;
  onRefreshFromWordPress: (overrideUrl?: string) => Promise<boolean>;
  onBack: () => void;
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
  onLogout,
  onRefreshFromWordPress,
  onBack,
}) => {
  const [siteInput, setSiteInput] = useState(wpUrl);
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Registration fields
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regChildName, setRegChildName] = useState('');
  const [regChildAge, setRegChildAge] = useState(6);
  const [regAvatar, setRegAvatar] = useState<AvatarId>('owl');

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTestAndSaveUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);
    const saved = saveWordPressUrl(siteInput);
    if (!saved) {
      setErrorMsg('لطفاً آدرس معتبر سایت وردپرس را با https:// وارد کنید.');
      return;
    }
    setLoading(true);
    try {
      const health = await checkWordPressHealth(saved);
      onUpdateWpUrl(saved);
      await onRefreshFromWordPress(saved);
      setStatusMsg(
        `اتصال به «${health.siteName || saved}» برقرار شد! (${formatNumber(
          health.stagesCount,
          digitMode
        )} مرحله و ${formatNumber(health.questionsCount, digitMode)} سؤال بارگذاری شد)`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'ارتباط با پلاگین وردپرس برقرار نشد. مطمئن شوید پلاگین نصب و فعال است.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);
    const activeUrl = saveWordPressUrl(siteInput || wpUrl);
    if (!activeUrl) {
      setErrorMsg('ابتدا آدرس سایت وردپرس را در بالا وارد و ذخیره کنید.');
      return;
    }
    setLoading(true);
    try {
      const res = await loginWordPress(activeUrl, identifier.trim(), password);
      onUpdateWpUrl(activeUrl);
      onAuthSuccess(res);
      setStatusMsg(`خوش آمدی ${res.user.displayName}! اطلاعات با وردپرس همگام شد.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ورود ناموفق بود.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);
    const activeUrl = saveWordPressUrl(siteInput || wpUrl);
    if (!activeUrl) {
      setErrorMsg('ابتدا آدرس سایت وردپرس را در بالا وارد و ذخیره کنید.');
      return;
    }
    setLoading(true);
    try {
      const res = await registerWordPress(activeUrl, {
        email: regEmail.trim(),
        password: regPassword,
        displayName: regDisplayName.trim() || regChildName.trim(),
        childName: regChildName.trim() || 'قهرمان کوچک',
        childAge: regChildAge,
        childAvatar: regAvatar,
      });
      onUpdateWpUrl(activeUrl);
      onAuthSuccess(res);
      setStatusMsg('ثبت‌نام با موفقیت انجام شد و پروفایل کودک ساخته شد!');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ثبت‌نام انجام نشد.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutClick = async () => {
    setLoading(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      await logoutWordPress(wpUrl);
      onLogout();
      setStatusMsg('از حساب وردپرس خارج شدید.');
    } finally {
      setLoading(false);
    }
  };

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
          حساب کاربری و وردپرس هدلس
        </h1>

        <div className="w-11" />
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto p-4 space-y-5 pb-12">
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

        {/* 1. WordPress Site URL Connector */}
        <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] border-b-4 border-b-[#DFC6A8] dark:border-slate-800 p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <KidIconTile color="sky" size="md">
                <Globe className="w-6 h-6" />
              </KidIconTile>
              <div>
                <h2 className="font-extrabold text-sm sm:text-base text-[#3B2618] dark:text-white">
                  آدرس سرور وردپرس هدلس
                </h2>
                <p className="text-xs text-[#785942] dark:text-slate-400">
                  جاده مراحل، بانک سوالات و پیشرفت کودکان از اینجا خوانده می‌شود
                </p>
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-xl text-xs font-extrabold ${
                wpConnected
                  ? 'bg-[#E7F9E5] text-[#1E6B19] border border-[#8EE086]'
                  : 'bg-[#FFF6EB] text-[#8B623D] border border-[#EEDCC5]'
              }`}
            >
              {wpConnected
                ? `متصل · ${formatNumber(stagesCount, digitMode)} مرحله · ${formatNumber(
                    questionsCount,
                    digitMode
                  )} سؤال`
                : 'حالت آفلاین / پیش‌فرض'}
            </span>
          </div>

          <form onSubmit={handleTestAndSaveUrl} className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              dir="ltr"
              value={siteInput}
              onChange={(e) => setSiteInput(e.target.value)}
              placeholder="https://yoursite.com"
              className="flex-1 min-h-[48px] px-4 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5472EB]"
            />
            <button
              type="submit"
              disabled={loading}
              className="min-h-[48px] px-5 rounded-2xl bg-[#5472EB] hover:bg-[#425FD6] border-b-4 border-[#354EB8] active:border-b-0 active:translate-y-0.5 text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>اتصال و همگام‌سازی</span>
            </button>
          </form>
        </section>

        {/* 2. Authenticated User Card OR Login/Register Tabs */}
        {wpUser ? (
          <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] border-b-4 border-b-[#DFC6A8] dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <KidIconTile color="green" size="lg">
                  <Cloud className="w-7 h-7" />
                </KidIconTile>
                <div>
                  <h2 className="font-extrabold text-base text-[#3B2618] dark:text-white">
                    {wpUser.displayName}
                  </h2>
                  <p className="text-xs text-[#785942] dark:text-slate-400" dir="ltr">
                    {wpUser.email}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogoutClick}
                disabled={loading}
                className="min-h-[44px] px-4 rounded-2xl bg-amber-100 hover:bg-amber-200 border-b-4 border-amber-300 text-amber-950 font-extrabold text-xs inline-flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>خروج از حساب</span>
              </button>
            </div>

            <p className="text-xs text-[#6B4A35] dark:text-slate-300 leading-relaxed">
              حساب شما به وردپرس متصل است؛ امتیازات، ستاره‌ها، پروفایل کودکان و تنظیمات به‌صورت خودکار با سرور همگام‌سازی می‌شوند.
            </p>
          </section>
        ) : (
          <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] border-b-4 border-b-[#DFC6A8] dark:border-slate-800 p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[#FFF6EB] dark:bg-slate-800 border border-[#EEDCC5] dark:border-slate-700">
              <button
                type="button"
                onClick={() => setTab('login')}
                className={`min-h-[44px] rounded-xl font-extrabold text-sm inline-flex items-center justify-center gap-1.5 transition-all ${
                  tab === 'login'
                    ? 'bg-[#5472EB] text-white shadow-xs'
                    : 'text-[#6B4A35] dark:text-slate-300'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>ورود به حساب</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('register')}
                className={`min-h-[44px] rounded-xl font-extrabold text-sm inline-flex items-center justify-center gap-1.5 transition-all ${
                  tab === 'register'
                    ? 'bg-[#4BB543] text-white shadow-xs'
                    : 'text-[#6B4A35] dark:text-slate-300'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>ثبت‌نام جدید</span>
              </button>
            </div>

            {tab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-3">
                <div>
                  <label className="block text-xs font-extrabold text-[#5C3A00] dark:text-slate-300 mb-1">
                    ایمیل یا نام کاربری وردپرس
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="parent@example.com"
                    className="w-full min-h-[48px] px-4 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-[#5C3A00] dark:text-slate-300 mb-1">
                    رمز عبور
                  </label>
                  <input
                    type="password"
                    dir="ltr"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full min-h-[48px] px-4 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-[52px] rounded-2xl bg-[#5472EB] hover:bg-[#425FD6] border-b-4 border-[#354EB8] active:border-b-0 active:translate-y-0.5 text-white font-extrabold text-base transition-all disabled:opacity-60"
                >
                  ورود و بارگذاری پیشرفت کودک
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold text-[#5C3A00] dark:text-slate-300 mb-1">
                      ایمیل والد
                    </label>
                    <input
                      type="email"
                      dir="ltr"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="parent@example.com"
                      className="w-full min-h-[46px] px-3.5 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-[#5C3A00] dark:text-slate-300 mb-1">
                      رمز عبور (حداقل ۶ کاراکتر)
                    </label>
                    <input
                      type="password"
                      dir="ltr"
                      required
                      minLength={6}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full min-h-[46px] px-3.5 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold text-[#5C3A00] dark:text-slate-300 mb-1">
                      نام والد
                    </label>
                    <input
                      type="text"
                      value={regDisplayName}
                      onChange={(e) => setRegDisplayName(e.target.value)}
                      placeholder="مثلاً خانم محمدی"
                      className="w-full min-h-[46px] px-3.5 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-[#5C3A00] dark:text-slate-300 mb-1">
                      نام کودک قهرمان
                    </label>
                    <input
                      type="text"
                      required
                      value={regChildName}
                      onChange={(e) => setRegChildName(e.target.value)}
                      placeholder="مثلاً آرتین"
                      className="w-full min-h-[46px] px-3.5 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-[#5C3A00] dark:text-slate-300 mb-1">
                    سن کودک: {formatNumber(regChildAge, digitMode)} سال
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[4, 5, 6, 7, 8, 9, 10].map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setRegChildAge(a)}
                        className={`min-h-[40px] min-w-[40px] rounded-xl font-extrabold text-xs ${
                          regChildAge === a
                            ? 'bg-[#5472EB] text-white'
                            : 'bg-[#FFF6EB] text-[#5C3A00] border border-[#EEDCC5]'
                        }`}
                      >
                        {formatNumber(a, digitMode)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-[#5C3A00] dark:text-slate-300 mb-1.5">
                    شخصیت کودک
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {AVATAR_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setRegAvatar(opt.id)}
                        className={`p-2 rounded-2xl border-2 flex flex-col items-center gap-1 ${
                          regAvatar === opt.id
                            ? 'border-[#5472EB] bg-[#EEF2FF]'
                            : 'border-[#EEDCC5] bg-[#FFF9F2]'
                        }`}
                      >
                        <AvatarGraphic avatar={opt.id} className="w-8 h-8" />
                        <span className="text-[11px] font-bold text-[#3B2618]">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-[52px] rounded-2xl bg-[#4BB543] hover:bg-[#41A23A] border-b-4 border-[#2E8228] active:border-b-0 active:translate-y-0.5 text-white font-extrabold text-base transition-all disabled:opacity-60"
                >
                  ثبت‌نام و ساخت پروفایل در وردپرس
                </button>
              </form>
            )}
          </section>
        )}

        {/* 3. Custom WordPress Plugin Download Card */}
        <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] border-b-4 border-b-[#DFC6A8] dark:border-slate-800 p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <KidIconTile color="violet" size="md">
                <Download className="w-6 h-6" />
              </KidIconTile>
              <div>
                <h2 className="font-extrabold text-sm sm:text-base text-[#3B2618] dark:text-white">
                  پلاگین اختصاصی وردپرس «کودک نابغه»
                </h2>
                <p className="text-xs text-[#785942] dark:text-slate-400">
                  فایل آماده نصب برای پیشخوان وردپرس (نسخه ۱.۰.۰)
                </p>
              </div>
            </div>

            <a
              href="/downloads/koodak-nabegheh-soroban.zip"
              download="koodak-nabegheh-soroban.zip"
              className="min-h-[46px] px-4 rounded-2xl bg-[#8E63EB] hover:bg-[#7A4EE0] border-b-4 border-[#6339C4] active:border-b-0 active:translate-y-0.5 text-white font-extrabold text-xs sm:text-sm inline-flex items-center gap-2 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>دانلود پلاگین (ZIP)</span>
            </a>
          </div>

          <ol className="text-xs text-[#6B4A35] dark:text-slate-300 space-y-1.5 list-decimal pr-5 leading-relaxed">
            <li>فایل <strong>koodak-nabegheh-soroban.zip</strong> را با دکمه بالا دانلود کنید.</li>
            <li>در پیشخوان وردپرس به بخش <strong>افزونه‌ها ← افزودن افزونه ← بارگذاری افزونه</strong> بروید و فایل را نصب و فعال کنید.</li>
            <li>منوی جدید <strong>«کودک نابغه»</strong> در وردپرس باز می‌شود که در آن می‌توانید مراحل جاده، سوالات، کاربران، امتیازات و تنظیمات را مدیریت کنید.</li>
          </ol>
        </section>
      </main>
    </div>
  );
};
