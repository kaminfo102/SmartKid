import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  ImagePlus,
  Loader2,
  RotateCw,
  Trash2,
  X,
  ZoomIn,
} from 'lucide-react';
import type { AvatarId, ChildProfile, DigitDisplayMode } from '../types/app';
import { formatNumber } from '../lib/numbers';
import { optimizeCroppedAvatarCanvas } from '../lib/imageOptimizer';
import { validateSafeImageSrc } from '../lib/wordpressApi';
import { AVATAR_OPTIONS, AvatarGraphic } from './MascotDana';

export interface ChildAvatarSavePayload {
  name: string;
  age: number;
  avatar: AvatarId;
  avatarUrl?: string;
  avatarFile?: File | null;
  removePhoto?: boolean;
}

interface ChildAvatarEditorModalProps {
  mode: 'create' | 'edit';
  initialProfile?: ChildProfile | null;
  digitMode: DigitDisplayMode;
  saving?: boolean;
  onClose: () => void;
  onSave: (payload: ChildAvatarSavePayload) => Promise<void> | void;
}

const CHILD_AGES = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const CROP_BOX_SIZE = 216;
const EXPORT_CANVAS_SIZE = 256;

export const ChildAvatarEditorModal: React.FC<ChildAvatarEditorModalProps> = ({
  mode,
  initialProfile,
  digitMode,
  saving = false,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(
    mode === 'edit' ? initialProfile?.name || 'کیا' : ''
  );
  const [age, setAge] = useState(initialProfile?.age ?? 6);
  const [avatar, setAvatar] = useState<AvatarId>(initialProfile?.avatar ?? 'owl');
  const [existingUrl, setExistingUrl] = useState<string>(
    validateSafeImageSrc(initialProfile?.avatarUrl)
  );
  const [removedPhoto, setRemovedPhoto] = useState(false);

  // Interactive messenger-style cropper state
  const [sourceImg, setSourceImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const dragStartRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    basePanX: number;
    basePanY: number;
  } | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const activeObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (activeObjectUrlRef.current) {
        URL.revokeObjectURL(activeObjectUrlRef.current);
      }
    };
  }, []);

  const renderToCanvas = (
    canvas: HTMLCanvasElement,
    size: number,
    img: HTMLImageElement
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#FFF9F2';
    ctx.fillRect(0, 0, size, size);

    const iw = img.naturalWidth || img.width || 1;
    const ih = img.naturalHeight || img.height || 1;
    const swapped = rotationDeg % 180 !== 0;
    const effW = swapped ? ih : iw;
    const effH = swapped ? iw : ih;
    const coverScale = Math.max(size / effW, size / effH);
    const drawScale = coverScale * zoom;
    const panRatio = size / CROP_BOX_SIZE;

    ctx.save();
    ctx.translate(
      size / 2 + pan.x * panRatio,
      size / 2 + pan.y * panRatio
    );
    ctx.rotate((rotationDeg * Math.PI) / 180);
    ctx.scale(drawScale, drawScale);
    ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
    ctx.restore();
  };

  useEffect(() => {
    if (!sourceImg || !previewCanvasRef.current) return;
    renderToCanvas(previewCanvasRef.current, CROP_BOX_SIZE, sourceImg);
  }, [sourceImg, zoom, rotationDeg, pan]);

  const handleFilePick = (file: File | undefined) => {
    if (!file) return;
    setErrorMsg(null);
    if (!file.type.startsWith('image/')) {
      setErrorMsg('لطفاً فقط یک فایل تصویری (عکس) انتخاب کنید.');
      return;
    }
    if (activeObjectUrlRef.current) {
      URL.revokeObjectURL(activeObjectUrlRef.current);
    }
    const objUrl = URL.createObjectURL(file);
    activeObjectUrlRef.current = objUrl;

    const img = new Image();
    img.onload = () => {
      setSourceImg(img);
      setZoom(1);
      setRotationDeg(0);
      setPan({ x: 0, y: 0 });
      setRemovedPhoto(false);
    };
    img.onerror = () => {
      setErrorMsg('امکان خواندن این تصویر وجود نداشت.');
    };
    img.src = objUrl;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!sourceImg) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      basePanX: pan.x,
      basePanY: pan.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragStartRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const maxShift = Math.round(CROP_BOX_SIZE * 0.45 * zoom);
    setPan({
      x: Math.max(-maxShift, Math.min(maxShift, drag.basePanX + dx)),
      y: Math.max(-maxShift, Math.min(maxShift, drag.basePanY + dy)),
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragStartRef.current?.pointerId === e.pointerId) {
      dragStartRef.current = null;
    }
  };

  const handleClearPhoto = () => {
    setSourceImg(null);
    setExistingUrl('');
    setRemovedPhoto(true);
    setZoom(1);
    setRotationDeg(0);
    setPan({ x: 0, y: 0 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMsg('لطفاً نام کودک را وارد کنید.');
      return;
    }
    setErrorMsg(null);
    setProcessing(true);

    try {
      if (sourceImg) {
        const exportCanvas = document.createElement('canvas');
        renderToCanvas(exportCanvas, EXPORT_CANVAS_SIZE, sourceImg);
        const serverOptimized = await optimizeCroppedAvatarCanvas(
          exportCanvas,
          100 * 1024
        );
        const localOptimized =
          serverOptimized.compressedBytes <= 40 * 1024
            ? serverOptimized
            : await optimizeCroppedAvatarCanvas(exportCanvas, 40 * 1024);

        await onSave({
          name: cleanName,
          age,
          avatar,
          avatarUrl: localOptimized.dataUrl,
          avatarFile: serverOptimized.file,
          removePhoto: false,
        });
      } else if (removedPhoto) {
        await onSave({
          name: cleanName,
          age,
          avatar,
          avatarUrl: undefined,
          avatarFile: null,
          removePhoto: true,
        });
      } else {
        await onSave({
          name: cleanName,
          age,
          avatar,
          avatarUrl: existingUrl || undefined,
          avatarFile: null,
          removePhoto: false,
        });
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'ذخیره پروفایل کودک انجام نشد.'
      );
    } finally {
      setProcessing(false);
    }
  };

  const busy = processing || saving;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kn-child-editor-title"
    >
      <div className="w-full max-w-lg my-auto rounded-3xl bg-[#FFF9F2] dark:bg-slate-900 border-4 border-white dark:border-slate-700 shadow-[0_24px_56px_-12px_rgba(140,80,20,0.35)] overflow-hidden">
        <div className="bg-gradient-to-b from-[#FFCC33] to-[#FFE066] dark:from-slate-800 dark:to-slate-800 px-5 py-4 flex items-center justify-between gap-3">
          <h2
            id="kn-child-editor-title"
            className="text-base sm:text-lg font-extrabold text-[#593400] dark:text-white"
          >
            {mode === 'create'
              ? 'ساخت پروفایل کودک جدید'
              : `ویرایش پروفایل ${initialProfile?.name || 'کودک'}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن پنجره"
            className="min-h-[44px] min-w-[44px] rounded-2xl bg-white/95 hover:bg-white dark:bg-slate-700 border-b-2 border-amber-300 dark:border-slate-600 text-slate-700 dark:text-slate-100 flex items-center justify-center shadow-xs shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-4 sm:p-5 space-y-4 max-h-[82vh] overflow-y-auto"
        >
          {errorMsg && (
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-200 dark:border-rose-800 p-3 text-xs font-extrabold text-rose-800 dark:text-rose-200">
              {errorMsg}
            </div>
          )}

          {/* Messenger-Style Circular Profile Photo Studio */}
          <div className="rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-[#EEDCC5] dark:border-slate-700 p-4 space-y-3">
            <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200 text-center">
              تصویر پروفایل کودک (برش دایره‌ای + فشرده‌سازی خودکار زیر ۱۰۰ کیلوبایت)
            </div>

            <div className="flex flex-col items-center gap-3">
              {sourceImg ? (
                <div className="relative select-none">
                  <canvas
                    ref={previewCanvasRef}
                    width={CROP_BOX_SIZE}
                    height={CROP_BOX_SIZE}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    className="w-[216px] h-[216px] rounded-full border-4 border-[#5472EB] shadow-md cursor-grab active:cursor-grabbing touch-none bg-[#FFF9F2]"
                  />
                  <span className="mt-1.5 block text-center text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    برای جابه‌جایی تصویر، روی دایره بکشید
                  </span>
                </div>
              ) : (
                <div className="relative">
                  <div className="w-28 h-28 rounded-full border-4 border-[#EEDCC5] dark:border-slate-600 bg-[#FFF6EB] dark:bg-slate-900 flex items-center justify-center overflow-hidden shadow-sm">
                    <AvatarGraphic
                      avatar={avatar}
                      imageUrl={removedPhoto ? undefined : existingUrl}
                      alt={name || 'تصویر کودک'}
                      className="w-24 h-24"
                    />
                  </div>
                </div>
              )}

              {/* Zoom & Rotate controls when cropping */}
              {sourceImg && (
                <div className="w-full max-w-xs space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs font-extrabold text-slate-700 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1">
                      <ZoomIn className="w-4 h-4 text-[#5472EB]" />
                      <span>بزرگ‌نمایی</span>
                    </span>
                    <span dir="ltr" className="tabular-nums">
                      {zoom.toFixed(2)}x
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.05}
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      aria-label="بزرگ‌نمایی تصویر پروفایل"
                      className="flex-1 accent-[#5472EB]"
                    />
                    <button
                      type="button"
                      onClick={() => setRotationDeg((r) => (r + 90) % 360)}
                      aria-label="چرخش ۹۰ درجه"
                      className="min-h-[40px] min-w-[40px] rounded-xl bg-[#FFF6EB] hover:bg-amber-100 dark:bg-slate-700 border border-[#EEDCC5] dark:border-slate-600 text-slate-800 dark:text-slate-100 flex items-center justify-center"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Photo Action Buttons */}
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleFilePick(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={(e) => {
                    handleFilePick(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />

                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="min-h-[44px] px-3.5 rounded-2xl bg-[#5472EB] hover:bg-[#425FD6] border-b-4 border-[#354EB8] text-white font-extrabold text-xs inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <ImagePlus className="w-4 h-4" />
                  <span>انتخاب از گالری</span>
                </button>

                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="min-h-[44px] px-3.5 rounded-2xl bg-[#FFF6EB] hover:bg-amber-100 dark:bg-slate-700 border-2 border-[#EEDCC5] dark:border-slate-600 text-[#783F1D] dark:text-slate-100 font-extrabold text-xs inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Camera className="w-4 h-4 text-[#EA8800]" />
                  <span>عکس با دوربین</span>
                </button>

                {(sourceImg || (existingUrl && !removedPhoto)) && (
                  <button
                    type="button"
                    onClick={handleClearPhoto}
                    className="min-h-[44px] px-3 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-extrabold text-xs inline-flex items-center gap-1 whitespace-nowrap"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>حذف عکس</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Child Name */}
          <div>
            <label
              htmlFor="kn-child-name-input"
              className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              نام کودک
            </label>
            <input
              id="kn-child-name-input"
              type="text"
              maxLength={24}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً کیا، سارا یا باران..."
              className="w-full min-h-[48px] px-4 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Age selector */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
              سن کودک: {formatNumber(age, digitMode)} سال
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {CHILD_AGES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAge(a)}
                  className={`min-h-[42px] min-w-[42px] rounded-2xl font-extrabold text-xs transition-colors ${
                    age === a
                      ? 'bg-[#5472EB] border-b-4 border-[#354EB8] text-white'
                      : 'bg-white dark:bg-slate-800 border border-[#EEDCC5] dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {formatNumber(a, digitMode)}
                </button>
              ))}
            </div>
          </div>

          {/* Mascot Fallback Selector */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
              شخصیت همراه (نمایش در صورت نداشتن عکس)
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {AVATAR_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAvatar(opt.id)}
                  className={`min-h-[64px] p-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                    avatar === opt.id
                      ? 'border-[#5472EB] bg-sky-50 dark:bg-blue-950/50 ring-2 ring-blue-300'
                      : 'border-[#EFE0CE] dark:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                >
                  <AvatarGraphic avatar={opt.id} className="w-9 h-9" />
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate max-w-full">
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 min-h-[50px] rounded-2xl bg-[#4BB543] hover:bg-[#41A23A] border-b-4 border-[#2E8228] active:border-b-0 active:translate-y-0.5 text-white font-extrabold text-sm sm:text-base inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Check className="w-5 h-5" />
              )}
              <span>ذخیره پروفایل</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[50px] px-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-[#EEDCC5] dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm"
            >
              انصراف
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
