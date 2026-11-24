import type { DigitDisplayMode } from '../types/app';

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const;
const ARABIC_INDIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'] as const;

export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)] ?? d);
}

export function toEnglishDigits(input: string): string {
  return String(input)
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
    .replace(/[\u06F0-\u06F9]/g, (ch) => String(ch.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (ch) => String(ch.charCodeAt(0) - 0x0660))
    .replace(/[\uFF10-\uFF19]/g, (ch) => String(ch.charCodeAt(0) - 0xff10));
}

export function formatNumber(value: number | string, mode: DigitDisplayMode = 'fa'): string {
  const str = String(value);
  return mode === 'fa' ? toPersianDigits(str) : toEnglishDigits(str);
}

export function getPlaceName(columnIndexFromRight: number): string {
  switch (columnIndexFromRight) {
    case 0:
      return 'یکان';
    case 1:
      return 'دهگان';
    case 2:
      return 'صدگان';
    case 3:
      return 'هزارگان';
    default:
      return `ستون ${toPersianDigits(columnIndexFromRight + 1)}`;
  }
}

export function getColumnColor(columnIndexFromRight: number): string {
  switch (columnIndexFromRight) {
    case 0:
      return '#0EA5E9'; // Sky Blue for Units
    case 1:
      return '#10B981'; // Emerald for Tens
    case 2:
      return '#8B5CF6'; // Soft Violet for Hundreds
    case 3:
      return '#EC4899'; // Rose for Thousands
    default:
      return '#0EA5E9';
  }
}
