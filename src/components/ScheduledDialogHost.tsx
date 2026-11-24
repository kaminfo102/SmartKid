import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Clock, ExternalLink, Sparkles, X } from 'lucide-react';
import type { DigitDisplayMode, ScheduledDialog, ScreenId } from '../types/app';
import { formatNumber } from '../lib/numbers';
import {
  trackMarketingEvent,
  validateSafeHttpUrl,
  validateSafeImageSrc,
} from '../lib/wordpressApi';

const DIALOG_FREQ_STORAGE_KEY = 'kn_dialog_freq_v1';
const DIALOG_SESSION_STORAGE_KEY = 'kn_dialog_sess_v1';

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

interface DialogFreqEntry {
  count: number;
  lastShownAt: number;
  lastDateKey: string;
}

type DialogFreqMap = Record<string, DialogFreqEntry>;

const memoryFreqMap: DialogFreqMap = {};
const memorySessionShown = new Set<number>();

function getLocalDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function readFreqMap(): DialogFreqMap {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(DIALOG_FREQ_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === 'object') {
          return parsed as DialogFreqMap;
        }
      }
    }
  } catch {
    // ignore storage errors
  }
  return { ...memoryFreqMap };
}

function writeFreqMap(map: DialogFreqMap): void {
  Object.assign(memoryFreqMap, map);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(DIALOG_FREQ_STORAGE_KEY, JSON.stringify(map));
    }
  } catch {
    // ignore storage errors
  }
}

function hasSessionShown(dialogId: number): boolean {
  if (memorySessionShown.has(dialogId)) return true;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const raw = window.sessionStorage.getItem(DIALOG_SESSION_STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as unknown;
        if (Array.isArray(arr) && arr.includes(dialogId)) {
          return true;
        }
      }
    }
  } catch {
    // ignore storage errors
  }
  return false;
}

function markSessionShown(dialogId: number): void {
  memorySessionShown.add(dialogId);
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const raw = window.sessionStorage.getItem(DIALOG_SESSION_STORAGE_KEY);
      const arr: number[] = raw ? ((JSON.parse(raw) as number[]) || []) : [];
      if (!arr.includes(dialogId)) {
        arr.push(dialogId);
        window.sessionStorage.setItem(DIALOG_SESSION_STORAGE_KEY, JSON.stringify(arr));
      }
    }
  } catch {
    // ignore storage errors
  }
}

function canDisplayDialogNow(dialog: ScheduledDialog, freqMap: DialogFreqMap): boolean {
  const entry = freqMap[String(dialog.id)];
  const count = entry?.count ?? 0;

  if (dialog.maxImpressionsUser > 0 && count >= dialog.maxImpressionsUser) {
    return false;
  }

  switch (dialog.frequencyMode) {
    case 'once_ever':
      return count === 0;
    case 'once_per_session':
      return !hasSessionShown(dialog.id);
    case 'once_per_day':
      return !entry || entry.lastDateKey !== getLocalDateKey();
    case 'every_n_hours': {
      if (!entry) return true;
      const hours = Math.max(1, dialog.frequencyHours || 24);
      return Date.now() - entry.lastShownAt >= hours * 3600 * 1000;
    }
    case 'always':
      return !hasSessionShown(dialog.id);
    default:
      return !hasSessionShown(dialog.id);
  }
}

function recordDialogShownLocally(dialogId: number): void {
  markSessionShown(dialogId);
  const map = readFreqMap();
  const prev = map[String(dialogId)];
  map[String(dialogId)] = {
    count: (prev?.count ?? 0) + 1,
    lastShownAt: Date.now(),
    lastDateKey: getLocalDateKey(),
  };
  writeFreqMap(map);
}

interface ScheduledDialogHostProps {
  dialogs: ScheduledDialog[];
  screen: ScreenId;
  wpUrl: string;
  digitMode: DigitDisplayMode;
  reducedMotion: boolean;
  onNavigateScreen: (screen: ScreenId) => void;
  onOpenTermCheckout: (termDbId: number) => void;
}

export const ScheduledDialogHost: React.FC<ScheduledDialogHostProps> = ({
  dialogs,
  screen,
  wpUrl,
  digitMode,
  reducedMotion,
  onNavigateScreen,
  onOpenTermCheckout,
}) => {
  const [activeDialog, setActiveDialog] = useState<ScheduledDialog | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const trackedImpressionIdRef = useRef<number | null>(null);

  const candidateDialog = useMemo(() => {
    if (dialogs.length === 0) return null;
    const freqMap = readFreqMap();
    const sorted = [...dialogs].sort((a, b) => a.priority - b.priority);
    for (const d of sorted) {
      const targets = d.targetScreens && d.targetScreens.length > 0 ? d.targetScreens : ['all'];
      const matchesScreen = targets.includes('all') || targets.includes(screen);
      if (!matchesScreen) continue;
      if (canDisplayDialogNow(d, freqMap)) {
        return d;
      }
    }
    return null;
  }, [dialogs, screen]);

  useEffect(() => {
    if (activeDialog || !candidateDialog) return;
    const delayMs = Math.max(0, candidateDialog.delaySeconds || 0) * 1000;
    const timer = window.setTimeout(() => {
      recordDialogShownLocally(candidateDialog.id);
      trackedImpressionIdRef.current = candidateDialog.id;
      setActiveDialog(candidateDialog);
      setSecondsLeft(Math.max(0, candidateDialog.autoCloseSeconds || 0));
      void trackMarketingEvent(wpUrl, 'dialog_impression', candidateDialog.id, screen);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [activeDialog, candidateDialog, wpUrl, screen]);

  const closeDialog = useCallback(
    (reason: 'manual' | 'autoclose' | 'action') => {
      if (!activeDialog) return;
      const closedId = activeDialog.id;
      setActiveDialog(null);
      setSecondsLeft(0);
      if (reason === 'manual') {
        void trackMarketingEvent(wpUrl, 'dialog_close', closedId, screen);
      } else if (reason === 'autoclose') {
        void trackMarketingEvent(wpUrl, 'dialog_autoclose', closedId, screen);
      } else {
        void trackMarketingEvent(wpUrl, 'dialog_click', closedId, screen);
      }
    },
    [activeDialog, wpUrl, screen]
  );

  useEffect(() => {
    if (!activeDialog || activeDialog.autoCloseSeconds <= 0) return;
    if (secondsLeft <= 0) {
      closeDialog('autoclose');
      return;
    }
    const timer = window.setTimeout(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [activeDialog, secondsLeft, closeDialog]);

  if (!activeDialog) {
    return null;
  }

  const safeImage = validateSafeImageSrc(activeDialog.imageUrl);
  const safeExternalUrl =
    activeDialog.actionType === 'external_url'
      ? validateSafeHttpUrl(activeDialog.actionTarget)
      : '';

  const sizeClass =
    activeDialog.dialogSize === 'sm'
      ? 'max-w-sm'
      : activeDialog.dialogSize === 'lg'
        ? 'max-w-2xl'
        : activeDialog.dialogSize === 'fullscreen'
          ? 'max-w-4xl min-h-[85vh]'
          : 'max-w-md';

  const positionClass =
    activeDialog.position === 'bottom_sheet'
      ? 'items-end sm:items-center pb-0 sm:p-4'
      : 'items-center p-4';

  const sheetRoundedClass =
    activeDialog.position === 'bottom_sheet'
      ? 'rounded-t-3xl sm:rounded-3xl'
      : 'rounded-3xl';

  const themeCardClass = (() => {
    switch (activeDialog.themeStyle) {
      case 'celebration':
        return 'bg-gradient-to-b from-[#FFF4D6] via-[#FFFBF0] to-white dark:from-slate-900 dark:to-slate-900 border-[#F59E0B] text-slate-900 dark:text-white';
      case 'urgent':
        return 'bg-gradient-to-b from-[#FFF1F2] via-white to-white dark:from-slate-900 dark:to-slate-900 border-rose-400 text-slate-900 dark:text-white';
      case 'dark':
        return 'bg-slate-900 border-slate-700 text-white';
      case 'glass':
        return 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-white/70 dark:border-slate-700 text-slate-900 dark:text-white';
      case 'brand':
      default:
        return 'bg-[#FFF9F2] dark:bg-slate-900 border-white dark:border-slate-700 text-slate-900 dark:text-white';
    }
  })();

  const handlePrimaryAction = () => {
    const type = activeDialog.actionType;
    const target = (activeDialog.actionTarget || '').trim();
    closeDialog('action');

    if (type === 'app_screen') {
      const targetScreen = target as ScreenId;
      if (VALID_TARGET_SCREENS.has(targetScreen)) {
        onNavigateScreen(targetScreen);
      }
    } else if (type === 'term_checkout') {
      const termId = Number(target) || 0;
      onOpenTermCheckout(termId);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="kn-scheduled-dialog-title"
      onClick={() => {
        if (activeDialog.closeOnBackdrop && activeDialog.allowUserClose) {
          closeDialog('manual');
        }
      }}
      className={`fixed inset-0 z-50 flex justify-center bg-slate-950/60 ${
        activeDialog.overlayBlur ? 'backdrop-blur-sm' : ''
      } ${positionClass}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${sizeClass} ${sheetRoundedClass} ${themeCardClass} border-4 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
          reducedMotion ? '' : 'transition-all duration-200'
        }`}
      >
        {safeImage && (
          <div className="relative w-full max-h-60 bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
            <img
              src={safeImage}
              alt={activeDialog.title || 'اعلان ویژه'}
              referrerPolicy="no-referrer"
              className="w-full h-full max-h-60 object-cover"
            />
            {activeDialog.allowUserClose && (
              <button
                type="button"
                onClick={() => closeDialog('manual')}
                aria-label="بستن پنجره"
                className="absolute top-3 left-3 min-h-[40px] min-w-[40px] rounded-2xl bg-white/95 dark:bg-slate-800 text-slate-800 dark:text-white flex items-center justify-center shadow-md hover:bg-white"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {activeDialog.badgeText && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-xs font-extrabold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{activeDialog.badgeText}</span>
                </span>
              )}
              {activeDialog.autoCloseSeconds > 0 && activeDialog.showCountdown && secondsLeft > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-extrabold tabular-nums">
                  <Clock className="w-3.5 h-3.5" />
                  <span>بسته شدن تا {formatNumber(secondsLeft, digitMode)} ثانیه</span>
                </span>
              )}
            </div>

            {!safeImage && activeDialog.allowUserClose && (
              <button
                type="button"
                onClick={() => closeDialog('manual')}
                aria-label="بستن پنجره"
                className="min-h-[38px] min-w-[38px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="space-y-2 text-right">
            {activeDialog.title && (
              <h2
                id="kn-scheduled-dialog-title"
                className="text-lg sm:text-xl font-extrabold leading-snug"
              >
                {activeDialog.title}
              </h2>
            )}
            {activeDialog.body && (
              <p
                className={`text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                  activeDialog.themeStyle === 'dark'
                    ? 'text-slate-300'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {activeDialog.body}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
            {activeDialog.ctaText && (
              safeExternalUrl ? (
                <a
                  href={safeExternalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => closeDialog('action')}
                  className="flex-1 min-h-[48px] px-5 rounded-2xl bg-[#4BB543] hover:bg-[#41A23A] border-b-4 border-[#2E8228] text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 transition-all"
                >
                  <span>{activeDialog.ctaText}</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  className="flex-1 min-h-[48px] px-5 rounded-2xl bg-[#4BB543] hover:bg-[#41A23A] border-b-4 border-[#2E8228] text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 transition-all"
                >
                  <span>{activeDialog.ctaText}</span>
                </button>
              )
            )}

            {activeDialog.allowUserClose && activeDialog.secondaryText && (
              <button
                type="button"
                onClick={() => closeDialog('manual')}
                className="min-h-[48px] px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs sm:text-sm"
              >
                {activeDialog.secondaryText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
