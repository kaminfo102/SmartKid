import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Heart, HelpCircle } from 'lucide-react';
import type { KiaMood } from '../types/app';
import { audioEngine } from '../lib/audioEngine';

export const KIA_ICON_PATHS = {
  idle: '/assets/kia_269d7c8e.png',
  teaching: '/assets/kia_269d7c8e.png',
  happy: '/assets/kia-happy.png',
  cheering: '/assets/kia-happy.png',
  sad: '/assets/kia-sad.png',
} as const;

let preloaded = false;
function preloadKiaIcons(): void {
  if (preloaded || typeof window === 'undefined') return;
  preloaded = true;
  const uniqueUrls = Array.from(new Set(Object.values(KIA_ICON_PATHS)));
  uniqueUrls.forEach((src) => {
    const img = new window.Image();
    img.src = src;
  });
}

export interface KiaAvatarProps {
  mood?: KiaMood;
  className?: string;
  reducedMotion?: boolean;
  interactive?: boolean;
  onTap?: () => void;
  showEmblem?: boolean;
}

/**
 * KiaAvatar — Fast, expressive mascot component for Kia the Smart Bird.
 * Switches smoothly between pre-optimized lightweight icons:
 * - idle / teaching -> /assets/kia_269d7c8e.png
 * - happy / cheering -> /assets/kia-happy.png
 * - sad -> /assets/kia-sad.png
 */
export const KiaAvatar: React.FC<KiaAvatarProps> = ({
  mood = 'idle',
  className = 'w-20 h-20',
  reducedMotion = false,
  interactive = false,
  onTap,
  showEmblem = true,
}) => {
  const [chirpPing, setChirpPing] = useState(false);
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});

  useEffect(() => {
    preloadKiaIcons();
  }, []);

  const effectiveMood: KiaMood = chirpPing ? 'cheering' : mood;
  const targetSrc = KIA_ICON_PATHS[effectiveMood] ?? KIA_ICON_PATHS.idle;
  const activeSrc = failedUrls[targetSrc] ? KIA_ICON_PATHS.idle : targetSrc;
  const allFailed = Boolean(failedUrls[activeSrc]);

  const handleClick = () => {
    if (!interactive && !onTap) return;
    audioEngine.play('birdChirp');
    setChirpPing(true);
    window.setTimeout(() => setChirpPing(false), 650);
    onTap?.();
  };

  const animateProps = reducedMotion
    ? {}
    : effectiveMood === 'cheering'
    ? {
        y: [0, -10, 0, -6, 0],
        rotate: [0, -4, 4, -2, 0],
        scale: [1, 1.08, 1, 1.04, 1],
      }
    : effectiveMood === 'happy'
    ? {
        y: [0, -6, 0],
        rotate: [0, 2.5, -2.5, 0],
        scale: [1, 1.04, 1],
      }
    : effectiveMood === 'sad'
    ? {
        y: [0, 3, 0],
        rotate: [0, -6, 4, -3, 0],
        scale: [1, 0.96, 1],
      }
    : effectiveMood === 'teaching'
    ? {
        y: [0, -4, 0],
        rotate: [0, 3, 0],
      }
    : {
        y: [0, -4, 0],
      };

  const transitionProps = reducedMotion
    ? undefined
    : {
        duration:
          effectiveMood === 'cheering'
            ? 0.95
            : effectiveMood === 'sad'
            ? 1.15
            : 2.8,
        repeat: effectiveMood === 'sad' ? 1 : Infinity,
        ease: 'easeInOut' as const,
      };

  const isHappy = effectiveMood === 'happy' || effectiveMood === 'cheering';
  const isSad = effectiveMood === 'sad';

  return (
    <motion.div
      key={effectiveMood}
      animate={animateProps}
      transition={transitionProps}
      onClick={handleClick}
      role={interactive ? 'button' : 'img'}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={(e) => {
        if (interactive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={
        isSad
          ? 'کیا پرنده با چهره ناراحت و مهربان می‌گوید دوباره تلاش کن'
          : isHappy
          ? 'کیا پرنده با خوشحالی تشویق می‌کند'
          : effectiveMood === 'teaching'
          ? 'کیا پرنده در حال آموزش'
          : 'کیا پرنده دوست چرتکه‌ای'
      }
      className={`relative inline-flex items-center justify-center select-none ${
        interactive
          ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400 rounded-full'
          : ''
      } ${className}`}
    >
      {/* Soft mood halo */}
      <div
        aria-hidden="true"
        className={`absolute inset-0.5 rounded-full transition-colors ${
          isHappy
            ? 'bg-emerald-200/60 dark:bg-emerald-500/20 ring-2 ring-emerald-400/60'
            : isSad
            ? 'bg-amber-200/65 dark:bg-amber-500/20 ring-2 ring-amber-400/70'
            : effectiveMood === 'teaching'
            ? 'bg-sky-200/55 dark:bg-sky-500/20'
            : 'bg-emerald-100/45 dark:bg-emerald-900/20'
        }`}
      />

      {!allFailed ? (
        <img
          src={activeSrc}
          alt={
            isSad
              ? 'کیای ناراحت و تشویق‌کننده به تلاش دوباره'
              : isHappy
              ? 'کیای خوشحال و خندان'
              : 'پرنده کیا'
          }
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          draggable={false}
          onError={() =>
            setFailedUrls((prev) => ({ ...prev, [activeSrc]: true }))
          }
          className="relative z-10 w-full h-full object-contain drop-shadow-sm"
        />
      ) : (
        <div className="relative z-10 w-full h-full rounded-full bg-emerald-500 text-white font-extrabold flex items-center justify-center text-sm shadow">
          کیا
        </div>
      )}

      {/* Subtle corner badge matching emotion */}
      {showEmblem && isHappy && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 z-20 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-400 text-white flex items-center justify-center shadow-sm border-2 border-white dark:border-slate-900"
        >
          <Sparkles className="w-3.5 h-3.5" />
        </span>
      )}

      {showEmblem && isSad && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 z-20 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm border-2 border-white dark:border-slate-900"
        >
          <Heart className="w-3 h-3 fill-white" />
        </span>
      )}

      {showEmblem && effectiveMood === 'teaching' && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 z-20 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm border-2 border-white dark:border-slate-900"
        >
          <HelpCircle className="w-3 h-3" />
        </span>
      )}
    </motion.div>
  );
};
