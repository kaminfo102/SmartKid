import React from 'react';
import { Star } from 'lucide-react';

interface ConfettiOrRewardAnimationProps {
  stars: number;
  reducedMotion?: boolean;
}

export const ConfettiOrRewardAnimation: React.FC<ConfettiOrRewardAnimationProps> = ({
  stars,
  reducedMotion = false,
}) => {
  return (
    <div className="flex items-center justify-center gap-3 py-2" aria-label={`${stars} ستاره`}>
      {[1, 2, 3].map((idx) => {
        const earned = idx <= stars;
        return (
          <div
            key={idx}
            className={`flex items-center justify-center rounded-2xl p-2 ${
              idx === 2 ? 'scale-110 -translate-y-1' : ''
            } ${
              !reducedMotion && earned ? 'transition-transform duration-300' : ''
            }`}
          >
            <Star
              className={`w-12 h-12 sm:w-14 sm:h-14 ${
                earned
                  ? 'text-amber-400 fill-amber-400 drop-shadow-sm'
                  : 'text-slate-300 dark:text-slate-700'
              }`}
            />
          </div>
        );
      })}
    </div>
  );
};
