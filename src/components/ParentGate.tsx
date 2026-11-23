import React, { useMemo, useRef, useState } from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import { toEnglishDigits, toPersianDigits } from '../lib/numbers';
import { KidIconTile } from './KidIconTile';
import { AbacusAdventureIllustration } from './KidIllustrations';

interface ParentGateProps {
  onUnlock: () => void;
  onCancel: () => void;
}

/**
 * Protects Parent Zone from accidental child taps via EITHER:
 * 1) Solving a simple adult multiplication question, OR
 * 2) Holding the unlock button for 2 seconds.
 */
export const ParentGate: React.FC<ParentGateProps> = ({ onUnlock, onCancel }) => {
  const challenge = useMemo(() => {
    const pairs = [
      { a: 7, b: 3 },
      { a: 6, b: 4 },
      { a: 8, b: 3 },
      { a: 9, b: 4 },
    ];
    const pick = pairs[Math.floor(Math.random() * pairs.length)];
    return { a: pick.a, b: pick.b, answer: pick.a * pick.b };
  }, []);

  const [answerInput, setAnswerInput] = useState('');
  const [hint, setHint] = useState('');
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Number(toEnglishDigits(answerInput.trim()));
    if (numeric === challenge.answer) {
      onUnlock();
    } else {
      setHint('پاسخ دقیق نبود؛ دوباره امتحان کنید یا دکمه پایین را نگه دارید.');
    }
  };

  const startHold = () => {
    if (holdTimerRef.current !== null) return;
    const started = Date.now();
    holdTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - started;
      const pct = Math.min(100, Math.round((elapsed / 1800) * 100));
      setHoldProgress(pct);
      if (pct >= 100) {
        stopHold();
        onUnlock();
      }
    }, 50);
  };

  const stopHold = () => {
    if (holdTimerRef.current !== null) {
      window.clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldProgress(0);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#F5E4CE] dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 border-b-4 border-b-[#DFC6A8] p-6 shadow-[0_20px_48px_-12px_rgba(170,104,40,0.24)]">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={onCancel}
            aria-label="بازگشت"
            className="min-h-[44px] min-w-[44px] rounded-2xl bg-[#FFF6EB] hover:bg-amber-50 dark:bg-slate-800 border-b-4 border-[#DFC6A8] dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-all"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <AbacusAdventureIllustration className="w-12 h-12" />
            <KidIconTile color="violet" size="md">
              <Lock className="w-6 h-6" />
            </KidIconTile>
          </div>
          <div className="w-11" />
        </div>

        <h1 className="text-xl font-extrabold text-center text-slate-900 dark:text-white">
          ورود به بخش والدین و حساب کاربری
        </h1>
        <p className="text-sm text-center text-slate-600 dark:text-slate-400 mt-1">
          برای جلوگیری از ورود تصادفی کودک به حساب و تنظیمات، یکی از روش‌های زیر را انجام دهید.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 text-center">
            حاصل {toPersianDigits(challenge.a)} × {toPersianDigits(challenge.b)} چند می‌شود؟
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={answerInput}
            onChange={(e) => {
              setAnswerInput(toEnglishDigits(e.target.value).replace(/\D/g, ''));
              setHint('');
            }}
            placeholder="پاسخ را بنویسید..."
            aria-label="پاسخ سؤال والدین"
            className="w-full min-h-[48px] px-4 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-center text-lg font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {hint && (
            <p className="text-xs font-bold text-amber-700 dark:text-amber-300 text-center">{hint}</p>
          )}
          <button
            type="submit"
            className="w-full min-h-[50px] rounded-2xl bg-[#5472EB] hover:bg-[#425FD6] border-b-4 border-[#354EB8] active:border-b-0 active:translate-y-0.5 text-white font-extrabold text-base transition-all"
          >
            تایید و ورود
          </button>
        </form>

        <div className="mt-5 pt-5 border-t border-[#EFE0CE] dark:border-slate-800">
          <button
            type="button"
            onPointerDown={startHold}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            onPointerCancel={stopHold}
            aria-label="دکمه را ۲ ثانیه نگه دارید تا بخش والدین باز شود"
            className="relative w-full min-h-[50px] rounded-2xl bg-[#FFF6EB] dark:bg-slate-800 border-2 border-[#EEDCC5] dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm overflow-hidden select-none"
          >
            <div
              className="absolute inset-y-0 right-0 bg-emerald-400/35 transition-all duration-75"
              style={{ width: `${holdProgress}%` }}
            />
            <span className="relative z-10">
              {holdProgress > 0
                ? 'در حال باز کردن...'
                : 'یا این دکمه را ۲ ثانیه نگه دارید'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
