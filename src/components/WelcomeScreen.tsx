import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Award,
  Compass,
  LogIn,
  Moon,
  Sparkles,
  Sun,
  Trophy,
  UserCheck,
  Volume2,
} from 'lucide-react';
import type { DigitDisplayMode } from '../types/app';
import { formatNumber } from '../lib/numbers';
import { KiaAvatar } from './KiaAvatar';
import { AbacusAdventureIllustration } from './KidIllustrations';
import { audioEngine } from '../lib/audioEngine';
import welcomeHeroImg from '../assets/images/welcome_kid_hero_1795604964773.jpg';

interface WelcomeScreenProps {
  activeChildName: string;
  termsCount: number;
  stagesCount: number;
  digitMode: DigitDisplayMode;
  nightMode: boolean;
  reducedMotion: boolean;
  onEnterLogin: () => void;
  onContinueAsGuest: () => void;
  onToggleNightMode: () => void;
}

const WELCOME_SLIDES = [
  {
    id: 'dreams',
    eyebrow: 'یادگیری شاد و هدفمند',
    headline: 'رویاهای بزرگ از اینجا شروع می‌شوند',
    desc: 'برنامه‌ای کودکانه و بازی‌محور برای تقویت تمرکز، محاسبه ذهنی سریع و اعتمادبه‌نفس کودکان با همراهی کیا.',
    pillBg: 'bg-violet-500',
    cardTitle: 'ماجراجویی مرحله‌به‌مرحله سوروبان',
  },
  {
    id: 'soroban',
    eyebrow: 'چرتکه واقعی در دستان کودک',
    headline: 'بازی و تمرین با چرتکه سه‌بعدی لمسی',
    desc: 'حرکت روان مهره‌ها با صداگذاری واقعی، زوم دو انگشتی و آموزش تصویری مکمل‌های ۵ و ۱۰ بدون خستگی.',
    pillBg: 'bg-emerald-500',
    cardTitle: 'چرتکه تمام‌صفحه با حرکت افقی',
  },
  {
    id: 'champions',
    eyebrow: 'انگیزه و رقابت سالم',
    headline: 'مدال بگیر و در جدول قهرمانان بدرخش',
    desc: 'کسب ستاره، جایزه استمرار روزانه، باز کردن مدال‌های افتخار و مقایسه امتیازها در لیدربورد کودکان نابغه.',
    pillBg: 'bg-amber-500',
    cardTitle: 'جدول قهرمانان و جایزه روزانه',
  },
] as const;

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  activeChildName,
  termsCount,
  stagesCount,
  digitMode,
  nightMode,
  reducedMotion,
  onEnterLogin,
  onContinueAsGuest,
  onToggleNightMode,
}) => {
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [kiaGreeting, setKiaGreeting] = useState(
    `سلام ${activeChildName}! آماده سفر جادویی چرتکه هستی؟`
  );

  const slide = WELCOME_SLIDES[activeSlide] ?? WELCOME_SLIDES[0];

  const handleKiaSpeak = () => {
    const msg = `سلام ${activeChildName}! من کیا هستم. می‌توانی وارد حساب کاربری شوی یا به عنوان مهمان بازی را شروع کنی!`;
    setKiaGreeting(msg);
    audioEngine.speakPersian(msg, 'cheer');
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col bg-[#FFF9F2] dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Soft Pastel Organic Blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-20 w-72 h-72 rounded-full bg-[#FFE8C8]/70 dark:bg-amber-500/10 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-12 -left-24 w-80 h-80 rounded-full bg-[#FCE3EF]/80 dark:bg-violet-500/10 blur-2xl"
      />

      {/* Top Onboarding Header (Inspired by "Skip" + clean branding) */}
      <header className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-4 pb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <AbacusAdventureIllustration className="w-10 h-10 shrink-0" />
          <div className="min-w-0">
            <span className="text-lg sm:text-xl font-black text-[#261B47] dark:text-amber-300 whitespace-nowrap block leading-none">
              کودک نابغه
            </span>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              آکادمی چرتکه و ریاضی ذهنی
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleKiaSpeak}
            aria-label="شنیدن پیام خوش‌آمدگویی کیا"
            className="min-h-[42px] px-3 rounded-2xl bg-white dark:bg-slate-900 border border-[#EEDCC5] dark:border-slate-800 text-xs font-extrabold text-[#6E3D1C] dark:text-amber-200 inline-flex items-center gap-1.5 shadow-xs active:translate-y-0.5 transition-all whitespace-nowrap shrink-0"
          >
            <Volume2 className="w-4 h-4 text-[#4BB543]" />
            <span className="hidden sm:inline">صدای کیا</span>
          </button>

          <button
            type="button"
            onClick={onToggleNightMode}
            aria-label={nightMode ? 'تغییر به حالت روز' : 'تغییر به حالت شب'}
            className="min-h-[42px] min-w-[42px] rounded-2xl bg-white dark:bg-slate-900 border border-[#EEDCC5] dark:border-slate-800 text-slate-700 dark:text-amber-300 inline-flex items-center justify-center shadow-xs active:translate-y-0.5 transition-all shrink-0"
          >
            {nightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => {
              audioEngine.play('uiTap');
              onContinueAsGuest();
            }}
            className="min-h-[42px] px-3.5 rounded-2xl bg-[#FFF1DE] hover:bg-[#FFE4C2] dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-black text-[#7C3E13] dark:text-amber-200 transition-all whitespace-nowrap shrink-0"
          >
            رد شدن · مهمان
          </button>
        </div>
      </header>

      {/* Main Centered Onboarding Content */}
      <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          {/* Left/Top Column: Warm Playful Typography + 3D Character Portrait */}
          <motion.section
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-right space-y-4"
          >
            <div className="space-y-2 max-w-xl">
              <div className="text-xs font-black text-[#6D4CED] dark:text-violet-300 flex items-center justify-center lg:justify-start gap-2">
                <span>{slide.eyebrow}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {formatNumber(Math.max(1, termsCount), digitMode)} ترم
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {formatNumber(Math.max(1, stagesCount), digitMode)} مرحله
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-[#261B47] dark:text-white leading-[1.22] [text-wrap:balance]">
                {slide.headline}
              </h1>

              <p className="text-sm sm:text-base font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                {slide.desc}
              </p>
            </div>

            {/* Framed Storybook 3D Character Card */}
            <div className="w-full relative rounded-[32px] overflow-hidden border-2 border-[#F2DFCA] dark:border-slate-800 bg-[#FFF3E3] dark:bg-slate-900 shadow-[0_20px_42px_-16px_rgba(165,105,45,0.25)]">
              {!heroImgFailed ? (
                <img
                  src={welcomeHeroImg}
                  alt="کودک شاد و جغد مهربان با چرتکه سه‌بعدی"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="w-full aspect-[4/3] max-h-[340px] object-cover object-center"
                />
              ) : (
                <div className="w-full aspect-[4/3] max-h-[340px] bg-gradient-to-b from-[#FFEEDB] to-[#FCE3EF] flex items-center justify-center p-8">
                  <KiaAvatar
                    mood="happy"
                    interactive
                    onTap={handleKiaSpeak}
                    reducedMotion={reducedMotion}
                    className="w-36 h-36"
                  />
                </div>
              )}

              {/* Interactive Kia Mini Bubble Overlay */}
              <div className="p-3.5 sm:p-4 bg-white/95 dark:bg-slate-900/95 border-t border-[#F2DFCA] dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 text-right">
                  <KiaAvatar
                    mood="happy"
                    interactive
                    onTap={handleKiaSpeak}
                    reducedMotion={reducedMotion}
                    className="w-11 h-11 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-black text-[#261B47] dark:text-white truncate">
                      {slide.cardTitle}
                    </div>
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
                      {kiaGreeting}
                    </div>
                  </div>
                </div>

                {/* Carousel Dots */}
                <div
                  role="tablist"
                  aria-label="اسلایدهای معرفی"
                  className="flex items-center gap-1.5 shrink-0"
                >
                  {WELCOME_SLIDES.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={idx === activeSlide}
                      aria-label={`اسلاید ${formatNumber(idx + 1, digitMode)}`}
                      onClick={() => {
                        audioEngine.play('uiTap');
                        setActiveSlide(idx);
                      }}
                      className={`h-2.5 rounded-full transition-all ${
                        idx === activeSlide
                          ? 'w-7 bg-[#261B47] dark:bg-amber-400'
                          : 'w-2.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.section>

          {/* Right/Bottom Column: Clean Action Card (Account vs Guest) */}
          <motion.section
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            className="lg:col-span-5 rounded-[32px] bg-white dark:bg-slate-900 border-2 border-[#EFE0CE] dark:border-slate-800 border-b-4 border-b-[#DFC6A8] dark:border-b-slate-700 p-5 sm:p-6 space-y-5 shadow-[0_18px_38px_-14px_rgba(140,95,45,0.2)]"
          >
            <div className="space-y-1">
              <p className="text-xs font-black text-[#4BB543]">
                انتخاب روش شروع
              </p>
              <h2 className="text-xl sm:text-2xl font-black text-[#261B47] dark:text-white">
                آماده یادگیری و بازی هستی؟
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                می‌توانی با شماره موبایل وارد حساب کاربری شوی یا بدون ثبت‌نام به عنوان مهمان بخش‌های رایگان را تجربه کنی.
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#F4F8FF] dark:bg-slate-800/80 border border-[#DCE7FE] dark:border-slate-700">
                <div className="w-10 h-10 rounded-xl bg-[#2574F5] text-white flex items-center justify-center shrink-0">
                  <Compass className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    ترم اول رایگان و چرتکه سه‌بعدی
                  </div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                    کاملاً در دسترس حتی در حالت مهمان
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#FFF8EB] dark:bg-slate-800/80 border border-[#FCE2B4] dark:border-slate-700">
                <div className="w-10 h-10 rounded-xl bg-[#F59E0B] text-white flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    جدول قهرمانان و مدال‌های افتخار
                  </div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                    ثبت امتیاز در لیدربورد با ورود موبایلی
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#EEF9EE] dark:bg-slate-800/80 border border-[#C6EAC4] dark:border-slate-700">
                <div className="w-10 h-10 rounded-xl bg-[#4BB543] text-white flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    پشتیبانی، فروشگاه و ترم‌های پیشرفته
                  </div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                    همگام‌سازی ابری پیشرفت در گوشی و وب
                  </div>
                </div>
              </div>
            </div>

            {/* Stadium CTAs matching Onboarding Reference */}
            <div className="space-y-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  audioEngine.play('uiTap');
                  onEnterLogin();
                }}
                className="w-full min-h-[56px] px-6 rounded-full bg-[#261B47] hover:bg-[#352663] dark:bg-[#5472EB] dark:hover:bg-[#4361DB] border-b-4 border-[#150E2A] dark:border-[#324AB2] active:border-b-0 active:translate-y-0.5 text-white font-extrabold text-base flex items-center justify-center gap-2.5 shadow-md transition-all whitespace-nowrap"
              >
                <LogIn className="w-5 h-5" />
                <span>ورود و شروع ماجراجویی</span>
                <ArrowLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  audioEngine.play('uiTap');
                  onContinueAsGuest();
                }}
                className="w-full min-h-[50px] px-5 rounded-full bg-[#FFF6EB] hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-slate-700 border-2 border-[#EEDCC5] dark:border-slate-700 text-[#6D3B19] dark:text-amber-200 font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 transition-all whitespace-nowrap"
              >
                <UserCheck className="w-5 h-5 text-[#E07C47]" />
                <span>ورود به عنوان مهمان</span>
              </button>

              <p className="text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1 pt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>در هر زمان می‌توانید از صفحه اصلی وارد حساب کاربری شوید.</span>
              </p>
            </div>
          </motion.section>
        </div>
      </main>
    </div>
  );
};
