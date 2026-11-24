import React, { useEffect, useState } from 'react';
import { Loader2, Save, ShieldCheck, X } from 'lucide-react';
import type { WordPressUser } from '../types/app';
import { IRAN_PROVINCES } from '../lib/iranProvinces';
import {
  isValidIranMobile,
  normalizeIranMobile,
  normalizePersianDigits,
  updateAccountProfile,
} from '../lib/wordpressApi';
import { LatinDigitInput } from './LatinDigitInput';

interface CompleteProfileFormProps {
  wpUrl: string;
  wpUser: WordPressUser;
  onCompleted: (updatedUser: WordPressUser) => void;
  submitLabel?: string;
  introText?: string;
}

export const CompleteProfileForm: React.FC<CompleteProfileFormProps> = ({
  wpUrl,
  wpUser,
  onCompleted,
  submitLabel = 'ثبت مشخصات و ادامه خرید',
  introText = 'برای صدور فاکتور و ارسال سفارش، لطفاً مشخصات کامل و نشانی پستی خود را یک‌بار تکمیل کنید.',
}) => {
  const [firstName, setFirstName] = useState(wpUser.firstName || '');
  const [lastName, setLastName] = useState(wpUser.lastName || '');
  const [mobile, setMobile] = useState(wpUser.mobile || '');
  const [stateName, setStateName] = useState(
    wpUser.state && wpUser.state.trim() ? wpUser.state : 'تهران'
  );
  const [city, setCity] = useState(wpUser.city || '');
  const [address1, setAddress1] = useState(wpUser.address1 || '');
  const [postcode, setPostcode] = useState(wpUser.postcode || '');
  const [email, setEmail] = useState(
    wpUser.email && !wpUser.email.endsWith('@chootkeh.ir') ? wpUser.email : ''
  );

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(wpUser.firstName || '');
    setLastName(wpUser.lastName || '');
    setMobile(wpUser.mobile || '');
    setStateName(wpUser.state && wpUser.state.trim() ? wpUser.state : 'تهران');
    setCity(wpUser.city || '');
    setAddress1(wpUser.address1 || '');
    setPostcode(wpUser.postcode || '');
    setEmail(wpUser.email && !wpUser.email.endsWith('@chootkeh.ir') ? wpUser.email : '');
  }, [wpUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg('لطفاً نام و نام خانوادگی خود را کامل وارد کنید.');
      return;
    }

    const normalizedMobile = normalizeIranMobile(mobile);
    if (!isValidIranMobile(normalizedMobile)) {
      setErrorMsg('شماره موبایل معتبر نیست. لطفاً شماره ۱۱ رقمی با شروع ۰۹ وارد کنید.');
      return;
    }

    if (!stateName.trim() || !city.trim() || !address1.trim()) {
      setErrorMsg('لطفاً استان، شهر و آدرس کامل پستی را وارد کنید.');
      return;
    }

    const cleanPostcode = normalizePersianDigits(postcode.trim()).replace(/\D/g, '');
    if (cleanPostcode.length !== 10) {
      setErrorMsg('کد پستی باید دقیقاً ۱۰ رقم باشد.');
      return;
    }

    const cleanEmail = normalizePersianDigits(email).trim();
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('فرمت ایمیل واردشده معتبر نیست.');
      return;
    }

    const fallbackEmail = wpUser.username
      ? `${wpUser.username}@chootkeh.ir`
      : `${normalizedMobile}@chootkeh.ir`;

    setSaving(true);
    try {
      const res = await updateAccountProfile(wpUrl, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName: `${firstName.trim()} ${lastName.trim()}`.trim(),
        mobile: normalizedMobile,
        email: cleanEmail || wpUser.email || fallbackEmail,
        state: stateName.trim(),
        city: city.trim(),
        address1: address1.trim(),
        postcode: cleanPostcode,
      });
      onCompleted(res.user);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'ذخیره اطلاعات ناموفق بود. لطفاً دوباره تلاش کنید.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-200 dark:border-amber-800 p-3 text-xs font-bold text-amber-950 dark:text-amber-200 flex items-start gap-2 leading-relaxed">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <span>{introText}</span>
      </div>

      {errorMsg && (
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-200 dark:border-rose-800 p-3 text-xs font-extrabold text-rose-800 dark:text-rose-200">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
            نام *
          </label>
          <input
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="مثلاً سارا"
            className="w-full min-h-[44px] px-3 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
            نام خانوادگی *
          </label>
          <input
            type="text"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="مثلاً محمدی"
            className="w-full min-h-[44px] px-3 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
            value={mobile}
            onValueChange={setMobile}
            placeholder="09123456789"
            className="w-full min-h-[44px] px-3 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
            ایمیل (اختیاری)
          </label>
          <LatinDigitInput
            type="text"
            inputMode="email"
            autoComplete="email"
            dir="ltr"
            transformMode="latin-digits"
            value={email}
            onValueChange={setEmail}
            placeholder="parent@example.com"
            className="w-full min-h-[44px] px-3 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
            استان *
          </label>
          <select
            value={stateName}
            onChange={(e) => setStateName(e.target.value)}
            className="w-full min-h-[44px] px-3 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
          >
            {stateName && !IRAN_PROVINCES.includes(stateName) && (
              <option value={stateName}>{stateName}</option>
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
            شهر *
          </label>
          <input
            type="text"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="مثلاً تهران"
            className="w-full min-h-[44px] px-3 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="sm:col-span-2">
          <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
            آدرس کامل پستی *
          </label>
          <input
            type="text"
            required
            value={address1}
            onChange={(e) => setAddress1(e.target.value)}
            placeholder="خیابان، کوچه، پلاک، واحد"
            className="w-full min-h-[44px] px-3 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
            کد پستی ۱۰ رقمی *
          </label>
          <LatinDigitInput
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            dir="ltr"
            transformMode="postcode"
            value={postcode}
            onValueChange={setPostcode}
            placeholder="1234567890"
            className={`w-full min-h-[44px] px-3 rounded-2xl border-2 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white ${
              postcode.trim() && postcode.trim().length !== 10
                ? 'border-rose-400 dark:border-rose-500'
                : 'border-[#EEDCC5] dark:border-slate-700'
            }`}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full min-h-[48px] rounded-2xl bg-[#4BB543] hover:bg-[#41A23A] border-b-4 border-[#2E8228] active:border-b-0 active:translate-y-0.5 text-white font-extrabold text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        <span>{submitLabel}</span>
      </button>
    </form>
  );
};

interface CompleteProfileModalProps {
  wpUrl: string;
  wpUser: WordPressUser;
  onClose: () => void;
  onCompleted: (updatedUser: WordPressUser) => void;
}

export const CompleteProfileModal: React.FC<CompleteProfileModalProps> = ({
  wpUrl,
  wpUser,
  onClose,
  onCompleted,
}) => {
  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kn-complete-profile-title"
    >
      <div className="w-full max-w-lg my-auto rounded-3xl bg-[#FFF9F2] dark:bg-slate-900 border-4 border-white dark:border-slate-700 shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-b from-[#FFCC33] to-[#FFE066] dark:from-slate-800 dark:to-slate-800 px-5 py-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-extrabold text-amber-950 dark:text-amber-300">
              پیش‌نیاز ثبت سفارش و خرید
            </div>
            <h2
              id="kn-complete-profile-title"
              className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white"
            >
              تکمیل مشخصات ثبت‌نام و نشانی ارسال
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن پنجره"
            className="min-h-[42px] min-w-[42px] rounded-2xl bg-white/95 hover:bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-100 flex items-center justify-center shadow-xs shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 max-h-[80vh] overflow-y-auto">
          <CompleteProfileForm
            wpUrl={wpUrl}
            wpUser={wpUser}
            onCompleted={onCompleted}
          />
        </div>
      </div>
    </div>
  );
};
