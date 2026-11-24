import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Palette,
  Check,
} from 'lucide-react';
import type {
  CameraPreset,
  ColorMode,
  DigitDisplayMode,
  RodState,
  SorobanTheme,
  SorobanThemeId,
} from '../../types/app';
import { SOROBAN_THEMES } from './utils/sorobanThemes';
import { formatNumber } from '../../lib/numbers';
import { SorobanSceneController } from './three/SorobanSceneController';

export interface CameraControlsHandle {
  panBy: (deltaX: number) => void;
  panToRod: (rodIndex: number) => void;
  zoomBy: (factor: number) => void;
  resetView: () => void;
}

interface Soroban3DProps {
  rods: RodState[];
  totalRods: number;
  activeUnitIndex: number;
  theme: SorobanTheme;
  currentThemeId?: SorobanThemeId;
  onSetTheme?: (t: SorobanThemeId) => void;
  cameraPreset: CameraPreset;
  highlightRodIndex?: number;
  showHalo?: boolean;
  colorMode?: ColorMode;
  digitMode?: DigitDisplayMode;
  showBottomDock?: boolean;
  isCssRotated90?: boolean;
  onBeadSound?: () => void;
  onToggleUpper: (rodIndex: number) => void;
  onSetLowerCount: (rodIndex: number, count: number) => void;
  onSelectUnitIndex: (index: number) => void;
  onTriggerReset: () => void;
}

export const Soroban3D: React.FC<Soroban3DProps> = ({
  rods,
  totalRods,
  activeUnitIndex,
  theme,
  currentThemeId = 'photo_match',
  onSetTheme,
  cameraPreset,
  showHalo = false,
  colorMode = 'dark',
  digitMode = 'fa',
  showBottomDock = false,
  isCssRotated90 = false,
  onBeadSound,
  onToggleUpper,
  onSetLowerCount,
  onSelectUnitIndex,
  onTriggerReset,
}) => {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<SorobanSceneController | null>(null);

  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState<boolean>(false);
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);

  const isDark = colorMode === 'dark';
  const isRtl = true;

  // Keep latest callbacks in ref so WebGL canvas is never torn down on React re-renders
  const callbacksRef = useRef({
    onToggleUpper,
    onSetLowerCount,
    onSelectUnitIndex,
    onTriggerReset,
    onBeadSound,
  });
  callbacksRef.current = {
    onToggleUpper,
    onSetLowerCount,
    onSelectUnitIndex,
    onTriggerReset,
    onBeadSound,
  };

  // Mount WebGL canvas once inside isolated container
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const controller = new SorobanSceneController(
      container,
      {
        rods,
        totalRods,
        activeUnitIndex,
        theme,
        colorMode,
        showHalo,
        cameraPreset,
        isCssRotated90,
      },
      {
        onToggleUpper: (idx) => callbacksRef.current.onToggleUpper(idx),
        onSetLowerCount: (idx, cnt) => callbacksRef.current.onSetLowerCount(idx, cnt),
        onSelectUnitIndex: (idx) => callbacksRef.current.onSelectUnitIndex(idx),
        onTriggerReset: () => callbacksRef.current.onTriggerReset(),
        onBeadSound: () => callbacksRef.current.onBeadSound?.(),
      }
    );

    controllerRef.current = controller;

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalRods]);

  // Forward reactive props cleanly to the Three.js scene controller
  useEffect(() => {
    controllerRef.current?.applyOptions({
      rods,
      totalRods,
      activeUnitIndex,
      theme,
      colorMode,
      showHalo,
      cameraPreset,
      isCssRotated90,
    });
  }, [rods, totalRods, activeUnitIndex, theme, colorMode, showHalo, cameraPreset, isCssRotated90]);

  const handlePanLeft = () => controllerRef.current?.panBy(-1.6);
  const handlePanRight = () => controllerRef.current?.panBy(1.6);
  const handleZoomIn = () => controllerRef.current?.zoomBy(1.16);
  const handleZoomOut = () => controllerRef.current?.zoomBy(0.86);
  const handleFitView = () => {
    controllerRef.current?.resetView();
    onTriggerReset();
  };

  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none touch-none transition-colors duration-300 ${
        isDark ? 'bg-[#1a2220]' : 'bg-[#35443f]'
      }`}
    >
      {/* Isolated WebGL mount container */}
      <div
        ref={canvasMountRef}
        className="w-full h-full touch-none"
        aria-label="چرتکه سه بعدی تعاملی"
      />

      {showBottomDock && (
        <div
          className={`pointer-events-none absolute inset-x-0 z-20 flex flex-col items-center justify-center transition-all duration-300 ${
            isDockCollapsed ? 'bottom-1.5' : 'bottom-2.5 sm:bottom-3.5 px-2'
          }`}
        >
          <div className="pointer-events-auto relative flex flex-col items-center">
            {onSetTheme && isThemeMenuOpen && !isDockCollapsed && (
              <div
                className={`mb-2 w-60 rounded-2xl p-2 shadow-2xl border transition-all ${
                  isDark
                    ? 'bg-slate-900 border-slate-700/80 text-slate-100'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div className="text-[11px] font-bold px-2.5 py-1.5 text-slate-400">
                  ظاهر چرتکه
                </div>
                <div className="flex flex-col gap-1">
                  {Object.values(SOROBAN_THEMES).map((themeItem) => {
                    const isSelected = currentThemeId === themeItem.id;
                    return (
                      <button
                        key={themeItem.id}
                        type="button"
                        onClick={() => {
                          onSetTheme(themeItem.id);
                          setIsThemeMenuOpen(false);
                        }}
                        className={`flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-xs font-bold transition-all ${
                          isSelected
                            ? isDark
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-amber-500/15 text-amber-800 border border-amber-500/30'
                            : isDark
                              ? 'hover:bg-slate-800 text-slate-300'
                              : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                            style={{ background: themeItem.frameColor }}
                          />
                          <span>{themeItem.name}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setIsDockCollapsed((v) => !v);
                setIsThemeMenuOpen(false);
              }}
              className={`flex items-center justify-center gap-1 px-3 py-0.5 mb-1 rounded-full border shadow-sm transition-all text-[10px] font-bold ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                  : 'bg-white border-slate-300 text-slate-700 hover:text-slate-900'
              }`}
            >
              {isDockCollapsed ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  <span>کنترل‌ها</span>
                </>
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {!isDockCollapsed && (
              <div
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-full border shadow-xl transition-all max-w-[96vw] overflow-x-auto ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-100'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <button
                  type="button"
                  onClick={handlePanLeft}
                  className="p-2 rounded-full hover:bg-amber-500/15 active:scale-95 transition-all"
                  aria-label="حرکت به چپ"
                >
                  {isRtl ? (
                    <ChevronRight className="w-4 h-4" />
                  ) : (
                    <ChevronLeft className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handlePanRight}
                  className="p-2 rounded-full hover:bg-amber-500/15 active:scale-95 transition-all"
                  aria-label="حرکت به راست"
                >
                  {isRtl ? (
                    <ChevronLeft className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-2 rounded-full hover:bg-amber-500/15 active:scale-95 transition-all"
                  aria-label="کوچک‌نمایی"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-2 rounded-full hover:bg-amber-500/15 active:scale-95 transition-all"
                  aria-label="بزرگ‌نمایی"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleFitView}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full hover:bg-rose-500/15 active:scale-95 transition-all text-xs font-bold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>تنظیم و صفر ({formatNumber(totalRods, digitMode)})</span>
                </button>
                {onSetTheme && (
                  <button
                    type="button"
                    onClick={() => setIsThemeMenuOpen((v) => !v)}
                    className="p-2 rounded-full hover:bg-amber-500/15 active:scale-95 transition-all"
                    aria-label="انتخاب ظاهر"
                  >
                    <Palette className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
