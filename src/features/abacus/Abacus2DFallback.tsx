import React, { useRef } from 'react';
import type { DigitDisplayMode, SorobanGuidedMove, SorobanState } from '../../types/app';
import { getColumnColor, getPlaceName, formatNumber } from '../../lib/numbers';
import { getColumnDigit, toggleEarthBead, toggleHeavenBead } from './sorobanEngine';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface Abacus2DFallbackProps {
  state: SorobanState;
  onChange: (next: SorobanState) => void;
  onBeadMove?: () => void;
  guidedMove?: SorobanGuidedMove | null;
  highlightColumn?: number;
  disabled?: boolean;
  scale?: 'normal' | 'large';
  digitMode?: DigitDisplayMode;
  reducedMotion?: boolean;
}

/**
 * Tactile 2D Soroban fallback (also usable manually on low-end devices).
 * Renders columns right-to-left (index 0 on right = Units) matching standard Soroban layout.
 */
export const Abacus2DFallback: React.FC<Abacus2DFallbackProps> = ({
  state,
  onChange,
  onBeadMove,
  guidedMove,
  highlightColumn,
  disabled = false,
  scale = 'normal',
  digitMode = 'fa',
  reducedMotion = false,
}) => {
  const dragStartY = useRef<number | null>(null);

  // Render columns from highest place (left) to Units index 0 (right)
  const columnsVisualOrder = state
    .map((col, idx) => ({ col, colIdx: idx }))
    .reverse();

  const handleHeavenAction = (colIdx: number) => {
    if (disabled) return;
    onChange(toggleHeavenBead(state, colIdx));
    onBeadMove?.();
  };

  const handleEarthAction = (colIdx: number, beadIdx: number) => {
    if (disabled) return;
    onChange(toggleEarthBead(state, colIdx, beadIdx));
    onBeadMove?.();
  };

  const isLarge = scale === 'large';

  return (
    <div
      dir="ltr"
      role="group"
      aria-label="چرتکه دو بعدی سوروبان"
      className={`w-full h-full flex flex-col items-center justify-center select-none px-2 py-2 ${
        isLarge ? 'scale-[1.03]' : ''
      }`}
    >
      <div className="relative w-full max-w-[420px] rounded-3xl border-[6px] border-amber-700 bg-amber-50 dark:bg-slate-800 dark:border-amber-600 shadow-lg overflow-hidden p-3">
        {/* Column headers */}
        <div
          className="grid gap-2 mb-2"
          style={{ gridTemplateColumns: `repeat(${state.length}, minmax(0, 1fr))` }}
        >
          {columnsVisualOrder.map(({ col, colIdx }) => {
            const isHighlighted = highlightColumn === colIdx;
            return (
              <div
                key={`hdr_${colIdx}`}
                className={`text-center text-xs font-bold py-1 rounded-lg ${
                  isHighlighted
                    ? 'bg-amber-200/80 text-amber-950 dark:bg-amber-500/30 dark:text-amber-100'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <div>{getPlaceName(colIdx)}</div>
                <div className="text-base font-extrabold tabular-nums text-slate-900 dark:text-white">
                  {formatNumber(getColumnDigit(col), digitMode)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Soroban Frame Interior */}
        <div
          className="relative grid gap-2 pt-2 pb-3"
          style={{ gridTemplateColumns: `repeat(${state.length}, minmax(0, 1fr))` }}
        >
          {/* Central Reckoning Beam */}
          <div
            aria-hidden="true"
            className="absolute left-0 right-0 top-[92px] h-3.5 bg-amber-800 dark:bg-amber-700 rounded-full z-10 shadow-sm"
          />

          {columnsVisualOrder.map(({ col, colIdx }) => {
            const earthColor = getColumnColor(colIdx);
            const heavenGuided =
              guidedMove?.columnIndex === colIdx && guidedMove.beadType === 'heaven';

            return (
              <div
                key={`col_${colIdx}`}
                className="relative flex flex-col items-center min-h-[270px]"
              >
                {/* Vertical Rod */}
                <div
                  aria-hidden="true"
                  className="absolute top-0 bottom-0 w-2 bg-slate-300 dark:bg-slate-600 rounded-full z-0"
                />

                {/* Heaven Section (Top Bead = 5) */}
                <div className="relative w-full h-[86px] flex flex-col items-center z-20">
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`مهره ۵ ستون ${getPlaceName(colIdx)}، ${
                      col.heavenActive ? 'فعال' : 'غیرفعال'
                    }`}
                    onClick={() => handleHeavenAction(colIdx)}
                    onPointerDown={(e) => {
                      dragStartY.current = e.clientY;
                    }}
                    onPointerUp={(e) => {
                      if (dragStartY.current !== null) {
                        const dy = e.clientY - dragStartY.current;
                        dragStartY.current = null;
                        if (Math.abs(dy) > 14) {
                          const wantActive = dy > 0;
                          if (wantActive !== col.heavenActive) {
                            handleHeavenAction(colIdx);
                          }
                          return;
                        }
                      }
                    }}
                    style={{
                      transform: col.heavenActive ? 'translateY(34px)' : 'translateY(4px)',
                    }}
                    className={`relative min-w-[60px] min-h-[44px] w-[78%] max-w-[84px] h-[38px] rounded-full bg-gradient-to-b from-orange-400 to-orange-600 border-2 border-orange-700 shadow-md flex items-center justify-center text-white font-extrabold text-sm cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 ${
                      reducedMotion ? '' : 'transition-transform duration-200 ease-out'
                    } ${
                      heavenGuided
                        ? 'ring-4 ring-amber-400 ring-offset-2 dark:ring-offset-slate-800'
                        : ''
                    }`}
                  >
                    <span>{formatNumber(5, digitMode)}</span>
                    {heavenGuided && (
                      <span
                        className={`absolute -left-3 -top-3 w-8 h-8 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-md border-2 border-white ${
                          reducedMotion ? '' : 'animate-bounce'
                        }`}
                      >
                        {guidedMove.direction === 'toward-beam' ? (
                          <ArrowDown className="w-5 h-5 stroke-[2.75]" />
                        ) : (
                          <ArrowUp className="w-5 h-5 stroke-[2.75]" />
                        )}
                      </span>
                    )}
                  </button>
                </div>

                {/* Earth Section (4 Bottom Beads = 1 each) */}
                <div className="relative w-full flex-1 flex flex-col items-center justify-start pt-5 gap-1.5 z-20">
                  {[0, 1, 2, 3].map((beadIdx) => {
                    const isActive = beadIdx < col.earthCount;
                    const isGuided =
                      guidedMove?.columnIndex === colIdx &&
                      guidedMove.beadType === 'earth' &&
                      guidedMove.beadIndex === beadIdx;

                    return (
                      <button
                        key={`e_${colIdx}_${beadIdx}`}
                        type="button"
                        disabled={disabled}
                        aria-label={`مهره ۱ شماره ${formatNumber(beadIdx + 1, digitMode)} ستون ${getPlaceName(colIdx)}، ${
                          isActive ? 'فعال' : 'غیرفعال'
                        }`}
                        onClick={() => handleEarthAction(colIdx, beadIdx)}
                        style={{
                          backgroundColor: earthColor,
                          transform: isActive ? 'translateY(-10px)' : 'translateY(22px)',
                          opacity: isActive ? 1 : 0.88,
                        }}
                        className={`relative min-w-[60px] min-h-[38px] w-[78%] max-w-[84px] h-[36px] rounded-full border-2 border-black/20 shadow-md flex items-center justify-center text-white font-bold text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 ${
                          reducedMotion ? '' : 'transition-transform duration-200 ease-out'
                        } ${
                          isGuided
                            ? 'ring-4 ring-amber-400 ring-offset-2 dark:ring-offset-slate-800'
                            : ''
                        }`}
                      >
                        <span className="w-6 h-1.5 rounded-full bg-white/35" />
                        {isGuided && (
                          <span
                            className={`absolute -left-3 -top-3 w-8 h-8 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-md border-2 border-white ${
                              reducedMotion ? '' : 'animate-bounce'
                            }`}
                          >
                            {guidedMove.direction === 'toward-beam' ? (
                              <ArrowUp className="w-5 h-5 stroke-[2.75]" />
                            ) : (
                              <ArrowDown className="w-5 h-5 stroke-[2.75]" />
                            )}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
