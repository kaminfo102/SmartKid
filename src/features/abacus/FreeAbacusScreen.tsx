import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Eye, EyeOff, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import type { DigitDisplayMode, RodState } from '../../types/app';
import { audioEngine } from '../../lib/audioEngine';
import { formatNumber } from '../../lib/numbers';
import {
  isCapacitorNative,
  lockLandscapeOrientation,
  unlockOrientation,
} from '../../lib/nativeBridge';
import { Soroban3D } from './Soroban3D';
import { SOROBAN_THEMES } from './utils/sorobanThemes';

const TOTAL_RODS = 17;

function createEmptyRods(): RodState[] {
  return Array.from({ length: TOTAL_RODS }, () => ({
    upperActive: false,
    lowerCount: 0,
  }));
}

function computeSorobanValueString(rods: RodState[], digitMode: DigitDisplayMode): string {
  let total = BigInt(0);
  let place = BigInt(1);
  const ten = BigInt(10);

  for (let i = rods.length - 1; i >= 0; i--) {
    const rod = rods[i];
    const digit = (rod.upperActive ? 5 : 0) + rod.lowerCount;
    if (digit > 0) {
      total += BigInt(digit) * place;
    }
    place *= ten;
  }

  const raw = total.toString();
  const grouped = raw.replace(/\B(?=(\d{3})+(?!\d))/g, digitMode === 'fa' ? '٬' : ',');
  return formatNumber(grouped, digitMode);
}

interface FreeAbacusScreenProps {
  digitMode: DigitDisplayMode;
  nightMode: boolean;
  initialSoundEnabled: boolean;
  onBack: () => void;
}

export const FreeAbacusScreen: React.FC<FreeAbacusScreenProps> = ({
  digitMode,
  nightMode,
  initialSoundEnabled,
  onBack,
}) => {
  const [rods, setRods] = useState<RodState[]>(() => createEmptyRods());
  const [beadSoundEnabled, setBeadSoundEnabled] = useState<boolean>(initialSoundEnabled);
  const [showValue, setShowValue] = useState<boolean>(true);
  const [isPortraitMobileViewport, setIsPortraitMobileViewport] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return !isCapacitorNative() && window.innerHeight > window.innerWidth && window.innerWidth < 900;
  });

  useEffect(() => {
    void lockLandscapeOrientation();

    const syncViewportOrientation = () => {
      const portraitMobile =
        !isCapacitorNative() &&
        window.innerHeight > window.innerWidth &&
        window.innerWidth < 900;
      setIsPortraitMobileViewport(portraitMobile);
    };

    syncViewportOrientation();
    window.addEventListener('resize', syncViewportOrientation);
    window.addEventListener('orientationchange', syncViewportOrientation);

    return () => {
      window.removeEventListener('resize', syncViewportOrientation);
      window.removeEventListener('orientationchange', syncViewportOrientation);
      void unlockOrientation(nightMode);
    };
  }, [nightMode]);

  const handleToggleUpper = useCallback((rodIndex: number) => {
    setRods((prev) =>
      prev.map((rod, idx) =>
        idx === rodIndex ? { ...rod, upperActive: !rod.upperActive } : rod
      )
    );
  }, []);

  const handleSetLowerCount = useCallback((rodIndex: number, count: number) => {
    const safeCount = Math.max(0, Math.min(4, count));
    setRods((prev) =>
      prev.map((rod, idx) =>
        idx === rodIndex ? { ...rod, lowerCount: safeCount } : rod
      )
    );
  }, []);

  const handleReset = useCallback(() => {
    setRods(createEmptyRods());
    if (beadSoundEnabled) {
      audioEngine.play('beadClick', true);
    }
  }, [beadSoundEnabled]);

  const handleBeadSound = useCallback(() => {
    if (beadSoundEnabled) {
      audioEngine.play('beadClick', true);
    }
  }, [beadSoundEnabled]);

  const formattedValue = useMemo(
    () => computeSorobanValueString(rods, digitMode),
    [rods, digitMode]
  );

  const rotatedStyle: React.CSSProperties | undefined = isPortraitMobileViewport
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100dvh',
        height: '100vw',
        transformOrigin: 'top left',
        transform: 'translateX(100vw) rotate(90deg)',
        zIndex: 50,
      }
    : undefined;

  return (
    <div
      style={rotatedStyle}
      className={
        isPortraitMobileViewport
          ? 'flex flex-col bg-[#1b2421] text-white overflow-hidden select-none'
          : 'fixed inset-0 z-50 flex flex-col bg-[#1b2421] text-white overflow-hidden select-none'
      }
    >
      {/* Slim solid toolbar above WebGL canvas (no backdrop-blur over WebGL) */}
      <header className="shrink-0 h-13 px-2.5 sm:px-4 bg-[#141b18] border-b border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => {
              audioEngine.play('uiTap');
              onBack();
            }}
            aria-label="بازگشت به صفحه اصلی"
            className="h-9 px-2.5 sm:px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-xs font-extrabold inline-flex items-center gap-1.5 active:scale-95 transition-all shrink-0"
          >
            <ArrowRight className="w-4 h-4" />
            <span>بازگشت</span>
          </button>

          {showValue && (
            <div
              dir="ltr"
              aria-live="polite"
              className="h-9 px-3 sm:px-4 rounded-xl bg-[#24322d] border border-amber-400/35 text-amber-300 font-black text-base sm:text-lg tabular-nums inline-flex items-center justify-center shadow-inner truncate max-w-[44vw]"
            >
              {formattedValue}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowValue((prev) => !prev)}
            aria-label={showValue ? 'مخفی کردن عدد چرتکه' : 'نمایش عدد چرتکه'}
            aria-pressed={showValue}
            className={`h-9 px-2.5 sm:px-3 rounded-xl border text-xs font-extrabold inline-flex items-center gap-1.5 active:scale-95 transition-all ${
              showValue
                ? 'bg-emerald-600/90 hover:bg-emerald-600 border-emerald-400/40 text-white'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
          >
            {showValue ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span>{showValue ? 'نمایش عدد' : 'عدم نمایش عدد'}</span>
          </button>

          <button
            type="button"
            onClick={() => setBeadSoundEnabled((prev) => !prev)}
            aria-label={beadSoundEnabled ? 'قطع صدای مهره‌ها' : 'وصل صدای مهره‌ها'}
            aria-pressed={beadSoundEnabled}
            className={`h-9 px-2.5 sm:px-3 rounded-xl border text-xs font-extrabold inline-flex items-center gap-1.5 active:scale-95 transition-all ${
              beadSoundEnabled
                ? 'bg-sky-600/90 hover:bg-sky-600 border-sky-400/40 text-white'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
          >
            {beadSoundEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
            <span>{beadSoundEnabled ? 'صدا وصل' : 'صدا قطع'}</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            aria-label="صفر کردن چرتکه"
            className="h-9 px-2.5 sm:px-3 rounded-xl bg-rose-600 hover:bg-rose-500 border border-rose-400/40 text-white text-xs font-extrabold inline-flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>صفر کردن</span>
          </button>
        </div>
      </header>

      {/* Fullscreen auto-fitted 3D Soroban canvas */}
      <main className="relative flex-1 min-h-0 w-full">
        <Soroban3D
          rods={rods}
          totalRods={TOTAL_RODS}
          activeUnitIndex={TOTAL_RODS - 1}
          theme={SOROBAN_THEMES.photo_match}
          cameraPreset="front"
          colorMode={nightMode ? 'dark' : 'light'}
          digitMode={digitMode}
          showBottomDock={false}
          isCssRotated90={isPortraitMobileViewport}
          onBeadSound={handleBeadSound}
          onToggleUpper={handleToggleUpper}
          onSetLowerCount={handleSetLowerCount}
          onSelectUnitIndex={() => {}}
          onTriggerReset={handleReset}
        />
      </main>
    </div>
  );
};
