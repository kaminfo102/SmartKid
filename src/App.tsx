import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  AppSettings,
  AvatarId,
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
  detectSameOriginWordPressUrl,
  fetchWordPressCurriculum,
  fetchWordPressQuestions,
  getSavedWordPressUrl,
  hasMemoryBearerToken,
  restoreWordPressSession,
  setMemoryBearerToken,
  setOnUnauthorizedSession,
  syncProfileToWordPress,
  syncSettingsToWordPress,
  type WordPressAuthResponse,
} from './lib/wordpressApi';
import { audioEngine } from './lib/audioEngine';
import { StartScreen } from './components/StartScreen';
import { WordPressAuthScreen } from './components/WordPressAuthScreen';
import { ProfileScreen } from './features/progress/ProfileScreen';
import { LessonMap } from './features/lessons/LessonMap';
import { LessonScreen } from './features/lessons/LessonScreen';
import { PracticeScreen } from './features/lessons/PracticeScreen';
import { GameScreen } from './features/games/GameScreen';
import { SorobanStepSimulator } from './features/abacus/SorobanStepSimulator';
import { ResultScreen } from './features/progress/ResultScreen';
import { ParentGate } from './components/ParentGate';
import { SettingsPanel } from './features/progress/SettingsPanel';
import { ShopScreen } from './features/shop/ShopScreen';
import { SupportScreen } from './features/support/SupportScreen';
import { OfflineIndicator } from './components/PWAInstallButton';

export default function App() {
  const [data, setData] = useState<StoredAppData>(() => loadAppData());
  const [screen, setScreen] = useState<ScreenId>('start');
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
  const [profileTab, setProfileTab] = useState<'details' | 'profiles'>('details');

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

  // Fetch dynamic Terms, Learning Roads & Practice Questions from Headless WordPress
  const refreshFromWordPress = useCallback(
    async (overrideUrl?: string): Promise<boolean> => {
      const targetUrl = overrideUrl ?? wpUrl;
      if (!targetUrl) {
        setWpConnected(false);
        return false;
      }
      setWpRefreshing(true);
      try {
        const [curriculum, questions] = await Promise.all([
          fetchWordPressCurriculum(targetUrl),
          fetchWordPressQuestions(targetUrl),
        ]);

        if (curriculum.terms.length > 0) {
          setTerms(curriculum.terms);
          setActiveTermId((prev) =>
            curriculum.terms.some((t) => t.id === prev)
              ? prev
              : curriculum.terms[0].id
          );
          const allStages = curriculum.terms.flatMap((t) => t.stages);
          if (allStages.length > 0) {
            setActiveLesson((prev) => {
              const match = allStages.find((s) => s.id === prev.id);
              return match ?? allStages[0];
            });
          }
        } else if (curriculum.stages.length > 0) {
          // Backward compatibility if server returns flat stages only
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

  // Auto-restore authenticated WordPress session (via HttpOnly cookie) + load dynamic terms on boot
  useEffect(() => {
    if (!wpUrl) return;
    let cancelled = false;
    void (async () => {
      const restored = await restoreWordPressSession(wpUrl);
      if (cancelled) return;
      if (restored) {
        const normalizedProfiles =
          restored.profiles.length > 0 ? restored.profiles.map(normalizeChildProfile) : [];
        setWpUser(restored.user);
        setWpConnected(true);
        setData((prev) => ({
          profiles: normalizedProfiles.length > 0 ? normalizedProfiles : prev.profiles,
          activeProfileId:
            normalizedProfiles.length > 0 ? normalizedProfiles[0].id : prev.activeProfileId,
          settings: restored.settings
            ? { ...prev.settings, ...restored.settings }
            : prev.settings,
        }));
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
  }, [data.settings]);

  // Track active learning minutes gently every 60s
  useEffect(() => {
    const isLearningScreen =
      screen === 'lesson' || screen === 'practice' || screen === 'games';
    if (!isLearningScreen) return;

    const timer = window.setInterval(() => {
      setData((prev) => {
        const updatedProfiles = prev.profiles.map((p) =>
          p.id === prev.activeProfileId
            ? { ...p, practiceMinutes: p.practiceMinutes + 1 }
            : p
        );
        const updatedActive = updatedProfiles.find(
          (p) => p.id === prev.activeProfileId
        );
        if (wpUrl && (hasMemoryBearerToken() || Boolean(wpUser)) && updatedActive) {
          void syncProfileToWordPress(wpUrl, updatedActive).catch(() => {});
        }
        return {
          ...prev,
          profiles: updatedProfiles,
        };
      });
    }, 60000);

    return () => window.clearInterval(timer);
  }, [screen, wpUrl, wpUser]);

  const updateSettings = (patch: Partial<AppSettings>) => {
    setData((prev) => {
      const nextSettings = { ...prev.settings, ...patch };
      if (wpUrl && (hasMemoryBearerToken() || Boolean(wpUser))) {
        void syncSettingsToWordPress(wpUrl, nextSettings).catch(() => {});
      }
      return {
        ...prev,
        settings: nextSettings,
      };
    });
  };

  const updateActiveProfile = (updater: (p: ChildProfile) => ChildProfile) => {
    setData((prev) => {
      const updatedProfiles = prev.profiles.map((p) =>
        p.id === prev.activeProfileId ? updater(p) : p
      );
      const updatedActive = updatedProfiles.find(
        (p) => p.id === prev.activeProfileId
      );
      if (wpUrl && (hasMemoryBearerToken() || Boolean(wpUser)) && updatedActive) {
        void syncProfileToWordPress(wpUrl, updatedActive).catch(() => {});
      }
      return {
        ...prev,
        profiles: updatedProfiles,
      };
    });
  };

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
    });
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
      });
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
    });
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

  const handleWordPressAuthSuccess = (res: WordPressAuthResponse) => {
    setWpUser(res.user);
    setWpConnected(true);
    const normalizedProfiles =
      res.profiles.length > 0 ? res.profiles.map(normalizeChildProfile) : [];
    setData((prev) => ({
      profiles: normalizedProfiles.length > 0 ? normalizedProfiles : prev.profiles,
      activeProfileId:
        normalizedProfiles.length > 0 ? normalizedProfiles[0].id : prev.activeProfileId,
      settings: res.settings ? { ...prev.settings, ...res.settings } : prev.settings,
    }));
    if (Array.isArray(res.unlockedTermIds) && res.unlockedTermIds.length > 0) {
      const unlockedSet = new Set(res.unlockedTermIds);
      setTerms((prev) =>
        prev.map((t) =>
          t.isFree || (t.dbId && unlockedSet.has(t.dbId))
            ? { ...t, unlocked: true }
            : t
        )
      );
    }
    void refreshFromWordPress();
  };

  const handleWordPressLogout = useCallback(() => {
    setMemoryBearerToken(null);
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
      updateActiveProfile(() => res.updatedProfile);
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
      updateActiveProfile(() => res.updatedProfile);
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
    updateActiveProfile((p) => ({
      ...p,
      rewardPoints: Math.max(0, (p.rewardPoints ?? 0) - safeSpend),
    }));
  };

  const hasProgress = Object.keys(activeProfile.lessons).length > 0;

  return (
    <div className="min-h-screen w-full">
      {screen === 'start' && (
        <StartScreen
          terms={terms}
          lessons={lessons}
          activeProfile={activeProfile}
          digitMode={data.settings.digitMode}
          reducedMotion={data.settings.reducedMotion}
          hasProgress={hasProgress}
          wpUser={wpUser}
          wpConnected={wpConnected}
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
          onClaimDailyBonus={handleClaimDailyBonus}
          onOpenAuth={() => {
            audioEngine.play('uiTap');
            setScreen('auth');
          }}
          onOpenParents={() => {
            audioEngine.play('uiTap');
            setParentUnlocked(false);
            setScreen('parents');
          }}
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
          onUpdateWpUrl={(url) => setWpUrl(url)}
          onAuthSuccess={handleWordPressAuthSuccess}
          onUpdateUser={(u) => setWpUser(u)}
          onLogout={handleWordPressLogout}
          onRefreshFromWordPress={refreshFromWordPress}
          onOpenProfiles={() => {
            setProfileTab('details');
            setScreen('profiles');
          }}
          onOpenTickets={() => setScreen('tickets')}
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
          onSelectProfile={(id) => {
            audioEngine.play('uiTap');
            setData((prev) => ({ ...prev, activeProfileId: id }));
          }}
          onCreateProfile={(name: string, avatar: AvatarId, age: number) => {
            audioEngine.play('success');
            const created = createChildProfile(name, avatar, age);
            setData((prev) => ({
              ...prev,
              profiles: [...prev.profiles, created],
              activeProfileId: created.id,
            }));
            if (wpUrl && (hasMemoryBearerToken() || Boolean(wpUser))) {
              void createProfileInWordPress(wpUrl, created).catch(() => {});
            }
          }}
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
          onOpenAuth={() => setScreen('auth')}
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
          onOpenAuth={() => setScreen('auth')}
          onOrderCreated={() => void refreshFromWordPress()}
          onBack={() => setScreen('start')}
        />
      )}

      {screen === 'tickets' && (
        <SupportScreen
          wpUrl={wpUrl}
          wpUser={wpUser}
          digitMode={data.settings.digitMode}
          onOpenAuth={() => setScreen('auth')}
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
            profile={activeProfile}
            settings={data.settings}
            lessons={lessons}
            wpUrl={wpUrl}
            wpUser={wpUser}
            wpConnected={wpConnected}
            onOpenWordPressAuth={() => setScreen('auth')}
            onOpenTickets={() => setScreen('tickets')}
            onRefreshWordPress={() => void refreshFromWordPress()}
            onUpdateSettings={updateSettings}
            onClearAllData={() => {
              const fresh = clearAppData();
              setData(fresh);
            }}
            onBack={() => {
              setParentUnlocked(false);
              setScreen('start');
            }}
          />
        ))}

      <OfflineIndicator />
    </div>
  );
}
