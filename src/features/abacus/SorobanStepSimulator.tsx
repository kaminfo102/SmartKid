import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronRight, RotateCcw } from 'lucide-react';
import type {
  AppSettings,
  SorobanMoveStep,
  SorobanState,
} from '../../types/app';
import { numberToSorobanState, planSorobanSteps } from './sorobanEngine';
import { AbacusStage } from './AbacusStage';
import { KiaTutorialGuide } from './KiaTutorialGuide';
import { audioEngine } from '../../lib/audioEngine';
import { formatNumber } from '../../lib/numbers';

export interface ComplexProblemPreset {
  id: string;
  label: string;
  category: string;
  startValue: number;
  targetValue: number;
  columns: number;
}

export const COMPLEX_PROBLEM_PRESETS: ComplexProblemPreset[] = [
  {
    id: 'comp5-add',
    label: '۳ + ۴ = ۷',
    category: 'مکمل ۵',
    startValue: 3,
    targetValue: 7,
    columns: 2,
  },
  {
    id: 'comp5-sub',
    label: '۷ − ۴ = ۳',
    category: 'مکمل ۵ تفریق',
    startValue: 7,
    targetValue: 3,
    columns: 2,
  },
  {
    id: 'comp10-add',
    label: '۶ + ۷ = ۱۳',
    category: 'مکمل ۱۰',
    startValue: 6,
    targetValue: 13,
    columns: 2,
  },
  {
    id: 'comp10-sub',
    label: '۱۳ − ۶ = ۷',
    category: 'مکمل ۱۰ تفریق',
    startValue: 13,
    targetValue: 7,
    columns: 2,
  },
  {
    id: 'multi-carry',
    label: '۲۸ + ۳۷ = ۶۵',
    category: 'انتقال دو رقمی',
    startValue: 28,
    targetValue: 65,
    columns: 2,
  },
  {
    id: 'three-digit',
    label: '۱۲۵ + ۴۸ = ۱۷۳',
    category: 'مسئله سه‌رقمی',
    startValue: 125,
    targetValue: 173,
    columns: 3,
  },
];

interface SorobanStepSimulatorProps {
  initialStartValue?: number;
  initialTargetValue?: number;
  initialColumns?: number;
  title?: string;
  allowProblemPicker?: boolean;
  autoPlay?: boolean;
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onClose?: () => void;
}

export const SorobanStepSimulator: React.FC<SorobanStepSimulatorProps> = ({
  initialStartValue = 6,
  initialTargetValue = 13,
  initialColumns = 2,
  title = 'شبیه‌ساز حل گام‌به‌گام کیا',
  allowProblemPicker = true,
  autoPlay = false,
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const [startValue, setStartValue] = useState(initialStartValue);
  const [targetValue, setTargetValue] = useState(initialTargetValue);
  const [columns, setColumns] = useState(initialColumns);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    COMPLEX_PROBLEM_PRESETS.find(
      (p) => p.startValue === initialStartValue && p.targetValue === initialTargetValue
    )?.id ?? 'custom'
  );

  const steps = useMemo<SorobanMoveStep[]>(
    () => planSorobanSteps(startValue, targetValue, columns),
    [startValue, targetValue, columns]
  );

  // currentStepIndex = next step to perform (0..steps.length).
  // When currentStepIndex === 0, abacus displays initial startValue.
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  useEffect(() => {
    setCurrentStepIndex(0);
  }, [startValue, targetValue, columns]);

  const displayState = useMemo<SorobanState>(() => {
    if (currentStepIndex <= 0 || steps.length === 0) {
      return numberToSorobanState(startValue, columns);
    }
    const lastCompleted = Math.min(currentStepIndex - 1, steps.length - 1);
    return steps[lastCompleted].stateAfter;
  }, [currentStepIndex, steps, startValue, columns]);

  const activeStep: SorobanMoveStep | null =
    currentStepIndex >= 0 && currentStepIndex < steps.length
      ? steps[currentStepIndex]
      : null;

  const handleStepComplete = (completedIdx: number) => {
    setCurrentStepIndex((prev) =>
      Math.min(steps.length, Math.max(prev, completedIdx + 1))
    );
  };

  const handleSelectPreset = (preset: ComplexProblemPreset) => {
    audioEngine.play('uiTap');
    setSelectedPresetId(preset.id);
    setStartValue(preset.startValue);
    setTargetValue(preset.targetValue);
    setColumns(preset.columns);
    setCurrentStepIndex(0);
  };

  const handleResetReplay = () => {
    audioEngine.play('uiTap');
    setCurrentStepIndex(0);
  };

  const handleStepBack = () => {
    if (currentStepIndex <= 0) return;
    audioEngine.play('uiTap');
    setCurrentStepIndex((i) => Math.max(0, i - 1));
  };

  const delta = targetValue - startValue;
  const problemEquation = `${formatNumber(startValue, settings.digitMode)} ${
    delta >= 0 ? '+' : '−'
  } ${formatNumber(Math.abs(delta), settings.digitMode)} = ${formatNumber(
    targetValue,
    settings.digitMode
  )}`;

  return (
    <div className="h-[100dvh] flex flex-col bg-[#F7F9FC] dark:bg-slate-950 overflow-hidden">
      {/* Compact Header */}
      <header className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 h-14 flex items-center justify-between gap-2">
        {onClose ? (
          <button
            type="button"
            onClick={() => {
              audioEngine.stopSpeech();
              onClose();
            }}
            aria-label="بازگشت"
            className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-11" />
        )}

        <div className="text-center min-w-0">
          <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
            {title}
          </h1>
          <div className="text-xs font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
            {problemEquation}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleStepBack}
            disabled={currentStepIndex <= 0}
            aria-label="گام قبلی"
            className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center disabled:opacity-40"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleResetReplay}
            aria-label="شروع دوباره مراحل"
            className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Preset Complex Problems Strip */}
      {allowProblemPicker && (
        <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 py-2 overflow-x-auto">
          <div className="max-w-4xl mx-auto flex items-center gap-2">
            {COMPLEX_PROBLEM_PRESETS.map((preset) => {
              const active = selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`min-h-[40px] px-3 py-1.5 rounded-xl border text-right shrink-0 transition-colors ${
                    active
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-[10px] opacity-80">{preset.category}</div>
                  <div className="text-xs font-extrabold tabular-nums">
                    {formatNumber(preset.label, settings.digitMode)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* KiaTutorialGuide wrapping AbacusStage with absolute arrow/bead overlay */}
      <div className="flex-1 min-h-0 flex flex-col p-2 sm:p-3 max-w-4xl w-full mx-auto">
        <KiaTutorialGuide
          steps={steps}
          currentStepIndex={currentStepIndex}
          onStepComplete={handleStepComplete}
          onSelectStep={(idx) => setCurrentStepIndex(idx)}
          columns={columns}
          digitMode={settings.digitMode}
          reducedMotion={settings.reducedMotion}
          autoPlay={autoPlay}
        >
          <AbacusStage
            state={displayState}
            onChange={() => {}}
            guidedMove={activeStep?.move ?? null}
            highlightColumn={activeStep?.move.columnIndex}
            disabled={true}
            scale={settings.abacusScale}
            onToggleScale={() =>
              onUpdateSettings({
                abacusScale: settings.abacusScale === 'large' ? 'normal' : 'large',
              })
            }
            prefer2D={settings.prefer2D}
            onToggle2D={() => onUpdateSettings({ prefer2D: !settings.prefer2D })}
            digitMode={settings.digitMode}
            reducedMotion={settings.reducedMotion}
            nightMode={settings.nightMode}
          />
        </KiaTutorialGuide>
      </div>
    </div>
  );
};
