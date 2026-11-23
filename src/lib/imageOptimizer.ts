export interface OptimizedImageResult {
  file: File;
  previewUrl: string;
  originalSizeKb: number;
  compressedSizeKb: number;
  compressedBytes: number;
}

const MAX_TARGET_BYTES = 100 * 1024; // Strictly <= 100 KB (102,400 bytes)

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('فایل انتخاب‌شده یک تصویر معتبر نیست.'));
    };
    img.src = objectUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

/**
 * Real-time client-side image compression.
 * Converts and scales any uploaded photo or smartphone camera snapshot
 * so the resulting JPEG File is guaranteed <= 100 KB (102,400 bytes).
 */
export async function optimizeReceiptImage(
  inputFile: File,
  maxBytes: number = MAX_TARGET_BYTES
): Promise<OptimizedImageResult> {
  if (!inputFile.type.startsWith('image/')) {
    throw new Error('لطفاً فقط فایل تصویری (عکس) انتخاب کنید.');
  }

  const originalSizeKb = Math.max(1, Math.round(inputFile.size / 1024));
  const img = await loadImageFromFile(inputFile);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('مرورگر امکان پردازش تصویر را ندارد.');
  }

  const dimensionSteps = [1200, 960, 760, 580, 440, 340];
  const qualitySteps = [0.82, 0.68, 0.54, 0.4, 0.28, 0.18, 0.12];
  let bestBlob: Blob | null = null;

  for (const maxDim of dimensionSteps) {
    const longest = Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height, 1);
    const scale = Math.min(1, maxDim / longest);
    const w = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
    const h = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));

    canvas.width = w;
    canvas.height = h;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    for (const q of qualitySteps) {
      const blob = await canvasToBlob(canvas, 'image/jpeg', q);
      if (!blob) continue;
      if (!bestBlob || blob.size < bestBlob.size) {
        bestBlob = blob;
      }
      if (blob.size <= maxBytes) {
        const cleanBase = inputFile.name.replace(/\.[^/.]+$/, '') || 'receipt';
        const finalFile = new File([blob], `${cleanBase}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        return {
          file: finalFile,
          previewUrl: URL.createObjectURL(blob),
          originalSizeKb,
          compressedSizeKb: Math.max(1, Math.round(blob.size / 1024)),
          compressedBytes: blob.size,
        };
      }
    }
  }

  if (bestBlob && bestBlob.size <= maxBytes) {
    const cleanBase = inputFile.name.replace(/\.[^/.]+$/, '') || 'receipt';
    const finalFile = new File([bestBlob], `${cleanBase}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
    return {
      file: finalFile,
      previewUrl: URL.createObjectURL(bestBlob),
      originalSizeKb,
      compressedSizeKb: Math.max(1, Math.round(bestBlob.size / 1024)),
      compressedBytes: bestBlob.size,
    };
  }

  throw new Error('امکان کاهش حجم این تصویر به زیر ۱۰۰ کیلوبایت نبود؛ لطفاً تصویر واضح‌تری انتخاب کنید.');
}

export interface OptimizedAvatarResult {
  file: File;
  dataUrl: string;
  compressedSizeKb: number;
  compressedBytes: number;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('خطا در خواندن تصویر پردازش‌شده.'));
      }
    };
    reader.onerror = () => reject(new Error('خطا در خواندن تصویر پردازش‌شده.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Export a cropped square canvas as JPEG strictly <= maxBytes (default 100 KB),
 * returning both a File for server upload and a dataUrl for immediate/guest display.
 */
export async function optimizeCroppedAvatarCanvas(
  sourceCanvas: HTMLCanvasElement,
  maxBytes: number = MAX_TARGET_BYTES
): Promise<OptimizedAvatarResult> {
  const sizeSteps = [Math.min(280, Math.max(sourceCanvas.width, 160)), 256, 192, 160];
  const qualitySteps = [0.88, 0.76, 0.64, 0.5, 0.36, 0.24, 0.16];
  const workCanvas = document.createElement('canvas');
  const workCtx = workCanvas.getContext('2d');
  if (!workCtx) {
    throw new Error('مرورگر امکان پردازش تصویر پروفایل را ندارد.');
  }

  let bestBlob: Blob | null = null;

  for (const dim of sizeSteps) {
    workCanvas.width = dim;
    workCanvas.height = dim;
    workCtx.fillStyle = '#FFFFFF';
    workCtx.fillRect(0, 0, dim, dim);
    workCtx.drawImage(sourceCanvas, 0, 0, dim, dim);

    for (const q of qualitySteps) {
      const blob = await canvasToBlob(workCanvas, 'image/jpeg', q);
      if (!blob) continue;
      if (!bestBlob || blob.size < bestBlob.size) {
        bestBlob = blob;
      }
      if (blob.size <= maxBytes) {
        const file = new File([blob], 'child-avatar.jpg', {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        const dataUrl = await blobToDataUrl(blob);
        return {
          file,
          dataUrl,
          compressedSizeKb: Math.max(1, Math.round(blob.size / 1024)),
          compressedBytes: blob.size,
        };
      }
    }
  }

  if (bestBlob && bestBlob.size <= maxBytes) {
    const file = new File([bestBlob], 'child-avatar.jpg', {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
    const dataUrl = await blobToDataUrl(bestBlob);
    return {
      file,
      dataUrl,
      compressedSizeKb: Math.max(1, Math.round(bestBlob.size / 1024)),
      compressedBytes: bestBlob.size,
    };
  }

  throw new Error('حجم تصویر پروفایل بیش از حد مجاز است؛ لطفاً عکس دیگری انتخاب کنید.');
}

