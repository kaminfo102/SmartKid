import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Camera, CameraDirection, CameraResultType, CameraSource } from '@capacitor/camera';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

export function isCapacitorNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export async function hideNativeSplash(): Promise<void> {
  if (!isCapacitorNative()) return;
  try {
    await SplashScreen.hide();
  } catch {
    // ignore outside native runtime
  }
}

export async function syncNativeStatusBar(nightMode: boolean): Promise<void> {
  if (!isCapacitorNative()) return;
  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setBackgroundColor({
      color: nightMode ? '#0F172A' : '#F49A67',
    });
    await StatusBar.setStyle({
      style: Style.Dark,
    });
  } catch {
    // ignore outside native runtime
  }
}

export function registerNativeBackHandler(onBackPressed: () => boolean): () => void {
  if (!isCapacitorNative()) {
    return () => {};
  }
  let removed = false;
  const listenerPromise = CapApp.addListener('backButton', ({ canGoBack }) => {
    const handled = onBackPressed();
    if (!handled) {
      if (canGoBack) {
        window.history.back();
      } else {
        void CapApp.exitApp();
      }
    }
  });

  return () => {
    if (removed) return;
    removed = true;
    void listenerPromise.then((handle) => handle.remove()).catch(() => {});
  };
}

/**
 * Picks or captures an image using Capacitor's native Camera plugin on Android/iOS,
 * automatically requesting runtime camera/gallery permissions and returning a standard File.
 * Returns null if cancelled.
 */
export async function pickImageNative(
  source: 'camera' | 'gallery',
  preferredCamera: 'rear' | 'front' = 'rear'
): Promise<File | null> {
  if (!isCapacitorNative()) return null;

  if (source === 'camera') {
    const perms = await Camera.requestPermissions({ permissions: ['camera'] });
    if (perms.camera === 'denied') {
      throw new Error('دسترسی به دوربین در تنظیمات گوشی مسدود است. لطفاً مجوز دوربین را فعال کنید.');
    }
  } else {
    await Camera.requestPermissions({ permissions: ['photos'] }).catch(() => null);
  }

  let photo;
  try {
    photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      direction:
        preferredCamera === 'front' ? CameraDirection.Front : CameraDirection.Rear,
      correctOrientation: true,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : '';
    if (msg.includes('cancel') || msg.includes('user cancelled')) {
      return null;
    }
    throw err;
  }

  if (!photo?.dataUrl) return null;

  const res = await fetch(photo.dataUrl);
  const blob = await res.blob();
  const ext = photo.format === 'png' ? 'png' : 'jpg';
  const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
  return new File([blob], `native-capture-${Date.now()}.${ext}`, {
    type: mime,
    lastModified: Date.now(),
  });
}
