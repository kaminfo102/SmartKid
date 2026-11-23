import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { optimizeReceiptImage, type OptimizedImageResult } from '../lib/imageOptimizer';
import { isCapacitorNative, pickImageNative } from '../lib/nativeBridge';
import type { DigitDisplayMode } from '../types/app';
import { formatNumber } from '../lib/numbers';

interface ReceiptUploaderFieldProps {
  digitMode?: DigitDisplayMode;
  selectedImage: OptimizedImageResult | null;
  onImageChange: (img: OptimizedImageResult | null) => void;
  noteValue?: string;
  onNoteChange?: (note: string) => void;
  showNoteField?: boolean;
  imageLabel?: string;
  noteLabel?: string;
  notePlaceholder?: string;
}

export const ReceiptUploaderField: React.FC<ReceiptUploaderFieldProps> = ({
  digitMode = 'fa',
  selectedImage,
  onImageChange,
  noteValue = '',
  onNoteChange,
  showNoteField = true,
  imageLabel = 'تصویر رسید بانکی (اختیاری)',
  noteLabel = 'توضیحات یا کد پیگیری واریز (اختیاری)',
  notePlaceholder = 'مثلاً شماره پیگیری، چهار رقم آخر کارت واریزکننده، یا تاریخ و ساعت واریز...',
}) => {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (selectedImage?.previewUrl) {
        URL.revokeObjectURL(selectedImage.previewUrl);
      }
    };
  }, [selectedImage?.previewUrl]);

  const processPickedFile = async (file: File) => {
    setCompressing(true);
    setErrorMsg(null);
    try {
      const result = await optimizeReceiptImage(file);
      if (selectedImage?.previewUrl) {
        URL.revokeObjectURL(selectedImage.previewUrl);
      }
      onImageChange(result);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در بهینه‌سازی تصویر.');
    } finally {
      setCompressing(false);
    }
  };

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await processPickedFile(file);
  };

  const handlePickTrigger = async (source: 'gallery' | 'camera') => {
    if (isCapacitorNative()) {
      setErrorMsg(null);
      try {
        const nativeFile = await pickImageNative(source, 'rear');
        if (nativeFile) {
          await processPickedFile(nativeFile);
        }
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : 'دسترسی به دوربین یا گالری انجام نشد.'
        );
      }
      return;
    }

    if (source === 'camera') {
      cameraInputRef.current?.click();
    } else {
      galleryInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <label className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
            {imageLabel}
          </label>
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
            بهینه‌سازی خودکار زیر ۱۰۰ کیلوبایت
          </span>
        </div>

        {/* Hidden Inputs: Gallery Picker & Mobile Camera Capture */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleFilePicked}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFilePicked}
          className="hidden"
        />

        {!selectedImage ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={compressing}
              onClick={() => void handlePickTrigger('gallery')}
              className="min-h-[48px] px-3 py-2 rounded-2xl bg-[#FFF6EB] hover:bg-amber-100 dark:bg-slate-800 border-2 border-dashed border-[#D99B58] dark:border-slate-600 text-slate-800 dark:text-slate-100 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              {compressing ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
              ) : (
                <ImagePlus className="w-4 h-4 text-[#5472EB]" />
              )}
              <span>انتخاب از گالری / فایل</span>
            </button>

            <button
              type="button"
              disabled={compressing}
              onClick={() => void handlePickTrigger('camera')}
              className="min-h-[48px] px-3 py-2 rounded-2xl bg-[#EFF6FF] hover:bg-sky-100 dark:bg-slate-800 border-2 border-dashed border-sky-400 dark:border-sky-700 text-sky-900 dark:text-sky-200 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              {compressing ? (
                <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
              ) : (
                <Camera className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              )}
              <span>عکس با دوربین گوشی</span>
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-700 p-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={selectedImage.previewUrl}
                alt="پیش‌نمایش تصویر بهینه‌شده"
                className="w-14 h-14 rounded-xl object-cover border-2 border-white shadow-xs shrink-0"
              />
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1 text-xs font-extrabold text-emerald-900 dark:text-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">تصویر آماده ارسال است</span>
                </div>
                <div className="text-[11px] font-bold text-emerald-800/80 dark:text-emerald-300 tabular-nums">
                  {formatNumber(selectedImage.originalSizeKb, digitMode)} KB ←{' '}
                  <strong>{formatNumber(selectedImage.compressedSizeKb, digitMode)} KB</strong>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onImageChange(null)}
              aria-label="حذف تصویر انتخاب‌شده"
              className="min-h-[40px] min-w-[40px] rounded-xl bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center hover:bg-rose-50 shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mt-1.5 text-[11px] font-bold text-rose-600 dark:text-rose-400">
            {errorMsg}
          </div>
        )}
      </div>

      {showNoteField && onNoteChange && (
        <div>
          <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-1">
            {noteLabel}
          </label>
          <textarea
            rows={2}
            value={noteValue}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder={notePlaceholder}
            className="w-full px-3 py-2 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      )}
    </div>
  );
};
