import type { PracticeQuestion, SkillKey } from '../types/app';
import { toPersianDigits } from '../lib/numbers';

const EMOJIS: Array<'apple' | 'star' | 'balloon' | 'pencil'> = [
  'apple',
  'star',
  'balloon',
  'pencil',
];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generatePracticeQuestion(
  skill: SkillKey,
  difficulty: number = 1
): PracticeQuestion {
  const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const emoji = EMOJIS[randInt(0, EMOJIS.length - 1)];

  if (skill === 'recognition') {
    const maxN = difficulty <= 1 ? 5 : 9;
    const target = randInt(1, maxN);
    return {
      id,
      skill,
      columns: 1,
      promptText: `عدد ${toPersianDigits(target)} را روی چرتکه بساز`,
      spokenText: `عدد ${toPersianDigits(target)} را روی چرتکه بساز`,
      startValue: 0,
      targetValue: target,
      visualType: 'objects',
      visualCountA: target,
      visualEmoji: emoji,
    };
  }

  if (skill === 'placeValue') {
    const columns = difficulty >= 3 ? 3 : 2;
    const target = columns === 3 ? randInt(105, 399) : randInt(11, 98);
    return {
      id,
      skill,
      columns,
      promptText: `عدد ${toPersianDigits(target)} را با مهره‌ها بساز`,
      spokenText: `عدد ${toPersianDigits(target)} را روی چرتکه بساز`,
      startValue: 0,
      targetValue: target,
      visualType: 'number',
    };
  }

  if (skill === 'simpleAddition') {
    // Direct additions without complex carries for early learners
    const pairs =
      difficulty <= 1
        ? [
            [1, 2],
            [2, 2],
            [1, 3],
            [5, 1],
            [5, 3],
            [2, 5],
          ]
        : [
            [11, 12],
            [12, 15],
            [21, 13],
            [14, 25],
            [32, 15],
          ];
    const [a, b] = pairs[randInt(0, pairs.length - 1)];
    return {
      id,
      skill,
      columns: a >= 10 || a + b >= 10 ? 2 : 1,
      promptText: `${toPersianDigits(a)} + ${toPersianDigits(b)} چند می‌شود؟`,
      spokenText: `${toPersianDigits(a)} به اضافه ${toPersianDigits(b)} چند می‌شود؟ روی چرتکه نشان بده.`,
      startValue: a,
      targetValue: a + b,
      visualType: a < 6 && b < 6 ? 'objects' : 'number',
      visualCountA: a,
      visualCountB: b,
      visualEmoji: emoji,
      operation: '+',
    };
  }

  if (skill === 'simpleSubtraction') {
    const pairs =
      difficulty <= 1
        ? [
            [4, 2],
            [3, 1],
            [7, 2],
            [8, 5],
            [9, 4],
          ]
        : [
            [27, 12],
            [38, 15],
            [49, 24],
            [34, 11],
          ];
    const [a, b] = pairs[randInt(0, pairs.length - 1)];
    return {
      id,
      skill,
      columns: a >= 10 ? 2 : 1,
      promptText: `${toPersianDigits(a)} − ${toPersianDigits(b)} چند می‌شود؟`,
      spokenText: `${toPersianDigits(a)} منهای ${toPersianDigits(b)} چند می‌شود؟`,
      startValue: a,
      targetValue: a - b,
      visualType: 'number',
      operation: '-',
    };
  }

  if (skill === 'complements') {
    const pairs = [
      [3, 4], // +4 = +5 - 1 -> 7
      [2, 4], // +4 = +5 - 1 -> 6
      [4, 3], // +3 = +5 - 2 -> 7
      [6, 7], // +7 = +10 - 3 -> 13
      [8, 5], // +5 = +10 - 5 -> 13
      [7, 6], // +6 = +10 - 4 -> 13
    ];
    const [a, b] = pairs[randInt(0, pairs.length - 1)];
    return {
      id,
      skill,
      columns: 2,
      promptText: `با کمک مکمل‌ها: ${toPersianDigits(a)} + ${toPersianDigits(b)} = ؟`,
      spokenText: `با کمک مکمل‌ها حساب کن: ${toPersianDigits(a)} به اضافه ${toPersianDigits(b)} چند می‌شود؟`,
      startValue: a,
      targetValue: a + b,
      visualType: 'number',
      operation: '+',
    };
  }

  // mentalMath
  const mentalPairs = [
    [2, 5],
    [1, 3],
    [10, 4],
    [5, 3],
    [12, 5],
  ];
  const [a, b] = mentalPairs[randInt(0, mentalPairs.length - 1)];
  return {
    id,
    skill: 'mentalMath',
    columns: a + b >= 10 ? 2 : 1,
    promptText: `ذهنی حساب کن: ${toPersianDigits(a)} + ${toPersianDigits(b)} = ؟`,
    spokenText: `در ذهنت حساب کن: ${toPersianDigits(a)} به اضافه ${toPersianDigits(b)} چند می‌شود؟`,
    startValue: a,
    targetValue: a + b,
    visualType: 'mental-flash',
    operation: '+',
  };
}
