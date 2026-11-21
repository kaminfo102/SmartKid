import React from 'react';
import { motion } from 'motion/react';
import { Coffee, Heart, ExternalLink } from 'lucide-react';
import { audioEngine } from '../lib/audioEngine';

export const SUPPORT_COFFEE_URL = 'https://coffeete.ir/kaminfo';

interface BuyCoffeeButtonProps {
  variant?: 'card' | 'compact';
  reducedMotion?: boolean;
  className?: string;
}

/**
 * Attractive, persuasive support CTA ("یک قهوه من رو مهمون کن") linking to Coffeete.
 * Uses a standard external anchor link (safe for iframes/PWAs without window.open).
 */
export const BuyCoffeeButton: React.FC<BuyCoffeeButtonProps> = ({
  variant = 'card',
  reducedMotion = false,
  className = '',
}) => {
  const handleClick = () => {
    audioEngine.play('uiTap');
  };

  if (variant === 'compact') {
    return (
      <motion.a
        href={SUPPORT_COFFEE_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        whileHover={reducedMotion ? undefined : { y: -1.5, scale: 1.01 }}
        whileTap={reducedMotion ? undefined : { scale: 0.985 }}
        aria-label="یک قهوه من رو مهمون کن — حمایت مالی از سازنده کودک نابغه"
        className={`group w-full min-h-[50px] px-4 py-2.5 rounded-2xl bg-gradient-to-l from-[#78350F] via-[#92400E] to-[#B45309] hover:from-[#6B2D0B] hover:to-[#9A3412] text-amber-50 shadow-md shadow-amber-900/20 border border-amber-400/30 flex items-center justify-between gap-3 transition-all ${className}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center shrink-0">
            <Coffee className="w-5 h-5 text-amber-200" />
            {!reducedMotion && (
              <motion.span
                aria-hidden="true"
                animate={{ y: [0, -3, 0], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-200"
              />
            )}
          </span>
          <div className="text-right min-w-0">
            <div className="text-sm font-extrabold text-white truncate">
              یک قهوه من رو مهمون کن
            </div>
            <div className="text-[11px] text-amber-100/90 truncate">
              حمایت از آموزش رایگان کودکان
            </div>
          </div>
        </div>

        <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/15 group-hover:bg-white/25 text-xs font-bold text-white transition-colors">
          <Heart className="w-3.5 h-3.5 fill-rose-300 text-rose-200" />
          <span>حمایت</span>
        </span>
      </motion.a>
    );
  }

  return (
    <motion.a
      href={SUPPORT_COFFEE_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      whileHover={reducedMotion ? undefined : { y: -2, scale: 1.01 }}
      whileTap={reducedMotion ? undefined : { scale: 0.99 }}
      aria-label="یک قهوه من رو مهمون کن — حمایت مالی از سازنده کودک نابغه"
      className={`group relative overflow-hidden block w-full rounded-2xl bg-gradient-to-l from-[#6C2E0E] via-[#8B3E12] to-[#B45309] hover:from-[#5D260A] hover:to-[#9A3412] text-white p-4 shadow-[0_12px_28px_-8px_rgba(120,53,15,0.34)] border border-amber-300/30 transition-all ${className}`}
    >
      {/* Subtle warm sheen */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -left-10 w-32 h-32 rounded-full bg-amber-300/15 blur-2xl"
      />

      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-100/15 border border-amber-200/30 flex items-center justify-center shrink-0">
            <Coffee className="w-6 h-6 sm:w-7 sm:h-7 text-amber-200" />
            {!reducedMotion && (
              <>
                <motion.span
                  aria-hidden="true"
                  animate={{ y: [0, -5, -8], opacity: [0, 0.9, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                  className="absolute top-1.5 right-3.5 w-1 h-2 rounded-full bg-amber-100"
                />
                <motion.span
                  aria-hidden="true"
                  animate={{ y: [0, -5, -8], opacity: [0, 0.9, 0] }}
                  transition={{
                    duration: 1.8,
                    delay: 0.6,
                    repeat: Infinity,
                    ease: 'easeOut',
                  }}
                  className="absolute top-1.5 left-3.5 w-1 h-2 rounded-full bg-amber-100"
                />
              </>
            )}
          </div>

          <div className="text-right min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm sm:text-base font-extrabold text-white">
                یک قهوه من رو مهمون کن
              </span>
              <Heart className="w-4 h-4 fill-rose-300 text-rose-200 shrink-0" />
            </div>
            <p className="text-xs text-amber-100/90 leading-relaxed">
              اگر «کودک نابغه» برای فرزندتان مفید بود، با یک فنجان قهوه به ساخت درس‌ها و بازی‌های رایگان بیشتر انرژی بدهید!
            </p>
          </div>
        </div>

        <span className="shrink-0 min-h-[40px] px-3 py-2 rounded-2xl bg-amber-300 group-hover:bg-amber-200 text-[#451A03] font-extrabold text-xs inline-flex items-center gap-1.5 shadow-sm transition-colors">
          <span>مهمونم کن</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </span>
      </div>
    </motion.a>
  );
};
