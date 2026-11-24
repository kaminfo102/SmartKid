import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
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
import welcomeHeroImg from '../assets/images/welcome_meadow_hero_1795553019880.jpg';

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

const WELCOME_HIGHLIGHTS = [
  {
    id: 'story-map',
    title: 'ماجراجویی داستانی چرتکه',
    desc: 'یادگیری مرحله‌به‌مرحله سوروبان در مزرعه آفتابی، جنگل جادویی و جزیره گنج با همراهی کیا',
    accent: 'bg-emerald-500',
  },
  {
    id: 'soroban-3d',
    title: 'چرتکه سه‌بعدی و لمسی واقعی',
    desc: 'حرکت روان مهره‌ها با صداگذاری واقعی، زوم دو انگشتی و آموزش گام‌به‌گام مکمل‌های ۵ و ۱۰',
    accent: 'bg-sky-500',
  },
  {
    id: 'rewards-rank',
    title: 'مدال‌ها و جدول قهرمانان',
    desc: 'دریافت ستاره، پاداش روزانه، باز کردن مدال‌های افتخار و رقابت شاد در لیدربورد کودکان نابغه',
    accent: 'bg-amber-500',
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

  const currentHighlight = WELCOME_HIGHLIGHTS[activeSlide] ?? WELCOME_HIGHLIGHTS[0];

  const handleKiaSpeak = () => {
    const msg = `سلام ${activeChildName}! من کیا هستم. می‌توانی وارد حساب کاربری شوی یا به عنوان مهمان بازی را شروع کنی!`;
    setKiaGreeting(msg);
    audioEngine.speakPersian(msg, 'cheer');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF7EA] dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Compact Top Bar */}
      <header className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-4 pb-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <AbacusAdventureIllustration className="w-10 h-10 shrink-0" />
          <span className="text-lg sm:text-xl font-black text-[#4B2D16] dark:text-amber-300 whitespace-nowrap shrink-0">
            کودک نابغه
          </span>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleKiaSpeak}
            aria-label="شنیدن پیام خوش‌آمدگویی کیا"
            className="min-h-[44px] px-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-[#EEDCC5] dark:border-slate-800 border-b-4 border-b-[#DFC6A8] dark:border-b-slate-700 text-xs font-extrabold text-[#6E3D1C] dark:text-amber-200 inline-flex items-center gap-1.5 shadow-xs active:translate-y-0.5 transition-all whitespace-nowrap shrink-0"
          >
            <Volume2 className="w-4 h-4 text-[#4BB543]" />
            <span>صدای کیا</span>
          </button>

          <button
            type="button"
            onClick={onToggleNightMode}
            aria-label={nightMode ? 'تغییر به حالت روز' : 'تغییر به حالت شب'}
            className="min-h-[44px] min-w-[44px] rounded-2xl bg-white dark:bg-slate-900 border border-[#EEDCC5] dark:border-slate-800 border-b-4 border-b-[#DFC6A8] dark:border-b-slate-700 text-slate-700 dark:text-amber-300 inline-flex items-center justify-center shadow-xs active:translate-y-0.5 transition-all shrink-0"
          >
            {nightMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Welcome Canvas */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-7 items-stretch">
          {/* Illustrated Storybook Meadow Showcase */}
          <motion.section
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="lg:col-span-7 relative rounded-3xl overflow-hidden border-2 border-[#EEDCC5] dark:border-slate-800 bg-gradient-to-b from-[#98DFFF] via-[#C6EEFF] to-[#A6DE64] dark:from-slate-800 dark:to-slate-900 shadow-[0_18px_40px_-14px_rgba(145,92,38,0.28)] flex flex-col justify-between min-h-[300px] sm:min-h-[390px]"
          >
            {!heroImgFailed ? (
              <img
                src={welcomeHeroImg}
                alt="دنیای شاد آموزش چرتکه کودک نابغه"
                referrerPolicy="no-referrer"
                onError={() => setHeroImgFailed(true)}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-b from-[#7FD4FF] via-[#CBEFFF] to-[#8CD44F]"
              />
            )}

            {/* Measured contrast scrim for crisp readability */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-slate-950/20"
            />

            {/* Top Floating Kia Greeting */}
            <div className="relative z-10 p-4 sm:p-5 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <KiaAvatar
                  mood="happy"
                  interactive
                  onTap={handleKiaSpeak}
                  reducedMotion={reducedMotion}
                  className="w-16 h-16 sm:w-20 sm:h-20 shrink-0"
                />
                <div className="rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-white/80 dark:border-slate-700 px-3.5 py-2.5 text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white shadow-md max-w-xs leading-relaxed">
                  {kiaGreeting}
                </div>
              </div>
            </div>

            {/* Bottom Interactive Feature Spotlight */}
            <div className="relative z-10 p-4 sm:p-6 space-y-3">
              <div className="text-xs font-bold text-amber-200 flex items-center gap-2">
                <span>{formatNumber(Math.max(1, termsCount), digitMode)} ترم ماجراجویی</span>
                <span aria-hidden="true">·</span>
                <span>{formatNumber(Math.max(1, stagesCount), digitMode)} مرحله آموزشی</span>
                <span aria-hidden="true">·</span>
                <span>چرتکه سه‌بعدی تعاملی</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight [text-wrap:balance] drop-shadow-xs">
                محاسبه ذهنی و بازی با چرتکه را مثل یک ماجراجویی شاد یاد بگیر!
              </h1>

              <div className="rounded-2xl bg-slate-950/70 border border-white/15 p-3.5 text-white space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${currentHighlight.accent}`} />
                  <h2 className="text-sm sm:text-base font-extrabold">
                    {currentHighlight.title}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {currentHighlight.desc}
                </p>

                <div className="flex items-center gap-2 pt-1">
                  {WELCOME_HIGHLIGHTS.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        audioEngine.play('uiTap');
                        setActiveSlide(idx);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap shrink-0 ${
                        idx === activeSlide
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-white/15 hover:bg-white/25 text-white'
                      }`}
                    >
                      {formatNumber(idx + 1, digitMode)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>

          {/* Right Onboarding & Access Options Panel */}
          <motion.section
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            className="lg:col-span-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 border-b-4 border-b-[#DFC6A8] dark:border-b-slate-700 p-5 sm:p-6 flex flex-col justify-between gap-5 shadow-[0_14px_30px_-12px_rgba(170,104,40,0.2)]"
          >
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-extrabold text-[#D97706] dark:text-amber-400">
                  شروع مسیر یادگیری کودک نابغه
                </p>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  چطور دوست داری وارد شوی؟
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  می‌توانی با شماره موبایل وارد شوی تا پیشرفت و ستاره‌ها ذخیره شوند، یا بدون ثبت‌نام به عنوان مهمان محیط برنامه را تجربه کنی.
                </p>
              </div>

              {/* Clean Kid-Friendly Highlights List */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#FFF8EE] dark:bg-slate-800/70 border border-[#F2E2CE] dark:border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                      ترم اول رایگان و چرتکه سه‌بعدی
                    </div>
                    <div className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      قابل استفاده حتی در حالت مهمان برای آشنایی کودک با چرتکه
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#F4F8FF] dark:bg-slate-800/70 border border-[#DCE7FE] dark:border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-[#5472EB] text-white flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                      لیدربورد و کلکسیون مدال‌های قهرمانی
                    </div>
                    <div className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      با ورود به حساب، رکورد کودک در جدول قهرمانان ثبت و ذخیره می‌شود
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#FFF7ED] dark:bg-slate-800/70 border border-[#FDE2C4] dark:border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                      پشتیبانی، فروشگاه و باز کردن ترم‌های پیشرفته
                    </div>
                    <div className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      خرید امن، ثبت تیکت و همگام‌سازی خودکار روی گوشی و وب
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Primary CTAs */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  audioEngine.play('uiTap');
                  onEnterLogin();
                }}
                className="w-full min-h-[54px] px-5 rounded-2xl bg-[#4BB543] hover:bg-[#41A23A] border-b-4 border-[#2E8228] active:border-b-0 active:translate-y-0.5 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-sm transition-all whitespace-nowrap"
              >
                <LogIn className="w-5 h-5" />
                <span>ورود یا ثبت‌نام با موبایل</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  audioEngine.play('uiTap');
                  onContinueAsGuest();
                }}
                className="w-full min-h-[50px] px-5 rounded-2xl bg-[#FFF6EB] hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-slate-700 border-2 border-[#EEDCC5] dark:border-slate-700 border-b-4 border-b-[#DFC6A8] dark:border-b-slate-600 active:translate-y-0.5 text-[#6D3B19] dark:text-amber-200 font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 transition-all whitespace-nowrap"
              >
                <UserCheck className="w-5 h-5 text-[#E07C47]" />
                <span>ورود به عنوان مهمان</span>
              </button>

              <p className="text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>در هر زمان می‌توانید از بالای صفحه اصلی وارد حساب کاربری شوید.</span>
              </p>
            </div>
          </motion.section>
        </div>
      </main>
    </div>
  );
};
