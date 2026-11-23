import type { AudioSettingsConfig, VoiceClipMapping } from '../types/app';

export type SoundEffectKey =
  | 'beadClick'
  | 'uiTap'
  | 'success'
  | 'tryAgain'
  | 'levelComplete'
  | 'birdChirp';

export type PersianVoiceTone = 'teach' | 'cheer' | 'encourage';

/**
 * Default static audio paths served from /public/audio/...
 * Any missing file automatically falls back to Web Audio synth / TTS without errors.
 */
export const STATIC_SFX_PATHS: Record<SoundEffectKey, string> = {
  beadClick: '/audio/sfx/bead-click.mp3',
  uiTap: '/audio/sfx/ui-tap.mp3',
  success: '/audio/sfx/success.mp3',
  tryAgain: '/audio/sfx/try-again.mp3',
  levelComplete: '/audio/sfx/level-complete.mp3',
  birdChirp: '/audio/sfx/bird-chirp.mp3',
};

export const STATIC_BG_MUSIC_PATH = '/audio/music/bg-music.mp3';

export const STATIC_VOICE_MAP: Record<string, string> = {
  praise_correct: '/audio/voice/praise-correct.mp3',
  try_again: '/audio/voice/try-again.mp3',
  level_complete: '/audio/voice/level-complete.mp3',
  welcome: '/audio/voice/welcome.mp3',
};

export const AUDIO_ASSET_MAP: Record<SoundEffectKey, { src?: string; description: string }> = {
  beadClick: { src: STATIC_SFX_PATHS.beadClick, description: 'صدای چوبی حرکت مهره چرتکه' },
  uiTap: { src: STATIC_SFX_PATHS.uiTap, description: 'صدای کلیک نرم دکمه‌ها' },
  success: { src: STATIC_SFX_PATHS.success, description: 'صدای تشویق پاسخ درست' },
  tryAgain: { src: STATIC_SFX_PATHS.tryAgain, description: 'صدای ملایم تلاش دوباره' },
  levelComplete: { src: STATIC_SFX_PATHS.levelComplete, description: 'صدای پایان موفقیت‌آمیز مرحله' },
  birdChirp: { src: STATIC_SFX_PATHS.birdChirp, description: 'صدای جیک‌جیک شاد پرنده کیا' },
};

const FEMALE_VOICE_HINTS = [
  'darya',
  'parisa',
  'sara',
  'zahra',
  'mina',
  'maryam',
  'leila',
  'niloofar',
  'female',
  'woman',
  'google فارسی',
];

const MALE_VOICE_HINTS = ['farid', 'dara', 'ali', 'reza', 'male', 'man'];

function inferToneFromText(text: string): PersianVoiceTone {
  if (/آفرین|هورا|تبریک|عالی|قهرمان/.test(text) && !/دوباره تلاش/.test(text)) {
    return 'cheer';
  }
  if (/دوباره تلاش|اشکالی ندارد|غصه نخور|نزدیک بودی/.test(text)) {
    return 'encourage';
  }
  return 'teach';
}

function normalizePhrase(text: string): string {
  return text
    .trim()
    .replace(/[\u200c\s]+/g, ' ')
    .replace(/[.!؟،؛:«»"']/g, '')
    .toLowerCase();
}

function isSafeAudioUrl(url?: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/audio/')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    return '';
  }
  return '';
}

function base64WavToObjectUrl(base64: string): string {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private soundEnabled = true;
  private musicEnabled = false;
  private speechEnabled = true;

  // Synth music fallback timer
  private musicInterval: number | null = null;
  private musicStep = 0;
  // File-based looped background music
  private bgMusicAudio: HTMLAudioElement | null = null;
  private bgMusicUrl: string = STATIC_BG_MUSIC_PATH;

  // Zero-latency Web Audio decoded SFX buffers + URL state caches
  private sfxBuffers = new Map<SoundEffectKey, AudioBuffer>();
  private sfxLoading = new Set<SoundEffectKey>();
  private failedUrls = new Set<string>();
  private validatedAudioUrls = new Map<string, boolean>();
  private sfxUrlOverrides: Partial<Record<SoundEffectKey, string>> = {};
  private pluginVoiceClips: VoiceClipMapping[] = [];

  private currentAudio: HTMLAudioElement | null = null;
  private ttsAbortController: AbortController | null = null;
  private audioCache = new Map<string, string>();
  private speakingListeners = new Set<(speaking: boolean) => void>();
  private voicesWarmupAttached = false;
  private unlockAttached = false;
  private hasUserGesture = false;

  private staticManifestPromise: Promise<{
    sfx: Partial<Record<SoundEffectKey, string>>;
    bgMusic: string | null;
    voice: Record<string, string>;
  } | null> | null = null;
  private staticManifestLoaded = false;
  private staticManifestAvailable = false;
  private availableLocalUrls = new Set<string>();

  constructor() {
    this.attachFirstGestureUnlock();
  }

  private isGestureUnlocked(): boolean {
    if (this.hasUserGesture) return true;
    if (typeof navigator !== 'undefined' && 'userActivation' in navigator) {
      const ua = (
        navigator as Navigator & {
          userActivation?: { hasBeenActive?: boolean; isActive?: boolean };
        }
      ).userActivation;
      if (ua?.hasBeenActive || ua?.isActive) {
        this.hasUserGesture = true;
        return true;
      }
      return false;
    }
    return false;
  }

  private attachFirstGestureUnlock() {
    if (typeof window === 'undefined' || this.unlockAttached) return;
    this.unlockAttached = true;

    const unlock = () => {
      const ctx = this.ensureContext(true);
      if (ctx) {
        if (this.soundEnabled) {
          this.preloadAllSfx();
        }
        if (this.musicEnabled && this.musicInterval === null && !this.bgMusicAudio) {
          this.startBackgroundMusic();
        }
      }
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      window.removeEventListener('touchstart', unlock, true);
    };

    window.addEventListener('pointerdown', unlock, { passive: true, once: true, capture: true });
    window.addEventListener('keydown', unlock, { passive: true, once: true, capture: true });
    window.addEventListener('touchstart', unlock, { passive: true, once: true, capture: true });
  }

  private setSpeaking(speaking: boolean) {
    this.speakingListeners.forEach((cb) => cb(speaking));
  }

  public onSpeakingChange(cb: (speaking: boolean) => void): () => void {
    this.speakingListeners.add(cb);
    return () => {
      this.speakingListeners.delete(cb);
    };
  }

  private ensureContext(fromGesture = false): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (fromGesture) {
      this.hasUserGesture = true;
    } else if (!this.isGestureUnlocked()) {
      return null;
    }
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private async ensureStaticManifest(): Promise<void> {
    if (this.staticManifestLoaded || typeof window === 'undefined') return;
    if (!this.staticManifestPromise) {
      this.staticManifestPromise = fetch('/audio/manifest.json', { method: 'GET' })
        .then(async (res) => {
          if (!res.ok) return null;
          const ct = (res.headers.get('content-type') || '').toLowerCase();
          if (!ct.includes('json')) return null;
          return (await res.json()) as {
            sfx?: Partial<Record<SoundEffectKey, string>>;
            bgMusic?: string | null;
            voice?: Record<string, string>;
          };
        })
        .then((data) => {
          this.staticManifestLoaded = true;
          if (!data) return null;
          this.staticManifestAvailable = true;
          const next = {
            sfx: data.sfx ?? {},
            bgMusic: data.bgMusic ?? null,
            voice: data.voice ?? {},
          };
          Object.values(next.sfx).forEach((u) => {
            if (typeof u === 'string' && u) this.availableLocalUrls.add(u);
          });
          if (typeof next.bgMusic === 'string' && next.bgMusic) {
            this.availableLocalUrls.add(next.bgMusic);
          }
          Object.values(next.voice).forEach((u) => {
            if (typeof u === 'string' && u) this.availableLocalUrls.add(u);
          });
          return next;
        })
        .catch(() => {
          this.staticManifestLoaded = true;
          return null;
        });
    }
    await this.staticManifestPromise;
  }

  private getEffectiveSfxUrl(key: SoundEffectKey): string {
    const custom = isSafeAudioUrl(this.sfxUrlOverrides[key]);
    if (custom) return custom;
    return STATIC_SFX_PATHS[key];
  }

  /**
   * Fetch and verify an audio URL really serves audio bytes (protects against SPA HTML fallback 200 OK).
   */
  private async fetchAudioArrayBuffer(url: string): Promise<ArrayBuffer | null> {
    if (!url || this.failedUrls.has(url)) return null;
    try {
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) {
        this.failedUrls.add(url);
        return null;
      }
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (ct.includes('text/html') || ct.includes('application/json') || ct.includes('text/plain')) {
        this.failedUrls.add(url);
        return null;
      }
      const buf = await res.arrayBuffer();
      if (!buf || buf.byteLength < 64) {
        this.failedUrls.add(url);
        return null;
      }
      this.validatedAudioUrls.set(url, true);
      return buf;
    } catch {
      this.failedUrls.add(url);
      return null;
    }
  }

  private async isPlayableAudioUrl(url: string): Promise<boolean> {
    if (!url) return false;
    if (this.failedUrls.has(url)) return false;
    if (this.validatedAudioUrls.has(url)) return Boolean(this.validatedAudioUrls.get(url));

    // For local /audio/* paths, consult /audio/manifest.json first so absent optional files never 404
    if (url.startsWith('/audio/')) {
      await this.ensureStaticManifest();
      if (this.staticManifestAvailable && !this.availableLocalUrls.has(url)) {
        this.validatedAudioUrls.set(url, false);
        return false;
      }
    }

    if (url.startsWith('/')) {
      try {
        const res = await fetch(url, { method: 'HEAD' });
        if (!res.ok) {
          this.failedUrls.add(url);
          return false;
        }
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        if (ct.includes('text/html') || ct.includes('application/json')) {
          this.failedUrls.add(url);
          return false;
        }
        this.validatedAudioUrls.set(url, true);
        return true;
      } catch {
        this.failedUrls.add(url);
        return false;
      }
    }

    // Remote plugin / CDN media URLs may restrict CORS HEAD requests; let <audio> try directly
    return true;
  }

  private async loadSfxBuffer(key: SoundEffectKey): Promise<AudioBuffer | null> {
    if (this.sfxBuffers.has(key)) return this.sfxBuffers.get(key) ?? null;
    if (this.sfxLoading.has(key)) return null;

    const url = this.getEffectiveSfxUrl(key);
    if (!url || this.failedUrls.has(url)) return null;

    const ctx = this.ensureContext();
    if (!ctx) return null;

    if (url.startsWith('/audio/')) {
      await this.ensureStaticManifest();
      if (this.staticManifestAvailable && !this.availableLocalUrls.has(url)) {
        return null;
      }
    }

    this.sfxLoading.add(key);
    try {
      const arrayBuf = await this.fetchAudioArrayBuffer(url);
      if (!arrayBuf) return null;
      const decoded = await ctx.decodeAudioData(arrayBuf.slice(0));
      this.sfxBuffers.set(key, decoded);
      return decoded;
    } catch {
      this.failedUrls.add(url);
      return null;
    } finally {
      this.sfxLoading.delete(key);
    }
  }

  private preloadAllSfx() {
    if (typeof window === 'undefined') return;
    (Object.keys(STATIC_SFX_PATHS) as SoundEffectKey[]).forEach((key) => {
      if (!this.sfxBuffers.has(key) && !this.sfxLoading.has(key)) {
        void this.loadSfxBuffer(key);
      }
    });
  }

  /**
   * Apply dynamic audio configuration returned from WordPress plugin.
   */
  public configureAssets(audioConfig?: AudioSettingsConfig | null) {
    if (!audioConfig) return;

    const nextSfx = audioConfig.sfxUrls ?? {};
    let sfxChanged = false;
    (Object.keys(STATIC_SFX_PATHS) as SoundEffectKey[]).forEach((key) => {
      const safe = isSafeAudioUrl(nextSfx[key]);
      if (this.sfxUrlOverrides[key] !== (safe || undefined)) {
        if (safe) {
          this.sfxUrlOverrides[key] = safe;
        } else {
          delete this.sfxUrlOverrides[key];
        }
        this.sfxBuffers.delete(key);
        sfxChanged = true;
      }
    });

    const nextBg = isSafeAudioUrl(audioConfig.bgMusicUrl) || STATIC_BG_MUSIC_PATH;
    if (nextBg !== this.bgMusicUrl) {
      this.bgMusicUrl = nextBg;
      if (this.musicEnabled) {
        this.stopBackgroundMusic();
        this.startBackgroundMusic();
      }
    }

    this.pluginVoiceClips = Array.isArray(audioConfig.voiceClips)
      ? audioConfig.voiceClips.filter((c) => c && isSafeAudioUrl(c.url))
      : [];

    if (sfxChanged && this.soundEnabled && this.isGestureUnlocked()) {
      this.preloadAllSfx();
    }
  }

  public configure(opts: {
    soundEnabled: boolean;
    musicEnabled: boolean;
    speechEnabled: boolean;
  }) {
    this.soundEnabled = opts.soundEnabled;
    this.speechEnabled = opts.speechEnabled;
    if (opts.musicEnabled !== this.musicEnabled) {
      this.musicEnabled = opts.musicEnabled;
      if (this.musicEnabled) {
        this.startBackgroundMusic();
      } else {
        this.stopBackgroundMusic();
      }
    }
    if (!this.speechEnabled) {
      this.stopSpeech();
    }
    if (
      this.speechEnabled &&
      !this.voicesWarmupAttached &&
      typeof window !== 'undefined' &&
      'speechSynthesis' in window
    ) {
      this.voicesWarmupAttached = true;
      window.speechSynthesis.getVoices();
    }
  }

  public play(key: SoundEffectKey) {
    if (!this.soundEnabled) return;

    const cachedBuffer = this.sfxBuffers.get(key);
    const ctx = this.ensureContext();
    if (cachedBuffer && ctx) {
      try {
        const src = ctx.createBufferSource();
        src.buffer = cachedBuffer;
        const gain = ctx.createGain();
        gain.gain.value = key === 'beadClick' ? 0.7 : 0.6;
        src.connect(gain);
        gain.connect(ctx.destination);
        src.start(0);
        return;
      } catch {
        // fallback to synth below
      }
    }

    // Trigger lazy decode for next call while playing synth zero-latency right now
    const effectiveUrl = this.getEffectiveSfxUrl(key);
    if (effectiveUrl && !this.failedUrls.has(effectiveUrl)) {
      if (effectiveUrl.startsWith('/')) {
        void this.loadSfxBuffer(key);
      } else {
        // Remote audio URL (e.g. from WordPress Media Library) — try Audio element or preload buffer
        void this.loadSfxBuffer(key).then((buf) => {
          if (!buf && !this.failedUrls.has(effectiveUrl) && typeof Audio !== 'undefined') {
            const audio = new Audio(effectiveUrl);
            audio.volume = 0.6;
            void audio.play().catch(() => {
              this.failedUrls.add(effectiveUrl);
            });
          }
        });
      }
    }

    this.playSynth(key);
  }

  private playSynth(key: SoundEffectKey) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (key === 'beadClick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(560, now);
      osc.frequency.exponentialRampToValueAtTime(190, now + 0.055);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
      return;
    }

    if (key === 'uiTap') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.04);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.055);
      return;
    }

    if (key === 'success') {
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = now + idx * 0.09;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.14, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.25);
      });
      return;
    }

    if (key === 'tryAgain') {
      const notes = [392.0, 349.23];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = now + idx * 0.11;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.23);
      });
      return;
    }

    if (key === 'levelComplete') {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = now + idx * 0.11;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.36);
      });
      return;
    }

    if (key === 'birdChirp') {
      const chirps = [
        { start: 1180, end: 1620, delay: 0 },
        { start: 1320, end: 1860, delay: 0.11 },
      ];
      chirps.forEach((c) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = now + c.delay;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(c.start, t);
        osc.frequency.exponentialRampToValueAtTime(c.end, t + 0.08);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.11);
      });
    }
  }

  private startSynthBackgroundMusic() {
    if (this.musicInterval !== null || typeof window === 'undefined') return;
    const pentatonic = [261.63, 293.66, 329.63, 392.0, 440.0, 392.0, 329.63, 293.66];
    this.musicInterval = window.setInterval(() => {
      if (!this.musicEnabled) return;
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const freq = pentatonic[this.musicStep % pentatonic.length];
      this.musicStep++;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.025, now);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.75);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.8);
    }, 900);
  }

  private startBackgroundMusic() {
    if (typeof window === 'undefined' || !this.isGestureUnlocked()) return;
    const musicUrl = this.bgMusicUrl;
    if (musicUrl && !this.failedUrls.has(musicUrl) && typeof Audio !== 'undefined') {
      void this.isPlayableAudioUrl(musicUrl).then((ok) => {
        if (!this.musicEnabled) return;
        if (ok) {
          this.stopSynthMusicOnly();
          const audio = new Audio(musicUrl);
          audio.loop = true;
          audio.volume = 0.2;
          this.bgMusicAudio = audio;
          audio.onerror = () => {
            this.failedUrls.add(musicUrl);
            this.bgMusicAudio = null;
            if (this.musicEnabled) this.startSynthBackgroundMusic();
          };
          void audio.play().catch(() => {
            if (this.bgMusicAudio === audio) {
              this.bgMusicAudio = null;
            }
            if (this.musicEnabled) this.startSynthBackgroundMusic();
          });
        } else {
          this.startSynthBackgroundMusic();
        }
      });
      return;
    }
    this.startSynthBackgroundMusic();
  }

  private stopSynthMusicOnly() {
    if (this.musicInterval !== null && typeof window !== 'undefined') {
      window.clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  private stopBackgroundMusic() {
    this.stopSynthMusicOnly();
    if (this.bgMusicAudio) {
      try {
        this.bgMusicAudio.pause();
        this.bgMusicAudio.currentTime = 0;
      } catch {
        // ignore
      }
      this.bgMusicAudio = null;
    }
  }

  private resolveVoiceUrl(
    cleanText: string,
    explicitAudioUrl?: string,
    staticKey?: string
  ): string {
    const direct = isSafeAudioUrl(explicitAudioUrl);
    if (direct && !this.failedUrls.has(direct)) return direct;

    const norm = normalizePhrase(cleanText);
    // 1. Check WordPress-managed phrase voice clips
    for (const clip of this.pluginVoiceClips) {
      const clipUrl = isSafeAudioUrl(clip.url);
      if (!clipUrl || this.failedUrls.has(clipUrl)) continue;
      if (staticKey && clip.key && clip.key === staticKey) return clipUrl;
      if (clip.phrase && normalizePhrase(clip.phrase) === norm) return clipUrl;
    }

    // 2. Check static key / standard built-in static voice files
    if (staticKey && STATIC_VOICE_MAP[staticKey] && !this.failedUrls.has(STATIC_VOICE_MAP[staticKey])) {
      return STATIC_VOICE_MAP[staticKey];
    }

    if (/آفرین|کاملا درست|خیلی خوب بود/.test(norm) && !this.failedUrls.has(STATIC_VOICE_MAP.praise_correct)) {
      return STATIC_VOICE_MAP.praise_correct;
    }
    if (/دوباره تلاش|اشکالی ندارد|غصه نخور/.test(norm) && !this.failedUrls.has(STATIC_VOICE_MAP.try_again)) {
      return STATIC_VOICE_MAP.try_again;
    }

    return '';
  }

  private pickFemalePersianVoice(): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    const persianVoices = voices.filter((v) => {
      const lang = v.lang.toLowerCase();
      const name = v.name.toLowerCase();
      return lang.startsWith('fa') || name.includes('persian') || name.includes('farsi');
    });
    if (persianVoices.length === 0) return null;

    let bestVoice = persianVoices[0];
    let bestScore = -999;
    for (const v of persianVoices) {
      const name = v.name.toLowerCase();
      let score = 0;
      if (v.lang.toLowerCase() === 'fa-ir') score += 5;
      if (FEMALE_VOICE_HINTS.some((h) => name.includes(h))) score += 20;
      if (MALE_VOICE_HINTS.some((h) => name.includes(h))) score -= 20;
      if (score > bestScore) {
        bestScore = score;
        bestVoice = v;
      }
    }
    return bestVoice;
  }

  private speakWithBrowserFallback(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fa-IR';
      utterance.rate = 0.9;
      utterance.pitch = 1.18;

      const femaleVoice = this.pickFemalePersianVoice();
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      utterance.onstart = () => this.setSpeaking(true);
      utterance.onend = () => this.setSpeaking(false);
      utterance.onerror = () => this.setSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch {
      this.setSpeaking(false);
    }
  }

  private playCachedUrl(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url);
      audio.volume = 0.95;
      this.currentAudio = audio;
      this.setSpeaking(true);

      audio.onended = () => {
        if (this.currentAudio === audio) {
          this.currentAudio = null;
          this.setSpeaking(false);
        }
        resolve();
      };
      audio.onerror = () => {
        if (this.currentAudio === audio) {
          this.currentAudio = null;
          this.setSpeaking(false);
        }
        reject(new Error('Audio playback failed'));
      };
      audio.play().catch((err) => {
        if (this.currentAudio === audio) {
          this.currentAudio = null;
          this.setSpeaking(false);
        }
        reject(err);
      });
    });
  }

  /**
   * Hybrid Persian Voice Player:
   * 1) Explicit per-step/question/stage MP3 URL or WordPress Voice Library clip
   * 2) Static pre-recorded voiceover file in /audio/voice/
   * 3) Server-side /api/tts with local cache
   * 4) Browser female Persian speechSynthesis
   */
  public speakPersian(
    text: string,
    explicitTone?: PersianVoiceTone,
    explicitAudioUrl?: string,
    staticKey?: string
  ) {
    if (!this.speechEnabled || typeof window === 'undefined') return;
    const cleanText = text.trim();
    const resolvedFileUrl = this.resolveVoiceUrl(cleanText, explicitAudioUrl, staticKey);
    if (!cleanText && !resolvedFileUrl) return;

    this.stopSpeech();

    if (resolvedFileUrl) {
      void this.isPlayableAudioUrl(resolvedFileUrl)
        .then(async (ok) => {
          if (!ok) throw new Error('Audio asset absent');
          await this.playCachedUrl(resolvedFileUrl);
        })
        .catch(() => {
          this.failedUrls.add(resolvedFileUrl);
          if (cleanText) {
            this.speakViaTtsOrBrowser(cleanText, explicitTone);
          }
        });
      return;
    }

    if (cleanText) {
      this.speakViaTtsOrBrowser(cleanText, explicitTone);
    }
  }

  private speakViaTtsOrBrowser(cleanText: string, explicitTone?: PersianVoiceTone) {
    const tone = explicitTone ?? inferToneFromText(cleanText);
    const cacheKey = `${tone}:${cleanText}`;
    const cachedUrl = this.audioCache.get(cacheKey);
    if (cachedUrl) {
      void this.playCachedUrl(cachedUrl).catch(() => {
        this.speakWithBrowserFallback(cleanText);
      });
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.speakWithBrowserFallback(cleanText);
      return;
    }

    const controller = new AbortController();
    this.ttsAbortController = controller;

    void fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText, tone }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`TTS HTTP ${res.status}`);
        }
        const data = (await res.json()) as { audioBase64?: string };
        if (!data.audioBase64) {
          throw new Error('Empty audio payload');
        }
        if (controller.signal.aborted) return;

        const objectUrl = base64WavToObjectUrl(data.audioBase64);
        if (this.audioCache.size >= 80) {
          const oldestKey = this.audioCache.keys().next().value;
          if (oldestKey !== undefined) {
            const oldUrl = this.audioCache.get(oldestKey);
            if (oldUrl) URL.revokeObjectURL(oldUrl);
            this.audioCache.delete(oldestKey);
          }
        }
        this.audioCache.set(cacheKey, objectUrl);

        await this.playCachedUrl(objectUrl);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        this.speakWithBrowserFallback(cleanText);
      });
  }

  public stopSpeech() {
    if (this.ttsAbortController) {
      this.ttsAbortController.abort();
      this.ttsAbortController = null;
    }
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {
        // ignore
      }
      this.currentAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    this.setSpeaking(false);
  }
}

export const audioEngine = new SoundEngine();
