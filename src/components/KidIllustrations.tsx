import React from 'react';

interface IllustrationProps {
  className?: string;
}

/**
 * Cheerful abacus + floating stars illustration for hero & parent cards.
 */
export const AbacusAdventureIllustration: React.FC<IllustrationProps> = ({
  className = 'w-16 h-16',
}) => (
  <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
    <circle cx="48" cy="48" r="44" fill="#FFF3C4" />
    <path
      d="M14 58 Q48 22 82 58"
      fill="none"
      stroke="#F9A8D4"
      strokeWidth="6"
      strokeLinecap="round"
      opacity="0.7"
    />
    <path
      d="M20 62 Q48 32 76 62"
      fill="none"
      stroke="#7DD3FC"
      strokeWidth="5"
      strokeLinecap="round"
      opacity="0.75"
    />
    {/* Wooden Abacus Frame */}
    <rect x="20" y="28" width="56" height="42" rx="8" fill="#D97706" />
    <rect x="25" y="33" width="46" height="32" rx="4" fill="#FFFBEB" />
    {/* Horizontal Beam */}
    <rect x="25" y="45" width="46" height="4" fill="#92400E" />
    {/* Rods */}
    <line x1="36" y1="33" x2="36" y2="65" stroke="#B45309" strokeWidth="2.5" />
    <line x1="48" y1="33" x2="48" y2="65" stroke="#B45309" strokeWidth="2.5" />
    <line x1="60" y1="33" x2="60" y2="65" stroke="#B45309" strokeWidth="2.5" />
    {/* Colorful Beads */}
    <ellipse cx="36" cy="39" rx="5.5" ry="3.8" fill="#EF4444" />
    <ellipse cx="48" cy="41" rx="5.5" ry="3.8" fill="#3B82F6" />
    <ellipse cx="60" cy="38" rx="5.5" ry="3.8" fill="#10B981" />
    <ellipse cx="36" cy="54" rx="5.5" ry="3.8" fill="#F59E0B" />
    <ellipse cx="48" cy="59" rx="5.5" ry="3.8" fill="#EC4899" />
    <ellipse cx="60" cy="54" rx="5.5" ry="3.8" fill="#8B5CF6" />
    {/* Sparkle Stars */}
    <polygon points="78,18 80,23 85,25 80,27 78,32 76,27 71,25 76,23" fill="#FBBF24" />
    <circle cx="17" cy="24" r="3.5" fill="#4BB543" />
  </svg>
);

/**
 * Treasure chest & glowing stars illustration for unlocking new Terms via WooCommerce.
 */
export const TreasureUnlockIllustration: React.FC<IllustrationProps> = ({
  className = 'w-20 h-20',
}) => (
  <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
    <circle cx="48" cy="48" r="44" fill="#FEF3C7" />
    {/* Rays */}
    <polygon points="48,10 54,40 42,40" fill="#FDE047" opacity="0.6" />
    <polygon points="22,22 44,44 36,50" fill="#FDE047" opacity="0.5" />
    <polygon points="74,22 60,50 52,44" fill="#FDE047" opacity="0.5" />
    {/* Chest Base */}
    <rect x="20" y="46" width="56" height="30" rx="8" fill="#B45309" />
    <rect x="20" y="46" width="56" height="7" rx="3" fill="#FBBF24" />
    {/* Open Lid */}
    <path d="M22 44 Q48 20 74 44 Z" fill="#D97706" />
    <path d="M26 42 Q48 24 70 42 Z" fill="#FDE68A" />
    {/* Center Lock */}
    <rect x="42" y="44" width="12" height="14" rx="4" fill="#FDE047" stroke="#92400E" strokeWidth="2" />
    <circle cx="48" cy="50" r="2" fill="#92400E" />
    {/* Floating Coins & Stars */}
    <circle cx="34" cy="30" r="5" fill="#FACC15" stroke="#D97706" strokeWidth="1.5" />
    <circle cx="62" cy="28" r="5" fill="#FACC15" stroke="#D97706" strokeWidth="1.5" />
    <polygon points="48,14 50.5,20 57,20 52,24 54,30 48,26.5 42,30 44,24 39,20 45.5,20" fill="#F59E0B" />
  </svg>
);

/**
 * Celebratory trophy & confetti illustration for ResultScreen.
 */
export const TrophyCelebrationIllustration: React.FC<IllustrationProps> = ({
  className = 'w-20 h-20',
}) => (
  <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
    <circle cx="48" cy="48" r="44" fill="#E0F2FE" />
    {/* Trophy Handles */}
    <path d="M28 32 C16 32 16 48 29 50" fill="none" stroke="#F59E0B" strokeWidth="5" strokeLinecap="round" />
    <path d="M68 32 C80 32 80 48 67 50" fill="none" stroke="#F59E0B" strokeWidth="5" strokeLinecap="round" />
    {/* Trophy Cup */}
    <path d="M28 24 H68 L63 52 C61 61 55 66 48 66 C41 66 35 61 33 52 Z" fill="#FACC15" />
    <path d="M35 28 H50 L47 56 C41 56 37 50 35 28 Z" fill="#FEF08A" opacity="0.65" />
    {/* Pedestal */}
    <rect x="43" y="65" width="10" height="10" fill="#D97706" />
    <rect x="31" y="74" width="34" height="8" rx="4" fill="#92400E" />
    {/* Confetti */}
    <circle cx="20" cy="20" r="3.5" fill="#EC4899" />
    <circle cx="76" cy="20" r="3.5" fill="#4BB543" />
    <rect x="74" y="60" width="6" height="6" rx="1.5" transform="rotate(20 74 60)" fill="#8B5CF6" />
    <rect x="16" y="62" width="6" height="6" rx="1.5" transform="rotate(-15 16 62)" fill="#38BDF8" />
    <polygon points="48,32 50.5,38 57,38 52,42 54,48 48,44.5 42,48 44,42 39,38 45.5,38" fill="#FFFFFF" />
  </svg>
);

/**
 * Joyful cloud & storybook sync illustration for WordPressAuthScreen.
 */
export const CloudSyncIllustration: React.FC<IllustrationProps> = ({
  className = 'w-16 h-16',
}) => (
  <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
    <circle cx="48" cy="48" r="44" fill="#DBEAFE" />
    {/* Happy Cloud */}
    <path
      d="M28 60 H68 C75 60 80 54 80 47 C80 41 75 36 69 36 C67 26 58 20 48 20 C37 20 28 28 27 38 C21 39 17 44 17 50 C17 56 22 60 28 60 Z"
      fill="#FFFFFF"
    />
    <circle cx="41" cy="43" r="2.6" fill="#1E293B" />
    <circle cx="55" cy="43" r="2.6" fill="#1E293B" />
    <path d="M43 49 Q48 53 53 49" fill="none" stroke="#F43F5E" strokeWidth="2.5" strokeLinecap="round" />
    {/* Sync Sparkle */}
    <circle cx="48" cy="72" r="9" fill="#4BB543" />
    <path d="M44 72 L47 75 L53 69" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Playful Game Hub illustration with controller & colorful beads.
 */
export const GameHubIllustration: React.FC<IllustrationProps> = ({
  className = 'w-16 h-16',
}) => (
  <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
    <circle cx="48" cy="48" r="44" fill="#FCE7F3" />
    {/* Gamepad */}
    <path
      d="M28 38 H68 C76 38 82 48 80 60 C78 68 70 70 64 64 L58 58 H38 L32 64 C26 70 18 68 16 60 C14 48 20 38 28 38 Z"
      fill="#8B5CF6"
    />
    {/* D-pad */}
    <rect x="27" y="45" width="12" height="4" rx="2" fill="#FFFFFF" />
    <rect x="31" y="41" width="4" height="12" rx="2" fill="#FFFFFF" />
    {/* Candy Action Buttons */}
    <circle cx="62" cy="43" r="3" fill="#FACC15" />
    <circle cx="68" cy="49" r="3" fill="#4ADE80" />
    <circle cx="62" cy="55" r="3" fill="#38BDF8" />
    <circle cx="56" cy="49" r="3" fill="#FB7185" />
    {/* Floating Star */}
    <polygon points="48,14 50,20 56,20 51,24 53,30 48,26.5 43,30 45,24 40,20 46,20" fill="#F59E0B" />
  </svg>
);
