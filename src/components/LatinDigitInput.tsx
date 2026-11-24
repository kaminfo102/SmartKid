import React, { useEffect, useRef, useState } from 'react';
import { normalizePersianDigits } from '../lib/wordpressApi';

export type LatinDigitTransformMode =
  | 'digits-only'
  | 'mobile'
  | 'postcode'
  | 'username'
  | 'latin-digits';

function applyDigitTransform(raw: string, mode: LatinDigitTransformMode): string {
  const normalized = normalizePersianDigits(raw);
  switch (mode) {
    case 'digits-only':
      return normalized.replace(/\D/g, '');
    case 'postcode':
      return normalized.replace(/\D/g, '').slice(0, 10);
    case 'mobile': {
      // Keep leading '+' only if present, plus digits up to 15 chars (handles 009809...)
      const hasPlus = normalized.trimStart().startsWith('+');
      const digitsOnly = normalized.replace(/\D/g, '').slice(0, 15);
      return hasPlus ? `+${digitsOnly}` : digitsOnly;
    }
    case 'username':
      return normalized.replace(/[^a-zA-Z0-9._-]/g, '');
    case 'latin-digits':
    default:
      return normalized;
  }
}

interface LatinDigitInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'value' | 'onChange' | 'maxLength'
  > {
  value: string;
  onValueChange: (val: string) => void;
  transformMode?: LatinDigitTransformMode;
}

/**
 * Android WebView & Persian/Arabic IME-safe controlled input.
 * Avoids mutating the DOM input string mid-IME-composition (preventing dropped/scrambled digits
 * on Gboard / Samsung / MIUI keyboards inside Capacitor APKs) while keeping parent state
 * continuously normalized to Latin ASCII digits.
 */
export const LatinDigitInput: React.FC<LatinDigitInputProps> = ({
  value,
  onValueChange,
  transformMode = 'latin-digits',
  onCompositionStart,
  onCompositionEnd,
  onBlur,
  ...rest
}) => {
  const isComposingRef = useRef(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!isComposingRef.current) {
      setDraft(value);
    }
  }, [value]);

  const commitTransformed = (raw: string) => {
    const transformed = applyDigitTransform(raw, transformMode);
    setDraft(transformed);
    onValueChange(transformed);
  };

  const handleCompositionStart = (e: React.CompositionEvent<HTMLInputElement>) => {
    isComposingRef.current = true;
    onCompositionStart?.(e);
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    isComposingRef.current = false;
    commitTransformed(e.currentTarget.value);
    onCompositionEnd?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const nativeComposing = Boolean(
      (e.nativeEvent as InputEvent | undefined)?.isComposing
    );
    if (isComposingRef.current || nativeComposing) {
      isComposingRef.current = true;
      // Preserve raw IME composing text in DOM so Android InputConnection doesn't desync,
      // while immediately updating parent state with normalized Latin digits.
      setDraft(raw);
      onValueChange(applyDigitTransform(raw, transformMode));
      return;
    }
    commitTransformed(raw);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    isComposingRef.current = false;
    commitTransformed(e.currentTarget.value);
    onBlur?.(e);
  };

  return (
    <input
      {...rest}
      value={draft}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
};
