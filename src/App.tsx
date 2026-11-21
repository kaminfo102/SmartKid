import { useEffect, useMemo, useState } from 'react';
import type {
  AppSettings,
  AvatarId,
  ChildProfile,
  LessonDefinition,
  ScreenId,
  SessionResult,
  SkillKey,
} from './types/app';
import { LESSONS } from './data/lessons';
import {
  clearAppData,
  createChildProfile,
  loadAppData,
  saveAppData,
  type StoredAppData,
} from './lib/storage';
import { audioEngine } from './lib/audioEngine';
import { StartScreen } from './components/StartScreen';
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
  const [activeLesson, setActiveLesson] = useState<LessonDefinition>(LESSONS[0]);
  const [practiceSkill, setPracticeSkill] = useState<SkillKey>('recognition');
  const [lastResult, setLastResult] = useState<SessionResult | null>(null);
  const [parentUnlocked, setParentUnlocked] = useState(false);

  const activeProfile = useMemo<ChildProfile>(() => {
    return (
      data.profiles.find((p) => p.id === data.activeProfileId) ?? data.profiles[0]
    );
  }, [data.profiles, data.activeProfileId]);

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
      setData((prev) => ({
        ...prev,
        profiles: prev.profiles.map((p) =>
          p.id === prev.activeProfileId
            ? { ...p, practiceMinutes: p.practiceMinutes + 1 }
            : p
        ),
      }));
    }, 60000);

    return () => window.clearInterval(timer);
  }, [screen]);

  const updateSettings = (patch: Partial<AppSettings>) => {
    setData((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
    }));
  };

  const updateActiveProfile = (updater: (p: ChildProfile) => ChildProfile) => {
    setData((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) =>
        p.id === prev.activeProfileId ? updater(p) : p
      ),
    }));
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
      LESSONS.find((l) => !activeProfile.lessons[l.id]?.completed) ?? LESSONS[0];
    setActiveLesson(nextUnfinished);
    setScreen('lesson');
  };

  const handleNextFromResult = () => {
    if (!lastResult) {
      setScreen('map');
      return;
    }
    if (lastResult.nextAction === 'next-lesson' && lastResult.lessonId) {
      const idx = LESSONS.findIndex((l) => l.id === lastResult.lessonId);
      if (idx >= 0 && idx + 1 < LESSONS.length) {
        setActiveLesson(LESSONS[idx + 1]);
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
      const found = LESSONS.find((l) => l.id === lastResult.lessonId);
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

  const hasProgress = Object.keys(activeProfile.lessons).length > 0;

  return (
    <div className="min-h-screen w-full">
      {screen === 'start' && (
        <StartScreen
          activeProfile={activeProfile}
          digitMode={data.settings.digitMode}
          reducedMotion={data.settings.reducedMotion}
          hasProgress={hasProgress}
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
          onOpenParents={() => {
            audioEngine.play('uiTap');
            setParentUnlocked(false);
            setScreen('parents');
          }}
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
          }}
          onBack={() => setScreen('start')}
        />
      )}

      {screen === 'map' && (
        <LessonMap
          profile={activeProfile}
          digitMode={data.settings.digitMode}
          reducedMotion={data.settings.reducedMotion}
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
