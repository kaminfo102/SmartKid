import React, { useEffect, useState } from 'react';
import type { AvatarId } from '../types/app';
import { validateSafeImageSrc } from '../lib/wordpressApi';

interface MascotProps {
  mood?: 'happy' | 'cheering' | 'thinking';
  className?: string;
  reducedMotion?: boolean;
}

/**
 * Original custom-crafted SVG mascot "دانا" (Dana the Wise Abacus Owl)
 * Zero external/copyrighted images.
 */
export const MascotDana: React.FC<MascotProps> = ({
  mood = 'happy',
  className = 'w-28 h-28',
  reducedMotion = false,
}) => {
  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      aria-label="شخصیت دانا"
      className={`${className} ${reducedMotion ? '' : 'animate-gentle-float'}`}
    >
      {/* Soft shadow */}
      <ellipse cx="80" cy="148" rx="44" ry="8" fill="#CBD5E1" fillOpacity="0.55" />
      {/* Body */}
      <rect x="34" y="42" width="92" height="96" rx="46" fill="#2563EB" />
      {/* Belly */}
      <ellipse cx="80" cy="102" rx="31" ry="29" fill="#EFF6FF" />
      {/* Mini abacus badge on belly */}
      <rect x="61" y="92" width="38" height="22" rx="6" fill="#D97706" />
      <line x1="65" y1="101" x2="95" y2="101" stroke="#78350F" strokeWidth="2.5" />
      <circle cx="71" cy="97" r="3" fill="#F97316" />
      <circle cx="80" cy="107" r="3" fill="#0EA5E9" />
      <circle cx="89" cy="107" r="3" fill="#10B981" />

      {/* Ears / Tuft */}
      <path d="M44 48 L36 28 L58 38 Z" fill="#1D4ED8" />
      <path d="M116 48 L124 28 L102 38 Z" fill="#1D4ED8" />

      {/* Eyes */}
      <circle cx="62" cy="64" r="15" fill="#FFFFFF" />
      <circle cx="98" cy="64" r="15" fill="#FFFFFF" />
      {mood === 'cheering' ? (
        <>
          <path d="M54 64 Q62 56 70 64" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M90 64 Q98 56 106 64" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="63" cy="64" r="6.5" fill="#0F172A" />
          <circle cx="97" cy="64" r="6.5" fill="#0F172A" />
          <circle cx="65" cy="61" r="2.2" fill="#FFFFFF" />
          <circle cx="99" cy="61" r="2.2" fill="#FFFFFF" />
        </>
      )}

      {/* Beak */}
      <path d="M74 73 L86 73 L80 83 Z" fill="#F59E0B" />

      {/* Wings */}
      <ellipse
        cx="29"
        cy="95"
        rx="11"
        ry="22"
        transform={mood === 'cheering' ? 'rotate(24 29 95)' : 'rotate(10 29 95)'}
        fill="#1D4ED8"
      />
      <ellipse
        cx="131"
        cy="95"
        rx="11"
        ry="22"
        transform={mood === 'cheering' ? 'rotate(-24 131 95)' : 'rotate(-10 131 95)'}
        fill="#1D4ED8"
      />

      {/* Feet */}
      <ellipse cx="64" cy="140" rx="10" ry="5" fill="#F59E0B" />
      <ellipse cx="96" cy="140" rx="10" ry="5" fill="#F59E0B" />
    </svg>
  );
};

export const AVATAR_OPTIONS: { id: AvatarId; label: string; bg: string }[] = [
  { id: 'owl', label: 'جغد دانا', bg: 'bg-blue-100 dark:bg-blue-900/40' },
  { id: 'fox', label: 'روباه باهوش', bg: 'bg-orange-100 dark:bg-orange-900/40' },
  { id: 'rabbit', label: 'خرگوش سریع', bg: 'bg-pink-100 dark:bg-pink-900/40' },
  { id: 'bear', label: 'خرس مهربان', bg: 'bg-amber-100 dark:bg-amber-900/40' },
  { id: 'panda', label: 'پاندا', bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
  { id: 'star', label: 'ستاره طلایی', bg: 'bg-violet-100 dark:bg-violet-900/40' },
];

export const AvatarGraphic: React.FC<{
  avatar: AvatarId;
  imageUrl?: string;
  alt?: string;
  className?: string;
}> = ({ avatar, imageUrl, alt = 'تصویر کودک', className = 'w-12 h-12' }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const safeSrc = validateSafeImageSrc(imageUrl);

  useEffect(() => {
    setImgFailed(false);
  }, [safeSrc]);

  if (safeSrc && !imgFailed) {
    return (
      <img
        src={safeSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className={`${className} rounded-full object-cover bg-[#FFF6EB] dark:bg-slate-800`}
      />
    );
  }

  switch (avatar) {
    case 'owl':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <circle cx="32" cy="34" r="24" fill="#2563EB" />
          <circle cx="23" cy="30" r="8" fill="#FFF" />
          <circle cx="41" cy="30" r="8" fill="#FFF" />
          <circle cx="24" cy="30" r="3.5" fill="#0F172A" />
          <circle cx="40" cy="30" r="3.5" fill="#0F172A" />
          <path d="M29 36 L35 36 L32 42 Z" fill="#F59E0B" />
        </svg>
      );
    case 'fox':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <path d="M12 16 L24 24 L40 24 L52 16 L50 42 Q32 58 14 42 Z" fill="#F97316" />
          <path d="M16 40 Q32 54 48 40 L32 48 Z" fill="#FFF7ED" />
          <circle cx="24" cy="33" r="3" fill="#0F172A" />
          <circle cx="40" cy="33" r="3" fill="#0F172A" />
          <circle cx="32" cy="42" r="3" fill="#0F172A" />
        </svg>
      );
    case 'rabbit':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <ellipse cx="23" cy="17" rx="5" ry="13" fill="#F472B6" />
          <ellipse cx="41" cy="17" rx="5" ry="13" fill="#F472B6" />
          <circle cx="32" cy="38" r="19" fill="#FCE7F3" stroke="#F472B6" strokeWidth="2.5" />
          <circle cx="25" cy="36" r="3" fill="#0F172A" />
          <circle cx="39" cy="36" r="3" fill="#0F172A" />
          <ellipse cx="32" cy="42" rx="3.5" ry="2.5" fill="#EC4899" />
        </svg>
      );
    case 'bear':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <circle cx="17" cy="20" r="7" fill="#B45309" />
          <circle cx="47" cy="20" r="7" fill="#B45309" />
          <circle cx="32" cy="35" r="21" fill="#D97706" />
          <ellipse cx="32" cy="41" rx="9" ry="7" fill="#FEF3C7" />
          <circle cx="24" cy="31" r="3" fill="#0F172A" />
          <circle cx="40" cy="31" r="3" fill="#0F172A" />
          <circle cx="32" cy="39" r="3" fill="#451A03" />
        </svg>
      );
    case 'panda':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <circle cx="17" cy="19" r="7" fill="#1E293B" />
          <circle cx="47" cy="19" r="7" fill="#1E293B" />
          <circle cx="32" cy="35" r="21" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
          <ellipse cx="23" cy="32" rx="6" ry="7" fill="#1E293B" />
          <ellipse cx="41" cy="32" rx="6" ry="7" fill="#1E293B" />
          <circle cx="24" cy="32" r="2.2" fill="#FFF" />
          <circle cx="40" cy="32" r="2.2" fill="#FFF" />
          <ellipse cx="32" cy="41" rx="4" ry="2.5" fill="#1E293B" />
        </svg>
      );
    case 'star':
    default:
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <path
            d="M32 8 L39 23 L56 25 L43 37 L46 54 L32 45 L18 54 L21 37 L8 25 L25 23 Z"
            fill="#F59E0B"
            stroke="#D97706"
            strokeWidth="2"
          />
          <circle cx="26" cy="31" r="2.5" fill="#0F172A" />
          <circle cx="38" cy="31" r="2.5" fill="#0F172A" />
          <path d="M28 38 Q32 42 36 38" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </svg>
      );
  }
};

export const CartoonObjectIcon: React.FC<{
  type: 'apple' | 'star' | 'balloon' | 'pencil';
  className?: string;
}> = ({ type, className = 'w-8 h-8' }) => {
  switch (type) {
    case 'apple':
      return (
        <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
          <path d="M20 11 C20 6 25 5 27 6" stroke="#15803D" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <ellipse cx="25" cy="9" rx="4" ry="2.5" fill="#22C55E" />
          <path
            d="M20 13 C12 11 7 18 9 27 C11 35 17 36 20 34 C23 36 29 35 31 27 C33 18 28 11 20 13 Z"
            fill="#FB7185"
          />
        </svg>
      );
    case 'balloon':
      return (
        <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
          <ellipse cx="20" cy="16" rx="11" ry="13" fill="#38BDF8" />
          <path d="M18 29 L22 29 L20 32 Z" fill="#0284C7" />
          <path d="M20 32 Q17 36 21 39" stroke="#64748B" strokeWidth="1.5" fill="none" />
        </svg>
      );
    case 'pencil':
      return (
        <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
          <path d="M10 30 L13 21 L27 7 L33 13 L19 27 Z" fill="#FBBF24" />
          <path d="M10 30 L13 21 L19 27 Z" fill="#FDE68A" />
          <path d="M10 30 L12 25 L15 28 Z" fill="#334155" />
        </svg>
      );
    case 'star':
    default:
      return (
        <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
          <path
            d="M20 4 L24.5 14.5 L36 15.5 L27 23 L29.5 34.5 L20 28.5 L10.5 34.5 L13 23 L4 15.5 L15.5 14.5 Z"
            fill="#F59E0B"
          />
        </svg>
      );
  }
};
