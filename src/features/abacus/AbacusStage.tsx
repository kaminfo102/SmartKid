import React, { Suspense, useState } from 'react';
import { RotateCcw, ZoomIn, ZoomOut, Box, Layers } from 'lucide-react';
import type { DigitDisplayMode, SorobanGuidedMove, SorobanState } from '../../types/app';
import { formatNumber, getColumnColor, getPlaceName } from '../../lib/numbers';
import { getColumnDigit, resetSoroban, sorobanStateToNumber } from './sorobanEngine';
import { Abacus2DFallback } from './Abacus2DFallback';

const Abacus3DLazy = React.lazy(() =>
  import('./Abacus3D').then((m) => ({ default: m.Abacus3D }))
);

interface AbacusStageProps {
  state: SorobanState;
  onChange: (next: SorobanState) => void;
  onBeadMove?: () => void;
  onReset?: () => void;
  guidedMove?: SorobanGuidedMove | null;
  highlightColumn?: number;
  disabled?: boolean;
  scale: 'normal' | 'large';
  onToggleScale: () => void;
  prefer2D: boolean;
  onToggle2D: () => void;
  digitMode: DigitDisplayMode;
  reducedMotion: boolean;
  nightMode: boolean;
  hideValue?: boolean;
  compactHeader?: boolean;
}

export const AbacusStage: React.FC<AbacusStageProps> = ({
  state,
  onChange,
  onBeadMove,
  onReset,
  guidedMove,
  highlightColumn,
  disabled = false,
  scale,
  onToggleScale,
  prefer2D,
  onToggle2D,
  digitMode,
  reducedMotion,
  nightMode,
  hideValue = false,
  compactHeader = false,
}) => {
  const [webglFailed, setWebglFailed] = useState(false);

  const totalValue = sorobanStateToNumber(state);
  const use2D = prefer2D || webglFailed;

  const columnsVisualOrder = state
    .map((col, idx) => ({ col, colIdx: idx }))
    .reverse();

  const handleResetClick = () => {
    if (disabled) return;
    const empty = resetSoroban(state.length);
    onChange(empty);
    onReset?.();
  };

  return (
    <div className="flex flex-col w-full h-full flex-1 min-h-0">
      {/* Top readout + quick abacus controls */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
        {/* Live numeric readout & place breakdown */}
        <div className="flex items-center gap-3 min-w-0">
          {!hideValue ? (
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                عدد چرتکه:
              </span>
              <span
                data-testid="abacus-value"
                className="text-2xl sm:text-3xl font-extrabold tabular-nums text-blue-600 dark:text-blue-400"
              >
                {formatNumber(totalValue, digitMode)}
              </span>
            </div>
          ) : (
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              عدد روی چرتکه را بخوان!
            </span>
          )}

          {!compactHeader && !hideValue && state.length > 1 && (
            <div
              dir="ltr"
              className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"
            >
              {columnsVisualOrder.map(({ col, colIdx }) => (
                <span key={`col_val_${colIdx}`} className="flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: getColumnColor(colIdx) }}
                  />
                  <span>{getPlaceName(colIdx)}:</span>
                  <strong className="tabular-nums text-slate-800 dark:text-slate-200">
                    {formatNumber(getColumnDigit(col), digitMode)}
                  </strong>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Utility controls: Zoom, 2D/3D fallback toggle, Big Reset */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onToggleScale}
            aria-label={scale === 'large' ? 'کوچک کردن نمای چرتکه' : 'بزرگ‌نمایی چرتکه'}
            className="min-h-[44px] min-w-[44px] px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors"
          >
            {scale === 'large' ? (
              <ZoomOut className="w-5 h-5" />
            ) : (
              <ZoomIn className="w-5 h-5" />
            )}
          </button>

          {!webglFailed && (
            <button
              type="button"
              onClick={onToggle2D}
              aria-label={use2D ? 'نمایش چرتکه سه‌بعدی' : 'نمایش چرتکه دوبعدی'}
              title={use2D ? 'حالت سه‌بعدی' : 'حالت دوبعدی'}
              className="min-h-[44px] min-w-[44px] px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1 text-xs font-semibold transition-colors"
            >
              {use2D ? <Box className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
              <span className="hidden xs:inline">{use2D ? 'سه‌بعدی' : 'دوبعدی'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleResetClick}
            disabled={disabled}
            aria-label="صفر کردن چرتکه"
            className="min-h-[44px] px-3 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold text-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            <span>صفر کردن</span>
          </button>
        </div>
      </div>

      {/* Guided instruction banner when a hint/step arrow is active */}
      {guidedMove && (
        <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100 text-xs sm:text-sm font-semibold text-center">
          {guidedMove.hintText}
        </div>
      )}

      {/* Main Dominant Abacus Viewport */}
      <div className="relative flex-1 min-h-[300px] w-full bg-gradient-to-b from-[#EEF4FB] to-[#E2ECF8] dark:from-slate-900 dark:to-slate-950 overflow-hidden">
        {webglFailed && (
          <div className="px-3 py-1 bg-sky-100 dark:bg-sky-950 text-sky-900 dark:text-sky-100 text-xs text-center">
            حالت دو‌بعدی روان برای دستگاه شما فعال شد.
          </div>
        )}

        {use2D ? (
          <Abacus2DFallback
            state={state}
            onChange={onChange}
            onBeadMove={onBeadMove}
            guidedMove={guidedMove}
            highlightColumn={highlightColumn}
            disabled={disabled}
            scale={scale}
            digitMode={digitMode}
            reducedMotion={reducedMotion}
          />
        ) : (
          <Suspense
            fallback={
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-600 dark:text-slate-300">
                <div className="w-10 h-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                <span className="text-sm font-medium">در حال آماده‌سازی چرتکه سه‌بعدی...</span>
              </div>
            }
          >
            <Abacus3DLazy
              state={state}
              onChange={onChange}
              onBeadMove={onBeadMove}
              guidedMove={guidedMove}
              highlightColumn={highlightColumn}
              disabled={disabled}
              scale={scale}
              reducedMotion={reducedMotion}
              nightMode={nightMode}
              onWebGLUnsupported={() => setWebglFailed(true)}
            />
          </Suspense>
        )}

        {/* Column place labels anchored at bottom of 3D stage */}
        {!use2D && (
          <div
            dir="ltr"
            aria-hidden="true"
            className="pointer-events-none absolute bottom-2 left-0 right-0 flex justify-center gap-6 px-4"
          >
            {columnsVisualOrder.map(({ colIdx }) => (
              <div
                key={`lbl_${colIdx}`}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-white/85 dark:bg-slate-900/85 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: getColumnColor(colIdx) }}
                />
                <span>{getPlaceName(colIdx)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
