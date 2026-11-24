import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ActiveMarketingResponse,
  AppSettings,
  BacsAccount,
  ChildProfile,
  LessonDefinition,
  PracticeQuestion,
  ScreenId,
  SessionResult,
  SkillKey,
  TermDefinition,
  WordPressConfig,
  WordPressUser,
} from './types/app';
import { DEFAULT_TERMS, LESSONS } from './data/lessons';
import {
  clearAppData,
  createChildProfile,
  loadAppData,
  normalizeChildProfile,
  saveAppData,
  type StoredAppData,
} from './lib/storage';
import {
  claimDailyBonusOnProfile,
  evaluateProfileBadges,
  redeemShopMedalOnProfile,
} from './lib/rewards';
import {
  createProfileInWordPress,
  dataUrlToImageFile,
  deleteProfileInWordPress,
  detectSameOriginWordPressUrl,
  fetchActiveMarketing,
  fetchWordPressCurriculum,
  fetchWordPressQuestions,
  getSavedWordPressUrl,
  hasMemoryBearerToken,
  restoreWordPressSession,
  setMemoryBearerToken,
  setOnUnauthorizedSession,
  syncProfileToWordPress,
  syncSettingsToWordPress,
  trackAppVisit,
  uploadChildAvatarInWordPress,
  verifyWooCommercePurchase,
  type WordPressAuthResponse,
} from './lib/wordpressApi';
import { audioEngine } from './lib/audioEngine';
import {
  hideNativeSplash,
  registerNativeBackHandler,
  syncNativeStatusBar,
} from './lib/nativeBridge';
import { StartScreen } from './components/StartScreen';
import { WelcomeScreen } from './components/WelcomeScreen';
import { WordPressAuthScreen } from './components/WordPressAuthScreen';
import type { ChildAvatarSavePayload } from './components/ChildAvatarEditorModal';
import { ProfileScreen } from './features/progress/ProfileScreen';
import { LeaderboardScreen } from './features/progress/LeaderboardScreen';
import { LessonMap } from './features/lessons/LessonMap';
import { LessonScreen } from './features/lessons/LessonScreen';
import { PracticeScreen } from './features/lessons/PracticeScreen';
import { GameScreen } from './features/games/GameScreen';
import { SorobanStepSimulator } from './features/abacus/SorobanStepSimulator';
import { FreeAbacusScreen } from './features/abacus/FreeAbacusScreen';
import { ResultScreen } from './features/progress/ResultScreen';
import { ParentGate } from './components/ParentGate';
import { SettingsPanel, type ParentsHubTab } from './features/progress/SettingsPanel';
import {
  PENDING_SHOP_CART_KEY,
  RESTORE_SHOP_CART_FLAG,
  ShopScreen,
} from './features/shop/ShopScreen';
import { SupportScreen } from './features/support/SupportScreen';
import { OfflineIndicator } from './components/PWAInstallButton';
import { ScheduledDialogHost } from './components/ScheduledDialogHost';

const ONBOARDING_SEEN_KEY = 'kn_onboarding_seen_v1';
const GUEST_MODE_KEY = 'kn_guest_mode_v1';

function readStorageFlag(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeStorageFlag(key: string, value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (value) {
      window.localStorage.setItem(key, '1');
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // ignore storage restriction
  }
}

interface PaymentReturnPayload {
  from: 'map' | 'shop' | 'orders';
  termDbId: number;
  orderId: number;
  orderNumber: string;
  status: string;
}

interface NoticeBannerState {
  type: 'success' | 'info' | 'error';
  text: string;
}

function consumeInitialPaymentReturn(): PaymentReturnPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('kn_payment_return') !== '1') {
      return null;
    }
    const rawFrom = (params.get('kn_from') || '').trim();
    const from: 'map' | 'shop' | 'orders' =
      rawFrom === 'shop' ? 'shop' : rawFrom === 'orders' ? 'orders' : 'map';
    const payload: PaymentReturnPayload = {
      from,
      termDbId: Number(params.get('kn_term')) || 0,
      orderId: Number(params.get('kn_order_id')) || 0,
      orderNumber: (params.get('kn_order_number') || '').trim(),
      status: (params.get('kn_status') || '').trim().toLowerCase(),
    };
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname + window.location.hash
    );
    return payload;
  } catch {
    return null;
  }
}

export default function App() {
  const initialPaymentReturnRef = useRef<PaymentReturnPayload | null | undefined>(undefined);
  if (initialPaymentReturnRef.current === undefined) {
    initialPaymentReturnRef.current = consumeInitialPaymentReturn();
  }

  const [data, setData] = useState<StoredAppData>(() => loadAppData());
  const [screen, setScreen] = useState<ScreenId>(() => {
    const ret = initialPaymentReturnRef.current;
    if (ret) {
      if (ret.from === 'shop') return 'shop';
      if (ret.from === 'orders') return 'auth';
      return 'map';
    }
    return readStorageFlag(ONBOARDING_SEEN_KEY) ? 'start' : 'welcome';
  });
  const [guestMode, setGuestMode] = useState<boolean>(() => readStorageFlag(GUEST_MODE_KEY));
  const [authReturnScreen, setAuthReturnScreen] = useState<ScreenId | null>(null);
  const [authReasonMessage, setAuthReasonMessage] = useState<string | null>(null);
  const [terms, setTerms] = useState<TermDefinition[]>(DEFAULT_TERMS);
  const [activeTermId, setActiveTermId] = useState<string>(DEFAULT_TERMS[0].id);
  const [wpQuestions, setWpQuestions] = useState<PracticeQuestion[]>([]);
  const [bacsAccounts, setBacsAccounts] = useState<BacsAccount[]>([]);
  const [wpUrl, setWpUrl] = useState<string>(() => getSavedWordPressUrl());
  const [wpUser, setWpUser] = useState<WordPressUser | null>(null);
  const [wpConnected, setWpConnected] = useState(false);
  const [wpRefreshing, setWpRefreshing] = useState(false);
  const [wpConfig, setWpConfig] = useState<WordPressConfig>({
    appTitle: 'کودک نابغه',
    dailyChallengeCount: 5,
    allowRegistration: true,
  });

  const [activeLesson, setActiveLesson] = useState<LessonDefinition>(LESSONS[0]);
  const [practiceSkill, setPracticeSkill] = useState<SkillKey>('recognition');
  const [lastResult, setLastResult] = useState<SessionResult | null>(null);
  const [parentUnlocked, setParentUnlocked] = useState(false);
  const [parentsTab, setParentsTab] = useState<ParentsHubTab>('children');
  const [profileTab, setProfileTab] = useState<'details' | 'profiles'>('details');
  const [mapReturnNotice, setMapReturnNotice] = useState<NoticeBannerState | null>(null);
  const [shopReturnNotice, setShopReturnNotice] = useState<NoticeBannerState | null>(null);
  const [ordersRefreshTrigger, setOrdersRefreshTrigger] = useState(0);
  const [pendingCartRestoreSignal, setPendingCartRestoreSignal] = useState(0);
  const [marketing, setMarketing] = useState<ActiveMarketingResponse>({
    banners: [],
    dialogs: [],
  });
  const returnFocusTermDbIdRef = useRef<number>(
    initialPaymentReturnRef.current?.termDbId || 0
  );

  // Refs to execute network persistence strictly outside React state updaters
  const dataRef = useRef<StoredAppData>(data);
  const wpUrlRef = useRef<string>(wpUrl);
  const wpUserRef = useRef<WordPressUser | null>(wpUser);
  const syncTimerRef = useRef<number | null>(null);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    wpUrlRef.current = wpUrl;
  }, [wpUrl]);

  useEffect(() => {
    wpUserRef.current = wpUser;
  }, [wpUser]);

  useEffect(() => {
    return () => {
      if (syncTimerRef.current !== null) {
        window.clearTimeout(syncTimerRef.current);
      }
    };
  }, []);

  const lessons = useMemo<LessonDefinition[]>(() => {
    const flattened = terms.flatMap((t) => t.stages);
    return flattened.length > 0 ? flattened : LESSONS;
  }, [terms]);

  const unlockedLessons = useMemo<LessonDefinition[]>(() => {
    const allowed = terms
      .filter((t) => t.isFree || t.unlocked)
      .flatMap((t) => t.stages);
    return allowed.length > 0 ? allowed : lessons;
  }, [terms, lessons]);

  const activeProfile = useMemo<ChildProfile>(() => {
    const found =
      data.profiles.find((p) => p.id === data.activeProfileId) ?? data.profiles[0];
    return normalizeChildProfile(found);
  }, [data.profiles, data.activeProfileId]);

  const isAuthenticatedToBackend = useCallback((): boolean => {
    return Boolean(wpUrlRef.current) && (hasMemoryBearerToken() || Boolean(wpUserRef.current));
  }, []);

  const scheduleProfileSync = useCallback(
    (profile: ChildProfile, immediate = false) => {
      const targetUrl = wpUrlRef.current;
      if (!targetUrl || (!hasMemoryBearerToken() && !wpUserRef.current)) {
        return;
      }

      if (syncTimerRef.current !== null) {
        window.clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }

      // Never upload large inline data-URIs via JSON profile PUT; files go to /avatar
      const payloadToSync: ChildProfile =
        profile.avatarUrl?.startsWith('data:')
          ? { ...profile, avatarUrl: undefined }
          : profile;

      if (immediate) {
        void syncProfileToWordPress(targetUrl, payloadToSync).catch(() => {});
        return;
      }

      const targetId = profile.id;
      syncTimerRef.current = window.setTimeout(() => {
        syncTimerRef.current = null;
        const currentUrl = wpUrlRef.current;
        if (!currentUrl || (!hasMemoryBearerToken() && !wpUserRef.current)) return;
        const latestProfile =
          dataRef.current.profiles.find((p) => p.id === targetId) ?? payloadToSync;
        const safeLatest: ChildProfile =
          latestProfile.avatarUrl?.startsWith('data:')
            ? { ...latestProfile, avatarUrl: undefined }
            : latestProfile;
        void syncProfileToWordPress(currentUrl, safeLatest).catch(() => {});
      }, 500);
    },
    []
  );

  // Fetch dynamic Terms, Learning Roads & Practice Questions from WordPress
  const refreshFromWordPress = useCallback(
    async (overrideUrl?: string): Promise<boolean> => {
      const targetUrl = overrideUrl ?? wpUrl;
      if (!targetUrl) {
        setWpConnected(false);
        return false;
      }
      setWpRefreshing(true);
      try {
        const [curriculum, questions, activeMarketing] = await Promise.all([
          fetchWordPressCurriculum(targetUrl),
          fetchWordPressQuestions(targetUrl),
          fetchActiveMarketing(targetUrl).catch(() => ({ banners: [], dialogs: [] })),
        ]);
        setMarketing(activeMarketing);

        if (curriculum.terms.length > 0) {
          setTerms(curriculum.terms);
          const focusDbId = returnFocusTermDbIdRef.current;
          if (focusDbId > 0) {
            const matchedFocus = curriculum.terms.find((t) => t.dbId === focusDbId);
            if (matchedFocus) {
              setActiveTermId(matchedFocus.id);
              returnFocusTermDbIdRef.current = 0;
            }
          } else {
            setActiveTermId((prev) =>
              curriculum.terms.some((t) => t.id === prev)
                ? prev
                : curriculum.terms[0].id
            );
          }
          const allStages = curriculum.terms.flatMap((t) => t.stages);
          if (allStages.length > 0) {
            setActiveLesson((prev) => {
              const match = allStages.find((s) => s.id === prev.id);
              return match ?? allStages[0];
            });
          }
        } else if (curriculum.stages.length > 0) {
          setTerms((prev) =>
            prev.map((t, i) =>
              i === 0 ? { ...t, stages: curriculum.stages } : t
            )
          );
          setActiveLesson((prev) => {
            const match = curriculum.stages.find((s) => s.id === prev.id);
            return match ?? curriculum.stages[0];
          });
        }

        setWpQuestions(questions);
        setBacsAccounts(curriculum.bacsAccounts ?? []);
        audioEngine.configureAssets(curriculum.config.audioSettings);
        setWpConfig((prev) => ({
          ...prev,
          appTitle: curriculum.config.appTitle || prev.appTitle,
          dailyChallengeCount:
            curriculum.config.dailyChallengeCount || prev.dailyChallengeCount,
          wooActive: curriculum.config.wooActive ?? prev.wooActive,
          wooCurrency: curriculum.config.wooCurrency ?? prev.wooCurrency,
          smsOtpEnabled: curriculum.config.smsOtpEnabled ?? prev.smsOtpEnabled,
          audioSettings: curriculum.config.audioSettings ?? prev.audioSettings,
        }));
        setWpConnected(true);
        return true;
      } catch {
        setWpConnected(false);
        return false;
      } finally {
        setWpRefreshing(false);
      }
    },
    [wpUrl]
  );

  // Auto-detect same-origin WordPress if VITE_WORDPRESS_URL was not set at build time
  useEffect(() => {
    if (wpUrl) return;
    let cancelled = false;
    void detectSameOriginWordPressUrl().then((detected) => {
      if (!cancelled && detected) {
        setWpUrl(detected);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [wpUrl]);

  // Auto-restore authenticated WordPress session + load dynamic terms on boot
  useEffect(() => {
    if (!wpUrl) return;
    let cancelled = false;
    void (async () => {
      const restored = await restoreWordPressSession(wpUrl);
      if (cancelled) return;
      if (restored) {
        const normalizedProfiles =
          restored.profiles.length > 0 ? restored.profiles.map(normalizeChildProfile) : [];
        wpUserRef.current = restored.user;
        setWpUser(restored.user);
        setWpConnected(true);
        writeStorageFlag(ONBOARDING_SEEN_KEY, true);
        writeStorageFlag(GUEST_MODE_KEY, false);
        setGuestMode(false);
        setScreen((prev) => (prev === 'welcome' ? 'start' : prev));
        setData((prev) => {
          const next: StoredAppData = {
            profiles: normalizedProfiles.length > 0 ? normalizedProfiles : prev.profiles,
            activeProfileId:
              normalizedProfiles.length > 0 ? normalizedProfiles[0].id : prev.activeProfileId,
            settings: restored.settings
              ? { ...prev.settings, ...restored.settings }
              : prev.settings,
          };
          dataRef.current = next;
          return next;
        });
        if (Array.isArray(restored.unlockedTermIds) && restored.unlockedTermIds.length > 0) {
          const unlockedSet = new Set(restored.unlockedTermIds);
          setTerms((prev) =>
            prev.map((t) =>
              t.isFree || (t.dbId && unlockedSet.has(t.dbId))
                ? { ...t, unlocked: true }
                : t
            )
          );
        }
      }
      const pendingReturn = initialPaymentReturnRef.current;
      if (pendingReturn) {
        initialPaymentReturnRef.current = null;
        const orderLabel = pendingReturn.orderNumber
          ? `#${pendingReturn.orderNumber}`
          : pendingReturn.orderId > 0
          ? `#${pendingReturn.orderId}`
          : '';
        const isPaid =
          pendingReturn.status === 'processing' || pendingReturn.status === 'completed';
        const isPending =
          pendingReturn.status === 'on-hold' || pendingReturn.status === 'pending';
        const isFailedOrCancelled =
          pendingReturn.status === 'failed' || pendingReturn.status === 'cancelled';

        if (isPaid && pendingReturn.termDbId > 0 && restored?.user) {
          try {
            await verifyWooCommercePurchase(wpUrl, pendingReturn.termDbId);
          } catch {
            // refreshFromWordPress below will still pull unlocked_term_ids
          }
        }

        if (typeof window !== 'undefined') {
          try {
            if (isFailedOrCancelled) {
              window.sessionStorage.setItem(RESTORE_SHOP_CART_FLAG, '1');
              setPendingCartRestoreSignal((n) => n + 1);
            } else {
              window.sessionStorage.removeItem(RESTORE_SHOP_CART_FLAG);
              window.sessionStorage.removeItem(PENDING_SHOP_CART_KEY);
            }
          } catch {
            // ignore storage errors
          }
        }

        if (pendingReturn.from === 'shop') {
          if (isPaid) {
            audioEngine.play('levelComplete');
            setShopReturnNotice({
              type: 'success',
              text: `سفارش ${orderLabel} با موفقیت پرداخت و ثبت شد! از بخش «سفارش‌ها» می‌توانید وضعیت ارسال را پیگیری کنید.`,
            });
          } else if (isPending) {
            audioEngine.play('success');
            setShopReturnNotice({
              type: 'info',
              text: `سفارش ${orderLabel} ثبت شد و در حال بررسی و تایید توسط مدیر می‌باشد.`,
            });
          } else if (isFailedOrCancelled) {
            setShopReturnNotice({
              type: 'error',
              text: `پرداخت سفارش ${orderLabel} تکمیل نشد. در صورت تمایل سبد خرید شما بازیابی شد.`,
            });
          } else {
            setShopReturnNotice({
              type: 'info',
              text: `وضعیت سفارش ${orderLabel} به‌روزرسانی شد.`,
            });
          }
        } else if (pendingReturn.from === 'map') {
          if (isPaid) {
            audioEngine.play('levelComplete');
            setMapReturnNotice({
              type: 'success',
              text: `پرداخت سفارش ${orderLabel} با موفقیت تایید و دسترسی دوره آموزشی برای کودک شما فعال شد!`,
            });
          } else if (isPending) {
            audioEngine.play('success');
            setMapReturnNotice({
              type: 'info',
              text: `سفارش ${orderLabel} ثبت شد و در حال بررسی و تایید توسط مدیر می‌باشد.`,
            });
          } else if (isFailedOrCancelled) {
            setMapReturnNotice({
              type: 'error',
              text: `پرداخت سفارش ${orderLabel} تکمیل نشد یا لغو گردید.`,
            });
          }
        }

        setOrdersRefreshTrigger((n) => n + 1);
      }

      await refreshFromWordPress(wpUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [wpUrl, refreshFromWordPress]);

  // Persist to localStorage whenever data changes
  useEffect(() => {
    saveAppData(data);
  }, [data]);

  // Sync audio, night mode, and reduced-motion settings
  useEffect(() => {
    audioEngine.configure({
      soundEnabled: data.settings.soundEnabled,
      musicEnabled: data.settings.musicEnabled,
      speechEnabled: data.settings.speechEnabled,
    });

    const root = document.documentElement;
    if (data.settings.nightMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    if (data.settings.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    void syncNativeStatusBar(data.settings.nightMode);
  }, [data.settings]);

  // Hide native Android splash screen once mounted and handle hardware back button
  useEffect(() => {
    void hideNativeSplash();
  }, []);

  // Track Web App & Mobile App visits per screen change
  useEffect(() => {
    if (!wpUrl) return;
    void trackAppVisit(wpUrl, screen);
  }, [wpUrl, screen]);

  useEffect(() => {
    return registerNativeBackHandler(() => {
      if (screen === 'lesson') {
        setScreen('map');
        return true;
      }
      if (screen === 'welcome') {
        return false;
      }
      if (screen === 'auth') {
        const dest =
          authReturnScreen && authReturnScreen !== 'auth' ? authReturnScreen : 'start';
        setAuthReturnScreen(null);
        setAuthReasonMessage(null);
        setScreen(dest);
        return true;
      }
      if (screen !== 'start') {
        if (screen === 'parents') {
          setParentUnlocked(false);
        }
        setScreen('start');
        return true;
      }
      return false;
    });
  }, [screen, authReturnScreen]);

  const updateSettings = useCallback(
    (patch: Partial<AppSettings>) => {
      const prev = dataRef.current;
      const nextSettings = { ...prev.settings, ...patch };
      const nextData: StoredAppData = {
        ...prev,
        settings: nextSettings,
      };
      dataRef.current = nextData;
      setData(nextData);
      if (isAuthenticatedToBackend()) {
        void syncSettingsToWordPress(wpUrlRef.current, nextSettings).catch(() => {});
      }
    },
    [isAuthenticatedToBackend]
  );

  const updateActiveProfile = useCallback(
    (updater: (p: ChildProfile) => ChildProfile, immediate = true) => {
      const prev = dataRef.current;
      const updatedProfiles = prev.profiles.map((p) =>
        p.id === prev.activeProfileId ? updater(normalizeChildProfile(p)) : p
      );
      const nextData: StoredAppData = {
        ...prev,
        profiles: updatedProfiles,
      };
      dataRef.current = nextData;
      setData(nextData);
      const updatedActive = updatedProfiles.find(
        (p) => p.id === nextData.activeProfileId
      );
      if (updatedActive) {
        scheduleProfileSync(updatedActive, immediate);
      }
    },
    [scheduleProfileSync]
  );

  // Track active learning minutes gently every 60s
  useEffect(() => {
    const isLearningScreen =
      screen === 'lesson' || screen === 'practice' || screen === 'games';
    if (!isLearningScreen) return;

    const timer = window.setInterval(() => {
      updateActiveProfile(
        (p) => ({ ...p, practiceMinutes: p.practiceMinutes + 1 }),
        true
      );
    }, 60000);

    return () => window.clearInterval(timer);
  }, [screen, updateActiveProfile]);

  const handleRecordAnswer = (skill: SkillKey, correct: boolean) => {
    updateActiveProfile((p) => {
      const prevStat = p.skills[skill] ?? { correct: 0, attempts: 0 };
      const nextCorrect = p.totalCorrect + (correct ? 1 : 0);
      const nextAttempts = p.totalAttempts + 1;
      const ratio = nextAttempts > 0 ? nextCorrect / nextAttempts : 1;

      let nextDiff = p.difficultyLevel;
      if (correct && ratio > 0.8 && p.difficultyLevel < 5) {
        nextDiff = p.difficultyLevel + 1;
      } else if (!correct && ratio < 0.45 && p.difficultyLevel > 1) {
        nextDiff = p.difficultyLevel - 1;
      }

      const draft: ChildProfile = {
        ...p,
        totalCorrect: nextCorrect,
        totalAttempts: nextAttempts,
        difficultyLevel: nextDiff,
        skills: {
          ...p.skills,
          [skill]: {
            correct: prevStat.correct + (correct ? 1 : 0),
            attempts: prevStat.attempts + 1,
          },
        },
      };
      return {
        ...draft,
        badges: evaluateProfileBadges(draft, lessons),
      };
    }, false);
  };

  const handleCompleteLesson = (
    result: SessionResult,
    score: number,
    attempts: number
  ) => {
    if (result.lessonId) {
      updateActiveProfile((p) => {
        const existing = p.lessons[result.lessonId!];
        const prevStars = existing?.stars ?? 0;
        const gainedStars = Math.max(0, result.stars - prevStars);
        const prevSkill = p.skills[result.skill] ?? { correct: 0, attempts: 0 };
        const draft: ChildProfile = {
          ...p,
          totalStars: p.totalStars + (existing ? gainedStars : result.stars),
          totalCorrect: p.totalCorrect + score,
          totalAttempts: p.totalAttempts + attempts,
          lessons: {
            ...p.lessons,
            [result.lessonId!]: {
              completed: true,
              stars: Math.max(prevStars, result.stars),
              bestScore: Math.max(existing?.bestScore ?? 0, score),
            },
          },
          skills: {
            ...p.skills,
            [result.skill]: {
              correct: prevSkill.correct + score,
              attempts: prevSkill.attempts + attempts,
            },
          },
        };
        return {
          ...draft,
          badges: evaluateProfileBadges(draft, lessons),
        };
      }, true);
    }
    setLastResult(result);
    setScreen('result');
  };

  const handleCompleteSession = (result: SessionResult) => {
    updateActiveProfile((p) => {
      const draft: ChildProfile = {
        ...p,
        totalStars: p.totalStars + result.stars,
      };
      return {
        ...draft,
        badges: evaluateProfileBadges(draft, lessons),
      };
    }, true);
    setLastResult(result);
    setScreen('result');
  };

  const handleNextFromResult = () => {
    if (!lastResult) {
      setScreen('map');
      return;
    }
    if (lastResult.nextAction === 'next-lesson' && lastResult.lessonId) {
      const idx = unlockedLessons.findIndex((l) => l.id === lastResult.lessonId);
      if (idx >= 0 && idx + 1 < unlockedLessons.length) {
        setActiveLesson(unlockedLessons[idx + 1]);
        setScreen('lesson');
        return;
      }
      setScreen('map');
      return;
    }
    if (lastResult.nextAction === 'games') {
      setScreen('games');
      return;
    }
    if (lastResult.nextAction === 'practice') {
      setScreen('practice');
      return;
    }
    setScreen('map');
  };

  const handleRetryFromResult = () => {
    if (!lastResult) {
      setScreen('map');
      return;
    }
    if (lastResult.lessonId) {
      const found = lessons.find((l) => l.id === lastResult.lessonId);
      if (found) setActiveLesson(found);
      setScreen('lesson');
      return;
    }
    if (lastResult.nextAction === 'games') {
      setScreen('games');
      return;
    }
    setScreen('practice');
  };

  const handleSelectProfile = useCallback((id: string) => {
    audioEngine.play('uiTap');
    const prev = dataRef.current;
    if (!prev.profiles.some((p) => p.id === id)) return;
    const nextData: StoredAppData = { ...prev, activeProfileId: id };
    dataRef.current = nextData;
    setData(nextData);
  }, []);

  const handleCreateChildProfile = useCallback(
    async (payload: ChildAvatarSavePayload) => {
      audioEngine.play('success');
      const created = createChildProfile(
        payload.name,
        payload.avatar,
        payload.age,
        payload.avatarUrl
      );
      const prev = dataRef.current;
      const nextData: StoredAppData = {
        ...prev,
        profiles: [...prev.profiles, created],
        activeProfileId: created.id,
      };
      dataRef.current = nextData;
      setData(nextData);

      if (isAuthenticatedToBackend()) {
        const currentUrl = wpUrlRef.current;
        try {
          await createProfileInWordPress(currentUrl, {
            ...created,
            avatarUrl: created.avatarUrl?.startsWith('data:') ? undefined : created.avatarUrl,
          });
          if (payload.avatarFile) {
            const uploaded = await uploadChildAvatarInWordPress(
              currentUrl,
              created.id,
              payload.avatarFile
            );
            if (uploaded.avatarUrl) {
              setData((cur) => {
                const updated: StoredAppData = {
                  ...cur,
                  profiles: cur.profiles.map((p) =>
                    p.id === created.id ? { ...p, avatarUrl: uploaded.avatarUrl } : p
                  ),
                };
                dataRef.current = updated;
                return updated;
              });
            }
          }
        } catch {
          // Keep optimistic local profile on transient network failure
        }
      }
    },
    [isAuthenticatedToBackend]
  );

  const handleUpdateChildProfile = useCallback(
    async (profileId: string, payload: ChildAvatarSavePayload) => {
      audioEngine.play('success');
      const prev = dataRef.current;
      const existing = prev.profiles.find((p) => p.id === profileId);
      if (!existing) return;

      const nextAvatarUrl = payload.removePhoto
        ? undefined
        : payload.avatarUrl !== undefined
          ? payload.avatarUrl
          : existing.avatarUrl;

      const updatedProfile: ChildProfile = {
        ...existing,
        name: payload.name,
        age: payload.age,
        avatar: payload.avatar,
        avatarUrl: nextAvatarUrl,
      };

      const nextData: StoredAppData = {
        ...prev,
        profiles: prev.profiles.map((p) => (p.id === profileId ? updatedProfile : p)),
      };
      dataRef.current = nextData;
      setData(nextData);

      if (isAuthenticatedToBackend()) {
        const currentUrl = wpUrlRef.current;
        try {
          if (payload.avatarFile) {
            const uploaded = await uploadChildAvatarInWordPress(
              currentUrl,
              profileId,
              payload.avatarFile
            );
            const serverAvatarUrl = uploaded.avatarUrl || nextAvatarUrl;
            const syncedDraft: ChildProfile = {
              ...updatedProfile,
              avatarUrl: serverAvatarUrl,
            };
            await syncProfileToWordPress(currentUrl, syncedDraft);
            if (uploaded.avatarUrl) {
              setData((cur) => {
                const patched: StoredAppData = {
                  ...cur,
                  profiles: cur.profiles.map((p) =>
                    p.id === profileId ? { ...p, avatarUrl: uploaded.avatarUrl } : p
                  ),
                };
                dataRef.current = patched;
                return patched;
              });
            }
          } else {
            await syncProfileToWordPress(currentUrl, {
              ...updatedProfile,
              avatarUrl: payload.removePhoto
                ? ''
                : updatedProfile.avatarUrl?.startsWith('data:')
                  ? undefined
                  : updatedProfile.avatarUrl,
            });
          }
        } catch {
          // Retain local state if offline
        }
      }
    },
    [isAuthenticatedToBackend]
  );

  const handleDeleteChildProfile = useCallback(
    async (profileId: string) => {
      const prev = dataRef.current;
      if (prev.profiles.length <= 1) return;
      const remaining = prev.profiles.filter((p) => p.id !== profileId);
      if (remaining.length === 0) return;

      audioEngine.play('uiTap');
      const nextActiveId =
        prev.activeProfileId === profileId ? remaining[0].id : prev.activeProfileId;

      const nextData: StoredAppData = {
        ...prev,
        profiles: remaining,
        activeProfileId: nextActiveId,
      };
      dataRef.current = nextData;
      setData(nextData);

      if (isAuthenticatedToBackend()) {
        try {
          await deleteProfileInWordPress(wpUrlRef.current, profileId);
        } catch {
          // Ignored on transient network issue
        }
      }
    },
    [isAuthenticatedToBackend]
  );

  const handleWordPressAuthSuccess = (res: WordPressAuthResponse) => {
    wpUserRef.current = res.user;
    setWpUser(res.user);
    setWpConnected(true);
    writeStorageFlag(ONBOARDING_SEEN_KEY, true);
    writeStorageFlag(GUEST_MODE_KEY, false);
    setGuestMode(false);
    setAuthReasonMessage(null);

    const normalizedProfiles =
      res.profiles.length > 0 ? res.profiles.map(normalizeChildProfile) : [];

    const prev = dataRef.current;
    const guestProfile = normalizeChildProfile(
      prev.profiles.find((p) => p.id === prev.activeProfileId) ?? prev.profiles[0]
    );
    const serverFirst = normalizedProfiles[0];

    const isServerStarterEmpty =
      normalizedProfiles.length === 1 &&
      Boolean(serverFirst) &&
      serverFirst.totalAttempts === 0 &&
      serverFirst.totalStars === 0 &&
      (serverFirst.rewardPoints ?? 0) === 0 &&
      (serverFirst.dailyBonus?.totalDaysClaimed ?? 0) === 0 &&
      Object.keys(serverFirst.lessons).length === 0;

    const hasGuestProgress =
      guestProfile.totalAttempts > 0 ||
      guestProfile.totalStars > 0 ||
      (guestProfile.rewardPoints ?? 0) > 0 ||
      (guestProfile.dailyBonus?.totalDaysClaimed ?? 0) > 0 ||
      Object.keys(guestProfile.lessons).length > 0 ||
      guestProfile.name !== 'کیا' ||
      Boolean(guestProfile.avatarUrl);

    if (isServerStarterEmpty && serverFirst && hasGuestProgress) {
      const mergedProfile: ChildProfile = {
        ...guestProfile,
        id: serverFirst.id,
        avatarUrl: guestProfile.avatarUrl || serverFirst.avatarUrl,
      };
      const mergedData: StoredAppData = {
        profiles: [mergedProfile],
        activeProfileId: mergedProfile.id,
        settings: res.settings ? { ...prev.settings, ...res.settings } : prev.settings,
      };
      dataRef.current = mergedData;
      setData(mergedData);

      const targetUrl = wpUrlRef.current;
      if (targetUrl) {
        void (async () => {
          try {
            await syncProfileToWordPress(targetUrl, {
              ...mergedProfile,
              avatarUrl: mergedProfile.avatarUrl?.startsWith('data:')
                ? undefined
                : mergedProfile.avatarUrl,
            });
            if (guestProfile.avatarUrl?.startsWith('data:image/')) {
              const avatarFile = dataUrlToImageFile(
                guestProfile.avatarUrl,
                `child-avatar-${serverFirst.id}.jpg`
              );
              if (avatarFile) {
                const uploaded = await uploadChildAvatarInWordPress(
                  targetUrl,
                  serverFirst.id,
                  avatarFile
                );
                if (uploaded.avatarUrl) {
                  setData((cur) => {
                    const patched: StoredAppData = {
                      ...cur,
                      profiles: cur.profiles.map((p) =>
                        p.id === serverFirst.id ? { ...p, avatarUrl: uploaded.avatarUrl } : p
                      ),
                    };
                    dataRef.current = patched;
                    return patched;
                  });
                }
              }
            }
          } catch {
            // Non-blocking background guest migration
          }
        })();
      }
    } else {
      const nextData: StoredAppData = {
        profiles: normalizedProfiles.length > 0 ? normalizedProfiles : prev.profiles,
        activeProfileId:
          normalizedProfiles.length > 0 ? normalizedProfiles[0].id : prev.activeProfileId,
        settings: res.settings ? { ...prev.settings, ...res.settings } : prev.settings,
      };
      dataRef.current = nextData;
      setData(nextData);
    }

    if (Array.isArray(res.unlockedTermIds) && res.unlockedTermIds.length > 0) {
      const unlockedSet = new Set(res.unlockedTermIds);
      setTerms((curTerms) =>
        curTerms.map((t) =>
          t.isFree || (t.dbId && unlockedSet.has(t.dbId))
            ? { ...t, unlocked: true }
            : t
        )
      );
    }
    void refreshFromWordPress();
    if (screen === 'auth') {
      const targetScreen =
        authReturnScreen && authReturnScreen !== 'auth' ? authReturnScreen : 'start';
      setAuthReturnScreen(null);
      setScreen(targetScreen);
    }
  };

  const handleWordPressLogout = useCallback(() => {
    setMemoryBearerToken(null);
    wpUserRef.current = null;
    setWpUser(null);
    setTerms((prev) =>
      prev.map((t) => ({
        ...t,
        unlocked: t.isFree,
        unlockedSource: t.isFree ? 'free' : null,
        pendingOrder: null,
      }))
    );
  }, []);

  useEffect(() => {
    setOnUnauthorizedSession(() => {
      handleWordPressLogout();
    });
    return () => setOnUnauthorizedSession(null);
  }, [handleWordPressLogout]);

  const handleTermUnlocked = useCallback(
    (termDbId?: number) => {
      if (termDbId) {
        setTerms((prev) =>
          prev.map((t) =>
            t.dbId === termDbId
              ? { ...t, unlocked: true, unlockedSource: 'woocommerce', pendingOrder: null }
              : t
          )
        );
      }
      void refreshFromWordPress();
    },
    [refreshFromWordPress]
  );

  const handleClaimDailyBonus = () => {
    const res = claimDailyBonusOnProfile(activeProfile, lessons);
    if (!res.alreadyClaimed) {
      audioEngine.play('levelComplete');
      audioEngine.speakPersian('آفرین! پاداش روزانه به حسابت اضافه شد!', 'cheer');
      updateActiveProfile(() => res.updatedProfile, true);
    }
    return {
      awardedPoints: res.awardedPoints,
      newBadgeTitles: res.newBadges.map((b) => b.title),
    };
  };

  const handleRedeemShopMedal = (medalId: string) => {
    const res = redeemShopMedalOnProfile(activeProfile, medalId, lessons);
    if (res.ok) {
      audioEngine.play('levelComplete');
      updateActiveProfile(() => res.updatedProfile, true);
    } else {
      audioEngine.play('tryAgain');
    }
    return {
      ok: res.ok,
      error: res.error,
    };
  };

  const handleSpendPointsOnOrder = (points: number) => {
    const safeSpend = Math.max(0, Math.floor(points));
    if (safeSpend <= 0) return;
    updateActiveProfile(
      (p) => ({
        ...p,
        rewardPoints: Math.max(0, (p.rewardPoints ?? 0) - safeSpend),
      }),
      true
    );
  };

  const openParentsHub = useCallback((tab: ParentsHubTab = 'children') => {
    audioEngine.play('uiTap');
    setParentsTab(tab);
    setParentUnlocked(false);
    setScreen('parents');
  }, []);

  const handleEnterLoginFromWelcome = useCallback(() => {
    writeStorageFlag(ONBOARDING_SEEN_KEY, true);
    setAuthReturnScreen('start');
    setAuthReasonMessage(null);
    setScreen('auth');
  }, []);

  const handleContinueAsGuest = useCallback(() => {
    audioEngine.play('uiTap');
    writeStorageFlag(ONBOARDING_SEEN_KEY, true);
    writeStorageFlag(GUEST_MODE_KEY, true);
    setGuestMode(true);
    setAuthReasonMessage(null);
    setAuthReturnScreen(null);
    setScreen('start');
  }, []);

  const openAuthWithReturn = useCallback((fromScreen: ScreenId, reason?: string) => {
    audioEngine.play('uiTap');
    writeStorageFlag(ONBOARDING_SEEN_KEY, true);
    setAuthReturnScreen(fromScreen);
    setAuthReasonMessage(reason ?? null);
    setScreen('auth');
  }, []);

  const navigateFromMarketing = useCallback((target: ScreenId) => {
    audioEngine.play('uiTap');
    if (target === 'parents') {
      setParentUnlocked(false);
    }
    setScreen(target);
  }, []);

  const openTermFromDialog = useCallback(
    (termDbId: number) => {
      audioEngine.play('uiTap');
      if (termDbId > 0) {
        const matched = terms.find((t) => t.dbId === termDbId);
        if (matched) {
          setActiveTermId(matched.id);
        }
      }
      setScreen('map');
    },
    [terms]
  );

  const hasProgress = Object.keys(activeProfile.lessons).length > 0;

  return (
    <div className="min-h-screen w-full">
      {screen === 'welcome' && (
        <WelcomeScreen
          activeChildName={activeProfile.name}
          termsCount={terms.length}
          stagesCount={lessons.length}
          digitMode={data.settings.digitMode}
          nightMode={data.settings.nightMode}
          reducedMotion={data.settings.reducedMotion}
          onEnterLogin={handleEnterLoginFromWelcome}
          onContinueAsGuest={handleContinueAsGuest}
          onToggleNightMode={() => {
            audioEngine.play('uiTap');
            updateSettings({ nightMode: !data.settings.nightMode });
          }}
        />
      )}

      {screen === 'start' && (
        <StartScreen
          terms={terms}
          lessons={lessons}
          activeProfile={activeProfile}
          digitMode={data.settings.digitMode}
          nightMode={data.settings.nightMode}
          reducedMotion={data.settings.reducedMotion}
          hasProgress={hasProgress}
          wpUser={wpUser}
          wpConnected={wpConnected}
          isGuest={!wpUser && guestMode}
          banners={marketing.banners}
          wpUrl={wpUrl}
          onNavigateScreen={navigateFromMarketing}
          onContinueMap={() => {
            audioEngine.play('uiTap');
            setScreen('map');
          }}
          onOpenPractice={() => {
            audioEngine.play('uiTap');
            setPracticeSkill('recognition');
            setScreen('practice');
          }}
          onOpenGames={() => {
            audioEngine.play('uiTap');
            setScreen('games');
          }}
          onOpenSimulator={() => {
            audioEngine.play('uiTap');
            setScreen('simulator');
          }}
          onOpenFreeAbacus={() => {
            audioEngine.play('uiTap');
            setScreen('abacus');
          }}
          onOpenLeaderboard={() => {
            audioEngine.play('uiTap');
            setScreen('leaderboard');
          }}
          onOpenShop={() => {
            audioEngine.play('uiTap');
            setScreen('shop');
          }}
          onOpenTickets={() => {
            audioEngine.play('uiTap');
            setScreen('tickets');
          }}
          onOpenProfiles={() => {
            audioEngine.play('uiTap');
            setProfileTab('profiles');
            setScreen('profiles');
          }}
          onOpenProfileDetails={() => {
            audioEngine.play('uiTap');
            setProfileTab('details');
            setScreen('profiles');
          }}
          onOpenLogin={() =>
            openAuthWithReturn(
              'start',
              'با ورود یا ثبت‌نام سریع موبایلی، امتیازات، مدال‌ها و پیشرفت کودک ذخیره می‌شوند.'
            )
          }
          onOpenWelcome={() => {
            audioEngine.play('uiTap');
            setScreen('welcome');
          }}
          onClaimDailyBonus={handleClaimDailyBonus}
          onToggleNightMode={() => {
            audioEngine.play('uiTap');
            updateSettings({ nightMode: !data.settings.nightMode });
          }}
          onOpenParentsHub={() => openParentsHub('children')}
        />
      )}

      {screen === 'auth' && (
        <WordPressAuthScreen
          wpUrl={wpUrl}
          wpUser={wpUser}
          wpConnected={wpConnected}
          stagesCount={lessons.length}
          questionsCount={wpQuestions.length}
          digitMode={data.settings.digitMode}
          refreshTrigger={ordersRefreshTrigger}
          onUpdateWpUrl={(url) => setWpUrl(url)}
          onAuthSuccess={handleWordPressAuthSuccess}
          onUpdateUser={(u) => {
            wpUserRef.current = u;
            setWpUser(u);
          }}
          onLogout={handleWordPressLogout}
          onRefreshFromWordPress={refreshFromWordPress}
          onOpenProfiles={() => {
            setProfileTab('details');
            setScreen('profiles');
          }}
          onOpenTickets={() => setScreen('tickets')}
          onContinueAsGuest={handleContinueAsGuest}
          authReasonMessage={authReasonMessage}
          isGuestMode={!wpUser && guestMode}
          onBack={() => {
            const dest =
              authReturnScreen && authReturnScreen !== 'auth' ? authReturnScreen : 'start';
            setAuthReturnScreen(null);
            setAuthReasonMessage(null);
            setScreen(dest);
          }}
        />
      )}

      {screen === 'leaderboard' && (
        <LeaderboardScreen
          wpUrl={wpUrl}
          wpUser={wpUser}
          profiles={data.profiles}
          activeProfile={activeProfile}
          digitMode={data.settings.digitMode}
          onOpenAuth={() =>
            openAuthWithReturn(
              'leaderboard',
              'برای ثبت رکورد و حضور در رتبه‌بندی آنلاین قهرمانان، با شماره موبایل وارد شوید.'
            )
          }
          onBack={() => setScreen('start')}
        />
      )}

      {screen === 'profiles' && (
        <ProfileScreen
          profiles={data.profiles}
          activeProfileId={data.activeProfileId}
          digitMode={data.settings.digitMode}
          lessons={lessons}
          initialTab={profileTab}
          onSelectProfile={handleSelectProfile}
          onCreateProfile={handleCreateChildProfile}
          onUpdateProfile={handleUpdateChildProfile}
          onDeleteProfile={handleDeleteChildProfile}
          onPracticeSkill={(skill) => {
            audioEngine.play('uiTap');
            setPracticeSkill(skill);
            setScreen('practice');
          }}
          onOpenShop={() => {
            audioEngine.play('uiTap');
            setScreen('shop');
          }}
          onBack={() => setScreen('start')}
        />
      )}

      {screen === 'map' && (
        <LessonMap
          terms={terms}
          activeTermId={activeTermId}
          onSelectTerm={(id) => {
            audioEngine.play('uiTap');
            setActiveTermId(id);
          }}
          profile={activeProfile}
          digitMode={data.settings.digitMode}
          reducedMotion={data.settings.reducedMotion}
          dailyChallengeCount={wpConfig.dailyChallengeCount}
          wpUrl={wpUrl}
          wpUser={wpUser}
          wpConnected={wpConnected}
          bacsAccounts={bacsAccounts}
          isRefreshing={wpRefreshing}
          onRefreshCurriculum={() => void refreshFromWordPress()}
          onTermUnlocked={handleTermUnlocked}
          onOpenAuth={() =>
            openAuthWithReturn(
              'map',
              'برای خرید و باز کردن ترم‌های آموزشی پیشرفته، ابتدا با شماره موبایل وارد حساب کاربری شوید.'
            )
          }
          onUpdateUser={(u) => {
            wpUserRef.current = u;
            setWpUser(u);
          }}
          onSelectLesson={(lesson) => {
            audioEngine.play('uiTap');
            setActiveLesson(lesson);
            setScreen('lesson');
          }}
          onOpenPractice={() => {
            audioEngine.play('uiTap');
            setScreen('practice');
          }}
          onOpenGames={() => {
            audioEngine.play('uiTap');
            setScreen('games');
          }}
          onOpenSimulator={() => {
            audioEngine.play('uiTap');
            setScreen('simulator');
          }}
          returnNotice={mapReturnNotice}
          onDismissReturnNotice={() => setMapReturnNotice(null)}
          banners={marketing.banners}
          onNavigateScreen={navigateFromMarketing}
          onBack={() => setScreen('start')}
        />
      )}

      {screen === 'lesson' && (
        <LessonScreen
          lesson={activeLesson}
          settings={data.settings}
          onUpdateSettings={updateSettings}
          onCompleteLesson={handleCompleteLesson}
          onBack={() => setScreen('map')}
        />
      )}

      {screen === 'practice' && (
        <PracticeScreen
          profile={activeProfile}
          settings={data.settings}
          initialSkill={practiceSkill}
          wpQuestions={wpQuestions}
          totalQuestions={wpConfig.dailyChallengeCount}
          onUpdateSettings={updateSettings}
          onRecordAnswer={handleRecordAnswer}
          onCompleteSession={handleCompleteSession}
          onBack={() => setScreen('start')}
        />
      )}

      {screen === 'games' && (
        <GameScreen
          profile={activeProfile}
          settings={data.settings}
          onUpdateSettings={updateSettings}
          onRecordAnswer={handleRecordAnswer}
          onFinishGame={handleCompleteSession}
          onBack={() => setScreen('start')}
        />
      )}

      {screen === 'simulator' && (
        <SorobanStepSimulator
          settings={data.settings}
          onUpdateSettings={updateSettings}
          allowProblemPicker={true}
          onClose={() => setScreen('start')}
        />
      )}

      {screen === 'abacus' && (
        <FreeAbacusScreen
          digitMode={data.settings.digitMode}
          nightMode={data.settings.nightMode}
          initialSoundEnabled={data.settings.soundEnabled}
          onBack={() => setScreen('start')}
        />
      )}

      {screen === 'result' && lastResult && (
        <ResultScreen
          result={lastResult}
          digitMode={data.settings.digitMode}
          reducedMotion={data.settings.reducedMotion}
          onRetry={handleRetryFromResult}
          onNext={handleNextFromResult}
          onMap={() => setScreen('map')}
        />
      )}

      {screen === 'shop' && (
        <ShopScreen
          wpUrl={wpUrl}
          wpUser={wpUser}
          activeProfile={activeProfile}
          digitMode={data.settings.digitMode}
          bacsAccounts={bacsAccounts}
          onClaimDailyBonus={handleClaimDailyBonus}
          onRedeemShopMedal={handleRedeemShopMedal}
          onSpendPointsOnOrder={handleSpendPointsOnOrder}
          onOpenAuth={() =>
            openAuthWithReturn(
              'shop',
              'برای نهایی‌کردن سفارش خرید و ثبت نشانی ارسال، ابتدا با شماره موبایل وارد شوید.'
            )
          }
          onUpdateUser={(u) => {
            wpUserRef.current = u;
            setWpUser(u);
          }}
          onOpenOrders={() => setScreen('auth')}
          onOrderCreated={() => {
            setOrdersRefreshTrigger((n) => n + 1);
            void refreshFromWordPress();
          }}
          returnNotice={shopReturnNotice}
          pendingCartRestoreSignal={pendingCartRestoreSignal}
          onDismissReturnNotice={() => setShopReturnNotice(null)}
          banners={marketing.banners}
          onNavigateScreen={navigateFromMarketing}
          onBack={() => setScreen('start')}
        />
      )}

      {screen === 'tickets' && (
        <SupportScreen
          wpUrl={wpUrl}
          wpUser={wpUser}
          digitMode={data.settings.digitMode}
          onOpenAuth={() =>
            openAuthWithReturn(
              'tickets',
              'برای ارسال تیکت جدید و دریافت پاسخ تیم پشتیبانی، ابتدا وارد حساب کاربری شوید.'
            )
          }
          onBack={() => setScreen('start')}
        />
      )}

      {screen === 'parents' &&
        (!parentUnlocked ? (
          <ParentGate
            onUnlock={() => setParentUnlocked(true)}
            onCancel={() => setScreen('start')}
          />
        ) : (
          <SettingsPanel
            profiles={data.profiles}
            activeProfile={activeProfile}
            settings={data.settings}
            lessons={lessons}
            initialTab={parentsTab}
            wpUrl={wpUrl}
            wpUser={wpUser}
            wpConnected={wpConnected}
            stagesCount={lessons.length}
            questionsCount={wpQuestions.length}
            onSelectProfile={handleSelectProfile}
            onCreateProfile={handleCreateChildProfile}
            onUpdateProfile={handleUpdateChildProfile}
            onDeleteProfile={handleDeleteChildProfile}
            onUpdateWpUrl={(url) => setWpUrl(url)}
            onAuthSuccess={handleWordPressAuthSuccess}
            onUpdateUser={(u) => {
              wpUserRef.current = u;
              setWpUser(u);
            }}
            onLogout={handleWordPressLogout}
            onRefreshFromWordPress={refreshFromWordPress}
            onOpenTickets={() => setScreen('tickets')}
            onPracticeSkill={(skill) => {
              audioEngine.play('uiTap');
              setPracticeSkill(skill);
              setScreen('practice');
            }}
            onOpenShop={() => {
              audioEngine.play('uiTap');
              setScreen('shop');
            }}
            onUpdateSettings={updateSettings}
            ordersRefreshTrigger={ordersRefreshTrigger}
            onClearAllData={() => {
              const fresh = clearAppData();
              dataRef.current = fresh;
              setData(fresh);
            }}
            onBack={() => {
              setParentUnlocked(false);
              setScreen('start');
            }}
          />
        ))}

      <ScheduledDialogHost
        dialogs={marketing.dialogs}
        screen={screen}
        wpUrl={wpUrl}
        digitMode={data.settings.digitMode}
        reducedMotion={data.settings.reducedMotion}
        onNavigateScreen={navigateFromMarketing}
        onOpenTermCheckout={openTermFromDialog}
      />

      <OfflineIndicator />
    </div>
  );
}
