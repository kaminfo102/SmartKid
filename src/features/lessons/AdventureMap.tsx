import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Check, Flag, Lock, Play, Sparkles, Star } from 'lucide-react';
import type {
  ChildProfile,
  DigitDisplayMode,
  LessonDefinition,
  TermBiome,
  TermDefinition,
} from '../../types/app';
import { formatNumber } from '../../lib/numbers';
import { KiaAvatar } from '../../components/KiaAvatar';
import { MeadowDecorFlower } from '../../components/KidIconTile';
import { BiomeWorldScenery, StoryLandmarkBadge } from './StoryLandmarkSvg';

export interface AdventureMapProps {
  term: TermDefinition;
  profile: ChildProfile;
  digitMode: DigitDisplayMode;
  reducedMotion?: boolean;
  onSelectLesson: (lesson: LessonDefinition) => void;
  onRequestUnlockTerm?: (term: TermDefinition) => void;
}

const BIOME_PALETTE: Record<
  TermBiome,
  {
    frameBg: string;
    skyBg: string;
    islandBg: string;
    roadStroke: string;
    roadEdge: string;
    completedTrail: string;
    storyBg: string;
    finishCardBg: string;
  }
> = {
  farm: {
    frameBg: 'bg-gradient-to-b from-[#9FE0FC] to-[#7CCBF3] dark:from-slate-800 dark:to-slate-900',
    skyBg: 'from-[#CBEFFF] via-[#E5F7FF] to-transparent dark:from-slate-800 dark:to-transparent',
    islandBg:
      'bg-gradient-to-b from-[#92DA54] via-[#7ECD42] to-[#68B732] dark:from-emerald-950 dark:to-slate-950',
    roadStroke: '#F9E1A8',
    roadEdge: '#D8A651',
    completedTrail: '#4BB543',
    storyBg: 'bg-[#FFFBEF] border-[#F6D57A]',
    finishCardBg: 'bg-[#FFF7DE] border-[#F5C55B]',
  },
  forest: {
    frameBg: 'bg-gradient-to-b from-[#AEECE0] to-[#7FD9C9] dark:from-slate-800 dark:to-slate-900',
    skyBg: 'from-[#D7FBF3] via-[#ECFFF9] to-transparent dark:from-slate-800 dark:to-transparent',
    islandBg:
      'bg-gradient-to-b from-[#60C659] via-[#4BB048] to-[#379438] dark:from-emerald-950 dark:to-slate-950',
    roadStroke: '#F8E3B2',
    roadEdge: '#C79247',
    completedTrail: '#FBBF24',
    storyBg: 'bg-[#F7F1FF] border-[#D3BDF8]',
    finishCardBg: 'bg-[#F3EBFF] border-[#C7A6F5]',
  },
  island: {
    frameBg: 'bg-gradient-to-b from-[#82D8FA] to-[#56BFF2] dark:from-slate-800 dark:to-slate-900',
    skyBg: 'from-[#C8F0FF] via-[#E6F8FF] to-transparent dark:from-slate-800 dark:to-transparent',
    islandBg:
      'bg-gradient-to-b from-[#F5E2A6] via-[#EDD285] to-[#DFBD64] dark:from-amber-950 dark:to-slate-950',
    roadStroke: '#FFF7DF',
    roadEdge: '#C89B42',
    completedTrail: '#0EA5E9',
    storyBg: 'bg-[#ECF9FF] border-[#93DCFA]',
    finishCardBg: 'bg-[#E6F7FF] border-[#7DD3FC]',
  },
  space: {
    frameBg: 'bg-gradient-to-b from-[#4338CA] to-[#312E81] dark:from-slate-900 dark:to-slate-950',
    skyBg: 'from-[#4F46E5]/50 via-[#3730A3]/20 to-transparent dark:from-indigo-950 dark:to-transparent',
    islandBg: 'bg-gradient-to-b from-[#4338CA] via-[#3730A3] to-[#27236B]',
    roadStroke: '#FDE68A',
    roadEdge: '#818CF8',
    completedTrail: '#34D399',
    storyBg: 'bg-[#EEF2FF] border-[#A5B4FC]',
    finishCardBg: 'bg-[#EEF2FF] border-[#818CF8]',
  },
};

function buildRoadSegments(count: number, completedSegments: number) {
  const safeCount = Math.max(2, count);
  const segH = 160;
  const startY = 36;
  const totalH = safeCount * segH + 40;
  const rightX = 290;
  const leftX = 110;

  const getPoint = (i: number) => ({
    x: i % 2 === 0 ? rightX : leftX,
    y: startY + i * segH,
  });

  let fullPath = `M ${rightX} ${startY}`;
  let activeProgressPath = `M ${rightX} ${startY}`;

  for (let i = 0; i < safeCount - 1; i++) {
    const p1 = getPoint(i);
    const p2 = getPoint(i + 1);
    const midY1 = p1.y + segH * 0.56;
    const midY2 = p1.y + segH * 0.44;
    const curve = ` C ${p1.x} ${midY1}, ${p2.x} ${midY2}, ${p2.x} ${p2.y}`;
    fullPath += curve;
    if (i < completedSegments) {
      activeProgressPath += curve;
    }
  }

  const lastPt = getPoint(safeCount - 1);
  fullPath += ` Q ${lastPt.x} ${lastPt.y + 52}, 200 ${lastPt.y + 76}`;

  return {
    fullPath,
    activeProgressPath,
    hasActiveProgress: completedSegments > 0,
    height: totalH,
  };
}

/**
 * AdventureMap
 * Animated storybook game-road component generated from a TermDefinition.
 * Each stage renders its distinctive StageLandmark medallion connected along
 * an animated winding S-curve trail.
 */
export const AdventureMap: React.FC<AdventureMapProps> = ({
  term,
  profile,
  digitMode,
  reducedMotion = false,
  onSelectLesson,
  onRequestUnlockTerm,
}) => {
  const stages = term.stages ?? [];
  const isTermUnlocked = Boolean(term.isFree || term.unlocked);
  const biomeStyle = BIOME_PALETTE[term.biome] ?? BIOME_PALETTE.farm;

  const nextActiveLessonId =
    stages.find((l) => {
      const req = l.unlockRequirement;
      const unlockedStage =
        isTermUnlocked && (!req || Boolean(profile.lessons[req]?.completed));
      return unlockedStage && !profile.lessons[l.id]?.completed;
    })?.id ?? stages[0]?.id;

  // Determine furthest reached segment index to paint the glowing completed trail
  const activeOrCompletedIdx = useMemo(() => {
    if (!isTermUnlocked || stages.length === 0) return 0;
    let maxIdx = 0;
    stages.forEach((st, idx) => {
      if (profile.lessons[st.id]?.completed || st.id === nextActiveLessonId) {
        maxIdx = Math.max(maxIdx, idx);
      }
    });
    return maxIdx;
  }, [isTermUnlocked, stages, profile.lessons, nextActiveLessonId]);

  const roadGeometry = useMemo(
    () => buildRoadSegments(stages.length, activeOrCompletedIdx),
    [stages.length, activeOrCompletedIdx]
  );

  const allCompleted =
    isTermUnlocked &&
    stages.length > 0 &&
    stages.every((s) => Boolean(profile.lessons[s.id]?.completed));

  return (
    <section
      aria-label={`نقشه ماجراجویی ${term.title}`}
      className={`rounded-2xl sm:rounded-3xl border-4 border-white dark:border-slate-800 shadow-[0_14px_34px_-10px_rgba(155,95,35,0.28)] overflow-hidden p-2 sm:p-3 ${biomeStyle.frameBg}`}
    >
      <div className={`rounded-2xl overflow-hidden relative ${biomeStyle.islandBg}`}>
        {/* Animated Sky + Fluffy Floating Clouds + Biome Horizon Scenery */}
        <div className={`relative bg-gradient-to-b ${biomeStyle.skyBg} pt-3 overflow-hidden`}>
          {/* Drifting Puffy Clouds */}
          <motion.div
            aria-hidden="true"
            animate={reducedMotion ? undefined : { x: [-8, 12, -8] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            className="pointer-events-none absolute top-2 left-4 opacity-85 dark:opacity-25"
          >
            <svg viewBox="0 0 90 36" className="w-20 h-8">
              <path
                d="M16 30 H74 C80 30 84 26 84 20 C84 15 79 11 73 11 C71 4 63 1 55 2 C48 2 42 7 40 13 C36 10 30 10 26 14 C19 14 12 18 12 24 C12 28 14 30 16 30 Z"
                fill="#FFFFFF"
              />
            </svg>
          </motion.div>

          <motion.div
            aria-hidden="true"
            animate={reducedMotion ? undefined : { x: [10, -10, 10] }}
            transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
            className="pointer-events-none absolute top-3 right-6 opacity-75 dark:opacity-20"
          >
            <svg viewBox="0 0 80 32" className="w-16 h-7">
              <path
                d="M14 27 H66 C71 27 75 23 75 18 C75 13 70 10 65 10 C62 4 55 1 48 2 C41 2 36 7 35 12 C28 10 20 13 18 18 C13 18 10 22 10 25 C10 26 12 27 14 27 Z"
                fill="#FFFFFF"
              />
            </svg>
          </motion.div>

          <BiomeWorldScenery biome={term.biome} />
        </div>

        {/* Kia's Story Welcome Bubble */}
        <div className="px-3 sm:px-5 -mt-2 relative z-10">
          <div
            className={`rounded-2xl border-2 p-3 flex items-center gap-3 shadow-[0_8px_20px_-6px_rgba(30,41,59,0.14)] ${biomeStyle.storyBg} dark:bg-slate-900 dark:border-slate-700`}
          >
            <KiaAvatar
              mood={isTermUnlocked ? 'happy' : 'teaching'}
              className="w-12 h-12 shrink-0"
              reducedMotion={reducedMotion}
              showEmblem={false}
            />
            <p className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100 leading-relaxed">
              {term.storyDescription}
            </p>
          </div>
        </div>

        {/* Animated Winding Road + Landmark Nodes + Floating Story Cards */}
        <div className="relative px-3 sm:px-6 pt-6 pb-7">
          {stages.length === 0 ? (
            <div className="rounded-2xl bg-white/95 dark:bg-slate-900 p-6 text-center text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm">
              هنوز مرحله‌ای برای این ترم تعریف نشده است. از پیشخوان وردپرس اضافه کنید.
            </div>
          ) : (
            <>
              {/* Dual-layer SVG S-Curve Connector Path */}
              <svg
                aria-hidden="true"
                viewBox={`0 0 400 ${roadGeometry.height}`}
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-0 w-full h-full opacity-95 dark:opacity-45"
              >
                {/* Road Outer Earthy Rim */}
                <path
                  d={roadGeometry.fullPath}
                  fill="none"
                  stroke={biomeStyle.roadEdge}
                  strokeWidth="68"
                  strokeLinecap="round"
                />
                {/* Road Main Sandy Fill */}
                <path
                  d={roadGeometry.fullPath}
                  fill="none"
                  stroke={biomeStyle.roadStroke}
                  strokeWidth="54"
                  strokeLinecap="round"
                />
                {/* Dashed Center Footpath */}
                <path
                  d={roadGeometry.fullPath}
                  fill="none"
                  stroke="#FFFDF6"
                  strokeWidth="4"
                  strokeDasharray="10 12"
                  strokeLinecap="round"
                />
                {/* Animated Completed Trail Ribbon */}
                {roadGeometry.hasActiveProgress && (
                  <motion.path
                    d={roadGeometry.activeProgressPath}
                    fill="none"
                    stroke={biomeStyle.completedTrail}
                    strokeWidth="9"
                    strokeLinecap="round"
                    initial={reducedMotion ? false : { pathLength: 0, opacity: 0.5 }}
                    animate={{ pathLength: 1, opacity: 0.95 }}
                    transition={{ duration: reducedMotion ? 0 : 1.1, ease: 'easeOut' }}
                  />
                )}
              </svg>

              {/* Stage Milestones along the Winding Road */}
              <div className="relative z-10 space-y-6">
                {stages.map((stage, idx) => {
                  const req = stage.unlockRequirement;
                  const prevCompleted = !req || Boolean(profile.lessons[req]?.completed);
                  const stageUnlocked = isTermUnlocked && prevCompleted;
                  const progress = profile.lessons[stage.id];
                  const isCompleted = Boolean(progress?.completed);
                  const isActive = isTermUnlocked && stage.id === nextActiveLessonId;
                  const alignOpposite = idx % 2 === 1;
                  const stageStars = progress?.stars ?? 0;
                  const stagePct = isCompleted ? 100 : isActive ? 38 : 0;

                  const meadowVariant = (
                    ['sunflower', 'daisy', 'tulip', 'sprout'] as const
                  )[idx % 4];

                  return (
                    <motion.div
                      key={stage.id}
                      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                      animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.32,
                        delay: reducedMotion ? 0 : Math.min(idx * 0.06, 0.35),
                      }}
                      className={`relative flex items-center gap-2.5 sm:gap-4 ${
                        alignOpposite ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      {/* Decorative Meadow Flower on outer curve */}
                      {term.biome !== 'space' && (
                        <motion.div
                          aria-hidden="true"
                          animate={reducedMotion ? undefined : { rotate: [-4, 4, -4] }}
                          transition={{
                            duration: 3.4 + (idx % 3) * 0.6,
                            repeat: Infinity,
                            ease: 'easeInOut',
                          }}
                          className={`hidden sm:block shrink-0 opacity-90 ${
                            alignOpposite ? 'order-last' : ''
                          }`}
                        >
                          <MeadowDecorFlower variant={meadowVariant} className="w-9 h-9" />
                        </motion.div>
                      )}

                      {/* Distinctive StageLandmark Interactive Medallion Node on the Path */}
                      <div className="relative shrink-0 flex flex-col items-center">
                        {isActive && (
                          <motion.div
                            animate={reducedMotion ? undefined : { y: [0, -6, 0] }}
                            transition={{
                              duration: 1.7,
                              repeat: Infinity,
                              ease: 'easeInOut',
                            }}
                            className="absolute -top-9 z-20 pointer-events-none"
                          >
                            <KiaAvatar
                              mood="cheering"
                              className="w-11 h-11 drop-shadow-md"
                              reducedMotion={reducedMotion}
                              showEmblem={false}
                            />
                          </motion.div>
                        )}

                        <motion.button
                          type="button"
                          whileHover={
                            reducedMotion || (isTermUnlocked && !stageUnlocked)
                              ? undefined
                              : { scale: 1.06 }
                          }
                          whileTap={
                            reducedMotion || (isTermUnlocked && !stageUnlocked)
                              ? undefined
                              : { scale: 0.94 }
                          }
                          onClick={() => {
                            if (!isTermUnlocked) {
                              onRequestUnlockTerm?.(term);
                              return;
                            }
                            if (stageUnlocked) {
                              onSelectLesson(stage);
                            }
                          }}
                          disabled={isTermUnlocked && !stageUnlocked}
                          aria-label={`نشانه مرحله ${formatNumber(stage.stageNumber, digitMode)}: ${stage.title}`}
                          className={`relative w-16 h-16 sm:w-[70px] sm:h-[70px] rounded-full p-1 border-4 border-white shadow-[0_8px_18px_rgba(30,41,59,0.22)] flex items-center justify-center transition-all ${
                            isCompleted
                              ? 'bg-[#4BB543] ring-4 ring-emerald-200/75'
                              : isActive
                              ? 'bg-[#FFCC33] ring-4 ring-amber-200/90'
                              : stageUnlocked
                              ? 'bg-sky-400'
                              : 'bg-slate-400/90 grayscale-[35%]'
                          }`}
                        >
                          <StoryLandmarkBadge
                            landmark={stage.landmark ?? 'barn'}
                            className="w-full h-full"
                          />

                          {/* Corner Checkpoint Status Badge */}
                          <span
                            className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[11px] font-extrabold tabular-nums ${
                              isCompleted
                                ? 'bg-[#2E8228] text-white'
                                : stageUnlocked
                                ? 'bg-[#5472EB] text-white'
                                : 'bg-slate-700 text-white'
                            }`}
                          >
                            {isCompleted ? (
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            ) : stageUnlocked ? (
                              formatNumber(stage.stageNumber, digitMode)
                            ) : (
                              <Lock className="w-3 h-3" />
                            )}
                          </span>
                        </motion.button>
                      </div>

                      {/* Connected Storybook Stage Card (rounded-2xl + soft warm shadow) */}
                      <motion.button
                        type="button"
                        whileHover={
                          reducedMotion || (isTermUnlocked && !stageUnlocked)
                            ? undefined
                            : { y: -2 }
                        }
                        whileTap={
                          reducedMotion || (isTermUnlocked && !stageUnlocked)
                            ? undefined
                            : { scale: 0.985 }
                        }
                        onClick={() => {
                          if (!isTermUnlocked) {
                            onRequestUnlockTerm?.(term);
                            return;
                          }
                          if (stageUnlocked) {
                            onSelectLesson(stage);
                          }
                        }}
                        disabled={isTermUnlocked && !stageUnlocked}
                        aria-label={`مرحله ${formatNumber(stage.stageNumber, digitMode)}: ${stage.title}`}
                        className={`flex-1 min-w-0 min-h-[84px] rounded-2xl bg-white/98 dark:bg-slate-900 p-3 sm:p-3.5 flex items-center gap-3 text-right shadow-[0_10px_22px_-6px_rgba(30,41,59,0.18)] border-2 transition-all ${
                          !isTermUnlocked
                            ? 'border-amber-200 hover:border-amber-400 cursor-pointer'
                            : isActive
                            ? 'border-[#FFCC33] ring-4 ring-amber-200/75 dark:ring-amber-500/30'
                            : stageUnlocked
                            ? 'border-white hover:border-sky-300 dark:border-slate-800'
                            : 'border-white/75 dark:border-slate-800/70 opacity-75 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                              {stage.title}
                            </h3>
                            <div className="flex items-center gap-0.5 shrink-0">
                              {[1, 2, 3].map((st) => (
                                <Star
                                  key={st}
                                  className={`w-3.5 h-3.5 ${
                                    st <= stageStars
                                      ? 'text-amber-400 fill-amber-400'
                                      : 'text-slate-200 dark:text-slate-700'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>

                          <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 line-clamp-1">
                            {stage.storyCaption || stage.shortGoal}
                          </p>

                          {/* Mini Progress Bar + Action Label */}
                          <div className="flex items-center gap-2 pt-0.5">
                            <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isCompleted
                                    ? 'bg-[#4BB543]'
                                    : isActive
                                    ? 'bg-[#F59E0B]'
                                    : 'bg-slate-300 dark:bg-slate-700'
                                }`}
                                style={{ width: `${stagePct}%` }}
                              />
                            </div>
                            {stageUnlocked ? (
                              <span
                                className={`px-2.5 py-0.5 rounded-xl text-[11px] font-extrabold inline-flex items-center gap-1 shrink-0 ${
                                  isActive
                                    ? 'bg-[#4BB543] text-white'
                                    : 'bg-emerald-50 text-[#2E8228] dark:bg-emerald-950/60 dark:text-emerald-300'
                                }`}
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span>{isCompleted ? 'مرور' : 'شروع'}</span>
                              </span>
                            ) : !isTermUnlocked ? (
                              <span className="px-2.5 py-0.5 rounded-xl bg-amber-100 text-amber-800 text-[11px] font-extrabold shrink-0">
                                باز کردن ترم
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-slate-400 shrink-0">
                                قفل
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    </motion.div>
                  );
                })}

                {/* End-of-Road Storybook Finish Banner */}
                <div className="pt-2 flex justify-center">
                  <div
                    className={`rounded-2xl border-2 px-4 py-2.5 inline-flex items-center gap-2 shadow-[0_8px_18px_-4px_rgba(30,41,59,0.16)] ${biomeStyle.finishCardBg} dark:bg-slate-900 dark:border-slate-700`}
                  >
                    {allCompleted ? (
                      <>
                        <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
                        <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                          هورا! تمام مسیر {term.title} را با موفقیت طی کردی!
                        </span>
                      </>
                    ) : (
                      <>
                        <Flag className="w-4 h-4 text-[#4BB543] shrink-0" />
                        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                          خط پایان {term.title} منتظر توست!
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
