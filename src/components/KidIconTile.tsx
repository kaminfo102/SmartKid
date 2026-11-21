import React from 'react';

export type KidTileColor =
  | 'pink'
  | 'blue'
  | 'sky'
  | 'green'
  | 'amber'
  | 'violet'
  | 'coral'
  | 'slate';

const TILE_STYLES: Record<KidTileColor, string> = {
  pink: 'bg-[#EE6298] border-b-4 border-[#C73F74] text-white shadow-sm',
  blue: 'bg-[#5472EB] border-b-4 border-[#3852C4] text-white shadow-sm',
  sky: 'bg-[#4ABAF5] border-b-4 border-[#2793D1] text-white shadow-sm',
  green: 'bg-[#46B849] border-b-4 border-[#2D8D30] text-white shadow-sm',
  amber: 'bg-[#F6A623] border-b-4 border-[#CC810C] text-white shadow-sm',
  violet: 'bg-[#8E63EB] border-b-4 border-[#6840C4] text-white shadow-sm',
  coral: 'bg-[#F56C57] border-b-4 border-[#CA4936] text-white shadow-sm',
  slate: 'bg-slate-300 border-b-4 border-slate-400 text-slate-600 dark:bg-slate-700 dark:border-slate-800 dark:text-slate-300',
};

interface KidIconTileProps {
  color: KidTileColor;
  size?: 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  className?: string;
}

/**
 * Large, colorful, tactile 3D-lipped squircle icon tile tailored for kids ages 4-10.
 */
export const KidIconTile: React.FC<KidIconTileProps> = ({
  color,
  size = 'lg',
  children,
  className = '',
}) => {
  const sizeClass =
    size === 'xl'
      ? 'w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-[20px]'
      : size === 'lg'
      ? 'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl'
      : 'w-12 h-12 rounded-2xl';

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden ${sizeClass} ${TILE_STYLES[color]} ${className}`}
    >
      {/* Top glossy highlight arc */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1 left-2 right-2 h-2 rounded-full bg-white/25"
      />
      <span className="relative z-10 flex items-center justify-center">
        {children}
      </span>
    </div>
  );
};

export const MeadowDecorFlower: React.FC<{
  variant: 'sunflower' | 'daisy' | 'tulip' | 'sprout';
  className?: string;
}> = ({ variant, className = 'w-10 h-10' }) => {
  if (variant === 'sprout') {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <path d="M32 56 V28" stroke="#4D9E2A" strokeWidth="5" strokeLinecap="round" />
        <path d="M32 32 C16 32, 10 18, 18 12 C28 10, 34 20, 32 32 Z" fill="#7AD142" stroke="#4D9E2A" strokeWidth="2.5" />
        <path d="M32 28 C48 28, 54 14, 46 8 C36 6, 30 16, 32 28 Z" fill="#92E358" stroke="#4D9E2A" strokeWidth="2.5" />
      </svg>
    );
  }

  if (variant === 'sunflower') {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <path d="M32 58 V32" stroke="#3F8E22" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M32 48 C22 48, 20 40, 26 38" fill="#5CB834" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <ellipse
            key={deg}
            cx="32"
            cy="14"
            rx="5"
            ry="9"
            fill="#FACC15"
            transform={`rotate(${deg} 32 26)`}
          />
        ))}
        <circle cx="32" cy="26" r="9" fill="#854D0E" />
        <circle cx="29" cy="24" r="2" fill="#A16207" />
      </svg>
    );
  }

  if (variant === 'tulip') {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <path d="M32 58 V34" stroke="#3F8E22" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M32 50 C20 48, 18 38, 24 36 C28 36, 32 42, 32 50 Z" fill="#5CB834" />
        <path d="M20 22 C20 34, 44 34, 44 22 L42 12 L36 18 L32 10 L28 18 L22 12 Z" fill="#EF4444" />
        <path d="M26 20 C26 28, 38 28, 38 20" fill="#FCA5A5" opacity="0.35" />
      </svg>
    );
  }

  // daisy
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M32 58 V32" stroke="#3F8E22" strokeWidth="4.5" strokeLinecap="round" />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <ellipse
          key={deg}
          cx="32"
          cy="15"
          rx="5.5"
          ry="8.5"
          fill="#FFFFFF"
          transform={`rotate(${deg} 32 25)`}
        />
      ))}
      <circle cx="32" cy="25" r="7" fill="#FBBF24" />
    </svg>
  );
};
