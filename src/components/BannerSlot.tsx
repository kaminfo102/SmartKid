import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Sparkles,
} from 'lucide-react';
import type { PromotionalBanner, ScreenId } from '../types/app';
import {
  trackMarketingEvent,
  validateSafeHttpUrl,
  validateSafeImageSrc,
} from '../lib/wordpressApi';

const VALID_TARGET_SCREENS = new Set<ScreenId>([
  'start',
  'map',
  'practice',
  'games',
  'racing',
  'simulator',
  'abacus',
  'leaderboard',
  'shop',
  'tickets',
  'auth',
  'profiles',
  'parents',
]);

const trackedBannerImpressions = new Set<number>();

interface BannerSlotProps {
  banners: PromotionalBanner[];
  placement: PromotionalBanner['placement'];
  screen: ScreenId;
  wpUrl: string;
  onNavigateScreen: (screen: ScreenId) => void;
}

function sanitizeHexColor(raw?: string): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : undefined;
}

function parseAppScreenTarget(raw?: string): ScreenId | null {
  if (!raw || typeof raw !== 'string') return null;
  const key = raw.trim() as ScreenId;
  return VALID_TARGET_SCREENS.has(key) ? key : null;
}

export const BannerSlot: React.FC<BannerSlotProps> = ({
  banners,
  placement,
  screen,
  wpUrl,
  onNavigateScreen,
}) => {
  const matched = useMemo(
    () => banners.filter((b) => b.placement === placement),
    [banners, placement]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeIndex >= matched.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, matched.length]);

  const currentBanner = matched[activeIndex] ?? matched[0];

  useEffect(() => {
    if (!wpUrl || !currentBanner) return;
    if (!trackedBannerImpressions.has(currentBanner.id)) {
      trackedBannerImpressions.add(currentBanner.id);
      void trackMarketingEvent(wpUrl, 'banner_impression', currentBanner.id, screen);
    }
  }, [currentBanner, wpUrl, screen]);

  useEffect(() => {
    if (matched.length <= 1 || isPaused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % matched.length);
    }, 4800);
    return () => window.clearInterval(timer);
  }, [matched.length, isPaused]);

  if (matched.length === 0 || !currentBanner) {
    return null;
  }

  const goPrev = () => {
    setActiveIndex((prev) => (prev - 1 + matched.length) % matched.length);
  };

  const goNext = () => {
    setActiveIndex((prev) => (prev + 1) % matched.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const startX = touchStartXRef.current;
    const endX = e.changedTouches[0]?.clientX ?? null;
    touchStartXRef.current = null;
    if (startX !== null && endX !== null && matched.length > 1) {
      const diff = endX - startX;
      if (Math.abs(diff) > 36) {
        if (diff > 0) {
          goNext();
        } else {
          goPrev();
        }
      }
    }
    window.setTimeout(() => setIsPaused(false), 3000);
  };

  const safeImage = validateSafeImageSrc(currentBanner.imageUrl);
  const showFullImage = Boolean(safeImage) && !failedImages[currentBanner.id];
  const safeExternalUrl =
    currentBanner.actionType === 'external_url'
      ? validateSafeHttpUrl(currentBanner.actionTarget)
      : '';
  const targetScreen =
    currentBanner.actionType === 'app_screen'
      ? parseAppScreenTarget(currentBanner.actionTarget)
      : null;
  const customBg = sanitizeHexColor(currentBanner.bgColor);
  const customText = sanitizeHexColor(currentBanner.textColor);

  const handleBannerClick = () => {
    void trackMarketingEvent(wpUrl, 'banner_click', currentBanner.id, screen);
    if (targetScreen) {
      onNavigateScreen(targetScreen);
    }
  };

  const inlineStyle =
    customBg || customText
      ? {
          ...(customBg ? { backgroundColor: customBg } : {}),
          ...(customText ? { color: customText } : {}),
        }
      : undefined;

  const hasFooterInfo = Boolean(
    currentBanner.badgeText ||
      currentBanner.title ||
      currentBanner.subtitle ||
      safeExternalUrl ||
      targetScreen
  );

  const viewIconBadge = (safeExternalUrl || targetScreen) && (
    <span
      aria-label={currentBanner.ctaText || 'مشاهده'}
      title={currentBanner.ctaText || 'مشاهده'}
      className="w-10 h-10 rounded-2xl bg-white text-slate-900 shadow-sm inline-flex items-center justify-center shrink-0"
    >
      <Eye className="w-5 h-5 text-[#5472EB]" />
    </span>
  );

  const slideContent = showFullImage ? (
    <div className="w-full flex flex-col">
      <div
        style={customBg ? { backgroundColor: customBg } : undefined}
        className="relative w-full bg-white/95 dark:bg-slate-900 flex items-center justify-center overflow-hidden"
      >
        <img
          src={safeImage}
          alt={currentBanner.title || 'بنر تبلیغاتی'}
          referrerPolicy="no-referrer"
          onError={() =>
            setFailedImages((prev) => ({ ...prev, [currentBanner.id]: true }))
          }
          className="w-full h-auto max-h-[420px] sm:max-h-[520px] object-contain block mx-auto"
        />
      </div>

      {hasFooterInfo && (
        <div
          style={inlineStyle}
          className={`px-4 py-3 flex items-center justify-between gap-3 border-t border-white/25 ${
            customBg
              ? ''
              : 'bg-gradient-to-l from-[#5472EB] via-[#6682F2] to-[#7D96F7] text-white'
          }`}
        >
          <div className="min-w-0 space-y-1 text-right flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {currentBanner.badgeText && (
                <span className="inline-block px-2 py-0.5 rounded-lg bg-white/25 text-[10px] sm:text-[11px] font-extrabold shrink-0">
                  {currentBanner.badgeText}
                </span>
              )}
              {currentBanner.title && (
                <h3 className="text-sm sm:text-base font-extrabold leading-snug">
                  {currentBanner.title}
                </h3>
              )}
            </div>
            {currentBanner.subtitle && (
              <p className="text-xs opacity-95 font-bold leading-relaxed line-clamp-2">
                {currentBanner.subtitle}
              </p>
            )}
          </div>

          {viewIconBadge}
        </div>
      )}
    </div>
  ) : (
    <div
      style={inlineStyle}
      className={`p-4 sm:p-5 flex items-center justify-between gap-3.5 ${
        customBg
          ? ''
          : 'bg-gradient-to-l from-[#5472EB] via-[#6682F2] to-[#7D96F7] text-white'
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/25 flex items-center justify-center shrink-0">
          <Sparkles className="w-6 h-6" />
        </div>

        <div className="min-w-0 space-y-1 text-right">
          {currentBanner.badgeText && (
            <span className="inline-block px-2.5 py-0.5 rounded-lg bg-white/25 text-[11px] font-extrabold tracking-tight">
              {currentBanner.badgeText}
            </span>
          )}
          {currentBanner.title && (
            <h3 className="text-sm sm:text-base font-extrabold leading-snug">
              {currentBanner.title}
            </h3>
          )}
          {currentBanner.subtitle && (
            <p className="text-xs opacity-90 font-bold leading-relaxed line-clamp-2">
              {currentBanner.subtitle}
            </p>
          )}
        </div>
      </div>

      {viewIconBadge}
    </div>
  );

  const wrapperClasses =
    'block w-full overflow-hidden rounded-3xl border-2 border-white/90 dark:border-slate-700 shadow-[0_12px_28px_-10px_rgba(170,104,40,0.25)] transition-transform active:translate-y-[1px]';

  return (
    <section
      aria-label="اسلایدر بنرهای تبلیغاتی"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative space-y-2"
    >
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentBanner.id}
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {safeExternalUrl ? (
              <a
                href={safeExternalUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  void trackMarketingEvent(
                    wpUrl,
                    'banner_click',
                    currentBanner.id,
                    screen
                  );
                }}
                className={`${wrapperClasses} hover:brightness-[1.02]`}
              >
                {slideContent}
              </a>
            ) : targetScreen ? (
              <button
                type="button"
                onClick={handleBannerClick}
                className={`${wrapperClasses} text-right hover:brightness-[1.02]`}
              >
                {slideContent}
              </button>
            ) : (
              <div className={wrapperClasses}>{slideContent}</div>
            )}
          </motion.div>
        </AnimatePresence>

        {matched.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="بنر قبلی"
              className="absolute top-1/2 -translate-y-1/2 right-2.5 z-20 w-9 h-9 rounded-full bg-white/85 hover:bg-white dark:bg-slate-900/85 text-slate-800 dark:text-white border border-black/10 dark:border-white/15 shadow-md flex items-center justify-center backdrop-blur-xs transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="بنر بعدی"
              className="absolute top-1/2 -translate-y-1/2 left-2.5 z-20 w-9 h-9 rounded-full bg-white/85 hover:bg-white dark:bg-slate-900/85 text-slate-800 dark:text-white border border-black/10 dark:border-white/15 shadow-md flex items-center justify-center backdrop-blur-xs transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {matched.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-0.5">
          {matched.map((b, idx) => {
            const active = idx === activeIndex;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-label={b.title || `بنر ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${
                  active
                    ? 'w-6 bg-[#5472EB]'
                    : 'w-2 bg-[#DFC6A8] hover:bg-[#CBB08E] dark:bg-slate-700'
                }`}
              />
            );
          })}
        </div>
      )}
    </section>
  );
};
