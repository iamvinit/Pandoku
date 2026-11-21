import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  PanInfo,
  useMotionValue,
  animate,
} from 'motion/react';
import {
  ChevronDown,
  Clock,
  Lock,
  Sparkles,
} from 'lucide-react';
import {
  ALL_CAMPAIGN_LEVELS,
  CAMPAIGNS,
  CampaignLevel,
  CampaignSpec,
  DailyChallengeSpec,
} from '../shared/soloCatalog';
import {
  buildDailyChallengeFeed,
  ServerDailyChallenge,
} from '../shared/dailyChallenges';
import {
  estimateLevelXp,
  isCampaignLevelUnlocked,
  isCampaignUnlocked,
  SoloProgressState,
} from '../utils/soloStorage';
import { BambooIcon, CartoonStar, XpIcon } from './PandaFoodIcon';
import { AnimatedTrackPanda } from './ModeGraphic';
import {
  AnimatedCampaignIcon,
  AnimatedCampaignMapIcon,
  AnimatedDailySunIcon,
  AnimatedPlayArrowIcon,
  AnimatedReplayIcon,
  GameButton,
} from './GameAnimatedIcons';
import {
  CampaignHeaderLivingOverlay,
  CampaignLivingOverlay,
} from './CampaignLivingScene';
import { CAMPAIGN_BG_IMAGES } from '../utils/campaignArt';
import { getDailyChallengeImage } from '../utils/dailyArt';
import { soundFx } from '../utils/sound';

export type SoloHubTab = 'campaigns' | 'daily';

interface SoloHubViewProps {
  progress: SoloProgressState;
  activeTab: SoloHubTab;
  onTabChange: (tab: SoloHubTab) => void;
  onLevelTileTap: (levelId: number) => boolean;
  onStartDaily: (spec: DailyChallengeSpec) => void;
  onStartLevel: (level: CampaignLevel) => void;
}

function formatClockTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Proportional Single-Screen Winding Snake Adventure Map (360 × 400 SVG reference space)
// Uses percentage positioning so Header + ALL 10 levels + Top Stars + Level Name & Play Bar ALL fit on ONE screen!
const TRACK_WIDTH = 360;
const TRACK_HEIGHT = 400;

interface TrackPoint {
  x: number;
  y: number;
}

const NODE_POINTS: TrackPoint[] = [
  { x: 68, y: 74 },   // Stage 1 (Row 1 Left)
  { x: 180, y: 70 },  // Stage 2 (Row 1 Center)
  { x: 292, y: 76 },  // Stage 3 (Row 1 Right)
  { x: 292, y: 168 }, // Stage 4 (Row 2 Right)
  { x: 180, y: 172 }, // Stage 5 (Row 2 Center)
  { x: 68, y: 166 },  // Stage 6 (Row 2 Left)
  { x: 68, y: 262 },  // Stage 7 (Row 3 Left)
  { x: 180, y: 266 }, // Stage 8 (Row 3 Center)
  { x: 292, y: 260 }, // Stage 9 (Row 3 Right)
  { x: 180, y: 352 }, // Stage 10 (Summit Finale Center)
];

function buildSmoothTrackSegment(a: TrackPoint, b: TrackPoint): string {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  // Graceful U-turn bend when curving down to the next row on the left or right edge
  if (dx < 16 && dy > 40) {
    const bulgeX = a.x > TRACK_WIDTH / 2 ? TRACK_WIDTH - 20 : 20;
    return `M ${a.x} ${a.y} C ${bulgeX} ${a.y + 18}, ${bulgeX} ${b.y - 18}, ${b.x} ${b.y}`;
  }
  // Smooth S-curve into the summit center node (9 -> 10)
  if (dy > 40) {
    const midY = (a.y + b.y) / 2;
    return `M ${a.x} ${a.y} C ${a.x} ${midY + 8}, ${b.x} ${midY - 8}, ${b.x} ${b.y}`;
  }
  // Playful gentle wave between horizontal neighbors
  const midX = (a.x + b.x) / 2;
  const waveOffset = a.x < b.x ? -10 : 10;
  return `M ${a.x} ${a.y} C ${midX} ${a.y + waveOffset}, ${midX} ${b.y - waveOffset}, ${b.x} ${b.y}`;
}

function buildFullTrackPath(points: TrackPoint[]): string {
  if (points.length === 0) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const seg = buildSmoothTrackSegment(points[i - 1], points[i]);
    // Strip the leading "M x y " so path stays continuous
    const cmdStart = seg.indexOf('C');
    d += cmdStart >= 0 ? ` ${seg.slice(cmdStart)}` : ` L ${points[i].x} ${points[i].y}`;
  }
  return d;
}

const FULL_TRACK_D = buildFullTrackPath(NODE_POINTS);

// ============================================================================
// SCREEN 1: CHALLENGE OF THE DAY — LIVE DRAG-FOLLOW SWIPEABLE CAROUSEL
// ============================================================================
interface DailyChallengeDeckScreenProps {
  challenges: ServerDailyChallenge[];
  progress: SoloProgressState;
  onStartDaily: (spec: DailyChallengeSpec) => void;
}

const CARD_WIDTH = 308;
const CARD_GAP = 14;
const CARD_STRIDE = CARD_WIDTH + CARD_GAP;

function DailyChallengeDeckScreen({
  challenges,
  progress,
  onStartDaily,
}: DailyChallengeDeckScreenProps) {
  // Starts IMMEDIATELY on Today (rightmost index) with zero initial scroll animation!
  const [activeIdx, setActiveIdx] = useState<number>(() => Math.max(0, challenges.length - 1));
  const trackX = useMotionValue<number>(-(Math.max(0, challenges.length - 1) * CARD_STRIDE));
  const isFirstRenderRef = useRef(true);

  // Sync activeIdx safely if feed count changes
  useEffect(() => {
    setActiveIdx((prev) => {
      if (challenges.length === 0) return 0;
      if (prev >= challenges.length) return challenges.length - 1;
      return prev;
    });
  }, [challenges.length]);

  // Animate trackX smoothly whenever activeIdx changes (instant on mount so it starts right on Today!)
  useEffect(() => {
    const targetX = -(activeIdx * CARD_STRIDE);
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      trackX.set(targetX);
      return;
    }
    const controls = animate(trackX, targetX, {
      type: 'spring',
      stiffness: 340,
      damping: 30,
    });
    return () => controls.stop();
  }, [activeIdx, trackX]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;
    let nextIdx = activeIdx;
    // Swiping right (positive offset/velocity) reveals the previous (past) day on the left
    if (offset.x > 48 || velocity.x > 320) {
      nextIdx = Math.max(0, activeIdx - 1);
    } else if (offset.x < -48 || velocity.x < -320) {
      nextIdx = Math.min(challenges.length - 1, activeIdx + 1);
    }

    if (nextIdx !== activeIdx) {
      soundFx.buttonTap();
      setActiveIdx(nextIdx);
    } else {
      // Elastic spring back to current centered card
      animate(trackX, -(activeIdx * CARD_STRIDE), {
        type: 'spring',
        stiffness: 360,
        damping: 28,
      });
    }
  };

  if (challenges.length === 0) return null;

  const minDragX = -((challenges.length - 1) * CARD_STRIDE);
  const maxDragX = 0;

  return (
    <div className="flex-1 min-h-0 flex flex-col justify-between py-1 gap-1.5 overflow-hidden select-none">
      {/* Live Drag-Follow Horizontal Carousel Stage: dragging even a little smoothly reveals the next/prev card! */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden">
        <div
          className="relative flex items-center"
          style={{ width: `${CARD_WIDTH}px` }}
        >
          <motion.div
            drag="x"
            dragConstraints={{ left: minDragX, right: maxDragX }}
            dragElastic={0.22}
            dragMomentum={false}
            onDragEnd={handleDragEnd}
            style={{ x: trackX }}
            className="flex items-center cursor-grab active:cursor-grabbing touch-pan-y"
          >
            {challenges.map((item, idx) => {
              const isActive = idx === activeIdx;
              const isNear = Math.abs(idx - activeIdx) <= 2;
              const record = progress.dailyRecords[item.dateKey] ?? null;
              const xpEarned = record
                ? record.bestXp ?? estimateLevelXp(record.stars, record.bestTimeMs, item.par2Sec)
                : null;
              const dailyArtUrl = getDailyChallengeImage(item.dayOfMonth);

              return (
                <motion.div
                  key={item.dateKey}
                  animate={{
                    scale: isActive ? 1 : 0.91,
                    opacity: isActive ? 1 : isNear ? 0.72 : 0.25,
                    y: isActive ? 0 : 8,
                  }}
                  transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                  onClick={() => {
                    if (!isActive) {
                      soundFx.buttonTap();
                      setActiveIdx(idx);
                    }
                  }}
                  style={{
                    width: `${CARD_WIDTH}px`,
                    marginRight: idx < challenges.length - 1 ? `${CARD_GAP}px` : '0px',
                    background: `linear-gradient(160deg, ${item.accentFrom} 0%, #FFFFFF 48%, ${item.accentTo} 100%)`,
                    boxShadow: isActive
                      ? `0 8px 0 ${item.borderColor}88, 0 18px 36px rgba(24,48,34,0.16), inset 0 2px 0 rgba(255,255,255,0.95)`
                      : `0 4px 0 ${item.borderColor}66, 0 10px 20px rgba(24,48,34,0.08)`,
                  }}
                  className={`shrink-0 rounded-[32px] p-4 flex flex-col justify-between gap-3 ${
                    isActive ? '' : 'cursor-pointer'
                  }`}
                >
                  {/* Big Prominent Date Header */}
                  <div className="flex flex-col items-center gap-1 pt-0.5">
                    {item.isToday ? (
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-b from-[#FFC947] to-[#E58A06] text-white shadow-[0_3px_0_#B76600,0_6px_14px_rgba(229,138,6,0.28)]">
                        <AnimatedDailySunIcon className="w-5 h-5 shrink-0" />
                        <span className="font-display text-[13px] font-black uppercase tracking-wider text-[#FFF7DA]">
                          Today
                        </span>
                        <span className="w-1 h-1 rounded-full bg-white/75" aria-hidden="true" />
                        <span
                          className="font-display text-[20px] font-black leading-none tracking-tight text-white"
                          style={{ textShadow: '0 1.5px 0 rgba(135,65,0,0.35)' }}
                        >
                          {item.displayDate}
                        </span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center justify-center px-5 py-1.5 rounded-full bg-[#1D3528] text-white shadow-[0_3px_0_#0F2017,0_6px_14px_rgba(20,45,30,0.18)]">
                        <span className="font-display text-[20px] font-black leading-none tracking-tight">
                          {item.displayDate}
                        </span>
                      </div>
                    )}

                    {/* Puzzle Title */}
                    <h2 className="font-display text-[23px] font-black text-[#173022] leading-tight text-center mt-1">
                      {item.title}
                    </h2>
                  </div>

                  {/* Lush 4:3 Storybook Daily Illustration Frame */}
                  <div
                    className="relative w-full h-[clamp(142px,24dvh,196px)] rounded-[24px] overflow-hidden shadow-[0_6px_16px_rgba(20,45,30,0.16),inset_0_2px_0_rgba(255,255,255,0.85)]"
                    style={{
                      background: `linear-gradient(145deg, ${item.accentFrom} 0%, ${item.accentTo} 100%)`,
                    }}
                  >
                    <img
                      src={dailyArtUrl}
                      alt={`${item.title} — ${item.displayDate} daily challenge`}
                      loading="eager"
                      decoding="sync"
                      fetchPriority={isActive ? 'high' : 'auto'}
                      draggable={false}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-center select-none pointer-events-none"
                    />

                    {/* Soft top rim sheen */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 pointer-events-none rounded-[24px] ring-2 ring-inset ring-white/55"
                    />

                    {/* Celebratory Solved Ribbon Overlaid Cleanly at the Bottom of the Artwork */}
                    {record && (
                      <div className="absolute inset-x-2 bottom-2 rounded-[18px] bg-white/88 backdrop-blur-sm px-3 py-1.5 flex items-center justify-between gap-2 shadow-[0_4px_12px_rgba(18,40,28,0.18)]">
                        <div className="flex items-center gap-1">
                          {[0, 1, 2].map((starIdx) => {
                            const earned = record.stars > starIdx;
                            return (
                              <CartoonStar
                                key={starIdx}
                                filled={earned}
                                sparkle={earned && starIdx === 1}
                                className="w-6 h-6"
                              />
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-2.5 tabular-nums">
                          <span className="inline-flex items-center gap-1 text-xs font-mono font-black text-[#1D4ED8]">
                            <XpIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{xpEarned?.toLocaleString()}</span>
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-mono font-black text-[#14603D]">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>{formatClockTime(record.bestTimeMs)}</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bold Primary Hero CTA */}
                  <GameButton
                    variant="amber"
                    size="lg"
                    fullWidth
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isActive) {
                        soundFx.buttonTap();
                        setActiveIdx(idx);
                        return;
                      }
                      soundFx.buttonTap();
                      onStartDaily(item);
                    }}
                  >
                    <span className="font-display text-[17px] tracking-wide">
                      {record ? 'Play Again' : 'Play Challenge!'}
                    </span>
                  </GameButton>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>

      {/* Minimal Interactive Story Dots */}
      <div className="flex items-center justify-center gap-1.5 px-6 pb-2" role="tablist" aria-label="Daily challenges">
        {challenges.map((item, idx) => {
          const solved = Boolean(progress.dailyRecords[item.dateKey]);
          const isActive = idx === activeIdx;
          return (
            <button
              key={item.dateKey}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={item.isToday ? 'Today' : item.displayDate}
              onClick={() => {
                soundFx.buttonTap();
                setActiveIdx(idx);
              }}
              className="py-2 px-0.5 cursor-pointer focus-visible:outline-none"
            >
              <span
                className={`block rounded-full transition-all duration-200 ${
                  isActive
                    ? 'w-6 h-2.5 bg-[#D48A10]'
                    : solved
                      ? 'w-2.5 h-2.5 bg-[#1B7A4E]'
                      : 'w-2 h-2 bg-[#C8D5CC]'
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// SCREEN 2: CAMPAIGN ADVENTURE TRACK CARD
// ============================================================================
interface CampaignTrackCardProps {
  campaign: CampaignSpec;
  prevCampaign: CampaignSpec | null;
  progress: SoloProgressState;
  isExpanded: boolean;
  isLockedCampaign: boolean;
  isCampaignShaking: boolean;
  onToggleExpand: () => void;
  selectedLevelId: number;
  lockedShakeId: number | null;
  onNodeTap: (level: CampaignLevel, unlocked: boolean) => void;
  onStartLevel: (level: CampaignLevel) => void;
  sectionRef: (el: HTMLElement | null) => void;
}

function CampaignTrackCard({
  campaign,
  prevCampaign,
  progress,
  isExpanded,
  isLockedCampaign,
  isCampaignShaking,
  onToggleExpand,
  selectedLevelId,
  lockedShakeId,
  onNodeTap,
  onStartLevel,
  sectionRef,
}: CampaignTrackCardProps) {
  const { theme } = campaign;
  const bgImage = CAMPAIGN_BG_IMAGES[campaign.id];

  const { starsEarned, xpEarned, clearedCount, frontierId } = useMemo(() => {
    let stars = 0;
    let xp = 0;
    let cleared = 0;
    let firstUnsolvedId: number | null = null;
    for (const lv of campaign.levels) {
      const rec = progress.levelRecords[lv.id];
      if (rec) {
        stars += rec.stars;
        xp += rec.bestXp ?? estimateLevelXp(rec.stars, rec.bestTimeMs, lv.par2Sec);
        cleared += 1;
      } else if (firstUnsolvedId === null) {
        firstUnsolvedId = lv.id;
      }
    }
    return {
      starsEarned: stars,
      xpEarned: xp,
      clearedCount: cleared,
      frontierId: firstUnsolvedId ?? campaign.levels[campaign.levels.length - 1].id,
    };
  }, [campaign.levels, progress.levelRecords]);

  // Which node within this campaign holds the animated Track Panda
  const activeStageIndex = useMemo(() => {
    const idx = campaign.levels.findIndex((lv) => lv.id === selectedLevelId);
    if (idx !== -1) return idx;
    const fIdx = campaign.levels.findIndex((lv) => lv.id === frontierId);
    return fIdx !== -1 ? fIdx : 0;
  }, [campaign.levels, selectedLevelId, frontierId]);

  const activePoint = NODE_POINTS[activeStageIndex];
  const selectedLevel = campaign.levels[activeStageIndex] ?? campaign.levels[0];
  const selectedRecord = progress.levelRecords[selectedLevel.id] ?? null;
  const selectedUnlocked = isCampaignLevelUnlocked(progress, selectedLevel.id);
  const gradId = `trackGrad-c${campaign.id}`;

  // Park the hopping Track Panda cleanly beside the selected node's shoulder
  // so it NEVER covers the curved 3-star crown above OR the level number!
  const pandaOffsetX = activePoint.x >= 240 ? -42 : 42;

  return (
    <motion.section
      ref={sectionRef}
      aria-labelledby={`campaign-${campaign.id}-heading`}
      animate={isCampaignShaking ? { x: [0, -7, 7, -5, 5, 0] } : { x: 0 }}
      transition={{ duration: 0.34 }}
      className="rounded-[24px] border-2 bg-white shadow-sm transition-colors"
      style={{
        borderColor: isLockedCampaign
          ? '#CBD6CF'
          : isExpanded
            ? theme.accent
            : theme.border,
      }}
    >
      {/* Solid Sticky Campaign World Header (z-40 so scrolling Panda & nodes pass cleanly BEHIND it!) */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.99 }}
        onClick={onToggleExpand}
        aria-expanded={!isLockedCampaign && isExpanded}
        className={`w-full px-3 py-2.5 flex flex-col gap-2 text-left cursor-pointer overflow-hidden bg-white ${
          isExpanded && !isLockedCampaign
            ? 'sticky top-0 z-40 rounded-t-[22px] shadow-[0_6px_14px_rgba(20,45,30,0.1)]'
            : 'relative z-20 rounded-[22px]'
        }`}
      >
        {/* Solid opaque theme wash + scenic art background */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isLockedCampaign
              ? '#F3F6F4'
              : `linear-gradient(135deg, ${theme.bgFrom}, ${theme.bgVia})`,
          }}
        />
        <img
          src={bgImage}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="sync"
          referrerPolicy="no-referrer"
          className={`absolute inset-0 w-full h-full object-cover object-center pointer-events-none transition-opacity ${
            isLockedCampaign ? 'opacity-18 grayscale' : 'opacity-42'
          }`}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isLockedCampaign
              ? 'linear-gradient(90deg, rgba(244,247,245,0.94), rgba(244,247,245,0.88))'
              : 'linear-gradient(90deg, rgba(255,255,255,0.86) 0%, rgba(255,255,255,0.58) 100%)',
          }}
        />
        {!isLockedCampaign && <CampaignHeaderLivingOverlay campaignId={campaign.id} />}

        {/* Row 1: World Icon + Campaign World Name (+ aligned unlock hint when locked) | Stats or Lock Medallion on Right */}
        <div className="w-full flex items-center justify-between gap-2.5 relative z-10">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className={`shrink-0 ${isLockedCampaign ? 'opacity-55 grayscale' : ''}`}>
              <AnimatedCampaignIcon id={campaign.id} className="w-10 h-10" />
            </div>
            <div className="min-w-0 flex-1">
              <h2
                id={`campaign-${campaign.id}-heading`}
                className={`font-display text-[17px] font-black leading-tight truncate ${
                  isLockedCampaign ? 'text-[#5E7065]' : 'text-[#18201C]'
                }`}
              >
                {campaign.name}
              </h2>
              {isLockedCampaign && (
                <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] font-bold text-[#6E8075] leading-tight">
                  {prevCampaign && (
                    <AnimatedCampaignIcon id={prevCampaign.id} className="w-4 h-4 shrink-0 opacity-85" />
                  )}
                  <span className="truncate">
                    {prevCampaign ? `Finish ${prevCampaign.name}` : 'Locked'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isLockedCampaign ? (
              <span
                aria-hidden="true"
                className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center text-[#788A7F] shrink-0 shadow-[0_2px_0_#D2DDD6]"
              >
                <Lock className="w-4 h-4 stroke-[2.5]" />
              </span>
            ) : (
              <>
                <div className="flex flex-col items-end gap-1 tabular-nums">
                  <span className="w-[86px] inline-flex items-center justify-between gap-1 bg-white/88 px-2.5 py-0.5 rounded-full shadow-2xs text-[11px] font-mono font-black text-[#8A5000]">
                    <CartoonStar filled className="w-4 h-4 shrink-0" />
                    <span>{starsEarned}/30</span>
                  </span>
                  <span className="w-[86px] inline-flex items-center justify-between gap-1 bg-white/88 px-2.5 py-0.5 rounded-full shadow-2xs text-[11px] font-mono font-black text-[#1D4ED8]">
                    <XpIcon className="w-4 h-4 shrink-0" />
                    <span>{xpEarned.toLocaleString()}</span>
                  </span>
                </div>

                <motion.span
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-8 h-8 rounded-full bg-white/92 flex items-center justify-center text-[#18201C] shrink-0 shadow-[0_2px_6px_rgba(20,45,30,0.12)]"
                >
                  <ChevronDown className="w-4.5 h-4.5 stroke-[2.6]" />
                </motion.span>
              </>
            )}
          </div>
        </div>

        {/* Row 2: Full-Width 10-Gem Stepping-Stone Trail + Unclipped 3/10 Badge (Borderless soft track!) */}
        {!isLockedCampaign && (
          <div
            className="w-full flex items-center gap-2 relative z-10 bg-white/78 backdrop-blur-xs rounded-full pl-2.5 pr-1.5 py-1 shadow-[inset_0_1.5px_3px_rgba(20,50,34,0.08)]"
            aria-label={`${clearedCount} of 10 levels solved`}
          >
            <div className="flex-1 grid grid-cols-10 gap-1.5 items-center">
              {campaign.levels.map((lv) => {
                const done = Boolean(progress.levelRecords[lv.id]);
                const isHere = lv.id === selectedLevel.id;
                return (
                  <span
                    key={lv.id}
                    className="h-2.5 rounded-full transition-all"
                    style={
                      done
                        ? {
                            backgroundColor: theme.accent,
                            boxShadow: `inset 0 -1.5px 0 ${theme.accentDark}60`,
                          }
                        : isHere
                          ? {
                              backgroundColor: '#F5B014',
                              boxShadow: '0 0 0 1.5px #B86E0055',
                            }
                          : {
                              backgroundColor: '#D6E4DB',
                            }
                    }
                  />
                );
              })}
            </div>
            <span
              className="shrink-0 whitespace-nowrap font-mono text-[12px] font-black text-white rounded-full px-2.5 py-0.5 tabular-nums leading-none shadow-2xs"
              style={{ backgroundColor: theme.accent }}
            >
              {clearedCount}/10
            </span>
          </div>
        )}
      </motion.button>

      {/* Collapsible Single-Screen 10-Level Adventure Map + Docked Play Bar (z-10 strictly BELOW sticky z-40 header!) */}
      <AnimatePresence initial={false}>
        {!isLockedCampaign && isExpanded && (
          <motion.div
            key={`track-body-${campaign.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: 'easeInOut' }}
            className="relative z-10 overflow-hidden rounded-b-[22px]"
          >
            {/* Viewport-Fitted Living Landscape Map with clean bottom breathing space so entire green box is visible */}
            <div
              className="relative w-full overflow-hidden"
              style={{
                height: 'clamp(280px, calc(100dvh - 324px), 378px)',
                background: `linear-gradient(180deg, ${theme.bgFrom} 0%, ${theme.bgVia} 50%, ${theme.bgTo} 100%)`,
              }}
            >
              <img
                src={bgImage}
                alt={`${campaign.name} landscape`}
                loading="eager"
                decoding="sync"
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover object-top pointer-events-none select-none"
              />

              {/* Subtle Soft Scrim for crisp nodes & stars over vibrant landscape */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.12) 55%, rgba(255,255,255,0.22) 100%)',
                }}
              />

              {/* Seamless Living Sky & Atmosphere Overlay (Zero ground flora!) */}
              <CampaignLivingOverlay campaignId={campaign.id} />

              {/* Winding Compact Snake Adventure Track SVG */}
              <svg
                viewBox={`0 0 ${TRACK_WIDTH} ${TRACK_HEIGHT}`}
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full pointer-events-none"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={theme.trackStart} />
                    <stop offset="50%" stopColor={theme.trackMid} />
                    <stop offset="100%" stopColor={theme.trackEnd} />
                  </linearGradient>
                </defs>

                <path
                  d={FULL_TRACK_D}
                  fill="none"
                  stroke="rgba(18, 36, 26, 0.22)"
                  strokeWidth="20"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  transform="translate(0, 3)"
                />
                <path
                  d={FULL_TRACK_D}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="17"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={FULL_TRACK_D}
                  fill="none"
                  stroke="#FFFDF7"
                  strokeWidth="11"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={FULL_TRACK_D}
                  fill="none"
                  stroke={theme.border}
                  strokeWidth="2.8"
                  strokeDasharray="3 10"
                  strokeLinecap="round"
                  opacity="0.85"
                />

                {campaign.levels.slice(0, -1).map((level, idx) => {
                  const nextLevel = campaign.levels[idx + 1];
                  const segUnlocked = isCampaignLevelUnlocked(progress, nextLevel.id);
                  const segCleared = Boolean(progress.levelRecords[level.id]);
                  if (!segUnlocked && !segCleared) return null;

                  const segD = buildSmoothTrackSegment(NODE_POINTS[idx], NODE_POINTS[idx + 1]);
                  return (
                    <g key={`seg-${level.id}`}>
                      <path
                        d={segD}
                        fill="none"
                        stroke={segCleared ? `url(#${gradId})` : theme.trackStart}
                        strokeWidth="9.5"
                        strokeLinecap="round"
                      />
                      <path
                        d={segD}
                        fill="none"
                        stroke="#FFF9DE"
                        strokeWidth="2.4"
                        strokeDasharray="3 9"
                        strokeLinecap="round"
                        opacity="0.95"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Animated Hopping Track Panda perched beside the selected node's shoulder (NEVER covers stars or level number!) */}
              <motion.div
                aria-hidden="true"
                initial={false}
                animate={{
                  left: `${((activePoint.x + pandaOffsetX) / TRACK_WIDTH) * 100}%`,
                  top: `${(activePoint.y / TRACK_HEIGHT) * 100}%`,
                }}
                transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                className="absolute z-30 pointer-events-none"
                style={{ transform: 'translate(-50%, -56%)' }}
              >
                <AnimatedTrackPanda className="w-[42px] h-[46px]" accentColor={theme.accent} />
              </motion.div>

              {/* All 10 Playful Level Medallions with Always-Visible Arched Top 3-Star Crowns! */}
              {campaign.levels.map((level, idx) => {
                const pt = NODE_POINTS[idx];
                const unlocked = isCampaignLevelUnlocked(progress, level.id);
                const record = progress.levelRecords[level.id] ?? null;
                const isSelected = activeStageIndex === idx;
                const isFrontier = unlocked && level.id === frontierId && !record;
                const isShaking = lockedShakeId === level.id;
                const isFinale = level.stageNumber === 10;

                return (
                  <div
                    key={level.id}
                    className="absolute pointer-events-none z-20 flex flex-col items-center"
                    style={{
                      left: `${(pt.x / TRACK_WIDTH) * 100}%`,
                      top: `${(pt.y / TRACK_HEIGHT) * 100}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {/* Curved 3-Star Crown cleanly ABOVE the Level Number — NEVER hidden behind the circle! */}
                    {unlocked && (
                      <div
                        className="pointer-events-auto absolute -top-[24px] left-1/2 -translate-x-1/2 z-30 flex items-end justify-center gap-0.5 cursor-pointer drop-shadow-[0_2px_4px_rgba(18,36,26,0.34)]"
                        onClick={() => onNodeTap(level, unlocked)}
                      >
                        {[0, 1, 2].map((starIdx) => {
                          const earned = (record?.stars ?? 0) > starIdx;
                          // Deterministic pseudo-random staggered shine (~9s–14.5s) so stars sparkle independently, never all at once!
                          const seed = level.id * 7 + starIdx * 13 + campaign.id * 5;
                          const shineDurationSec = earned
                            ? Number((8.8 + ((seed * 1.93) % 5.8)).toFixed(2))
                            : undefined;
                          const shineDelaySec = earned
                            ? Number((-((seed * 3.17) % (shineDurationSec ?? 10))).toFixed(2))
                            : undefined;
                          const archClass =
                            starIdx === 0
                              ? '-rotate-[18deg] translate-y-[4px]'
                              : starIdx === 1
                                ? '-translate-y-[2px]'
                                : 'rotate-[18deg] translate-y-[4px]';
                          return (
                            <span key={starIdx} className={`inline-flex ${archClass}`}>
                              <CartoonStar
                                filled={earned}
                                shineDurationSec={shineDurationSec}
                                shineDelaySec={shineDelaySec}
                                className={
                                  starIdx === 1 ? 'w-[22px] h-[22px]' : 'w-[17px] h-[17px]'
                                }
                              />
                            </span>
                          );
                        })}
                      </div>
                    )}

                    <motion.button
                      type="button"
                      whileHover={unlocked ? { scale: 1.09 } : undefined}
                      whileTap={unlocked ? { scale: 0.92 } : undefined}
                      animate={
                        isShaking
                          ? { x: [0, -6, 6, -4, 4, 0] }
                          : isSelected
                            ? { scale: 1.08 }
                            : { scale: 1, x: 0 }
                      }
                      transition={{ duration: isShaking ? 0.32 : 0.2 }}
                      onClick={() => onNodeTap(level, unlocked)}
                      aria-label={`${campaign.name} stage ${level.stageNumber}: ${level.title}`}
                      className={`pointer-events-auto relative z-10 rounded-full border-[3px] flex flex-col items-center justify-center cursor-pointer focus-visible:outline-none transition-all shrink-0 ${
                        isFinale ? 'w-[54px] h-[54px]' : 'w-[48px] h-[48px]'
                      }`}
                      style={
                        !unlocked
                          ? {
                              backgroundColor: '#E8EFEA',
                              borderColor: '#FFFFFF',
                              color: '#73857A',
                              boxShadow: '0 3px 0 #B5C4BA, 0 5px 10px rgba(15,35,25,0.2)',
                            }
                          : isSelected
                            ? {
                                background: `linear-gradient(180deg, ${theme.trackStart}, ${theme.accent})`,
                                borderColor: '#FFFFFF',
                                color: '#FFFFFF',
                                boxShadow: `0 4px 0 ${theme.accentDark}, 0 0 0 3.5px #FFD93D, 0 7px 14px rgba(15,35,25,0.32)`,
                              }
                            : record
                              ? {
                                  background: `linear-gradient(180deg, #FFFFFF, ${theme.bgFrom})`,
                                  borderColor: theme.accent,
                                  color: theme.accentDark,
                                  boxShadow: `0 3.5px 0 ${theme.accent}, 0 5px 12px rgba(15,35,25,0.2)`,
                                }
                              : isFrontier
                                ? {
                                    background: 'linear-gradient(180deg, #FFF7DC, #FFD970)',
                                    borderColor: '#FFFFFF',
                                    color: '#7A4600',
                                    boxShadow: '0 3.5px 0 #C67D00, 0 5px 12px rgba(15,35,25,0.25)',
                                  }
                                : {
                                    backgroundColor: '#FFFFFF',
                                    borderColor: theme.accent,
                                    color: '#18201C',
                                    boxShadow: `0 3.5px 0 ${theme.border}, 0 5px 10px rgba(15,35,25,0.18)`,
                                  }
                      }
                    >
                      {!unlocked ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-[#788A7E]" />
                          <span className="font-mono text-[9.5px] font-bold leading-none mt-0.5 tabular-nums">
                            {level.stageNumber}
                          </span>
                        </>
                      ) : (
                        <span
                          className={`font-display font-black leading-none tabular-nums ${
                            isFinale ? 'text-2xl' : 'text-xl'
                          }`}
                        >
                          {level.stageNumber}
                        </span>
                      )}
                    </motion.button>
                  </div>
                );
              })}
            </div>

            {/* Docked Selected Stage Ribbon (Flows cleanly from map — zero grey React divider!) */}
            <div className="px-3.5 py-2.5 bg-gradient-to-b from-[#FFFFFF] to-[#F3FBF6] flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Round Stage Number Medallion — matches the tapped circle */}
                <div
                  className="w-10 h-10 rounded-full border-[3px] border-white flex items-center justify-center shrink-0 font-display text-lg font-black text-white tabular-nums"
                  style={{
                    background: `linear-gradient(180deg, ${theme.trackStart}, ${theme.accent})`,
                    boxShadow: `0 3px 0 ${theme.accentDark}, 0 0 0 2px ${theme.border}`,
                  }}
                >
                  {selectedLevel.stageNumber}
                </div>

                <div className="min-w-0">
                  <p className="font-display text-[15px] font-black text-[#173022] leading-tight truncate">
                    {selectedLevel.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <div className="inline-flex items-center gap-0.5">
                      {[0, 1, 2].map((s) => (
                        <CartoonStar
                          key={s}
                          filled={(selectedRecord?.stars ?? 0) > s}
                          className="w-4 h-4"
                        />
                      ))}
                    </div>
                    {selectedRecord ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E5F7EC] text-[11px] font-mono font-black text-[#14603D] tabular-nums">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{formatClockTime(selectedRecord.bestTimeMs)}</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-[#4D6859]">
                        Ready to play!
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {selectedUnlocked && (
                <GameButton
                  size="sm"
                  icon={
                    selectedRecord ? (
                      <AnimatedReplayIcon className="w-5 h-5 text-white" />
                    ) : (
                      <AnimatedPlayArrowIcon className="w-4 h-4 text-white" />
                    )
                  }
                  className="min-h-[44px] px-4 text-white shrink-0"
                  style={{
                    background: `linear-gradient(180deg, ${theme.trackStart}, ${theme.accent})`,
                    boxShadow: `0 4px 0 ${theme.accentDark}, 0 8px 16px rgba(18,45,30,0.2), inset 0 2px 0 rgba(255,255,255,0.4)`,
                  }}
                  onClick={() => {
                    soundFx.buttonTap();
                    onStartLevel(selectedLevel);
                  }}
                >
                  <span className="font-display text-[15px] tracking-wide">
                    {selectedRecord ? 'Replay' : 'Play!'}
                  </span>
                </GameButton>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

// ============================================================================
// MAIN SINGLE PLAYER HUB: 2 CLEAN SCREENS ("Campaigns" & "Daily Challenge")
// ============================================================================
export function SoloHubView({
  progress,
  activeTab,
  onTabChange,
  onLevelTileTap,
  onStartDaily,
  onStartLevel,
}: SoloHubViewProps) {
  const [lockedShakeId, setLockedShakeId] = useState<number | null>(null);
  const [lockedCampaignShake, setLockedCampaignShake] = useState<number | null>(null);
  const [cheatBanner, setCheatBanner] = useState<boolean>(false);

  const campaignsScrollerRef = useRef<HTMLDivElement | null>(null);
  const campaignSectionRefs = useRef<Record<number, HTMLElement | null>>({});

  // Instant local initialization from the 31-day bank, hydrated from server /api/daily-challenges
  const [dailyFeed, setDailyFeed] = useState<ServerDailyChallenge[]>(() =>
    buildDailyChallengeFeed(new Date(), 15)
  );

  useEffect(() => {
    let cancelled = false;
    fetch('/api/daily-challenges?days=15')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && Array.isArray(data.challenges) && data.challenges.length > 0) {
          setDailyFeed(data.challenges);
        }
      })
      .catch(() => {
        // Fallback already populated synchronously
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Pick initial frontier unlocked campaign & level
  const initialFrontier = useMemo(() => {
    const firstUnsolved = ALL_CAMPAIGN_LEVELS.find(
      (lv) => isCampaignLevelUnlocked(progress, lv.id) && !progress.levelRecords[lv.id]
    );
    return firstUnsolved ?? ALL_CAMPAIGN_LEVELS[0];
  }, [progress]);

  // Strict accordion state: expanding one campaign automatically collapses all others
  const [expandedCampaignId, setExpandedCampaignId] = useState<1 | 2 | 3 | 4 | null>(
    () => initialFrontier.world as 1 | 2 | 3 | 4
  );

  const [selectedLevelId, setSelectedLevelId] = useState<number>(initialFrontier.id);

  useEffect(() => {
    if (!isCampaignLevelUnlocked(progress, selectedLevelId)) {
      setSelectedLevelId(initialFrontier.id);
    }
  }, [progress, selectedLevelId, initialFrontier.id]);

  const triggerCheatFeedback = () => {
    setCheatBanner(true);
    setTimeout(() => setCheatBanner(false), 3600);
  };

  // Keyboard support for secret cheat sequence (1 -> 3 -> 9 -> 7)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '9') {
        if (onLevelTileTap(Number(e.key))) {
          triggerCheatFeedback();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onLevelTileTap]);

  const handleToggleCampaign = (campaignId: 1 | 2 | 3 | 4) => {
    const unlocked = isCampaignUnlocked(progress, campaignId);
    if (!unlocked) {
      soundFx.conflict();
      setLockedCampaignShake(campaignId);
      setTimeout(() => {
        setLockedCampaignShake((prev) => (prev === campaignId ? null : prev));
      }, 360);
      return;
    }

    soundFx.buttonTap();
    const isOpening = expandedCampaignId !== campaignId;
    setExpandedCampaignId((prev) => (prev === campaignId ? null : campaignId));

    if (isOpening) {
      const camp = CAMPAIGNS.find((c) => c.id === campaignId);
      if (camp) {
        const firstUnsolvedInCamp = camp.levels.find(
          (lv) => isCampaignLevelUnlocked(progress, lv.id) && !progress.levelRecords[lv.id]
        );
        setSelectedLevelId((firstUnsolvedInCamp ?? camp.levels[0]).id);
      }

      // Smoothly scroll the opened campaign right to the top so the whole screen shows it!
      window.setTimeout(() => {
        const container = campaignsScrollerRef.current;
        const target = campaignSectionRefs.current[campaignId];
        if (container && target) {
          const topOffset = Math.max(0, target.offsetTop - 6);
          container.scrollTo({ top: topOffset, behavior: 'smooth' });
        } else if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 240);
    }
  };

  const handleNodeTap = (level: CampaignLevel, unlocked: boolean) => {
    const cheatActivated = onLevelTileTap(level.stageNumber);
    if (cheatActivated) {
      triggerCheatFeedback();
      return;
    }

    if (!unlocked) {
      soundFx.conflict();
      setLockedShakeId(level.id);
      setTimeout(() => {
        setLockedShakeId((prev) => (prev === level.id ? null : prev));
      }, 340);
      return;
    }

    soundFx.buttonTap();
    if (selectedLevelId === level.id) {
      onStartLevel(level);
    } else {
      setSelectedLevelId(level.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col overflow-hidden"
    >
      {/* Consistent Sculpted 3D Toy Menu Buttons (Matches Main Screen Button Language for Kids!) */}
      <div className="px-3.5 pt-0.5 pb-2.5 shrink-0">
        <div className="grid grid-cols-2 gap-2.5">
          <GameButton
            variant={activeTab === 'campaigns' ? 'emerald' : 'white'}
            size="sm"
            fullWidth
            bgMotif={<AnimatedCampaignMapIcon className="w-11 h-11" />}
            onClick={() => {
              soundFx.buttonTap();
              onTabChange('campaigns');
            }}
            className={activeTab === 'campaigns' ? '' : 'opacity-85'}
          >
            <span
              className="font-display text-[15px] tracking-wide"
              style={
                activeTab === 'campaigns'
                  ? { textShadow: '0 1.5px 0 rgba(10,65,34,0.35)' }
                  : undefined
              }
            >
              Campaigns
            </span>
          </GameButton>

          <GameButton
            variant={activeTab === 'daily' ? 'amber' : 'white'}
            size="sm"
            fullWidth
            bgMotif={<AnimatedDailySunIcon className="w-11 h-11" />}
            onClick={() => {
              soundFx.buttonTap();
              onTabChange('daily');
            }}
            className={activeTab === 'daily' ? '' : 'opacity-85'}
          >
            <span
              className="font-display text-[15px] tracking-wide"
              style={
                activeTab === 'daily'
                  ? { textShadow: '0 1.5px 0 rgba(135,65,0,0.35)' }
                  : undefined
              }
            >
              Daily Challenge
            </span>
          </GameButton>
        </div>
      </div>

      {/* Cheat Activated Celebration Toast */}
      <AnimatePresence>
        {cheatBanner && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="mx-3.5 mb-2.5 bg-gradient-to-r from-[#DCFCEB] to-[#FFF6D4] rounded-full px-4 py-2 flex items-center justify-between gap-2 shadow-[0_4px_0_#7AD6A2] shrink-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-5 h-5 text-[#1B7A4E] shrink-0" />
              <p className="text-xs font-black text-[#145536] truncate">
                Secret Code! All 4 worlds unlocked + 100 Bamboo!
              </p>
            </div>
            <BambooIcon className="w-6 h-6 shrink-0" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dedicated Screen Body */}
      {activeTab === 'daily' ? (
        <DailyChallengeDeckScreen
          challenges={dailyFeed}
          progress={progress}
          onStartDaily={onStartDaily}
        />
      ) : (
        <div
          ref={campaignsScrollerRef}
          className="relative flex-1 overflow-y-auto kid-scrollbar pl-3.5 pr-2 pb-10 space-y-2.5"
        >
          {CAMPAIGNS.map((campaign, idx) => {
            const unlockedCampaign = isCampaignUnlocked(progress, campaign.id);
            const prevCampaign = idx > 0 ? CAMPAIGNS[idx - 1] : null;
            return (
              <CampaignTrackCard
                key={campaign.id}
                campaign={campaign}
                prevCampaign={prevCampaign}
                progress={progress}
                isExpanded={unlockedCampaign && expandedCampaignId === campaign.id}
                isLockedCampaign={!unlockedCampaign}
                isCampaignShaking={lockedCampaignShake === campaign.id}
                onToggleExpand={() => handleToggleCampaign(campaign.id)}
                selectedLevelId={selectedLevelId}
                lockedShakeId={lockedShakeId}
                onNodeTap={handleNodeTap}
                onStartLevel={onStartLevel}
                sectionRef={(el) => {
                  campaignSectionRefs.current[campaign.id] = el;
                }}
              />
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
