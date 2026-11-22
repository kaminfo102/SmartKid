import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import type { DigitDisplayMode } from '../types/app';
import { formatNumber } from '../lib/numbers';

interface SaleCountdownProps {
  saleEndTimestamp?: number | null;
  digitMode?: DigitDisplayMode;
  compact?: boolean;
}

export const SaleCountdown: React.FC<SaleCountdownProps> = ({
  saleEndTimestamp,
  digitMode = 'fa',
  compact = false,
}) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!saleEndTimestamp || saleEndTimestamp <= Date.now()) return;
    const id = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(id);
  }, [saleEndTimestamp]);

  if (!saleEndTimestamp || saleEndTimestamp <= now) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-rose-700 dark:text-rose-300">
        <Clock className="w-3 h-3 shrink-0" />
        <span>تخفیف ویژه — زمان محدود</span>
      </span>
    );
  }

  const diffMs = Math.max(0, saleEndTimestamp - now);
  const totalHours = Math.floor(diffMs / 3600000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const mins = Math.floor((diffMs % 3600000) / 60000);

  const label =
    days > 0
      ? `${formatNumber(days, digitMode)} روز و ${formatNumber(hours, digitMode)} ساعت`
      : hours > 0
      ? `${formatNumber(hours, digitMode)} ساعت و ${formatNumber(mins, digitMode)} دقیقه`
      : `${formatNumber(Math.max(1, mins), digitMode)} دقیقه باقی‌مانده`;

  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-rose-700 dark:text-rose-300">
      <Clock className="w-3 h-3 shrink-0" />
      <span>{compact ? label : `زمان محدود تخفیف: ${label}`}</span>
    </span>
  );
};
