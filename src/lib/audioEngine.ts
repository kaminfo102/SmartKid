export type SoundEffectKey =
  | 'beadClick'
  | 'uiTap'
  | 'success'
  | 'tryAgain'
  | 'levelComplete'
  | 'birdChirp';

export type PersianVoiceTone = 'teach' | 'cheer' | 'encourage';

/**
 * Placeholder structure for optional custom recorded Persian studio audio files.
 * If audio files are placed in /public/audio/, set `src` to use them with
 * automatic fallback to our procedural Web Audio synthesizer.
 */
export const AUDIO_ASSET_MAP: Record<SoundEffectKey, { src?: string; description: string }> = {
  beadClick: { description: 'صدای چوبی حرکت مهره چرتکه' },
  uiTap: { description: 'صدای کلیک نرم دکمه‌ها' },
  success: { description: 'صدای تشویق پاسخ درست' },
  tryAgain: { description: 'صدای ملایم تلاش دوباره' },
  levelComplete: { description: 'صدای پایان موفقیت‌آمیز مرحله' },
  birdChirp: { description: 'صدای جیک‌جیک شاد پرنده کیا' },
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
  private musicInterval: number | null = null;
  private musicStep = 0;

  private currentAudio: HTMLAudioElement | null = null;
  private ttsAbortController: AbortController | null = null;
  private audioCache = new Map<string, string>();
  private speakingListeners = new Set<(speaking: boolean) => void>();
  private voicesWarmupAttached = false;

  private setSpeaking(speaking: boolean) {
    this.speakingListeners.forEach((cb) => cb(speaking));
  }

  public onSpeakingChange(cb: (speaking: boolean) => void): () => void {
    this.speakingListeners.add(cb);
    return () => {
      this.speakingListeners.delete(cb);
    };
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
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

    const customSrc = AUDIO_ASSET_MAP[key]?.src;
    if (customSrc && typeof Audio !== 'undefined') {
      const audio = new Audio(customSrc);
      audio.volume = 0.6;
      audio.play().catch(() => this.playSynth(key));
      return;
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

  private startBackgroundMusic() {
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

  private stopBackgroundMusic() {
    if (this.musicInterval !== null && typeof window !== 'undefined') {
      window.clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
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

    // Score voices to prioritize natural female Persian voices
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
      utterance.pitch = 1.18; // Gentle warm female tone for children

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
   * Speaks Persian text using a warm, child-friendly female Iranian voice.
   * Uses server-side Gemini TTS (/api/tts) with caching and seamlessly falls back
   * to the browser's female Persian voice when offline.
   */
  public speakPersian(text: string, explicitTone?: PersianVoiceTone) {
    if (!this.speechEnabled || typeof window === 'undefined') return;
    const cleanText = text.trim();
    if (!cleanText) return;

    this.stopSpeech();

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
