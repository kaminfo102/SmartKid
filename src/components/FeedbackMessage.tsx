import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Sparkles, HelpCircle } from 'lucide-react';
import { KiaAvatar } from './KiaAvatar';

interface FeedbackMessageProps {
  type: 'success' | 'encourage' | 'info';
  title: string;
  subtitle?: string;
  reducedMotion?: boolean;
}

/**
 * Kid-friendly feedback banner starring Kia the Bird!
 * - success -> Kia happy/cheering icon
 * - encourage (incorrect answer) -> Kia sad & encouraging "Try again!" icon
 * - info -> Kia teaching icon
 */
export const FeedbackMessage: React.FC<FeedbackMessageProps> = ({
  type,
  title,
  subtitle,
  reducedMotion = false,
}) => {
  const styles =
    type === 'success'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-100'
      : type === 'encourage'
      ? 'bg-amber-50 border-amber-200 text-amber-950 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-100'
      : 'bg-sky-50 border-sky-200 text-sky-900 dark:bg-sky-950/60 dark:border-sky-800 dark:text-sky-100';

  const kiaMood =
    type === 'success' ? 'happy' : type === 'encourage' ? 'sad' : 'teaching';

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={reducedMotion ? false : { opacity: 0, y: 10, scale: 0.97 }}
      animate={reducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 360, damping: 24 }}
      className={`w-full rounded-2xl border px-3 py-2 flex items-center gap-3 ${styles}`}
    >
      <div className="shrink-0">
        <KiaAvatar
          mood={kiaMood}
          className="w-12 h-12 sm:w-14 sm:h-14"
          reducedMotion={reducedMotion}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : type === 'encourage' ? (
            <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
          )}
          <p className="font-extrabold text-sm sm:text-base">{title}</p>
        </div>
        {subtitle && <p className="text-xs sm:text-sm opacity-90 mt-0.5">{subtitle}</p>}
      </div>
    </motion.div>
  );
};
