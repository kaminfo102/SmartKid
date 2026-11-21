import React from 'react';
import type { StageLandmark, TermBiome } from '../../types/app';

interface StoryLandmarkBadgeProps {
  landmark?: StageLandmark;
  className?: string;
}

/**
 * Circular storybook landmark illustration rendered inside each floating stage card,
 * directly inspired by the illustrated farm badges in the reference adventure map.
 */
export const StoryLandmarkBadge: React.FC<StoryLandmarkBadgeProps> = ({
  landmark = 'barn',
  className = 'w-12 h-12',
}) => {
  switch (landmark) {
    case 'barn':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <circle cx="32" cy="32" r="30" fill="#FFE6C7" />
          <path d="M12 46 Q32 40 52 46 L52 56 Q32 62 12 56 Z" fill="#77C948" />
          <polygon points="16,28 32,14 48,28 48,48 16,48" fill="#E64833" />
          <polygon points="13,29 32,12 51,29 48,32 32,17 16,32" fill="#B91C1C" />
          <rect x="25" y="33" width="14" height="15" rx="2" fill="#FFF4E5" />
          <path d="M25 33 L39 48 M39 33 L25 48" stroke="#D97706" strokeWidth="2" />
          <rect x="29" y="21" width="6" height="6" rx="1" fill="#FEF08A" />
        </svg>
      );
    case 'windmill':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <circle cx="32" cy="32" r="30" fill="#DCF4FF" />
          <path d="M10 47 Q32 42 54 47 L54 57 Q32 62 10 57 Z" fill="#7BC843" />
          <polygon points="24,48 27,24 37,24 40,48" fill="#F59E0B" />
          <polygon points="26,24 32,15 38,24" fill="#B45309" />
          <rect x="29" y="38" width="6" height="10" rx="2" fill="#78350F" />
          <g stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round">
            <line x1="32" y1="24" x2="18" y2="12" />
            <line x1="32" y1="24" x2="46" y2="36" />
            <line x1="32" y1="24" x2="46" y2="12" />
            <line x1="32" y1="24" x2="18" y2="36" />
          </g>
          <circle cx="32" cy="24" r="3.5" fill="#78350F" />
        </svg>
      );
    case 'wheat':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <circle cx="32" cy="32" r="30" fill="#FEF3C7" />
          <path d="M32 52 V18" stroke="#D97706" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="26" cy="24" rx="5" ry="3" transform="rotate(-30 26 24)" fill="#F59E0B" />
          <ellipse cx="38" cy="24" rx="5" ry="3" transform="rotate(30 38 24)" fill="#F59E0B" />
          <ellipse cx="25" cy="32" rx="5.5" ry="3.2" transform="rotate(-30 25 32)" fill="#FBBF24" />
          <ellipse cx="39" cy="32" rx="5.5" ry="3.2" transform="rotate(30 39 32)" fill="#FBBF24" />
          <ellipse cx="26" cy="40" rx="5" ry="3" transform="rotate(-30 26 40)" fill="#F59E0B" />
          <ellipse cx="38" cy="40" rx="5" ry="3" transform="rotate(30 38 40)" fill="#F59E0B" />
          <circle cx="32" cy="14" r="3.5" fill="#FBBF24" />
        </svg>
      );
    case 'garden':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <circle cx="32" cy="32" r="30" fill="#E7F9E5" />
          <path d="M32 52 V32" stroke="#2E8228" strokeWidth="3.5" strokeLinecap="round" />
          <ellipse cx="25" cy="44" rx="6" ry="3" transform="rotate(-25 25 44)" fill="#4BB543" />
          <g fill="#FBBF24">
            <circle cx="32" cy="17" r="5" />
            <circle cx="41" cy="22" r="5" />
            <circle cx="43" cy="31" r="5" />
            <circle cx="36" cy="37" r="5" />
            <circle cx="28" cy="37" r="5" />
            <circle cx="21" cy="31" r="5" />
            <circle cx="23" cy="22" r="5" />
          </g>
          <circle cx="32" cy="27" r="8" fill="#78350F" />
          <circle cx="29.5" cy="26" r="1.3" fill="#FFF" />
          <circle cx="34.5" cy="26" r="1.3" fill="#FFF" />
          <path d="M29 29.5 Q32 32 35 29.5" stroke="#FFF" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </svg>
      );
    case 'treehouse':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <circle cx="32" cy="32" r="30" fill="#EDE9FE" />
          <rect x="27" y="34" width="10" height="20" rx="2" fill="#92400E" />
          <circle cx="22" cy="26" r="11" fill="#4BB543" />
          <circle cx="42" cy="26" r="11" fill="#46B849" />
          <circle cx="32" cy="18" r="12" fill="#65D04E" />
          <rect x="22" y="25" width="20" height="14" rx="2" fill="#FDE68A" />
          <polygon points="20,26 32,17 44,26" fill="#D97706" />
          <circle cx="32" cy="32" r="3.5" fill="#78350F" />
        </svg>
      );
    case 'bridge':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <circle cx="32" cy="32" r="30" fill="#FCE7F3" />
          <path d="M10 46 Q32 38 54 46 L54 56 Q32 62 10 56 Z" fill="#38BDF8" />
          <path d="M12 42 Q32 16 52 42" stroke="#EC4899" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M14 42 Q32 22 50 42" stroke="#FBBF24" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M12 42 Q32 32 52 42" stroke="#92400E" strokeWidth="4" fill="none" strokeLinecap="round" />
        </svg>
      );
    case 'waterfall':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <circle cx="32" cy="32" r="30" fill="#DCFCE7" />
          <path d="M14 46 L22 18 L42 18 L50 46 Z" fill="#64748B" />
          <path d="M25 18 V46 M32 18 V46 M39 18 V46" stroke="#38BDF8" strokeWidth="4.5" strokeLinecap="round" />
          <ellipse cx="32" cy="48" rx="16" ry="6" fill="#0EA5E9" />
          <circle cx="24" cy="46" r="2.5" fill="#E0F2FE" />
          <circle cx="38" cy="47" r="2.5" fill="#E0F2FE" />
        </svg>
      );
    case 'owlcastle':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <circle cx="32" cy="32" r="30" fill="#E0E7FF" />
          <rect x="18" y="26" width="28" height="24" rx="3" fill="#8B5CF6" />
          <polygon points="16,26 23,14 30,26" fill="#EC4899" />
          <polygon points="34,26 41,14 48,26" fill="#EC4899" />
          <rect x="27" y="36" width="10" height="14" rx="5" fill="#FEF08A" />
        </svg>
      );
    case 'boat':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <circle cx="32" cy="32" r="30" fill="#E0F2FE" />
          <path d="M10 46 Q32 41 54 46 L54 56 Q32 62 10 56 Z" fill="#0284C7" />
          <path d="M16 38 L48 38 L43 46 L21 46 Z" fill="#B45309" />
          <line x1="32" y1="14" x2="32" y2="38" stroke="#78350F" strokeWidth="3" />
          <polygon points="33,15 47,33 33,33" fill="#FFFFFF" />
          <polygon points="31,18 20,33 31,33" fill="#FDE047" />
        </svg>
      );
    case 'lighthouse':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <circle cx="32" cy="32" r="30" fill="#BAE6FD" />
          <polygon points="24,50 28,22 36,22 40,50" fill="#FFFFFF" />
          <polygon points="26,38 38,38 39,44 25,44" fill="#EF4444" />
          <polygon points="27.5,27 36.5,27 37,32 27,32" fill="#EF4444" />
          <rect x="27" y="16" width="10" height="7" rx="2" fill="#FBBF24" />
          <polygon points="25,16 32,10 39,16" fill="#EF4444" />
        </svg>
      );
    case 'cave':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <circle cx="32" cy="32" r="30" fill="#E0E7FF" />
          <path d="M12 50 Q18 16 32 16 Q46 16 52 50 Z" fill="#64748B" />
          <path d="M22 50 Q25 28 32 28 Q39 28 42 50 Z" fill="#1E293B" />
          <polygon points="32,33 37,40 32,47 27,40" fill="#38BDF8" />
        </svg>
      );
    case 'chest':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <circle cx="32" cy="32" r="30" fill="#FEF3C7" />
          <rect x="16" y="28" width="32" height="20" rx="4" fill="#B45309" />
          <path d="M16 28 Q32 16 48 28 Z" fill="#D97706" />
          <rect x="16" y="28" width="32" height="4" fill="#FBBF24" />
          <rect x="28" y="26" width="8" height="10" rx="2" fill="#FDE047" />
          <circle cx="32" cy="31" r="1.5" fill="#78350F" />
        </svg>
      );
    case 'rocket':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <circle cx="32" cy="32" r="30" fill="#EDE9FE" />
          <path d="M32 12 Q42 24 40 42 L24 42 Q22 24 32 12 Z" fill="#FFFFFF" />
          <path d="M32 12 Q38 18 39 24 L25 24 Q26 18 32 12 Z" fill="#EF4444" />
          <circle cx="32" cy="31" r="5" fill="#38BDF8" />
          <polygon points="24,35 17,45 24,42" fill="#EF4444" />
          <polygon points="40,35 47,45 40,42" fill="#EF4444" />
          <polygon points="28,42 32,53 36,42" fill="#FBBF24" />
        </svg>
      );
    case 'planet':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <circle cx="32" cy="32" r="30" fill="#E0E7FF" />
          <circle cx="32" cy="32" r="13" fill="#8B5CF6" />
          <ellipse
            cx="32"
            cy="32"
            rx="22"
            ry="6"
            transform="rotate(-20 32 32)"
            fill="none"
            stroke="#FBBF24"
            strokeWidth="4"
          />
        </svg>
      );
  }
};

/**
 * Storybook Illustrated World Horizon & Island Scenery above the road,
 * inspired by the illustrated farm landscape (red barn, windmill, sheep, cows) in app_c4acd993.jpg.
 */
export const BiomeWorldScenery: React.FC<{ biome: TermBiome }> = ({ biome }) => {
  if (biome === 'forest') {
    return (
      <svg
        viewBox="0 0 420 120"
        className="w-full h-24 sm:h-28 pointer-events-none select-none"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
      >
        <path d="M0 95 Q110 45 220 82 T420 75 L420 120 L0 120 Z" fill="#5DBB53" />
        <path d="M0 105 Q150 65 300 92 T420 88 L420 120 L0 120 Z" fill="#47A241" />
        {/* Pine Trees */}
        <polygon points="46,85 60,40 74,85" fill="#2E7D32" />
        <polygon points="75,92 88,52 101,92" fill="#388E3C" />
        <polygon points="340,86 355,42 370,86" fill="#2E7D32" />
        {/* Enchanted Treehouse */}
        <rect x="200" y="52" width="16" height="36" fill="#8B4513" />
        <circle cx="208" cy="40" r="26" fill="#65D04E" />
        <rect x="195" y="34" width="26" height="18" rx="3" fill="#FDE68A" />
        <polygon points="191,35 208,22 225,35" fill="#D97706" />
        <circle cx="208" cy="43" r="4" fill="#78350F" />
        {/* Rainbow Arc */}
        <path d="M120 78 Q210 10 300 78" fill="none" stroke="#F472B6" strokeWidth="5" opacity="0.7" />
        <path d="M125 78 Q210 16 295 78" fill="none" stroke="#FBBF24" strokeWidth="5" opacity="0.75" />
      </svg>
    );
  }

  if (biome === 'island') {
    return (
      <svg
        viewBox="0 0 420 120"
        className="w-full h-24 sm:h-28 pointer-events-none select-none"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
      >
        <path d="M0 92 Q120 78 240 90 T420 84 L420 120 L0 120 Z" fill="#0EA5E9" />
        <path d="M70 102 Q210 56 350 102 Z" fill="#FDE08D" />
        {/* Lighthouse */}
        <polygon points="300,90 306,40 318,40 324,90" fill="#FFFFFF" />
        <rect x="303" y="58" width="18" height="8" fill="#EF4444" />
        <rect x="305" y="42" width="14" height="6" fill="#EF4444" />
        <rect x="306" y="33" width="12" height="7" rx="2" fill="#FBBF24" />
        {/* Sailboat */}
        <path d="M95 85 L135 85 L129 94 L101 94 Z" fill="#B45309" />
        <polygon points="115,52 132,82 115,82" fill="#FFFFFF" />
        <polygon points="113,58 98,82 113,82" fill="#FBBF24" />
        {/* Palm Tree */}
        <path d="M235 90 Q242 68 238 54" stroke="#92400E" strokeWidth="5" fill="none" />
        <ellipse cx="228" cy="54" rx="12" ry="4" transform="rotate(-20 228 54)" fill="#4BB543" />
        <ellipse cx="248" cy="54" rx="12" ry="4" transform="rotate(20 248 54)" fill="#4BB543" />
      </svg>
    );
  }

  if (biome === 'space') {
    return (
      <svg
        viewBox="0 0 420 120"
        className="w-full h-24 sm:h-28 pointer-events-none select-none"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
      >
        <path d="M0 94 Q130 62 240 88 T420 80 L420 120 L0 120 Z" fill="#4338CA" />
        <circle cx="80" cy="40" r="18" fill="#FBBF24" />
        <circle cx="330" cy="46" r="14" fill="#EC4899" />
        <ellipse cx="330" cy="46" rx="24" ry="6" transform="rotate(-18 330 46)" fill="none" stroke="#FDE047" strokeWidth="3" />
        <circle cx="155" cy="28" r="3" fill="#FFFFFF" />
        <circle cx="255" cy="22" r="2.5" fill="#FFFFFF" />
        <circle cx="205" cy="42" r="3" fill="#FDE047" />
      </svg>
    );
  }

  // Default Farm Biome (matches app_c4acd993.jpg: Red Barn + Windmill + Green Hills + Sheep + Cow)
  return (
    <svg
      viewBox="0 0 420 120"
      className="w-full h-24 sm:h-28 pointer-events-none select-none"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      {/* Rolling Green Farm Hills */}
      <path d="M0 96 Q110 46 230 82 T420 76 L420 120 L0 120 Z" fill="#8CD44F" />
      <path d="M0 105 Q160 68 310 92 T420 88 L420 120 L0 120 Z" fill="#76C23A" />

      {/* Red Barn at top center-right */}
      <polygon points="246,78 246,52 272,34 298,52 298,78" fill="#E64833" />
      <polygon points="242,54 272,30 302,54 298,58 272,36 246,58" fill="#B91C1C" />
      <rect x="263" y="59" width="18" height="19" rx="2" fill="#FFF7ED" />
      <path d="M263 59 L281 78 M281 59 L263 78" stroke="#D97706" strokeWidth="2" />

      {/* Windmill on the left hill */}
      <polygon points="74,84 78,52 88,52 92,84" fill="#F59E0B" />
      <g stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round">
        <line x1="83" y1="53" x2="70" y2="40" />
        <line x1="83" y1="53" x2="96" y2="66" />
        <line x1="83" y1="53" x2="96" y2="40" />
        <line x1="83" y1="53" x2="70" y2="66" />
      </g>
      <circle cx="83" cy="53" r="3" fill="#78350F" />

      {/* Cute Fluffy Sheep */}
      <g transform="translate(135, 68)">
        <circle cx="12" cy="10" r="8" fill="#FFFFFF" />
        <circle cx="20" cy="10" r="8" fill="#FFFFFF" />
        <circle cx="16" cy="5" r="7" fill="#FFFFFF" />
        <circle cx="6" cy="10" r="5" fill="#FED7AA" />
        <circle cx="5" cy="9" r="1.2" fill="#1E293B" />
        <line x1="11" y1="17" x2="11" y2="23" stroke="#78350F" strokeWidth="2" />
        <line x1="20" y1="17" x2="20" y2="23" stroke="#78350F" strokeWidth="2" />
      </g>

      {/* Cute Spotted Farm Cow */}
      <g transform="translate(332, 70)">
        <rect x="4" y="6" width="24" height="15" rx="7" fill="#FFFFFF" />
        <circle cx="13" cy="12" r="4" fill="#1E293B" />
        <circle cx="23" cy="15" r="3" fill="#1E293B" />
        <circle cx="4" cy="9" r="6" fill="#FFFFFF" />
        <ellipse cx="2" cy="12" rx="4" ry="3" fill="#FBCFE8" />
        <line x1="9" y1="20" x2="9" y2="26" stroke="#1E293B" strokeWidth="2" />
        <line x1="22" y1="20" x2="22" y2="26" stroke="#1E293B" strokeWidth="2" />
      </g>

      {/* Sunbeam */}
      <circle cx="44" cy="24" r="14" fill="#FDE047" />
    </svg>
  );
};

/**
 * Cute illustrated animal cards for the bottom Resource / Bonus section,
 * mirroring the Cow & Sheep cards at the bottom of app_c4acd993.jpg.
 */
export const StoryCardMascot: React.FC<{ variant: 'sheep' | 'cow'; className?: string }> = ({
  variant,
  className = 'w-14 h-14',
}) => {
  if (variant === 'cow') {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <circle cx="32" cy="32" r="28" fill="#FEF9C3" />
        <ellipse cx="16" cy="22" rx="6" ry="4" transform="rotate(-25 16 22)" fill="#1E293B" />
        <ellipse cx="48" cy="22" rx="6" ry="4" transform="rotate(25 48 22)" fill="#1E293B" />
        <circle cx="32" cy="33" r="16" fill="#FFFFFF" />
        <circle cx="25" cy="25" r="5" fill="#1E293B" />
        <circle cx="26" cy="31" r="2.2" fill="#1E293B" />
        <circle cx="38" cy="31" r="2.2" fill="#1E293B" />
        <ellipse cx="32" cy="41" rx="11" ry="7" fill="#FBCFE8" />
        <circle cx="28" cy="40" r="1.5" fill="#BE185D" />
        <circle cx="36" cy="40" r="1.5" fill="#BE185D" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="28" fill="#E0F2FE" />
      <circle cx="24" cy="22" r="9" fill="#FFFFFF" />
      <circle cx="40" cy="22" r="9" fill="#FFFFFF" />
      <circle cx="32" cy="18" r="10" fill="#FFFFFF" />
      <circle cx="20" cy="34" r="9" fill="#FFFFFF" />
      <circle cx="44" cy="34" r="9" fill="#FFFFFF" />
      <circle cx="32" cy="42" r="10" fill="#FFFFFF" />
      <circle cx="32" cy="32" r="12" fill="#FED7AA" />
      <circle cx="27" cy="31" r="2" fill="#1E293B" />
      <circle cx="37" cy="31" r="2" fill="#1E293B" />
      <path d="M29 36 Q32 39 35 36" stroke="#9A3412" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
};
