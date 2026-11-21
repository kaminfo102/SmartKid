import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  AppSettings,
  AvatarId,
  ChildProfile,
  LessonDefinition,
  PracticeQuestion,
  ScreenId,
  SessionResult,
  SkillKey,
  WordPressConfig,
  WordPressUser,
} from './types/app';
import { LESSONS } from './data/lessons';
import {
  clearAppData,
  createChildProfile,
  loadAppData,
  saveAppData,
  type StoredAppData,
} from './lib/storage';
import {
  createProfileInWordPress,
  fetchWordPressCurriculum,
  fetchWordPressQuestions,
  getSavedWordPressUrl,
  hasMemoryBearerToken,
  setMemoryBearerToken,
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
import { OfflineIndicator } from './components/PWAInstallButton';

export default function App() {
  const [data, setData] = useState<StoredAppData>(() => loadAppData());
  const [screen, setScreen] = useState<ScreenId>('start');
  const [lessons, setLessons] = useState<LessonDefinition[]>(LESSONS);
  const [wpQuestions, setWpQuestions] = useState<PracticeQuestion[]>([]);
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

  const activeProfile = useMemo<ChildProfile>(() => {
    return (
      data.profiles.find((p) => p.id === data.activeProfileId) ?? data.profiles[0]
    );
  }, [data.profiles, data.activeProfileId]);

  // Fetch dynamic curriculum & practice questions from Headless WordPress
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
        if (curriculum.stages.length > 0) {
          setLessons(curriculum.stages);
          setActiveLesson((prev) => {
            const match = curriculum.stages.find((s) => s.id === prev.id);
            return match ?? curriculum.stages[0];
          });
        }
        setWpQuestions(questions);
        setWpConfig((prev) => ({
          ...prev,
          appTitle: curriculum.config.appTitle || prev.appTitle,
          dailyChallengeCount:
            curriculum.config.dailyChallengeCount || prev.dailyChallengeCount,
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

  // Auto-load WordPress dynamic road & questions on boot if WP URL is configured
  useEffect(() => {
    if (wpUrl) {
      void refreshFromWordPress(wpUrl);
    }
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
        if (wpUrl && hasMemoryBearerToken() && updatedActive) {
          void syncProfileToWordPress(wpUrl, updatedActive).catch(() => {});
        }
        return {
          ...prev,
          profiles: updatedProfiles,
        };
      });
    }, 60000);

    return () => window.clearInterval(timer);
  }, [screen, wpUrl]);

  const updateSettings = (patch: Partial<AppSettings>) => {
    setData((prev) => {
      const nextSettings = { ...prev.settings, ...patch };
      if (wpUrl && hasMemoryBearerToken()) {
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
      if (wpUrl && hasMemoryBearerToken() && updatedActive) {
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

      return {
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
        return {
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
      });
    }
    setLastResult(result);
    setScreen('result');
  };

  const handleCompleteSession = (result: SessionResult) => {
    updateActiveProfile((p) => ({
      ...p,
      totalStars: p.totalStars + result.stars,
    }));
    setLastResult(result);
    setScreen('result');
  };

  const handleStartFirstOrNextLesson = () => {
    audioEngine.play('uiTap');
    const nextUnfinished =
      lessons.find((l) => !activeProfile.lessons[l.id]?.completed) ?? lessons[0];
    if (nextUnfinished) {
      setActiveLesson(nextUnfinished);
      setScreen('lesson');
    }
  };

  const handleNextFromResult = () => {
    if (!lastResult) {
      setScreen('map');
      return;
    }
    if (lastResult.nextAction === 'next-lesson' && lastResult.lessonId) {
      const idx = lessons.findIndex((l) => l.id === lastResult.lessonId);
      if (idx >= 0 && idx + 1 < lessons.length) {
        setActiveLesson(lessons[idx + 1]);
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
    setData((prev) => ({
      profiles: res.profiles.length > 0 ? res.profiles : prev.profiles,
      activeProfileId:
        res.profiles.length > 0 ? res.profiles[0].id : prev.activeProfileId,
      settings: res.settings ? { ...prev.settings, ...res.settings } : prev.settings,
    }));
    void refreshFromWordPress();
  };

  const handleWordPressLogout = () => {
    setMemoryBearerToken(null);
    setWpUser(null);
  };

  const hasProgress = Object.keys(activeProfile.lessons).length > 0;

  return (
    <div className="min-h-screen w-full">
      {screen === 'start' && (
        <StartScreen
          lessons={lessons}
          activeProfile={activeProfile}
          digitMode={data.settings.digitMode}
          reducedMotion={data.settings.reducedMotion}
          hasProgress={hasProgress}
          wpUser={wpUser}
          wpConnected={wpConnected}
          onStartFirstLesson={handleStartFirstOrNextLesson}
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
          onOpenProfiles={() => {
            audioEngine.play('uiTap');
            setScreen('profiles');
          }}
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
          onLogout={handleWordPressLogout}
          onRefreshFromWordPress={refreshFromWordPress}
          onBack={() => setScreen('start')}
        />
      )}

      {screen === 'profiles' && (
        <ProfileScreen
          profiles={data.profiles}
          activeProfileId={data.activeProfileId}
          digitMode={data.settings.digitMode}
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
            if (wpUrl && hasMemoryBearerToken()) {
              void createProfileInWordPress(wpUrl, created).catch(() => {});
            }
          }}
          onBack={() => setScreen('start')}
        />
      )}

      {screen === 'map' && (
        <LessonMap
          lessons={lessons}
          profile={activeProfile}
          digitMode={data.settings.digitMode}
          reducedMotion={data.settings.reducedMotion}
          dailyChallengeCount={wpConfig.dailyChallengeCount}
          wpConnected={wpConnected}
          isRefreshing={wpRefreshing}
          onRefreshCurriculum={() => void refreshFromWordPress()}
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
