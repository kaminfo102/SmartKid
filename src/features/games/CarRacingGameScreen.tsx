import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Car,
  Clock,
  Flag,
  Heart,
  Lock,
  MoonStar,
  MountainSnow,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Star,
  Sun,
  Sunset,
  Trees,
  Trophy,
  Volume2,
  VolumeX,
  Waves,
  Zap,
} from 'lucide-react';
import type {
  AppSettings,
  ChildProfile,
  DigitDisplayMode,
} from '../../types/app';
import { formatNumber } from '../../lib/numbers';
import { audioEngine } from '../../lib/audioEngine';
import {
  formatRacingClock,
  getNormalizedRacingState,
  RACING_CARS,
  RACING_STAGES,
  type RaceCarSpec,
  type RacingStageSpec,
  type RoadPropType,
} from './racingStages';

export interface RacingCommitPayload {
  usedSecondsDelta: number;
  bestStageReached: number;
  score: number;
  earnedPoints: number;
  earnedStars: number;
  selectedCarId: string;
}

interface CarRacingGameScreenProps {
  profile: ChildProfile;
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onCommitProgress: (payload: RacingCommitPayload) => void;
  onBack: () => void;
}

type RacingViewState =
  | 'TITLE_MENU'
  | 'PLAYING'
  | 'PAUSED'
  | 'STAGE_CLEAR'
  | 'GAME_OVER'
  | 'TIME_LIMIT_REACHED';

type EntityKind =
  | 'car-sedan'
  | 'car-taxi'
  | 'car-suv'
  | 'car-truck'
  | 'cone'
  | 'barrier'
  | 'coin'
  | 'boost'
  | 'heart';

interface RoadEntity {
  id: number;
  kind: EntityKind;
  laneOffset: number; // -0.92 .. +0.92 across road width
  z: number; // 0 (camera) .. 1 (horizon)
  relSpeed: number; // multiplier on forward scroll (traffic moves forward so slower approach)
  color: string;
  collected?: boolean;
  hit?: boolean;
}

interface SceneryProp {
  id: number;
  side: -1 | 1;
  type: RoadPropType;
  z: number;
  xExtra: number; // extra distance beyond curb
}

interface SimState {
  stageIdx: number;
  carId: string;
  playerX: number; // -0.95 .. +0.95
  playerVelX: number;
  steerInput: number; // -1 | 0 | 1
  dragSteerTarget: number | null;
  speed: number;
  distance: number;
  trackZ: number;
  curveTime: number;
  currentCurve: number;
  hearts: number;
  score: number;
  coinsThisRun: number;
  nitro: number; // 0 .. 100
  boostTimer: number; // seconds left
  invulnTimer: number; // seconds left
  shakeTimer: number;
  elapsedRunSeconds: number;
  lastCommittedSeconds: number;
  spawnCooldown: number;
  propCooldown: number;
  nextEntityId: number;
  entities: RoadEntity[];
  props: SceneryProp[];
}

function playRacingSfx(
  kind: 'coin' | 'boost' | 'heart' | 'bump' | 'finish',
  enabled: boolean
): void {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const win = window as unknown as { __knRaceAudioCtx?: AudioContext };
    if (!win.__knRaceAudioCtx) {
      win.__knRaceAudioCtx = new AudioCtx();
    }
    const ctx = win.__knRaceAudioCtx;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    const playTone = (
      freqStart: number,
      freqEnd: number,
      duration: number,
      type: OscillatorType,
      gainLevel: number,
      delay = 0
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, now + delay);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + delay + duration);
      gain.gain.setValueAtTime(gainLevel, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + duration);
    };

    if (kind === 'coin') {
      playTone(880, 1320, 0.11, 'sine', 0.11, 0);
      playTone(1320, 1760, 0.13, 'triangle', 0.09, 0.06);
    } else if (kind === 'heart') {
      playTone(587, 784, 0.12, 'sine', 0.11, 0);
      playTone(784, 1046, 0.16, 'sine', 0.1, 0.08);
    } else if (kind === 'boost') {
      playTone(220, 740, 0.28, 'sawtooth', 0.08, 0);
      playTone(440, 980, 0.24, 'triangle', 0.08, 0.05);
    } else if (kind === 'bump') {
      playTone(150, 52, 0.2, 'triangle', 0.18, 0);
    } else if (kind === 'finish') {
      playTone(523, 659, 0.12, 'triangle', 0.12, 0);
      playTone(659, 784, 0.12, 'triangle', 0.12, 0.1);
      playTone(784, 1046, 0.24, 'triangle', 0.14, 0.2);
    }
  } catch {
    // ignore Web Audio failure cleanly
  }
}

const MiniCarSvg: React.FC<{ car: RaceCarSpec; className?: string }> = ({
  car,
  className = 'w-14 h-9',
}) => (
  <svg aria-hidden="true" viewBox="0 0 80 48" className={className}>
    {/* Tires */}
    <rect x="6" y="10" width="12" height="28" rx="4" fill="#1E293B" />
    <rect x="62" y="10" width="12" height="28" rx="4" fill="#1E293B" />
    {/* Chassis */}
    <rect x="14" y="14" width="52" height="24" rx="10" fill={car.bodyColor} />
    <path d="M22 16 L30 6 H50 L58 16 Z" fill={car.shadeColor} />
    {/* Windshield */}
    <path d="M26 15 L32 8 H48 L54 15 Z" fill="#BAE6FD" opacity="0.92" />
    {/* Racing stripe */}
    <rect x="37" y="14" width="6" height="24" fill={car.stripeColor} />
    {/* Spoiler */}
    <rect x="18" y="34" width="44" height="5" rx="2.5" fill={car.spoilerColor} />
    {/* Tail lights */}
    <rect x="17" y="27" width="8" height="4" rx="2" fill="#FEF08A" />
    <rect x="55" y="27" width="8" height="4" rx="2" fill="#FEF08A" />
  </svg>
);

export const CarRacingGameScreen: React.FC<CarRacingGameScreenProps> = ({
  profile,
  settings,
  onUpdateSettings,
  onCommitProgress,
  onBack,
}) => {
  const initialSummary = useMemo(() => getNormalizedRacingState(profile), [profile]);

  const [viewState, setViewState] = useState<RacingViewState>(() =>
    initialSummary.isLimitReached ? 'TIME_LIMIT_REACHED' : 'TITLE_MENU'
  );
  const [selectedStageIdx, setSelectedStageIdx] = useState<number>(() =>
    Math.max(0, Math.min(RACING_STAGES.length - 1, initialSummary.bestStage - 1))
  );
  const [selectedCarId, setSelectedCarId] = useState<string>(
    initialSummary.selectedCarId ?? RACING_CARS[0].id
  );

  const [hud, setHud] = useState({
    score: 0,
    coins: 0,
    hearts: 3,
    nitro: 40,
    speedKmh: 0,
    distancePct: 0,
    boostActive: false,
    remainingSeconds: initialSummary.remainingSeconds,
  });

  const [roundRewardSummary, setRoundRewardSummary] = useState<{
    pointsEarned: number;
    starsEarned: number;
    cleared: boolean;
    stageTitle: string;
    unlockedNextStage: number | null;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const summaryRef = useRef(initialSummary);
  summaryRef.current = initialSummary;

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const viewStateRef = useRef<RacingViewState>(viewState);
  viewStateRef.current = viewState;

  const onCommitRef = useRef(onCommitProgress);
  onCommitRef.current = onCommitProgress;

  const simRef = useRef<SimState>({
    stageIdx: selectedStageIdx,
    carId: selectedCarId,
    playerX: 0,
    playerVelX: 0,
    steerInput: 0,
    dragSteerTarget: null,
    speed: 0,
    distance: 0,
    trackZ: 0,
    curveTime: 0,
    currentCurve: 0,
    hearts: 3,
    score: 0,
    coinsThisRun: 0,
    nitro: 40,
    boostTimer: 0,
    invulnTimer: 0,
    shakeTimer: 0,
    elapsedRunSeconds: 0,
    lastCommittedSeconds: 0,
    spawnCooldown: 0.7,
    propCooldown: 0.05,
    nextEntityId: 1,
    entities: [],
    props: [],
  });

  const flushRunTimeDelta = useCallback(() => {
    const sim = simRef.current;
    const wholeElapsed = Math.floor(sim.elapsedRunSeconds);
    const delta = Math.max(0, wholeElapsed - sim.lastCommittedSeconds);
    if (delta > 0) {
      sim.lastCommittedSeconds = wholeElapsed;
      onCommitRef.current({
        usedSecondsDelta: delta,
        bestStageReached: Math.max(summaryRef.current.bestStage, sim.stageIdx + 1),
        score: sim.score,
        earnedPoints: 0,
        earnedStars: 0,
        selectedCarId: sim.carId,
      });
    }
  }, []);

  const createInitialProps = useCallback((stage: RacingStageSpec): SceneryProp[] => {
    const list: SceneryProp[] = [];
    for (let i = 0; i < 18; i++) {
      const z = 0.06 + (i / 18) * 0.92;
      const leftType = stage.propsLeft[i % stage.propsLeft.length];
      const rightType = stage.propsRight[i % stage.propsRight.length];
      list.push({
        id: i * 2 + 1,
        side: -1,
        type: leftType,
        z,
        xExtra: 0.16 + ((i * 37) % 100) * 0.0025,
      });
      list.push({
        id: i * 2 + 2,
        side: 1,
        type: rightType,
        z,
        xExtra: 0.16 + ((i * 53) % 100) * 0.0025,
      });
    }
    return list;
  }, []);

  const startStageRun = useCallback(
    (stageIndex: number) => {
      const latest = getNormalizedRacingState(profile);
      if (latest.isLimitReached) {
        setViewState('TIME_LIMIT_REACHED');
        return;
      }

      const stage = RACING_STAGES[stageIndex] ?? RACING_STAGES[0];
      simRef.current = {
        stageIdx: stage.stageNumber - 1,
        carId: selectedCarId,
        playerX: 0,
        playerVelX: 0,
        steerInput: 0,
        dragSteerTarget: null,
        speed: stage.baseSpeed * 0.72,
        distance: 0,
        trackZ: 0,
        curveTime: 0,
        currentCurve: 0,
        hearts: 3,
        score: 0,
        coinsThisRun: 0,
        nitro: 50,
        boostTimer: 0,
        invulnTimer: 0,
        shakeTimer: 0,
        elapsedRunSeconds: 0,
        lastCommittedSeconds: 0,
        spawnCooldown: 0.9,
        propCooldown: 0.08,
        nextEntityId: 100,
        entities: [],
        props: createInitialProps(stage),
      };

      setSelectedStageIdx(stage.stageNumber - 1);
      setRoundRewardSummary(null);
      setHud({
        score: 0,
        coins: 0,
        hearts: 3,
        nitro: 50,
        speedKmh: Math.round((stage.baseSpeed * 0.72) * 0.35),
        distancePct: 0,
        boostActive: false,
        remainingSeconds: latest.remainingSeconds,
      });
      setViewState('PLAYING');
      audioEngine.play('uiTap');
      audioEngine.speakPersian(`مرحله ${stage.stageNumber}: ${stage.title}. حرکت کن قهرمان!`);
    },
    [profile, selectedCarId, createInitialProps]
  );

  const finishStageRun = useCallback(
    (outcome: 'STAGE_CLEAR' | 'GAME_OVER' | 'TIME_LIMIT_REACHED') => {
      const sim = simRef.current;
      const stage = RACING_STAGES[sim.stageIdx] ?? RACING_STAGES[0];
      const wholeElapsed = Math.floor(sim.elapsedRunSeconds);
      const deltaSeconds = Math.max(0, wholeElapsed - sim.lastCommittedSeconds);
      sim.lastCommittedSeconds = wholeElapsed;

      const cleared = outcome === 'STAGE_CLEAR';
      const pointsFromCoins = Math.max(0, Math.round(sim.coinsThisRun * stage.coinMultiplier));
      const bonusPoints = cleared ? stage.completionBonusPoints : 0;
      const pointsEarned = Math.min(120, pointsFromCoins + bonusPoints);
      const starsEarned = cleared ? stage.completionStars : 0;
      const nextStageUnlock =
        cleared && stage.stageNumber < RACING_STAGES.length
          ? stage.stageNumber + 1
          : null;
      const bestStageReached = Math.max(
        summaryRef.current.bestStage,
        nextStageUnlock ?? stage.stageNumber
      );

      onCommitRef.current({
        usedSecondsDelta: deltaSeconds,
        bestStageReached,
        score: sim.score,
        earnedPoints: pointsEarned,
        earnedStars: starsEarned,
        selectedCarId: sim.carId,
      });

      setRoundRewardSummary({
        pointsEarned,
        starsEarned,
        cleared,
        stageTitle: stage.title,
        unlockedNextStage:
          nextStageUnlock && nextStageUnlock > summaryRef.current.bestStage
            ? nextStageUnlock
            : cleared && stage.stageNumber < RACING_STAGES.length
              ? stage.stageNumber + 1
              : null,
      });

      setViewState(outcome);
      if (cleared) {
        playRacingSfx('finish', settingsRef.current.soundEnabled);
        audioEngine.play('levelComplete');
        audioEngine.speakPersian(`آفرین! مرحله ${stage.stageNumber} رو با موفقیت رد کردی!`, 'cheer');
      } else if (outcome === 'TIME_LIMIT_REACHED') {
        audioEngine.play('uiTap');
        audioEngine.speakPersian('زمان بازی امروز تمام شد قهرمان! فردا دوباره برگرد.');
      } else {
        audioEngine.play('tryAgain');
        audioEngine.speakPersian('عالی تلاش کردی! امتیازاتت ذخیره شد.');
      }
    },
    []
  );

  // Flush elapsed time safely when leaving screen
  useEffect(() => {
    return () => {
      flushRunTimeDelta();
    };
  }, [flushRunTimeDelta]);

  const triggerNitroBoost = useCallback(() => {
    const sim = simRef.current;
    if (viewStateRef.current !== 'PLAYING') return;
    if (sim.nitro >= 30 && sim.boostTimer <= 0.1) {
      sim.nitro = Math.max(0, sim.nitro - 35);
      sim.boostTimer = 2.4;
      playRacingSfx('boost', settingsRef.current.soundEnabled);
    }
  }, []);

  // Keyboard controls (ArrowLeft / ArrowRight / A / D / Space / ArrowUp)
  useEffect(() => {
    const keysDown = new Set<string>();
    const syncSteer = () => {
      const left = keysDown.has('ArrowLeft') || keysDown.has('KeyA');
      const right = keysDown.has('ArrowRight') || keysDown.has('KeyD');
      simRef.current.steerInput = (right ? 1 : 0) - (left ? 1 : 0);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (viewStateRef.current !== 'PLAYING') return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
        triggerNitroBoost();
        return;
      }
      if (e.code === 'Escape') {
        flushRunTimeDelta();
        setViewState('PAUSED');
        return;
      }
      keysDown.add(e.code);
      syncSteer();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysDown.delete(e.code);
      syncSteer();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [triggerNitroBoost, flushRunTimeDelta]);

  // Main 60fps Canvas Loop (Physics + Pseudo-3D Realistic Road Renderer)
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cssW = Math.max(320, container.clientWidth);
    let cssH = Math.max(300, container.clientHeight);
    const resizeCanvas = () => {
      if (!container || !canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cssW = Math.max(320, container.clientWidth);
      cssH = Math.max(280, container.clientHeight);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resizeCanvas();

    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(container);

    let rafId = 0;
    let lastTs = performance.now();
    let hudSyncAccum = 0;

    const spawnRoadEntity = (stage: RacingStageSpec) => {
      const sim = simRef.current;
      const laneCenters: number[] = [];
      for (let i = 0; i < stage.lanes; i++) {
        // Normalize lane centers inside [-0.74 .. +0.74]
        const norm = stage.lanes === 1 ? 0 : -0.72 + (i / (stage.lanes - 1)) * 1.44;
        laneCenters.push(norm);
      }
      const laneOffset = laneCenters[Math.floor(Math.random() * laneCenters.length)];

      // Decide item vs obstacle vs traffic car
      const roll = Math.random();
      let kind: EntityKind = 'coin';
      let relSpeed = 0;
      let color = '#FBBF24';

      if (roll < 0.36) {
        kind = 'coin';
      } else if (roll < 0.44) {
        kind = 'boost';
      } else if (roll < 0.49 && sim.hearts < 3) {
        kind = 'heart';
      } else if (roll < 0.49 + stage.obstacleChance * 0.45) {
        kind = Math.random() > 0.45 ? 'cone' : 'barrier';
      } else {
        const trafficKinds: EntityKind[] = ['car-sedan', 'car-taxi', 'car-suv', 'car-truck'];
        kind = trafficKinds[Math.floor(Math.random() * trafficKinds.length)];
        relSpeed = kind === 'car-truck' ? 0.34 : kind === 'car-taxi' ? 0.48 : 0.42;
        const carPalette = ['#38BDF8', '#A855F7', '#EC4899', '#F97316', '#22C55E', '#EAB308'];
        color = kind === 'car-taxi' ? '#FACC15' : carPalette[Math.floor(Math.random() * carPalette.length)];
      }

      // Prevent overlapping an entity at the exact same far Z & lane
      const crowded = sim.entities.some(
        (ent) => ent.z > 0.85 && Math.abs(ent.laneOffset - laneOffset) < 0.32
      );
      if (crowded) return;

      sim.entities.push({
        id: sim.nextEntityId++,
        kind,
        laneOffset,
        z: 1.0,
        relSpeed,
        color,
      });
    };

    const drawRoadProp = (
      prop: SceneryProp,
      x: number,
      y: number,
      scale: number,
      stage: RacingStageSpec,
      timeSec: number
    ) => {
      if (scale < 0.04) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);

      // Soft ground shadow
      ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
      ctx.beginPath();
      ctx.ellipse(0, 2, 28, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      switch (prop.type) {
        case 'oak-tree': {
          ctx.fillStyle = '#78350F';
          ctx.fillRect(-7, -42, 14, 42);
          ctx.fillStyle = '#15803D';
          ctx.beginPath();
          ctx.arc(0, -64, 34, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#22C55E';
          ctx.beginPath();
          ctx.arc(-10, -72, 22, 0, Math.PI * 2);
          ctx.arc(12, -68, 20, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'pine-tree':
        case 'snow-pine': {
          ctx.fillStyle = '#5C3A21';
          ctx.fillRect(-6, -24, 12, 24);
          const layers = [
            { y: -22, w: 34, h: 34, c: '#166534' },
            { y: -44, w: 28, h: 34, c: '#15803D' },
            { y: -66, w: 21, h: 32, c: '#16A34A' },
          ];
          for (const l of layers) {
            ctx.fillStyle = l.c;
            ctx.beginPath();
            ctx.moveTo(0, l.y - l.h);
            ctx.lineTo(-l.w, l.y);
            ctx.lineTo(l.w, l.y);
            ctx.closePath();
            ctx.fill();
            if (prop.type === 'snow-pine') {
              ctx.fillStyle = '#F8FAFC';
              ctx.beginPath();
              ctx.moveTo(0, l.y - l.h);
              ctx.lineTo(-l.w * 0.45, l.y - l.h * 0.55);
              ctx.lineTo(l.w * 0.45, l.y - l.h * 0.55);
              ctx.closePath();
              ctx.fill();
            }
          }
          break;
        }
        case 'barn': {
          ctx.fillStyle = '#DC2626';
          ctx.fillRect(-44, -56, 88, 56);
          ctx.fillStyle = '#7F1D1D';
          ctx.beginPath();
          ctx.moveTo(-50, -56);
          ctx.lineTo(0, -90);
          ctx.lineTo(50, -56);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#FEF2F2';
          ctx.fillRect(-16, -34, 32, 34);
          ctx.strokeStyle = '#991B1B';
          ctx.lineWidth = 3;
          ctx.strokeRect(-16, -34, 32, 34);
          break;
        }
        case 'windmill': {
          ctx.fillStyle = '#F8FAFC';
          ctx.beginPath();
          ctx.moveTo(-20, 0);
          ctx.lineTo(-12, -88);
          ctx.lineTo(12, -88);
          ctx.lineTo(20, 0);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#EF4444';
          ctx.beginPath();
          ctx.arc(0, -88, 13, Math.PI, 0);
          ctx.fill();
          ctx.save();
          ctx.translate(0, -80);
          ctx.rotate(timeSec * 1.4);
          ctx.fillStyle = '#78350F';
          for (let b = 0; b < 4; b++) {
            ctx.rotate(Math.PI / 2);
            ctx.fillRect(-3, 0, 6, 36);
            ctx.fillStyle = '#FEF3C7';
            ctx.fillRect(3, 10, 8, 24);
            ctx.fillStyle = '#78350F';
          }
          ctx.restore();
          break;
        }
        case 'fence': {
          ctx.fillStyle = '#B45309';
          ctx.fillRect(-26, -24, 6, 24);
          ctx.fillRect(20, -24, 6, 24);
          ctx.fillStyle = '#D97706';
          ctx.fillRect(-32, -20, 64, 5);
          ctx.fillRect(-32, -10, 64, 5);
          break;
        }
        case 'cabin': {
          ctx.fillStyle = '#92400E';
          ctx.fillRect(-38, -48, 76, 48);
          ctx.fillStyle = '#451A03';
          ctx.beginPath();
          ctx.moveTo(-44, -48);
          ctx.lineTo(0, -78);
          ctx.lineTo(44, -48);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#FDE047';
          ctx.fillRect(-10, -34, 20, 16);
          break;
        }
        case 'palm': {
          ctx.strokeStyle = '#92400E';
          ctx.lineWidth = 10;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(prop.side * 10, -45, prop.side * 4, -88);
          ctx.stroke();
          ctx.fillStyle = '#16A34A';
          const topX = prop.side * 4;
          const topY = -88;
          for (let f = -2; f <= 2; f++) {
            ctx.beginPath();
            ctx.ellipse(topX + f * 14, topY + Math.abs(f) * 5, 22, 7, f * 0.4, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 'umbrella': {
          ctx.fillStyle = '#E2E8F0';
          ctx.fillRect(-2, -46, 4, 46);
          ctx.fillStyle = '#F43F5E';
          ctx.beginPath();
          ctx.arc(0, -44, 28, Math.PI, 0);
          ctx.fill();
          ctx.fillStyle = '#FACC15';
          ctx.beginPath();
          ctx.moveTo(0, -72);
          ctx.lineTo(-10, -44);
          ctx.lineTo(10, -44);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'lighthouse': {
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.moveTo(-18, 0);
          ctx.lineTo(-11, -110);
          ctx.lineTo(11, -110);
          ctx.lineTo(18, 0);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#EF4444';
          ctx.fillRect(-15, -40, 30, 18);
          ctx.fillRect(-13, -82, 26, 18);
          ctx.fillStyle = '#FEF08A';
          ctx.fillRect(-9, -124, 18, 14);
          ctx.fillStyle = '#1E293B';
          ctx.beginPath();
          ctx.moveTo(-12, -124);
          ctx.lineTo(0, -138);
          ctx.lineTo(12, -124);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'cliff-rock': {
          ctx.fillStyle = '#57534E';
          ctx.beginPath();
          ctx.moveTo(-40, 0);
          ctx.lineTo(-28, -68);
          ctx.lineTo(8, -82);
          ctx.lineTo(42, 0);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#78716C';
          ctx.beginPath();
          ctx.moveTo(-28, -68);
          ctx.lineTo(8, -82);
          ctx.lineTo(16, 0);
          ctx.lineTo(-10, 0);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'chevron-sign': {
          ctx.fillStyle = '#64748B';
          ctx.fillRect(-3, -46, 6, 46);
          ctx.fillStyle = '#FACC15';
          ctx.fillRect(-20, -74, 40, 28);
          ctx.strokeStyle = '#0F172A';
          ctx.lineWidth = 4;
          ctx.beginPath();
          if (prop.side < 0) {
            ctx.moveTo(-6, -67);
            ctx.lineTo(7, -60);
            ctx.lineTo(-6, -53);
          } else {
            ctx.moveTo(6, -67);
            ctx.lineTo(-7, -60);
            ctx.lineTo(6, -53);
          }
          ctx.stroke();
          break;
        }
        case 'cactus': {
          ctx.fillStyle = '#15803D';
          ctx.beginPath();
          ctx.roundRect(-8, -72, 16, 72, 8);
          ctx.roundRect(-24, -52, 18, 12, 6);
          ctx.roundRect(-24, -64, 10, 22, 5);
          ctx.roundRect(6, -42, 18, 12, 6);
          ctx.roundRect(14, -58, 10, 26, 5);
          ctx.fill();
          break;
        }
        case 'mesa': {
          ctx.fillStyle = '#B45309';
          ctx.beginPath();
          ctx.moveTo(-55, 0);
          ctx.lineTo(-34, -76);
          ctx.lineTo(30, -76);
          ctx.lineTo(54, 0);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#D97706';
          ctx.fillRect(-34, -76, 64, 16);
          break;
        }
        case 'streetlamp': {
          const armDir = prop.side < 0 ? 1 : -1;
          ctx.fillStyle = '#475569';
          ctx.fillRect(-3, -125, 6, 125);
          ctx.fillRect(armDir > 0 ? 0 : -28, -125, 28, 5);
          ctx.fillStyle = '#FEF08A';
          ctx.beginPath();
          ctx.arc(armDir * 24, -118, 7, 0, Math.PI * 2);
          ctx.fill();
          if (stage.isNight) {
            const glow = ctx.createRadialGradient(
              armDir * 24,
              -115,
              3,
              armDir * 24,
              -80,
              65
            );
            glow.addColorStop(0, 'rgba(253, 224, 71, 0.36)');
            glow.addColorStop(1, 'rgba(253, 224, 71, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(armDir * 24, -95, 65, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 'city-tower': {
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(-36, -150, 72, 150);
          ctx.fillStyle = '#38BDF8';
          for (let wy = -138; wy < -16; wy += 18) {
            for (let wx = -24; wx <= 14; wx += 18) {
              ctx.fillStyle = (wx + wy) % 3 === 0 ? '#FDE047' : '#38BDF8';
              ctx.fillRect(wx, wy, 10, 10);
            }
          }
          break;
        }
      }
      ctx.restore();
    };

    const drawRoadEntity = (
      entity: RoadEntity,
      x: number,
      y: number,
      scale: number,
      isNight: boolean,
      timeSec: number
    ) => {
      if (scale < 0.05) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);

      if (entity.kind === 'coin') {
        const bob = Math.sin(timeSec * 6 + entity.id) * 5;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
        ctx.beginPath();
        ctx.ellipse(0, 2, 16, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        const rGrad = ctx.createRadialGradient(-4, -24 + bob, 3, 0, -22 + bob, 20);
        rGrad.addColorStop(0, '#FEF08A');
        rGrad.addColorStop(0.65, '#FACC15');
        rGrad.addColorStop(1, '#D97706');
        ctx.fillStyle = rGrad;
        ctx.beginPath();
        ctx.arc(0, -22 + bob, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Star inside coin
        ctx.fillStyle = '#FFFBEB';
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? 10 : 4.5;
          const a = (Math.PI / 5) * i - Math.PI / 2;
          if (i === 0) ctx.moveTo(Math.cos(a) * r, -22 + bob + Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, -22 + bob + Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        return;
      }

      if (entity.kind === 'boost') {
        const pulse = 1 + Math.sin(timeSec * 8) * 0.08;
        ctx.scale(pulse, pulse);
        ctx.fillStyle = 'rgba(14, 165, 233, 0.28)';
        ctx.beginPath();
        ctx.ellipse(0, -18, 22, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#38BDF8';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(4, -38);
        ctx.lineTo(-10, -18);
        ctx.lineTo(-1, -18);
        ctx.lineTo(-5, -2);
        ctx.lineTo(11, -22);
        ctx.lineTo(1, -22);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        return;
      }

      if (entity.kind === 'heart') {
        const bob = Math.sin(timeSec * 5 + entity.id) * 4;
        ctx.fillStyle = '#F43F5E';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, -10 + bob);
        ctx.bezierCurveTo(-18, -26 + bob, -22, -40 + bob, -9, -40 + bob);
        ctx.bezierCurveTo(-2, -40 + bob, 0, -33 + bob, 0, -33 + bob);
        ctx.bezierCurveTo(0, -33 + bob, 2, -40 + bob, 9, -40 + bob);
        ctx.bezierCurveTo(22, -40 + bob, 18, -26 + bob, 0, -10 + bob);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        return;
      }

      if (entity.kind === 'cone') {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
        ctx.beginPath();
        ctx.ellipse(0, 2, 18, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#EA580C';
        ctx.fillRect(-16, -6, 32, 6);
        ctx.fillStyle = '#F97316';
        ctx.beginPath();
        ctx.moveTo(-12, -6);
        ctx.lineTo(-3, -38);
        ctx.lineTo(3, -38);
        ctx.lineTo(12, -6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-7.5, -24, 15, 7);
        ctx.restore();
        return;
      }

      if (entity.kind === 'barrier') {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
        ctx.fillRect(-34, -4, 68, 8);
        ctx.fillStyle = '#64748B';
        ctx.fillRect(-28, -26, 6, 26);
        ctx.fillRect(22, -26, 6, 26);
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(-34, -34, 68, 14);
        ctx.fillStyle = '#0F172A';
        for (let sx = -26; sx <= 18; sx += 20) {
          ctx.beginPath();
          ctx.moveTo(sx, -34);
          ctx.lineTo(sx + 10, -34);
          ctx.lineTo(sx + 4, -20);
          ctx.lineTo(sx - 6, -20);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        return;
      }

      // Traffic cars (rear view)
      const isTruck = entity.kind === 'car-truck';
      const w = isTruck ? 72 : 62;
      const h = isTruck ? 56 : 40;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 2, w * 0.56, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tires
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(-w * 0.5, -16, 11, 17);
      ctx.fillRect(w * 0.5 - 11, -16, 11, 17);

      // Lower body
      ctx.fillStyle = entity.color;
      ctx.beginPath();
      ctx.roundRect(-w * 0.46, -h * 0.65, w * 0.92, h * 0.58, 7);
      ctx.fill();

      // Cabin / Cargo Box
      if (isTruck) {
        ctx.fillStyle = '#F1F5F9';
        ctx.beginPath();
        ctx.roundRect(-w * 0.44, -h, w * 0.88, h * 0.62, 5);
        ctx.fill();
        ctx.fillStyle = '#CBD5E1';
        ctx.fillRect(-w * 0.44, -h * 0.5, w * 0.88, 5);
      } else {
        ctx.fillStyle = entity.color;
        ctx.beginPath();
        ctx.moveTo(-w * 0.36, -h * 0.62);
        ctx.lineTo(-w * 0.25, -h);
        ctx.lineTo(w * 0.25, -h);
        ctx.lineTo(w * 0.36, -h * 0.62);
        ctx.closePath();
        ctx.fill();
        // Rear window
        ctx.fillStyle = '#BAE6FD';
        ctx.beginPath();
        ctx.moveTo(-w * 0.29, -h * 0.66);
        ctx.lineTo(-w * 0.21, -h * 0.92);
        ctx.lineTo(w * 0.21, -h * 0.92);
        ctx.lineTo(w * 0.29, -h * 0.66);
        ctx.closePath();
        ctx.fill();
      }

      if (entity.kind === 'car-taxi') {
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(-9, -h - 6, 18, 6);
      }

      // Red Taillights
      ctx.fillStyle = isNight ? '#FF2E4C' : '#DC2626';
      ctx.fillRect(-w * 0.41, -h * 0.42, 11, 6);
      ctx.fillRect(w * 0.41 - 11, -h * 0.42, 11, 6);
      if (isNight) {
        ctx.fillStyle = 'rgba(255, 46, 76, 0.35)';
        ctx.beginPath();
        ctx.arc(-w * 0.34, -h * 0.39, 12, 0, Math.PI * 2);
        ctx.arc(w * 0.34, -h * 0.39, 12, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    };

    const drawPlayerCar = (
      cx: number,
      cy: number,
      scale: number,
      car: RaceCarSpec,
      tilt: number,
      boostActive: boolean,
      invulnTimer: number,
      isNight: boolean,
      timeSec: number
    ) => {
      if (invulnTimer > 0 && Math.floor(timeSec * 14) % 2 === 0) {
        ctx.globalAlpha = 0.45;
      }

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.rotate(tilt * 0.12);

      // Night headlights cones ahead of car
      if (isNight) {
        const beamL = ctx.createLinearGradient(-22, -32, -55, -240);
        beamL.addColorStop(0, 'rgba(254, 249, 195, 0.42)');
        beamL.addColorStop(1, 'rgba(254, 249, 195, 0)');
        ctx.fillStyle = beamL;
        ctx.beginPath();
        ctx.moveTo(-26, -32);
        ctx.lineTo(-75, -230);
        ctx.lineTo(-5, -230);
        ctx.closePath();
        ctx.fill();

        const beamR = ctx.createLinearGradient(22, -32, 55, -240);
        beamR.addColorStop(0, 'rgba(254, 249, 195, 0.42)');
        beamR.addColorStop(1, 'rgba(254, 249, 195, 0)');
        ctx.fillStyle = beamR;
        ctx.beginPath();
        ctx.moveTo(26, -32);
        ctx.lineTo(5, -230);
        ctx.lineTo(75, -230);
        ctx.closePath();
        ctx.fill();
      }

      // Ground shadow
      ctx.fillStyle = 'rgba(15, 23, 42, 0.38)';
      ctx.beginPath();
      ctx.ellipse(0, 6, 54, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      // Rear Tires
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.roundRect(-48, -22, 16, 26, 4);
      ctx.roundRect(32, -22, 16, 26, 4);
      ctx.fill();

      // Car Lower Body
      ctx.fillStyle = car.bodyColor;
      ctx.beginPath();
      ctx.roundRect(-42, -36, 84, 30, 12);
      ctx.fill();

      // Sporty Cockpit
      ctx.fillStyle = car.shadeColor;
      ctx.beginPath();
      ctx.moveTo(-30, -34);
      ctx.lineTo(-20, -54);
      ctx.lineTo(20, -54);
      ctx.lineTo(30, -34);
      ctx.closePath();
      ctx.fill();

      // Rear Windshield
      ctx.fillStyle = '#BAE6FD';
      ctx.beginPath();
      ctx.moveTo(-22, -36);
      ctx.lineTo(-15, -50);
      ctx.lineTo(15, -50);
      ctx.lineTo(22, -36);
      ctx.closePath();
      ctx.fill();

      // Center Racing Stripe
      ctx.fillStyle = car.stripeColor;
      ctx.fillRect(-5, -54, 10, 48);

      // Rear Spoiler Wing
      ctx.fillStyle = car.spoilerColor;
      ctx.beginPath();
      ctx.roundRect(-40, -40, 80, 7, 3);
      ctx.fill();

      // Exhaust Pipes + Nitro Boost Flames
      ctx.fillStyle = '#475569';
      ctx.fillRect(-20, -10, 9, 7);
      ctx.fillRect(11, -10, 9, 7);

      if (boostActive) {
        const flicker = 14 + Math.sin(timeSec * 45) * 6;
        ctx.fillStyle = '#38BDF8';
        ctx.beginPath();
        ctx.moveTo(-20, -3);
        ctx.lineTo(-15.5, flicker + 10);
        ctx.lineTo(-11, -3);
        ctx.moveTo(11, -3);
        ctx.lineTo(15.5, flicker + 10);
        ctx.lineTo(20, -3);
        ctx.fill();
        ctx.fillStyle = '#FEF08A';
        ctx.beginPath();
        ctx.arc(-15.5, 2, 4.5, 0, Math.PI * 2);
        ctx.arc(15.5, 2, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Tail Lights
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.roundRect(-36, -24, 14, 7, 3);
      ctx.roundRect(22, -24, 14, 7, 3);
      ctx.fill();

      ctx.restore();
      ctx.globalAlpha = 1;
    };

    const renderFrame = (nowTs: number) => {
      const rawDt = (nowTs - lastTs) / 1000;
      lastTs = nowTs;
      const dt = Math.min(0.05, Math.max(0.001, rawDt));
      const timeSec = nowTs / 1000;

      const sim = simRef.current;
      const stage = RACING_STAGES[sim.stageIdx] ?? RACING_STAGES[0];
      const activeCar =
        RACING_CARS.find((c) => c.id === sim.carId) ?? RACING_CARS[0];

      // Update physics ONLY when playing
      if (viewStateRef.current === 'PLAYING') {
        sim.elapsedRunSeconds += dt;

        // Check daily limit expiration in real time
        const usedToday =
          summaryRef.current.usedSeconds +
          (sim.elapsedRunSeconds - sim.lastCommittedSeconds);
        if (usedToday >= summaryRef.current.dailyLimitSeconds) {
          finishStageRun('TIME_LIMIT_REACHED');
        } else {
          // Commit elapsed seconds every 5 seconds safely
          if (Math.floor(sim.elapsedRunSeconds) - sim.lastCommittedSeconds >= 5) {
            flushRunTimeDelta();
          }

          if (sim.invulnTimer > 0) sim.invulnTimer = Math.max(0, sim.invulnTimer - dt);
          if (sim.shakeTimer > 0) sim.shakeTimer = Math.max(0, sim.shakeTimer - dt);
          if (sim.boostTimer > 0) sim.boostTimer = Math.max(0, sim.boostTimer - dt);

          const isBoost = sim.boostTimer > 0;
          const progressPct = Math.min(1, sim.distance / stage.distanceGoal);
          const targetSpeed = isBoost
            ? stage.boostSpeed
            : stage.baseSpeed + (stage.maxSpeed - stage.baseSpeed) * progressPct;

          sim.speed += (targetSpeed - sim.speed) * Math.min(1, dt * 3.5);
          sim.distance += (sim.speed * dt) / 7.5;
          sim.trackZ += (sim.speed * dt) / 16;
          sim.curveTime += dt * (sim.speed / 230);

          // Gentle dynamic curves
          sim.currentCurve =
            Math.sin(sim.curveTime * 0.72) * stage.curveIntensity * 0.75 +
            Math.sin(sim.curveTime * 1.45) * stage.curveIntensity * 0.25;

          // Steering (keyboard/buttons OR touch drag)
          if (sim.dragSteerTarget !== null) {
            const diff = sim.dragSteerTarget - sim.playerX;
            sim.playerVelX = Math.max(-1.6, Math.min(1.6, diff * 7.5));
          } else {
            const targetVel = sim.steerInput * 1.38;
            sim.playerVelX += (targetVel - sim.playerVelX) * Math.min(1, dt * 11);
          }
          // Centrifugal gentle drift on strong curves
          sim.playerX += (sim.playerVelX - sim.currentCurve * 0.14) * dt;
          sim.playerX = Math.max(-0.92, Math.min(0.92, sim.playerX));

          // Passive nitro charge + survival score
          sim.nitro = Math.min(100, sim.nitro + dt * 4.5);
          sim.score += Math.round(dt * 12);

          // Spawn entities until very close to finish line
          sim.spawnCooldown -= dt;
          if (sim.spawnCooldown <= 0 && sim.distance < stage.distanceGoal - 85) {
            spawnRoadEntity(stage);
            const pace = isBoost ? 0.68 : 1;
            sim.spawnCooldown =
              stage.trafficInterval * pace * (0.78 + Math.random() * 0.45);
          }

          // Advance scenery props
          const propFlow = (sim.speed / 250) * dt * 0.95;
          for (const prop of sim.props) {
            prop.z -= propFlow * (0.35 + (1 - prop.z) * 1.35);
            if (prop.z <= 0.02) {
              prop.z = 0.98 + Math.random() * 0.06;
              const arr = prop.side < 0 ? stage.propsLeft : stage.propsRight;
              prop.type = arr[Math.floor(Math.random() * arr.length)];
            }
          }

          // Advance road entities & check collisions
          const baseZFlow = (sim.speed / 260) * dt;
          for (const ent of sim.entities) {
            const effectiveFlow = baseZFlow * (1 - ent.relSpeed);
            ent.z -= effectiveFlow * (0.32 + (1 - ent.z) * 1.55);

            if (!ent.collected && !ent.hit && ent.z <= 0.14 && ent.z >= 0.04) {
              const hitHalfW =
                ent.kind === 'coin' || ent.kind === 'boost' || ent.kind === 'heart'
                  ? 0.24
                  : 0.21;
              if (Math.abs(ent.laneOffset - sim.playerX) < hitHalfW) {
                if (ent.kind === 'coin') {
                  ent.collected = true;
                  sim.coinsThisRun += 1;
                  sim.score += Math.round(25 * stage.coinMultiplier);
                  sim.nitro = Math.min(100, sim.nitro + 12);
                  playRacingSfx('coin', settingsRef.current.soundEnabled);
                } else if (ent.kind === 'boost') {
                  ent.collected = true;
                  sim.boostTimer = 2.6;
                  sim.nitro = Math.min(100, sim.nitro + 30);
                  sim.score += 35;
                  playRacingSfx('boost', settingsRef.current.soundEnabled);
                } else if (ent.kind === 'heart') {
                  ent.collected = true;
                  sim.hearts = Math.min(3, sim.hearts + 1);
                  playRacingSfx('heart', settingsRef.current.soundEnabled);
                } else if (sim.invulnTimer <= 0 && !isBoost) {
                  ent.hit = true;
                  sim.hearts -= 1;
                  sim.invulnTimer = 1.6;
                  sim.shakeTimer = 0.35;
                  sim.speed *= 0.62;
                  playRacingSfx('bump', settingsRef.current.soundEnabled);
                  if (sim.hearts <= 0) {
                    finishStageRun('GAME_OVER');
                    break;
                  }
                }
              }
            }
          }
          sim.entities = sim.entities.filter((ent) => ent.z > 0.01 && !ent.collected);

          // Check Finish Line!
          if (sim.distance >= stage.distanceGoal && viewStateRef.current === 'PLAYING') {
            finishStageRun('STAGE_CLEAR');
          }
        }
      }

      // Sync React HUD at ~12Hz
      hudSyncAccum += dt;
      if (hudSyncAccum >= 0.085) {
        hudSyncAccum = 0;
        const usedTotal =
          summaryRef.current.usedSeconds +
          Math.max(0, Math.floor(sim.elapsedRunSeconds) - sim.lastCommittedSeconds);
        const remaining = Math.max(0, summaryRef.current.dailyLimitSeconds - usedTotal);
        setHud({
          score: sim.score,
          coins: sim.coinsThisRun,
          hearts: Math.max(0, sim.hearts),
          nitro: Math.round(sim.nitro),
          speedKmh:
            viewStateRef.current === 'PLAYING' ? Math.round(sim.speed * 0.38) : 0,
          distancePct: Math.min(100, Math.round((sim.distance / stage.distanceGoal) * 100)),
          boostActive: sim.boostTimer > 0,
          remainingSeconds: remaining,
        });
      }

      // ===== RENDER SCENE =====
      ctx.save();
      if (sim.shakeTimer > 0 && !settingsRef.current.reducedMotion) {
        const mag = sim.shakeTimer * 18;
        ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
      }

      const hillSwing = Math.sin(sim.trackZ * 0.08) * (cssH * 0.035) * stage.hillIntensity;
      const horizonY = cssH * 0.38 + hillSwing;

      // 1. Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY + 12);
      skyGrad.addColorStop(0, stage.skyTop);
      skyGrad.addColorStop(1, stage.skyBottom);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(-20, -20, cssW + 40, horizonY + 35);

      // Stars on night stage
      if (stage.isNight) {
        ctx.fillStyle = '#FEF9C3';
        for (let s = 0; s < 32; s++) {
          const sx = ((s * 173 + 29) % 1000) * 0.001 * cssW;
          const sy = ((s * 97 + 17) % 1000) * 0.0008 * horizonY;
          const sr = s % 3 === 0 ? 1.8 : 1.1;
          ctx.fillRect(sx, sy, sr, sr);
        }
      }

      // Sun / Moon Disc
      const sunX = cssW * 0.78 - sim.currentCurve * 24;
      const sunY = Math.max(38, horizonY * 0.34);
      ctx.fillStyle = stage.sunOrMoonColor;
      ctx.beginPath();
      ctx.arc(sunX, sunY, stage.isNight ? 20 : 28, 0, Math.PI * 2);
      ctx.fill();
      if (stage.isNight) {
        ctx.fillStyle = stage.skyTop;
        ctx.beginPath();
        ctx.arc(sunX + 8, sunY - 4, 17, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Fluffy daytime clouds
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        for (let c = 0; c < 3; c++) {
          const cxCloud = ((cssW * (0.2 + c * 0.33) - sim.currentCurve * 18 + timeSec * 8) % (cssW + 120)) - 60;
          const cyCloud = 34 + c * 20;
          ctx.beginPath();
          ctx.arc(cxCloud, cyCloud, 18, 0, Math.PI * 2);
          ctx.arc(cxCloud + 16, cyCloud - 4, 22, 0, Math.PI * 2);
          ctx.arc(cxCloud + 34, cyCloud + 1, 16, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 2. Parallax Mountains / City Skyline
      const drawRidge = (color: string, baseH: number, shiftMul: number, seed: number) => {
        const shift = -sim.currentCurve * shiftMul;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(-40, horizonY + 4);
        for (let x = -40; x <= cssW + 60; x += 48) {
          const h = Math.abs(Math.sin((x + shift) * 0.008 + seed)) * baseH + 14;
          ctx.lineTo(x, horizonY - h);
        }
        ctx.lineTo(cssW + 60, horizonY + 4);
        ctx.closePath();
        ctx.fill();
      };

      if (stage.environment === 'night-city') {
        const shift = -sim.currentCurve * 32;
        ctx.fillStyle = '#0F172A';
        for (let bx = -40; bx <= cssW + 60; bx += 42) {
          const bh = 28 + ((Math.abs(bx * 13) % 5) * 16);
          ctx.fillRect(bx + shift * 0.3, horizonY - bh, 36, bh + 4);
          ctx.fillStyle = '#FACC15';
          for (let wy = horizonY - bh + 8; wy < horizonY - 8; wy += 11) {
            ctx.fillRect(bx + shift * 0.3 + 7, wy, 5, 5);
            ctx.fillRect(bx + shift * 0.3 + 22, wy, 5, 5);
          }
          ctx.fillStyle = '#0F172A';
        }
      } else {
        drawRidge(stage.mountainFar, 54, 22, 1.2);
        drawRidge(stage.mountainNear, 32, 36, 2.7);
      }

      // Mist overlay on forest stage
      if (stage.hasMist) {
        const mistGrad = ctx.createLinearGradient(0, horizonY - 26, 0, horizonY + 26);
        mistGrad.addColorStop(0, 'rgba(226, 245, 240, 0)');
        mistGrad.addColorStop(0.5, 'rgba(226, 245, 240, 0.45)');
        mistGrad.addColorStop(1, 'rgba(226, 245, 240, 0)');
        ctx.fillStyle = mistGrad;
        ctx.fillRect(0, horizonY - 26, cssW, 52);
      }

      // 3. Perspective Road Slices (from bottom to horizon)
      const slices = 64;
      const roadMaxHalfW = Math.min(cssW * 0.43, 330);
      const roadMinHalfW = Math.max(14, cssW * 0.03);

      const getSliceGeometry = (zNorm: number) => {
        // zNorm: 0 at bottom (camera), 1 at horizon
        const t = 1 - zNorm; // 1 at bottom, 0 at horizon
        const y = horizonY + t * (cssH - horizonY);
        const persp = Math.pow(t, 1.38);
        const halfW = roadMinHalfW + (roadMaxHalfW - roadMinHalfW) * persp;
        const curveShift = sim.currentCurve * cssW * 0.28 * Math.pow(1 - t, 2.05);
        const camFollow = -sim.playerX * halfW * 0.34;
        const cx = cssW * 0.5 + curveShift + camFollow;
        return { y, t, persp, halfW, cx };
      };

      for (let i = 0; i < slices; i++) {
        const z0 = i / slices;
        const z1 = (i + 1) / slices;
        const g0 = getSliceGeometry(z0);
        const g1 = getSliceGeometry(z1);

        // World Z band index for asphalt/grass alternating motion stripes
        const worldDepth = 1 / Math.max(0.08, g0.t) * 2.2 + sim.trackZ;
        const band = Math.floor(worldDepth) % 2 === 0;

        // Ground terrain
        ctx.fillStyle = band ? stage.groundLight : stage.groundDark;
        ctx.fillRect(-20, g1.y, cssW + 40, g0.y - g1.y + 1.5);

        // Coastal ocean strip on right side for Stage 3
        if (stage.hasOceanSide) {
          const oceanStartX = Math.max(g1.cx + g1.halfW * 1.42, cssW * 0.58);
          ctx.fillStyle = band ? '#0284C7' : '#0369A1';
          ctx.fillRect(oceanStartX, g1.y, cssW - oceanStartX + 30, g0.y - g1.y + 1.5);
          if (band) {
            ctx.fillStyle = 'rgba(224, 242, 254, 0.72)';
            ctx.fillRect(oceanStartX, g1.y, Math.max(4, 12 * g0.persp), g0.y - g1.y + 1);
          }
        }

        // Outer dirt/sand shoulders
        const sh0 = g0.halfW * 1.18;
        const sh1 = g1.halfW * 1.18;
        ctx.fillStyle = band ? stage.shoulderLight : stage.shoulderDark;
        ctx.beginPath();
        ctx.moveTo(g0.cx - sh0, g0.y + 1);
        ctx.lineTo(g0.cx + sh0, g0.y + 1);
        ctx.lineTo(g1.cx + sh1, g1.y);
        ctx.lineTo(g1.cx - sh1, g1.y);
        ctx.closePath();
        ctx.fill();

        // Guardrail posts on mountain/coastal/night highways
        if (stage.hasGuardrails && Math.floor(worldDepth * 1.5) % 3 === 0) {
          const postH = Math.max(3, 16 * g0.persp);
          const postW = Math.max(1.5, 4 * g0.persp);
          ctx.fillStyle = '#CBD5E1';
          ctx.fillRect(g0.cx - sh0, g0.y - postH, postW, postH);
          ctx.fillRect(g0.cx + sh0 - postW, g0.y - postH, postW, postH);
        }

        // Rumble curbs
        const cb0 = g0.halfW * 1.07;
        const cb1 = g1.halfW * 1.07;
        ctx.fillStyle = band ? stage.curbLight : stage.curbDark;
        ctx.beginPath();
        ctx.moveTo(g0.cx - cb0, g0.y + 1);
        ctx.lineTo(g0.cx + cb0, g0.y + 1);
        ctx.lineTo(g1.cx + cb1, g1.y);
        ctx.lineTo(g1.cx - cb1, g1.y);
        ctx.closePath();
        ctx.fill();

        // Asphalt surface
        ctx.fillStyle = band ? stage.asphaltLight : stage.asphaltDark;
        ctx.beginPath();
        ctx.moveTo(g0.cx - g0.halfW, g0.y + 1);
        ctx.lineTo(g0.cx + g0.halfW, g0.y + 1);
        ctx.lineTo(g1.cx + g1.halfW, g1.y);
        ctx.lineTo(g1.cx - g1.halfW, g1.y);
        ctx.closePath();
        ctx.fill();

        // Solid road edge lines
        const edgeW0 = Math.max(1.2, 5.5 * g0.persp);
        const edgeW1 = Math.max(1, 5.5 * g1.persp);
        ctx.fillStyle = stage.edgeLineColor;
        ctx.beginPath();
        ctx.moveTo(g0.cx - g0.halfW * 0.94, g0.y + 1);
        ctx.lineTo(g0.cx - g0.halfW * 0.94 + edgeW0, g0.y + 1);
        ctx.lineTo(g1.cx - g1.halfW * 0.94 + edgeW1, g1.y);
        ctx.lineTo(g1.cx - g1.halfW * 0.94, g1.y);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(g0.cx + g0.halfW * 0.94 - edgeW0, g0.y + 1);
        ctx.lineTo(g0.cx + g0.halfW * 0.94, g0.y + 1);
        ctx.lineTo(g1.cx + g1.halfW * 0.94, g1.y);
        ctx.lineTo(g1.cx + g1.halfW * 0.94 - edgeW1, g1.y);
        ctx.closePath();
        ctx.fill();

        // Dashed Lane Dividers
        if (band) {
          ctx.fillStyle = stage.laneLineColor;
          for (let l = 1; l < stage.lanes; l++) {
            const laneNorm = -1 + (l * 2) / stage.lanes;
            const lw0 = Math.max(1, 4.5 * g0.persp);
            const lw1 = Math.max(0.8, 4.5 * g1.persp);
            ctx.beginPath();
            ctx.moveTo(g0.cx + laneNorm * g0.halfW - lw0 * 0.5, g0.y + 1);
            ctx.lineTo(g0.cx + laneNorm * g0.halfW + lw0 * 0.5, g0.y + 1);
            ctx.lineTo(g1.cx + laneNorm * g1.halfW + lw1 * 0.5, g1.y);
            ctx.lineTo(g1.cx + laneNorm * g1.halfW - lw1 * 0.5, g1.y);
            ctx.closePath();
            ctx.fill();
          }
        } else if (stage.hasCatEyes && Math.floor(worldDepth) % 2 === 1) {
          ctx.fillStyle = stage.isNight ? '#38BDF8' : '#FBBF24';
          const studR = Math.max(1, 3 * g0.persp);
          ctx.beginPath();
          ctx.arc(g0.cx - g0.halfW * 0.92, g0.y, studR, 0, Math.PI * 2);
          ctx.arc(g0.cx + g0.halfW * 0.92, g0.y, studR, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Finish Banner Arch approaching as progress nears 100%
      const remainingMeters = stage.distanceGoal - sim.distance;
      if (remainingMeters < 180 && remainingMeters >= -20) {
        const finZ = Math.max(0.05, Math.min(0.95, remainingMeters / 180));
        const gf = getSliceGeometry(finZ);
        const archW = gf.halfW * 2.18;
        const archH = Math.max(24, 96 * gf.persp);
        ctx.fillStyle = '#E2E8F0';
        ctx.fillRect(gf.cx - archW * 0.5, gf.y - archH, 8 * gf.persp + 3, archH);
        ctx.fillRect(gf.cx + archW * 0.5 - (8 * gf.persp + 3), gf.y - archH, 8 * gf.persp + 3, archH);
        // Checkered banner bar
        const bannerH = Math.max(10, 22 * gf.persp);
        const cols = 10;
        const cellW = archW / cols;
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < cols; c++) {
            ctx.fillStyle = (r + c) % 2 === 0 ? '#0F172A' : '#FFFFFF';
            ctx.fillRect(
              gf.cx - archW * 0.5 + c * cellW,
              gf.y - archH + r * (bannerH * 0.5),
              cellW + 0.5,
              bannerH * 0.5 + 0.5
            );
          }
        }
      }

      // 4. Depth-sorted Roadside Props & Road Entities
      type DrawItem =
        | { kind: 'prop'; z: number; prop: SceneryProp }
        | { kind: 'entity'; z: number; entity: RoadEntity };

      const drawList: DrawItem[] = [
        ...sim.props.map((p) => ({ kind: 'prop' as const, z: p.z, prop: p })),
        ...sim.entities.map((e) => ({ kind: 'entity' as const, z: e.z, entity: e })),
      ];
      drawList.sort((a, b) => b.z - a.z);

      for (const item of drawList) {
        const g = getSliceGeometry(item.z);
        const scale = Math.max(0.05, 0.08 + g.persp * 1.15);
        if (item.kind === 'prop') {
          const x = g.cx + item.prop.side * g.halfW * (1.22 + item.prop.xExtra);
          drawRoadProp(item.prop, x, g.y, scale, stage, timeSec);
        } else {
          const x = g.cx + item.entity.laneOffset * g.halfW * 0.86;
          drawRoadEntity(item.entity, x, g.y, scale, stage.isNight, timeSec);
        }
      }

      // 5. Speed lines during Nitro Boost
      if (sim.boostTimer > 0 && !settingsRef.current.reducedMotion) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
        ctx.lineWidth = 2.5;
        for (let l = 0; l < 10; l++) {
          const lx = ((l * 137 + timeSec * 120) % cssW);
          const ly = horizonY + ((l * 79 + timeSec * 420) % (cssH - horizonY));
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(lx, ly + 36);
          ctx.stroke();
        }
      }

      // 6. Player Race Car
      const playerGeo = getSliceGeometry(0.095);
      const playerScreenX = playerGeo.cx + sim.playerX * playerGeo.halfW * 0.86;
      const carScale = Math.max(0.85, Math.min(1.22, cssW / 540));
      drawPlayerCar(
        playerScreenX,
        playerGeo.y,
        carScale,
        activeCar,
        sim.playerVelX,
        sim.boostTimer > 0,
        sim.invulnTimer,
        stage.isNight,
        timeSec
      );

      ctx.restore();
      rafId = window.requestAnimationFrame(renderFrame);
    };

    rafId = window.requestAnimationFrame(renderFrame);
    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [finishStageRun, flushRunTimeDelta]);

  const activeStage = RACING_STAGES[selectedStageIdx] ?? RACING_STAGES[0];
  const activeCar = RACING_CARS.find((c) => c.id === selectedCarId) ?? RACING_CARS[0];
  const latestSummary = getNormalizedRacingState(profile);

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (viewState !== 'PLAYING' || e.buttons === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const relX = ((e.clientX - rect.left) / rect.width) * 2 - 1; // -1 left .. +1 right
    simRef.current.dragSteerTarget = Math.max(-0.92, Math.min(0.92, relX * 1.15));
  };

  const clearPointerDrag = () => {
    simRef.current.dragSteerTarget = null;
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-[#0F172A] text-white overflow-hidden select-none">
      {/* Compact Racing Top Header */}
      <header className="shrink-0 z-30 bg-gradient-to-b from-[#F49A67] to-[#E67E45] dark:from-slate-900 dark:to-slate-900 border-b-2 border-[#C76531] dark:border-slate-800 px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            flushRunTimeDelta();
            audioEngine.stopSpeech();
            onBack();
          }}
          aria-label="بازگشت به خانه"
          className="min-h-[44px] min-w-[44px] rounded-2xl bg-white/95 hover:bg-white dark:bg-slate-800 border-b-4 border-[#DFC6A8] dark:border-slate-700 flex items-center justify-center text-[#783F1D] dark:text-slate-200 shrink-0"
        >
          <ArrowRight className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <Car className="w-5 h-5 text-white shrink-0" />
          <h1 className="text-sm sm:text-base font-black text-white drop-shadow-[0_2px_0_rgba(148,70,22,0.45)] truncate">
            {viewState === 'TITLE_MENU'
              ? 'مسابقه ماشین کودک نابغه'
              : `مرحله ${formatNumber(activeStage.stageNumber, settings.digitMode)} · ${activeStage.title}`}
          </h1>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div
            title="زمان بازی باقی‌مانده امروز"
            className={`min-h-[38px] px-2.5 rounded-xl border font-extrabold text-xs inline-flex items-center gap-1 tabular-nums whitespace-nowrap ${
              hud.remainingSeconds <= 60
                ? 'bg-rose-600/95 border-rose-300 text-white'
                : 'bg-slate-950/55 border-white/25 text-amber-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span dir="ltr">
              {formatRacingClock(
                viewState === 'TITLE_MENU'
                  ? latestSummary.remainingSeconds
                  : hud.remainingSeconds,
                settings.digitMode
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
            aria-label={settings.soundEnabled ? 'قطع صدا' : 'وصل صدا'}
            className="min-h-[40px] min-w-[40px] rounded-xl bg-white/90 hover:bg-white dark:bg-slate-800 text-[#783F1D] dark:text-slate-200 flex items-center justify-center shrink-0"
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>

          {viewState === 'PLAYING' && (
            <button
              type="button"
              onClick={() => {
                flushRunTimeDelta();
                setViewState('PAUSED');
              }}
              aria-label="توقف موقت"
              className="min-h-[40px] min-w-[40px] rounded-xl bg-white/90 hover:bg-white dark:bg-slate-800 text-[#783F1D] dark:text-slate-200 flex items-center justify-center shrink-0"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Canvas Playfield */}
      <div ref={containerRef} className="relative flex-1 min-h-0 overflow-hidden bg-slate-900">
        <canvas
          ref={canvasRef}
          onPointerDown={handleCanvasPointerMove}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={clearPointerDrag}
          onPointerCancel={clearPointerDrag}
          onPointerLeave={clearPointerDrag}
          className="block w-full h-full touch-none"
        />

        {/* Active Gameplay HUD Overlay (Unobtrusive Top Strip) */}
        {(viewState === 'PLAYING' || viewState === 'PAUSED') && (
          <div className="pointer-events-none absolute top-3 inset-x-3 z-20 flex flex-col gap-2 max-w-4xl mx-auto">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {/* Hearts + Score */}
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-2xl bg-slate-950/75 border border-white/15 flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <Heart
                      key={i}
                      className={`w-4 h-4 ${
                        i < hud.hearts
                          ? 'fill-rose-500 text-rose-400'
                          : 'text-slate-600'
                      }`}
                    />
                  ))}
                </div>

                <div className="px-3 py-1.5 rounded-2xl bg-slate-950/75 border border-white/15 flex items-center gap-1.5 text-xs sm:text-sm font-black tabular-nums">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{formatNumber(hud.score, settings.digitMode)}</span>
                </div>
              </div>

              {/* Speed & Nitro Meter */}
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-2xl bg-slate-950/75 border border-white/15 text-xs font-extrabold text-sky-300 tabular-nums">
                  {formatNumber(hud.speedKmh, settings.digitMode)} کیلومتر/ساعت
                </div>
                <div className="w-24 sm:w-32 h-7 rounded-2xl bg-slate-950/75 border border-white/15 p-1 flex items-center gap-1.5">
                  <Zap
                    className={`w-3.5 h-3.5 shrink-0 ${
                      hud.boostActive ? 'text-yellow-300 animate-pulse' : 'text-sky-400'
                    }`}
                  />
                  <div className="flex-1 h-2.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-l from-cyan-400 to-amber-400 transition-all"
                      style={{ width: `${hud.nitro}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Stage Distance Progress Bar */}
            <div className="h-4 rounded-full bg-slate-950/70 border border-white/15 p-0.5 flex items-center gap-2">
              <div className="flex-1 h-full rounded-full bg-slate-800 overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-l from-[#4BB543] to-[#FACC15] rounded-full transition-all"
                  style={{ width: `${hud.distancePct}%` }}
                />
              </div>
              <span className="text-[10px] font-black text-white px-1.5 tabular-nums flex items-center gap-1 shrink-0">
                <Flag className="w-3 h-3 text-emerald-400" />
                {formatNumber(hud.distancePct, settings.digitMode)}٪
              </span>
            </div>
          </div>
        )}

        {/* Physical LTR Steering Controls (Left always steers Left, Right always steers Right) */}
        {viewState === 'PLAYING' && (
          <div
            dir="ltr"
            className="pointer-events-none absolute bottom-4 inset-x-4 z-20 flex items-end justify-between gap-3 max-w-4xl mx-auto"
          >
            <div className="pointer-events-auto flex items-center gap-2.5">
              <button
                type="button"
                aria-label="گردش به چپ"
                onPointerDown={() => {
                  simRef.current.dragSteerTarget = null;
                  simRef.current.steerInput = -1;
                }}
                onPointerUp={() => {
                  if (simRef.current.steerInput === -1) simRef.current.steerInput = 0;
                }}
                onPointerLeave={() => {
                  if (simRef.current.steerInput === -1) simRef.current.steerInput = 0;
                }}
                onPointerCancel={() => {
                  if (simRef.current.steerInput === -1) simRef.current.steerInput = 0;
                }}
                className="w-16 h-16 sm:w-20 sm:h-16 rounded-3xl bg-white/90 active:bg-amber-200 border-b-4 border-slate-300 text-slate-900 flex items-center justify-center shadow-lg active:translate-y-0.5 transition-all"
              >
                <ArrowLeft className="w-8 h-8 stroke-[2.5]" />
              </button>

              <button
                type="button"
                aria-label="گردش به راست"
                onPointerDown={() => {
                  simRef.current.dragSteerTarget = null;
                  simRef.current.steerInput = 1;
                }}
                onPointerUp={() => {
                  if (simRef.current.steerInput === 1) simRef.current.steerInput = 0;
                }}
                onPointerLeave={() => {
                  if (simRef.current.steerInput === 1) simRef.current.steerInput = 0;
                }}
                onPointerCancel={() => {
                  if (simRef.current.steerInput === 1) simRef.current.steerInput = 0;
                }}
                className="w-16 h-16 sm:w-20 sm:h-16 rounded-3xl bg-white/90 active:bg-amber-200 border-b-4 border-slate-300 text-slate-900 flex items-center justify-center shadow-lg active:translate-y-0.5 transition-all"
              >
                <ArrowRight className="w-8 h-8 stroke-[2.5]" />
              </button>
            </div>

            <button
              type="button"
              onClick={triggerNitroBoost}
              disabled={hud.nitro < 30 || hud.boostActive}
              aria-label="توربو سرعت"
              className={`pointer-events-auto min-h-[64px] px-4 sm:px-5 rounded-3xl border-b-4 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all whitespace-nowrap ${
                hud.nitro >= 30 && !hud.boostActive
                  ? 'bg-gradient-to-b from-amber-400 to-orange-500 border-orange-700 text-slate-950 active:translate-y-0.5'
                  : 'bg-slate-800/80 border-slate-900 text-slate-400 opacity-75'
              }`}
            >
              <Zap className="w-5 h-5 fill-current" />
              <span>توربو</span>
            </button>
          </div>
        )}

        {/* TITLE MENU / ICON-FIRST GARAGE & STAGE SELECTOR */}
        {viewState === 'TITLE_MENU' && (
          <div className="absolute inset-0 z-30 bg-slate-950/80 overflow-y-auto p-4 sm:p-6 flex items-center justify-center">
            <div className="w-full max-w-2xl rounded-3xl bg-[#FFF8EE] dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-[#EEDCC5] dark:border-slate-800 p-4 sm:p-6 space-y-5 shadow-2xl my-auto">
              {/* Compact Icon Stat Chips */}
              <div className="flex items-center justify-between gap-2 border-b border-[#EFE0CE] dark:border-slate-800 pb-3.5">
                <div className="px-3 py-2 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-xs font-black tabular-nums inline-flex items-center gap-1.5">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span dir="ltr">
                    {formatRacingClock(latestSummary.remainingSeconds, settings.digitMode)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-3 py-2 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 text-xs font-black tabular-nums inline-flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 shrink-0" />
                    <span>{formatNumber(latestSummary.bestScore, settings.digitMode)}</span>
                  </div>
                  <div className="px-3 py-2 rounded-2xl bg-sky-100 dark:bg-sky-950/50 text-sky-900 dark:text-sky-200 border border-sky-300 dark:border-sky-800 text-xs font-black tabular-nums inline-flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-500 shrink-0" />
                    <span>{formatNumber(activeStage.completionStars, settings.digitMode)}</span>
                  </div>
                </div>
              </div>

              {/* Icon-Only Car Selector */}
              <div className="grid grid-cols-4 gap-2.5">
                {RACING_CARS.map((car) => {
                  const active = car.id === selectedCarId;
                  return (
                    <button
                      key={car.id}
                      type="button"
                      aria-label={car.name}
                      title={car.name}
                      onClick={() => {
                        audioEngine.play('uiTap');
                        setSelectedCarId(car.id);
                        simRef.current.carId = car.id;
                      }}
                      className={`rounded-2xl p-3 border-2 flex items-center justify-center transition-all active:translate-y-0.5 ${
                        active
                          ? 'bg-white dark:bg-slate-800 border-[#5472EB] ring-2 ring-blue-300/60 shadow-sm'
                          : 'bg-white/60 dark:bg-slate-800/50 border-[#EEDCC5] dark:border-slate-700 hover:bg-white'
                      }`}
                    >
                      <MiniCarSvg car={car} className="w-16 h-10" />
                    </button>
                  );
                })}
              </div>

              {/* Icon-Only Stage & Road Environment Selector */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                {RACING_STAGES.map((stage, idx) => {
                  const unlocked = stage.stageNumber <= latestSummary.bestStage;
                  const active = idx === selectedStageIdx;
                  const StageIcon =
                    stage.environment === 'countryside'
                      ? Sun
                      : stage.environment === 'forest'
                        ? Trees
                        : stage.environment === 'coastal'
                          ? Waves
                          : stage.environment === 'mountain'
                            ? MountainSnow
                            : stage.environment === 'desert'
                              ? Sunset
                              : MoonStar;

                  return (
                    <button
                      key={stage.stageNumber}
                      type="button"
                      disabled={!unlocked}
                      aria-label={`مرحله ${stage.stageNumber}: ${stage.title}`}
                      title={stage.title}
                      onClick={() => {
                        audioEngine.play('uiTap');
                        setSelectedStageIdx(idx);
                        simRef.current.stageIdx = idx;
                      }}
                      className={`rounded-2xl p-2.5 border-2 transition-all flex flex-col items-center justify-center gap-1.5 ${
                        !unlocked
                          ? 'bg-slate-100 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-55 cursor-not-allowed'
                          : active
                            ? 'bg-white dark:bg-slate-800 border-[#4BB543] ring-2 ring-emerald-300/60 shadow-sm'
                            : 'bg-white/80 dark:bg-slate-800/60 border-[#EEDCC5] dark:border-slate-700 hover:bg-white'
                      }`}
                    >
                      <div
                        className="w-12 h-12 rounded-xl border border-black/10 flex items-center justify-center text-white shadow-inner"
                        style={{
                          background: `linear-gradient(180deg, ${stage.skyTop} 0%, ${stage.groundLight} 55%, ${stage.asphaltDark} 100%)`,
                        }}
                      >
                        {!unlocked ? (
                          <Lock className="w-5 h-5 drop-shadow" />
                        ) : (
                          <StageIcon className="w-6 h-6 drop-shadow" />
                        )}
                      </div>
                      <span className="text-xs font-black tabular-nums text-slate-800 dark:text-slate-100">
                        {formatNumber(stage.stageNumber, settings.digitMode)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Big Icon Start CTA */}
              <div className="flex items-center justify-center pt-1">
                <button
                  type="button"
                  aria-label={`شروع مرحله ${activeStage.stageNumber}`}
                  title="شروع مسابقه"
                  onClick={() => startStageRun(selectedStageIdx)}
                  className="w-full sm:w-auto min-w-[200px] min-h-[56px] px-10 rounded-2xl bg-[#4BB543] hover:bg-[#41A23A] border-b-4 border-[#2E8228] active:border-b-0 active:translate-y-0.5 text-white flex items-center justify-center gap-2 shadow-md"
                >
                  <Play className="w-7 h-7 fill-white" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PAUSED MODAL */}
        {viewState === 'PAUSED' && (
          <div className="absolute inset-0 z-30 bg-slate-950/75 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-[#EEDCC5] dark:border-slate-800 p-6 text-center space-y-4 shadow-2xl">
              <h2 className="text-xl font-black">توقف مسابقه</h2>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                زمان باقی‌مانده امروز: {formatRacingClock(hud.remainingSeconds, settings.digitMode)}
              </p>
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => setViewState('PLAYING')}
                  className="w-full min-h-[50px] rounded-2xl bg-[#4BB543] border-b-4 border-[#2E8228] text-white font-black text-sm flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>ادامه رانندگی</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewState('TITLE_MENU')}
                  className="w-full min-h-[46px] rounded-2xl bg-[#FFF6EB] dark:bg-slate-800 border-2 border-[#EEDCC5] dark:border-slate-700 text-[#783F1D] dark:text-amber-200 font-extrabold text-sm"
                >
                  بازگشت به گاراژ و انتخاب مرحله
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STAGE CLEAR OR GAME OVER SUMMARY */}
        {(viewState === 'STAGE_CLEAR' || viewState === 'GAME_OVER') && (
          <div className="absolute inset-0 z-30 bg-slate-950/80 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-[#EEDCC5] dark:border-slate-800 p-6 text-center space-y-4 shadow-2xl">
              <div
                className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center ${
                  viewState === 'STAGE_CLEAR'
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-amber-100 text-amber-600'
                }`}
              >
                {viewState === 'STAGE_CLEAR' ? (
                  <Trophy className="w-9 h-9" />
                ) : (
                  <Flag className="w-9 h-9" />
                )}
              </div>

              <div>
                <h2 className="text-xl font-black">
                  {viewState === 'STAGE_CLEAR'
                    ? 'آفرین قهرمان! از خط پایان رد شدی!'
                    : 'پایان این دور مسابقه!'}
                </h2>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                  {roundRewardSummary?.stageTitle}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[#FFF9F2] dark:bg-slate-800 p-3 border border-[#EEDCC5] dark:border-slate-700 tabular-nums">
                <div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    امتیاز بازی
                  </div>
                  <div className="text-base font-black text-slate-900 dark:text-white">
                    {formatNumber(hud.score, settings.digitMode)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    امتیاز باشگاه
                  </div>
                  <div className="text-base font-black text-amber-600 dark:text-amber-400">
                    +{formatNumber(roundRewardSummary?.pointsEarned ?? 0, settings.digitMode)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    ستاره جدید
                  </div>
                  <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
                    +{formatNumber(roundRewardSummary?.starsEarned ?? 0, settings.digitMode)}
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                {viewState === 'STAGE_CLEAR' &&
                  activeStage.stageNumber < RACING_STAGES.length && (
                    <button
                      type="button"
                      onClick={() => startStageRun(selectedStageIdx + 1)}
                      className="w-full min-h-[52px] rounded-2xl bg-[#4BB543] hover:bg-[#41A23A] border-b-4 border-[#2E8228] text-white font-black text-sm flex items-center justify-center gap-2"
                    >
                      <Play className="w-5 h-5 fill-white" />
                      <span>
                        مرحله بعد ({RACING_STAGES[selectedStageIdx + 1]?.title})
                      </span>
                    </button>
                  )}

                <button
                  type="button"
                  onClick={() => startStageRun(selectedStageIdx)}
                  className="w-full min-h-[48px] rounded-2xl bg-[#5472EB] hover:bg-[#425FD6] border-b-4 border-[#354EB8] text-white font-extrabold text-sm flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>بازی مجدد این مرحله</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewState('TITLE_MENU')}
                  className="w-full min-h-[44px] rounded-2xl bg-[#FFF6EB] dark:bg-slate-800 border border-[#EEDCC5] dark:border-slate-700 text-[#783F1D] dark:text-amber-200 font-extrabold text-xs"
                >
                  بازگشت به گاراژ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DAILY TIME LIMIT REACHED MODAL */}
        {viewState === 'TIME_LIMIT_REACHED' && (
          <div className="absolute inset-0 z-30 bg-slate-950/85 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-[#EEDCC5] dark:border-slate-800 p-6 text-center space-y-4 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 mx-auto flex items-center justify-center">
                <ShieldAlert className="w-9 h-9" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  زمان مسابقه ماشین امروز تمام شد!
                </h2>
                <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
                  برای استراحت چشم‌ها و تعادل بین بازی و یادگیری، سهمیه امروز به پایان رسید. فردا دوباره با کلی انرژی برگرد!
                </p>
              </div>

              <div className="rounded-2xl bg-[#FFF9F2] dark:bg-slate-800 p-3.5 border border-[#EEDCC5] dark:border-slate-700 text-xs font-extrabold text-[#783F1D] dark:text-amber-200 tabular-nums">
                مجموع ستاره و امتیازهایی که تا الان گرفتی ذخیره شده · بهترین مرحله:{' '}
                {formatNumber(latestSummary.bestStage, settings.digitMode)} از{' '}
                {formatNumber(RACING_STAGES.length, settings.digitMode)}
              </div>

              <button
                type="button"
                onClick={onBack}
                className="w-full min-h-[52px] rounded-2xl bg-[#4BB543] hover:bg-[#41A23A] border-b-4 border-[#2E8228] text-white font-black text-sm flex items-center justify-center gap-2"
              >
                <span>بازگشت به صفحه اصلی و تمرین چرتکه</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
