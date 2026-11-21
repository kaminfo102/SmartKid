import type {
  SorobanColumnState,
  SorobanGuidedMove,
  SorobanMoveStep,
  SorobanState,
} from '../../types/app';
import { getPlaceName, toPersianDigits } from '../../lib/numbers';

/**
 * Pure Soroban (Japanese Abacus) Logic Engine.
 *
 * Column indexing convention:
 * - Index 0 is the rightmost column (Units / یکان: 10^0 = 1)
 * - Index 1 is Tens (دهگان: 10^1 = 10)
 * - Index 2 is Hundreds (صدگان: 10^2 = 100)
 *
 * Each column has:
 * - 1 Heaven bead (مهره بالایی) worth 5 units of that column's place value.
 * - 4 Earth beads (مهره‌های پایینی) each worth 1 unit of that column's place value.
 *   Beads move toward the central reckoning beam to become active.
 */

export function createEmptyColumn(): SorobanColumnState {
  return { heavenActive: false, earthCount: 0 };
}

export function createEmptySoroban(columns: number = 3): SorobanState {
  const safeCols = Math.max(1, Math.min(8, Math.floor(columns)));
  return Array.from({ length: safeCols }, () => createEmptyColumn());
}

export function cloneSorobanState(state: SorobanState): SorobanState {
  return state.map((col) => ({
    heavenActive: col.heavenActive,
    earthCount: Math.max(0, Math.min(4, col.earthCount)),
  }));
}

export function getColumnDigit(col: SorobanColumnState): number {
  const heaven = col.heavenActive ? 5 : 0;
  const earth = Math.max(0, Math.min(4, col.earthCount));
  return heaven + earth;
}

export function digitToColumnState(digit: number): SorobanColumnState {
  const safeDigit = Math.max(0, Math.min(9, Math.floor(digit)));
  return {
    heavenActive: safeDigit >= 5,
    earthCount: safeDigit % 5,
  };
}

export function sorobanStateToNumber(state: SorobanState): number {
  let total = 0;
  for (let i = 0; i < state.length; i++) {
    const placeValue = Math.pow(10, i);
    total += getColumnDigit(state[i]) * placeValue;
  }
  return total;
}

export function numberToSorobanState(value: number, columns: number = 3): SorobanState {
  const safeCols = Math.max(1, Math.min(8, Math.floor(columns)));
  const maxVal = Math.pow(10, safeCols) - 1;
  const clamped = Math.max(0, Math.min(maxVal, Math.floor(value)));
  const state: SorobanState = [];
  let remaining = clamped;
  for (let i = 0; i < safeCols; i++) {
    const digit = remaining % 10;
    state.push(digitToColumnState(digit));
    remaining = Math.floor(remaining / 10);
  }
  return state;
}

export function resetSoroban(columns: number): SorobanState {
  return createEmptySoroban(columns);
}

export function setHeavenBead(
  state: SorobanState,
  columnIndex: number,
  active: boolean
): SorobanState {
  if (columnIndex < 0 || columnIndex >= state.length) return state;
  const next = cloneSorobanState(state);
  next[columnIndex].heavenActive = active;
  return next;
}

export function toggleHeavenBead(state: SorobanState, columnIndex: number): SorobanState {
  if (columnIndex < 0 || columnIndex >= state.length) return state;
  return setHeavenBead(state, columnIndex, !state[columnIndex].heavenActive);
}

/**
 * Authentic Soroban Earth Bead rule:
 * beadIndex 0 is closest to the center beam, beadIndex 3 is at the bottom.
 * - If beadIndex >= earthCount (bead is currently inactive/down), pushing it UP
 *   also pushes all beads above it toward the beam -> earthCount becomes beadIndex + 1.
 * - If beadIndex < earthCount (bead is currently active/up), pushing it DOWN
 *   also pushes all beads below it away from the beam -> earthCount becomes beadIndex.
 */
export function toggleEarthBead(
  state: SorobanState,
  columnIndex: number,
  beadIndex: number
): SorobanState {
  if (columnIndex < 0 || columnIndex >= state.length) return state;
  if (beadIndex < 0 || beadIndex > 3) return state;

  const next = cloneSorobanState(state);
  const currentCount = next[columnIndex].earthCount;
  if (beadIndex >= currentCount) {
    next[columnIndex].earthCount = beadIndex + 1;
  } else {
    next[columnIndex].earthCount = beadIndex;
  }
  return next;
}

export function setEarthCount(
  state: SorobanState,
  columnIndex: number,
  count: number
): SorobanState {
  if (columnIndex < 0 || columnIndex >= state.length) return state;
  const next = cloneSorobanState(state);
  next[columnIndex].earthCount = Math.max(0, Math.min(4, Math.floor(count)));
  return next;
}

export function addValue(state: SorobanState, delta: number): SorobanState {
  const current = sorobanStateToNumber(state);
  return numberToSorobanState(current + delta, state.length);
}

export function subtractValue(state: SorobanState, delta: number): SorobanState {
  const current = sorobanStateToNumber(state);
  return numberToSorobanState(Math.max(0, current - delta), state.length);
}

export function isSorobanEqual(a: SorobanState, b: SorobanState): boolean {
  if (a.length !== b.length) return false;
  return sorobanStateToNumber(a) === sorobanStateToNumber(b);
}

/**
 * Generates step-by-step animated Soroban moves from `fromValue` to `toValue`.
 * Uses genuine Soroban pedagogical rules:
 * - Direct bead additions/subtractions
 * - 5-complement rules (+4 = +5 - 1, -4 = -5 + 1, etc.)
 * - 10-complement rules (+7 = +10 - 3, etc.)
 * Works from most-significant digit or single-column transition cleanly.
 */
export function planSorobanSteps(
  fromValue: number,
  toValue: number,
  columns: number = 3
): SorobanMoveStep[] {
  const steps: SorobanMoveStep[] = [];
  let working = numberToSorobanState(fromValue, columns);
  const target = Math.max(0, Math.min(Math.pow(10, columns) - 1, Math.floor(toValue)));

  if (sorobanStateToNumber(working) === target) {
    return steps;
  }

  const delta = target - sorobanStateToNumber(working);
  const isAddition = delta > 0;
  const absDelta = Math.abs(delta);

  // Decompose delta by place value from highest column to lowest (standard Soroban mental flow)
  for (let col = columns - 1; col >= 0; col--) {
    const place = Math.pow(10, col);
    const digitChange = Math.floor(absDelta / place) % 10;
    if (digitChange === 0) continue;

    if (isAddition) {
      applyAddDigitSteps(working, col, digitChange, steps);
    } else {
      applySubtractDigitSteps(working, col, digitChange, steps);
    }
    working = steps.length > 0 ? cloneSorobanState(steps[steps.length - 1].stateAfter) : working;
  }

  // Fallback reconciliation if intermediate carries differed from final target
  const finalCheck = numberToSorobanState(target, columns);
  for (let col = columns - 1; col >= 0; col--) {
    const cur = working[col];
    const want = finalCheck[col];
    if (cur.heavenActive !== want.heavenActive) {
      const next = setHeavenBead(working, col, want.heavenActive);
      const move: SorobanGuidedMove = {
        columnIndex: col,
        beadType: 'heaven',
        direction: want.heavenActive ? 'toward-beam' : 'away-from-beam',
        hintText: want.heavenActive
          ? `مهره ۵ را در ستون ${getPlaceName(col)} پایین بیاور`
          : `مهره ۵ را در ستون ${getPlaceName(col)} بالا ببر`,
      };
      steps.push({ stateAfter: next, move, spokenText: move.hintText });
      working = next;
    }
    if (cur.earthCount !== want.earthCount) {
      const up = want.earthCount > cur.earthCount;
      const beadIdx = up ? want.earthCount - 1 : want.earthCount;
      const next = setEarthCount(working, col, want.earthCount);
      const move: SorobanGuidedMove = {
        columnIndex: col,
        beadType: 'earth',
        beadIndex: beadIdx,
        direction: up ? 'toward-beam' : 'away-from-beam',
        hintText: up
          ? `در ستون ${getPlaceName(col)} مهره پایینی را به میله نزدیک کن`
          : `در ستون ${getPlaceName(col)} مهره پایینی را پایین ببر`,
      };
      steps.push({ stateAfter: next, move, spokenText: move.hintText });
      working = next;
    }
  }

  return steps;
}

function pushStep(
  working: SorobanState,
  next: SorobanState,
  move: SorobanGuidedMove,
  spokenText: string,
  steps: SorobanMoveStep[],
  formulaLabel?: string
) {
  steps.push({
    stateAfter: cloneSorobanState(next),
    move,
    spokenText,
    formulaLabel,
  });
  // Mutate working reference in-place for chained planning
  for (let i = 0; i < working.length; i++) {
    working[i] = { ...next[i] };
  }
}

function applyAddDigitSteps(
  working: SorobanState,
  col: number,
  d: number,
  steps: SorobanMoveStep[]
) {
  const placeName = getPlaceName(col);
  const current = working[col];
  const curDigit = getColumnDigit(current);

  // Case 1: Direct addition fits within this column without carry
  if (curDigit + d <= 9) {
    const needHeaven = !current.heavenActive && curDigit + d >= 5;
    const targetEarth = (curDigit + d) % 5;

    // Direct without touching heaven, or direct 5 + earth
    if (!needHeaven && targetEarth >= current.earthCount) {
      const count = targetEarth - current.earthCount;
      const next = setEarthCount(working, col, targetEarth);
      const msg = `در ستون ${placeName}، ${toPersianDigits(count)} مهره پایینی را بالا بیاور.`;
      pushStep(
        working,
        next,
        {
          columnIndex: col,
          beadType: 'earth',
          beadIndex: targetEarth - 1,
          direction: 'toward-beam',
          hintText: msg,
        },
        msg,
        steps,
        `+${toPersianDigits(d)}`
      );
      return;
    }

    if (needHeaven && targetEarth >= current.earthCount) {
      // Activate heaven (+5), and if extra earth needed, push up
      const nextH = setHeavenBead(working, col, true);
      const msgH = `در ستون ${placeName}، مهره بالایی (۵) را پایین بیاور.`;
      pushStep(
        working,
        nextH,
        {
          columnIndex: col,
          beadType: 'heaven',
          direction: 'toward-beam',
          hintText: msgH,
        },
        msgH,
        steps,
        `+۵`
      );
      if (targetEarth > working[col].earthCount) {
        const extra = targetEarth - working[col].earthCount;
        const nextE = setEarthCount(working, col, targetEarth);
        const msgE = `حالا ${toPersianDigits(extra)} مهره پایینی را بالا بیاور.`;
        pushStep(
          working,
          nextE,
          {
            columnIndex: col,
            beadType: 'earth',
            beadIndex: targetEarth - 1,
            direction: 'toward-beam',
            hintText: msgE,
          },
          msgE,
          steps,
          `+${toPersianDigits(extra)}`
        );
      }
      return;
    }

    // 5-complement rule! (+d = +5 - (5 - d))
    if (needHeaven && targetEarth < current.earthCount) {
      const comp = 5 - d;
      const formula = `+${toPersianDigits(d)} = +۵ - ${toPersianDigits(comp)}`;
      const nextH = setHeavenBead(working, col, true);
      const msg1 = `برای اضافه کردن ${toPersianDigits(d)}، از مکمل ۵ کمک می‌گیریم: اول مهره ۵ را پایین بیاور.`;
      pushStep(
        working,
        nextH,
        {
          columnIndex: col,
          beadType: 'heaven',
          direction: 'toward-beam',
          hintText: msg1,
        },
        msg1,
        steps,
        formula
      );
      const nextE = setEarthCount(working, col, targetEarth);
      const msg2 = `بعد ${toPersianDigits(comp)} مهره پایینی را پایین ببر تا ${toPersianDigits(d)} اضافه شود.`;
      pushStep(
        working,
        nextE,
        {
          columnIndex: col,
          beadType: 'earth',
          beadIndex: targetEarth,
          direction: 'away-from-beam',
          hintText: msg2,
        },
        msg2,
        steps,
        formula
      );
      return;
    }
  }

  // Case 2: 10-complement carry to col + 1! (+d = +10 - (10 - d))
  if (col + 1 < working.length) {
    const comp10 = 10 - d;
    const formula = `+${toPersianDigits(d)} = +۱۰ - ${toPersianDigits(comp10)}`;
    // Add 1 to col + 1 recursively
    applyAddDigitSteps(working, col + 1, 1, steps);
    // Subtract comp10 from col recursively
    applySubtractDigitSteps(working, col, comp10, steps);
    if (steps.length > 0) {
      steps[steps.length - 1].formulaLabel = formula;
    }
  }
}

function applySubtractDigitSteps(
  working: SorobanState,
  col: number,
  d: number,
  steps: SorobanMoveStep[]
) {
  const placeName = getPlaceName(col);
  const current = working[col];
  const curDigit = getColumnDigit(current);

  if (curDigit >= d) {
    const targetDigit = curDigit - d;
    const targetHeaven = targetDigit >= 5;
    const targetEarth = targetDigit % 5;

    // Direct earth subtraction
    if (current.heavenActive === targetHeaven && targetEarth < current.earthCount) {
      const removed = current.earthCount - targetEarth;
      const next = setEarthCount(working, col, targetEarth);
      const msg = `در ستون ${placeName}، ${toPersianDigits(removed)} مهره پایینی را پایین ببر.`;
      pushStep(
        working,
        next,
        {
          columnIndex: col,
          beadType: 'earth',
          beadIndex: targetEarth,
          direction: 'away-from-beam',
          hintText: msg,
        },
        msg,
        steps,
        `-${toPersianDigits(d)}`
      );
      return;
    }

    // Direct heaven subtraction (and optional earth subtraction)
    if (current.heavenActive && !targetHeaven && targetEarth <= current.earthCount) {
      if (targetEarth < current.earthCount) {
        const removed = current.earthCount - targetEarth;
        const nextE = setEarthCount(working, col, targetEarth);
        const msgE = `در ستون ${placeName}، ${toPersianDigits(removed)} مهره پایینی را پایین ببر.`;
        pushStep(
          working,
          nextE,
          {
            columnIndex: col,
            beadType: 'earth',
            beadIndex: targetEarth,
            direction: 'away-from-beam',
            hintText: msgE,
          },
          msgE,
          steps,
          `-${toPersianDigits(removed)}`
        );
      }
      const nextH = setHeavenBead(working, col, false);
      const msgH = `مهره بالایی (۵) را در ستون ${placeName} بالا ببر.`;
      pushStep(
        working,
        nextH,
        {
          columnIndex: col,
          beadType: 'heaven',
          direction: 'away-from-beam',
          hintText: msgH,
        },
        msgH,
        steps,
        `-۵`
      );
      return;
    }

    // 5-complement subtraction (-d = -5 + (5 - d))
    if (current.heavenActive && !targetHeaven && targetEarth > current.earthCount) {
      const comp = 5 - d;
      const formula = `-${toPersianDigits(d)} = -۵ + ${toPersianDigits(comp)}`;
      const nextE = setEarthCount(working, col, targetEarth);
      const msg1 = `برای کم کردن ${toPersianDigits(d)} با مکمل ۵: اول ${toPersianDigits(comp)} مهره پایینی را بالا بیاور.`;
      pushStep(
        working,
        nextE,
        {
          columnIndex: col,
          beadType: 'earth',
          beadIndex: targetEarth - 1,
          direction: 'toward-beam',
          hintText: msg1,
        },
        msg1,
        steps,
        formula
      );
      const nextH = setHeavenBead(working, col, false);
      const msg2 = `حالا مهره بالایی (۵) را بالا ببر.`;
      pushStep(
        working,
        nextH,
        {
          columnIndex: col,
          beadType: 'heaven',
          direction: 'away-from-beam',
          hintText: msg2,
        },
        msg2,
        steps,
        formula
      );
      return;
    }
  }

  // 10-complement borrow from col + 1 (-d = -10 + (10 - d))
  if (col + 1 < working.length) {
    const comp10 = 10 - d;
    const formula = `-${toPersianDigits(d)} = -۱۰ + ${toPersianDigits(comp10)}`;
    applySubtractDigitSteps(working, col + 1, 1, steps);
    applyAddDigitSteps(working, col, comp10, steps);
    if (steps.length > 0) {
      steps[steps.length - 1].formulaLabel = formula;
    }
  }
}
