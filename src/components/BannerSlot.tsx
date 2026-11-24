import React, { useEffect, useMemo } from 'react';
import { ArrowLeft, ExternalLink, Sparkles } from 'lucide-react';
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
  'simulator',
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

  useEffect(() => {
    if (!wpUrl || matched.length === 0) return;
    for (const banner of matched) {
      if (!trackedBannerImpressions.has(banner.id)) {
        trackedBannerImpressions.add(banner.id);
        void trackMarketingEvent(wpUrl, 'banner_impression', banner.id, screen);
      }
    }
  }, [matched, wpUrl, screen]);

  if (matched.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="بنرهای اطلاع‌رسانی"
      className="space-y-3"
    >
      {matched.map((banner) => {
        const safeImage = validateSafeImageSrc(banner.imageUrl);
        const safeExternalUrl =
          banner.actionType === 'external_url'
            ? validateSafeHttpUrl(banner.actionTarget)
            : '';
        const targetScreen =
          banner.actionType === 'app_screen'
            ? parseAppScreenTarget(banner.actionTarget)
            : null;
        const customBg = sanitizeHexColor(banner.bgColor);
        const customText = sanitizeHexColor(banner.textColor);

        const handleBannerClick = () => {
          void trackMarketingEvent(wpUrl, 'banner_click', banner.id, screen);
          if (targetScreen) {
            onNavigateScreen(targetScreen);
          }
        };

        const cardBody = (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              {safeImage ? (
                <img
                  src={safeImage}
                  alt={banner.title || 'بنر تبلیغاتی'}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white/60 shadow-sm shrink-0 bg-white/80"
                />
              ) : (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/25 flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6" />
                </div>
              )}

              <div className="min-w-0 space-y-1 text-right">
                {banner.badgeText && (
                  <span className="inline-block px-2.5 py-0.5 rounded-lg bg-white/25 text-[11px] font-extrabold tracking-tight">
                    {banner.badgeText}
                  </span>
                )}
                {banner.title && (
                  <h3 className="text-sm sm:text-base font-extrabold leading-snug">
                    {banner.title}
                  </h3>
                )}
                {banner.subtitle && (
                  <p className="text-xs opacity-90 font-bold leading-relaxed line-clamp-2">
                    {banner.subtitle}
                  </p>
                )}
              </div>
            </div>

            {banner.actionType !== 'none' && banner.ctaText && (
              <span className="min-h-[42px] px-4 py-2 rounded-2xl bg-white text-slate-900 font-extrabold text-xs inline-flex items-center justify-center gap-1.5 shadow-sm shrink-0 self-end sm:self-center">
                <span>{banner.ctaText}</span>
                {banner.actionType === 'external_url' ? (
                  <ExternalLink className="w-3.5 h-3.5" />
                ) : (
                  <ArrowLeft className="w-3.5 h-3.5" />
                )}
              </span>
            )}
          </div>
        );

        const baseClasses =
          'block w-full rounded-3xl border-2 border-white/80 dark:border-slate-700 p-4 shadow-[0_10px_24px_-8px_rgba(170,104,40,0.22)] transition-transform active:translate-y-0.5 ' +
          (customBg
            ? ''
            : 'bg-gradient-to-l from-[#5472EB] via-[#6682F2] to-[#7D96F7] text-white');

        const inlineStyle =
          customBg || customText
            ? {
                ...(customBg ? { backgroundColor: customBg } : {}),
                ...(customText ? { color: customText } : {}),
              }
            : undefined;

        if (safeExternalUrl) {
          return (
            <a
              key={banner.id}
              href={safeExternalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                void trackMarketingEvent(wpUrl, 'banner_click', banner.id, screen);
              }}
              style={inlineStyle}
              className={`${baseClasses} hover:brightness-[1.03]`}
            >
              {cardBody}
            </a>
          );
        }

        if (targetScreen) {
          return (
            <button
              key={banner.id}
              type="button"
              onClick={handleBannerClick}
              style={inlineStyle}
              className={`${baseClasses} text-right hover:brightness-[1.03]`}
            >
              {cardBody}
            </button>
          );
        }

        return (
          <div key={banner.id} style={inlineStyle} className={baseClasses}>
            {cardBody}
          </div>
        );
      })}
    </section>
  );
};
