import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Pause } from 'lucide-react';
import {
  CellCoord,
  PandokuPuzzleWithSolution,
} from '../shared/types';
import {
  AccessoryId,
  AccessorySlot,
  ALL_CAMPAIGN_LEVELS,
  calculateSoloStars,
  CAMPAIGNS,
  CampaignLevel,
  DailyChallengeSpec,
} from '../shared/soloCatalog';
import { generatePandokuPuzzle } from '../shared/puzzleGenerator';
import { PandokuBoard } from './PandokuBoard';
import {
  BoardBuddyPanda,
  BoardReaction,
  BoardReactionKind,
} from './BoardBuddyPanda';
import { InteractivePanda } from './InteractivePanda';
import { BambooIcon, CartoonStar, XpIcon } from './PandaFoodIcon';
import {
  AnimatedCampaignIcon,
  AnimatedDailySunIcon,
  AnimatedLevelIcon,
  AnimatedPandaShopIcon,
  AnimatedPlayArrowIcon,
  AnimatedReplayIcon,
  GameButton,
} from './GameAnimatedIcons';
import { soundFx } from '../utils/sound';

export type SoloSession =
  | { kind: 'daily'; spec: DailyChallengeSpec }
  | { kind: 'campaign'; level: CampaignLevel };

interface SoloArenaProps {
  session: SoloSession;
  currentPandaFood: number;
  equippedAccessories: Record<AccessorySlot, AccessoryId | null>;
  showPatterns: boolean;
  autoX: boolean;
  onCompleteSession: (
    session: SoloSession,
    stars: 1 | 2 | 3,
    solveTimeMs: number,
    xpEarned: number
  ) => { foodEarned: number; newTotalFood: number; isNewBest: boolean };
  onSelectSession: (next: SoloSession) => void;
  onBackToHub: () => void;
  onOpenStudio: () => void;
  /** Freezes timer & hides board while an external modal (e.g. Back confirmation) is open */
  externalPaused?: boolean;
  /** Reports whether the player is actively solving (true) vs viewing the Victory screen (false) */
  onActivePlayChange?: (isActive: boolean) => void;
}

function formatClockMmSs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatFriendlyDuration(totalSeconds: number): string {
  const secs = Math.max(1, Math.round(totalSeconds));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m === 0) return `${s} seconds`;
  if (s === 0) return `${m} ${m === 1 ? 'minute' : 'minutes'}`;
  return `${m} min ${s} sec`;
}

const VICTORY_HEADLINES: Record<1 | 2 | 3, string[]> = {
  3: [
    'Purr-fect Solve!',
    'Bamboo Genius!',
    'Super Panda Star!',
    'Paws-itively Amazing!',
    'Whoa, Unstoppable!',
    'Master of Pandoku!',
  ],
  2: [
    'Great Logic!',
    'Super Smart Panda!',
    'Awesome Thinking!',
    'Bamboo Brilliant!',
    'Way to Go, Champ!',
  ],
  1: [
    'Puzzle Solved!',
    'Yay, You Did It!',
    'Nice Job, Panda Pal!',
    'High Paw! Solved!',
  ],
};

const VICTORY_PANDA_CHEERS: Record<1 | 2 | 3, string[]> = {
  3: [
    'Woohoo!! Happy bamboo dance time!',
    'Yaaay!! You are the smartest panda pal ever!',
    'Hee-hee! Three shiny gold stars for us!',
    'Boing boing! That was super-duper fast!',
  ],
  2: [
    'Yay! That was soooo awesome!',
    'Woohoo! Happy panda wiggle dance!',
    'High paw!! You solved it like a pro!',
  ],
  1: [
    'Yaaay! You cracked the puzzle!',
    'Hehe! My tummy is doing a happy dance!',
    'Awesome job, bestest puzzle buddy!',
  ],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Smooth animated MM:SS rolling-digit game timer with a gently ticking clock hand */
function AnimatedGameTimer({ elapsedMs, paused }: { elapsedMs: number; paused: boolean }) {
  const totalSec = Math.max(0, Math.floor(elapsedMs / 1000));
  const mins = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const secs = String(totalSec % 60).padStart(2, '0');
  const digits = [mins[0], mins[1], ':', secs[0], secs[1]];
  const handAngle = (totalSec % 60) * 6;

  return (
    <div
      className="inline-flex items-center gap-1.5 px-3.5 h-[42px] rounded-full bg-white/88 shadow-[0_3px_0_#B4D3C0,0_6px_14px_rgba(20,62,38,0.1),inset_0_2px_0_#FFFFFF] select-none"
      aria-label={`Time ${mins}:${secs}`}
    >
      {/* Cute Ticking Stopwatch Icon */}
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-5 h-5 shrink-0"
        animate={paused ? { scale: 1 } : { scale: [1, 1.07, 1] }}
        transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden="true"
      >
        <line x1="9.5" y1="2.5" x2="14.5" y2="2.5" stroke="#145536" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="12" cy="13.5" r="8" fill="#FFFFFF" stroke="#1B7A4E" strokeWidth="2.2" />
        <circle cx="12" cy="13.5" r="1.4" fill="#145536" />
        <motion.line
          x1="12"
          y1="13.5"
          x2="12"
          y2="8.2"
          stroke="#D48A10"
          strokeWidth="2.1"
          strokeLinecap="round"
          style={{ transformOrigin: '12px 13.5px' }}
          animate={{ rotate: handAngle }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        />
      </motion.svg>

      {/* Smooth Rolling MM:SS Digits (minutes always present from 00:00!) */}
      <div className="flex items-center font-mono text-[15px] font-black text-[#18201C] tabular-nums leading-none">
        {digits.map((ch, idx) =>
          ch === ':' ? (
            <motion.span
              key="colon"
              animate={paused ? { opacity: 1 } : { opacity: [1, 0.35, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="mx-[1px] text-[#1B7A4E]"
            >
              :
            </motion.span>
          ) : (
            <span
              key={idx}
              className="relative inline-flex w-[10.5px] h-[18px] items-center justify-center overflow-hidden"
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={`${idx}-${ch}`}
                  initial={{ y: -14, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 14, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 460, damping: 28 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  {ch}
                </motion.span>
              </AnimatePresence>
            </span>
          )
        )}
      </div>
    </div>
  );
}

export function SoloArena({
  session,
  currentPandaFood,
  equippedAccessories,
  showPatterns,
  autoX,
  onCompleteSession,
  onSelectSession,
  onBackToHub,
  onOpenStudio,
  externalPaused = false,
  onActivePlayChange,
}: SoloArenaProps) {
  const sessionKey =
    session.kind === 'daily'
      ? `daily:${session.spec.dateKey}`
      : `campaign:${session.level.id}`;

  const activeCampaign =
    session.kind === 'campaign'
      ? CAMPAIGNS.find((c) => c.id === session.level.world) ?? null
      : null;

  const config =
    session.kind === 'daily'
      ? {
          title: session.spec.title,
          subtitle: session.spec.displayDate,
          difficulty: session.spec.difficulty,
          colorMode: session.spec.colorMode,
          seed: session.spec.seed,
          par3Sec: session.spec.par3Sec,
          par2Sec: session.spec.par2Sec,
        }
      : {
          title: session.level.title,
          subtitle: activeCampaign ? activeCampaign.name : 'Adventure',
          difficulty: session.level.difficulty,
          colorMode: session.level.colorMode,
          seed: session.level.seed,
          par3Sec: session.level.par3Sec,
          par2Sec: session.level.par2Sec,
        };

  // Static deterministic puzzle for this level/daily challenge
  const [attemptNum, setAttemptNum] = useState<number>(0);
  const puzzle: PandokuPuzzleWithSolution = useMemo(
    () => generatePandokuPuzzle(config.difficulty, config.colorMode, config.seed),
    [config.difficulty, config.colorMode, config.seed]
  );

  // Use a unique instance ID when replaying so PandokuBoard cleanly resets marks
  const boardPuzzle = useMemo(
    () => ({
      ...puzzle,
      id: `${puzzle.id}_try_${attemptNum}`,
    }),
    [puzzle, attemptNum]
  );

  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const accumulatedMsRef = useRef<number>(0);
  const segmentStartRef = useRef<number>(Date.now());
  const wasPausedRef = useRef<boolean>(false);
  const [buddyReaction, setBuddyReaction] = useState<BoardReaction>({
    kind: 'idle',
    seq: 0,
  });

  const [victory, setVictory] = useState<{
    timeMs: number;
    mistakes: number;
    stars: 1 | 2 | 3;
    score: number;
    foodEarned: number;
    previousFood: number;
    newTotalFood: number;
    headline: string;
    initialCheer: string;
  } | null>(null);

  // Victory popup interactive state: comic celebration bubble + smooth bamboo counter animation
  const [selectedStarTip, setSelectedStarTip] = useState<{
    starIdx: 1 | 2 | 3 | null;
    text: string;
    mood: 'dance' | 'tip';
    seq: number;
  }>({
    starIdx: null,
    text: 'Woohoo!! Happy bamboo dance time!',
    mood: 'dance',
    seq: 1,
  });

  // Total Bamboo animated counter & smooth float-in badge state
  const [animatedBankCount, setAnimatedBankCount] = useState<number>(currentPandaFood);
  const [bambooPopPulse, setBambooPopPulse] = useState<number>(0);
  const [bambooPhase, setBambooPhase] = useState<'idle' | 'floating' | 'done'>('idle');
  const [animatedScore, setAnimatedScore] = useState<number>(0);

  // Prevent background scrolling whenever the Victory popup is displayed
  useEffect(() => {
    if (!victory) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [victory]);

  const effectivePaused = isPaused || externalPaused;

  // Report active play status to App (so Back button asks confirmation only while actively playing)
  useEffect(() => {
    onActivePlayChange?.(!victory);
    return () => {
      onActivePlayChange?.(false);
    };
  }, [victory, onActivePlayChange]);

  // Reset timers and overlay whenever switching to a new campaign level / daily
  useEffect(() => {
    setAttemptNum(0);
    setIsPaused(false);
    accumulatedMsRef.current = 0;
    segmentStartRef.current = Date.now();
    wasPausedRef.current = false;
    setElapsedMs(0);
    setVictory(null);
    setBuddyReaction({ kind: 'idle', seq: 0 });
  }, [sessionKey]);

  // Freeze & resume elapsed timer cleanly without counting paused time
  useEffect(() => {
    if (victory) return;
    if (effectivePaused && !wasPausedRef.current) {
      accumulatedMsRef.current += Math.max(0, Date.now() - segmentStartRef.current);
      setElapsedMs(accumulatedMsRef.current);
      wasPausedRef.current = true;
    } else if (!effectivePaused && wasPausedRef.current) {
      segmentStartRef.current = Date.now();
      wasPausedRef.current = false;
    }
  }, [effectivePaused, victory]);

  useEffect(() => {
    if (victory || effectivePaused) return;
    const interval = setInterval(() => {
      setElapsedMs(accumulatedMsRef.current + Math.max(0, Date.now() - segmentStartRef.current));
    }, 100);
    return () => clearInterval(interval);
  }, [victory, effectivePaused]);

  // Switch music cleanly between active gameplay ('solo') and level won ('victory')
  useEffect(() => {
    soundFx.setMusicMood(victory ? 'victory' : 'solo');
  }, [victory]);

  // Choreograph Star trumpet+clap pops, 1 -> XP Mario coin roll-up, and Won Bamboo -> Total Bamboo transfer!
  useEffect(() => {
    if (!victory) {
      setBambooPhase('idle');
      setBambooPopPulse(0);
      setAnimatedBankCount(currentPandaFood);
      setAnimatedScore(1);
      return;
    }

    setAnimatedBankCount(victory.previousFood);
    setBambooPopPulse(0);
    setBambooPhase(victory.foodEarned > 0 ? 'floating' : 'done');
    setAnimatedScore(1);
    setSelectedStarTip({
      starIdx: null,
      text: victory.initialCheer,
      mood: 'dance',
      seq: 1,
    });

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Star pops with rising trumpet toot + crisp hand clap staggered cleanly inside 0.25s - 0.9s
    for (let s = 0; s < victory.stars; s++) {
      timers.push(
        setTimeout(() => {
          soundFx.starFill(s);
        }, 250 + s * 280)
      );
    }

    // Smooth Bamboo increment with gentle elastic pulse — zero layout shift or remount jitter!
    if (victory.foodEarned > 0) {
      for (let i = 0; i < victory.foodEarned; i++) {
        timers.push(
          setTimeout(() => {
            soundFx.foodCollect(i);
            setAnimatedBankCount(victory.previousFood + i + 1);
            setBambooPopPulse((p) => p + 1);
          }, 820 + i * 240)
        );
      }

      timers.push(
        setTimeout(() => {
          setBambooPhase('done');
        }, 820 + victory.foodEarned * 240 + 260)
      );
    }

    // Rapid Mario-style coin collection sound stream as XP climbs from 1 -> victory.score over 1.6s (< 2s)
    const durationMs = 1600;
    const coinIntervalMs = 95;
    const coinTicks = Math.floor((durationMs - 140) / coinIntervalMs);
    for (let c = 0; c < coinTicks; c++) {
      timers.push(
        setTimeout(() => {
          soundFx.coinTick(c);
        }, 120 + c * coinIntervalMs)
      );
    }
    timers.push(
      setTimeout(() => {
        soundFx.coinFinish();
      }, 120 + durationMs)
    );

    // Smooth 1 -> Score count-up completing inside the 2-second winning experience
    let rafId = 0;
    const startMs = performance.now() + 120;
    const tickScore = (now: number) => {
      if (now < startMs) {
        setAnimatedScore(1);
        rafId = requestAnimationFrame(tickScore);
        return;
      }
      const progress = Math.min(1, (now - startMs) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 2.2);
      const currentVal = Math.max(1, Math.round(1 + (victory.score - 1) * eased));
      setAnimatedScore(currentVal);
      if (progress < 1) {
        rafId = requestAnimationFrame(tickScore);
      } else {
        setAnimatedScore(victory.score);
      }
    };
    rafId = requestAnimationFrame(tickScore);

    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(rafId);
    };
  }, [victory, currentPandaFood]);

  const handleBoardReaction = useCallback((kind: BoardReactionKind) => {
    setBuddyReaction((prev) => ({ kind, seq: prev.seq + 1 }));
  }, []);

  const handleRestartSameLevel = () => {
    soundFx.buttonTap();
    setAttemptNum((n) => n + 1);
    setIsPaused(false);
    accumulatedMsRef.current = 0;
    segmentStartRef.current = Date.now();
    wasPausedRef.current = false;
    setElapsedMs(0);
    setVictory(null);
    setBuddyReaction({ kind: 'idle', seq: 0 });
  };

  const handleTogglePause = () => {
    soundFx.buttonTap();
    setIsPaused((prev) => !prev);
  };

  const handleResume = () => {
    soundFx.buttonTap();
    setIsPaused(false);
  };

  const handleSolved = useCallback(
    (_pandas: CellCoord[], mistakes: number) => {
      const liveDelta = wasPausedRef.current ? 0 : Math.max(0, Date.now() - segmentStartRef.current);
      const solveTimeMs = Math.max(400, accumulatedMsRef.current + liveDelta);
      const stars = calculateSoloStars(
        solveTimeMs,
        mistakes,
        config.par3Sec,
        config.par2Sec
      );
      const solveSec = solveTimeMs / 1000;
      const speedRatio = Math.max(0, Math.min(1, 1 - solveSec / Math.max(20, config.par2Sec * 1.4)));
      const speedBonus = Math.round(speedRatio * 500);
      const starBonus = stars * 150;
      const mistakePenalty = mistakes * 75;
      const score = Math.max(350, 1000 + speedBonus + starBonus - mistakePenalty);

      const previousFood = currentPandaFood;
      const result = onCompleteSession(session, stars, solveTimeMs, score);
      setIsPaused(false);
      setElapsedMs(solveTimeMs);
      setVictory({
        timeMs: solveTimeMs,
        mistakes,
        stars,
        score,
        foodEarned: result.foodEarned,
        previousFood,
        newTotalFood: result.newTotalFood,
        headline: pickRandom(VICTORY_HEADLINES[stars]),
        initialCheer: pickRandom(VICTORY_PANDA_CHEERS[stars]),
      });
    },
    [
      config.par3Sec,
      config.par2Sec,
      currentPandaFood,
      onCompleteSession,
      session,
    ]
  );

  const handleStarTap = (starIdx: 1 | 2 | 3) => {
    if (!victory) return;
    soundFx.buttonTap();
    const earned = starIdx <= victory.stars;
    const solveSec = victory.timeMs / 1000;

    let text = '';
    if (starIdx === 1) {
      text = 'Star 1: Yay!! You solved the whole puzzle!';
    } else if (starIdx === 2) {
      if (earned) {
        text = 'Star 2: Awesome! You played super carefully!';
      } else if (victory.mistakes > 3 && solveSec <= config.par2Sec) {
        text = 'Star 2: Play nice and steady with 3 or fewer red oopsies!';
      } else if (victory.mistakes > 3) {
        text = `Star 2: Finish under ${formatFriendlyDuration(config.par2Sec)} with 3 or fewer red oopsies!`;
      } else {
        text = `Star 2: Finish under ${formatFriendlyDuration(config.par2Sec)} to shine this star!`;
      }
    } else {
      if (earned) {
        text = 'Star 3: Super speedy and super smart! Best star ever!';
      } else if (solveSec > config.par3Sec && victory.mistakes <= 1) {
        text = `Star 3: Super-Speed Star! Zoom under ${formatFriendlyDuration(config.par3Sec)} to win it!`;
      } else if (victory.mistakes > 3) {
        text = `Star 3: Super-Speed Star! Zoom under ${formatFriendlyDuration(config.par3Sec)} with almost zero oopsies!`;
      } else if (solveSec <= config.par3Sec && victory.mistakes > 1) {
        text = 'Star 3: You were super fast! Make 0 or 1 red oopsie to grab the gold star!';
      } else {
        text = `Star 3: Zoom under ${formatFriendlyDuration(config.par3Sec)} with at most 1 red oopsie!`;
      }
    }

    setSelectedStarTip((prev) => ({
      starIdx,
      text,
      mood: earned ? 'dance' : 'tip',
      seq: prev.seq + 1,
    }));
  };

  const nextCampaignLevel = useMemo(() => {
    if (session.kind !== 'campaign') return null;
    return ALL_CAMPAIGN_LEVELS.find((l) => l.id === session.level.id + 1) ?? null;
  }, [session]);

  const nextLevelCampaign = useMemo(() => {
    if (!nextCampaignLevel) return null;
    return CAMPAIGNS.find((c) => c.id === nextCampaignLevel.world) ?? null;
  }, [nextCampaignLevel]);

  const bubbleWords = selectedStarTip.text.split(' ');

  // ===========================================================================
  // FULL-SCREEN VICTORY CELEBRATION (Consistent with overall Pandoku game menu!)
  // ===========================================================================
  if (victory) {
    return (
      <motion.div
        key={`victory-${sessionKey}-${attemptNum}`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col justify-between px-4 pt-1 pb-5 gap-3 overflow-y-auto"
      >
        {/* Floating Celebration Header — Directly on the sunlit sky (NO white React box!) */}
        <div className="px-2 pt-1 text-center space-y-2.5">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#145536] bg-white/85 px-3 py-1 rounded-full shadow-2xs">
              {session.kind === 'campaign' ? (
                <AnimatedLevelIcon
                  world={session.level.world}
                  stageNumber={session.level.stageNumber}
                  className="w-5 h-5"
                />
              ) : (
                <AnimatedDailySunIcon className="w-5 h-5" />
              )}
              <span>{config.title}</span>
            </span>

            <span className="inline-flex items-center gap-1 text-xs font-mono font-black text-[#385445] bg-white/85 px-3 py-1 rounded-full shadow-2xs tabular-nums">
              <Clock className="w-3.5 h-3.5 text-[#1B7A4E]" />
              <span>{formatClockMmSs(victory.timeMs)}</span>
            </span>
          </div>

          <h2
            className="font-display text-[30px] font-black text-[#163624] leading-tight"
            style={{ filter: 'drop-shadow(0 2px 0 rgba(255,255,255,0.95))' }}
          >
            {victory.headline}
          </h2>

          {/* Big Plump Tappable Cartoon Stars — Smooth Elastic Spring Pop */}
          <div className="flex items-center justify-center gap-4 pt-1">
            {([1, 2, 3] as const).map((idx) => {
              const earned = idx <= victory.stars;
              const isSelectedStar = selectedStarTip.starIdx === idx;
              const delay = 0.12 + (idx - 1) * 0.24;
              return (
                <motion.button
                  key={idx}
                  type="button"
                  onClick={() => handleStarTap(idx)}
                  aria-label={`Star ${idx} (${earned ? 'earned' : 'not earned'})`}
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.9 }}
                  animate={{ scale: isSelectedStar ? 1.14 : 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 20 }}
                  className={`relative w-16 h-16 rounded-full flex items-center justify-center cursor-pointer focus-visible:outline-none ${
                    idx === 2 ? '-mt-3' : ''
                  } ${
                    isSelectedStar ? 'ring-[3px] ring-[#F5B014] ring-offset-2 bg-[#FFFBEB]/90' : ''
                  }`}
                >
                  <CartoonStar filled={false} className="w-15 h-15" />

                  {earned && (
                    <>
                      <motion.div
                        initial={{ scale: 0, rotate: -32, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        transition={{
                          delay,
                          type: 'spring',
                          stiffness: 340,
                          damping: 16,
                        }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <CartoonStar
                          filled
                          sparkle
                          className="w-15 h-15 drop-shadow-[0_6px_10px_rgba(245,166,10,0.45)]"
                        />
                      </motion.div>
                      <motion.span
                        initial={{ scale: 0.55, opacity: 0 }}
                        animate={{ scale: [0.6, 1.48], opacity: [0.8, 0] }}
                        transition={{ delay: delay + 0.08, duration: 0.45, ease: 'easeOut' }}
                        className="absolute inset-0 rounded-full border-2 border-[#F5B014] pointer-events-none"
                        aria-hidden="true"
                      />
                    </>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Rewards Strip: Fixed Symmetric 2-Column Capsules (Zero Layout Shift or Merging Glitch!) */}
          <div className="grid grid-cols-2 gap-3 max-w-[300px] mx-auto pt-2.5">
            {/* Blue XP Earned Capsule */}
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.14, type: 'spring', stiffness: 360, damping: 24 }}
              className="h-[46px] px-3.5 rounded-full bg-gradient-to-b from-[#FFFFFF] to-[#E5F1FF] shadow-[0_3.5px_0_#9EC5F8,0_6px_14px_rgba(37,99,235,0.14),inset_0_2px_0_#FFFFFF] flex items-center justify-center gap-1.5"
            >
              <XpIcon className="w-6 h-6 shrink-0" />
              <span className="font-mono text-[19px] font-black text-[#1D4ED8] tabular-nums leading-none">
                +{animatedScore.toLocaleString()}
              </span>
            </motion.div>

            {/* Emerald Bamboo Capsule — Stays Fixed in Place while +N Smoothly Floats & Counts Up! */}
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.94 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: bambooPopPulse > 0 ? [1, 1.07, 1] : 1,
              }}
              transition={{
                opacity: { delay: 0.2, duration: 0.25 },
                y: { delay: 0.2, type: 'spring', stiffness: 360, damping: 24 },
                scale: { duration: 0.24, ease: 'easeOut' },
              }}
              className="relative h-[46px] px-3.5 rounded-full bg-gradient-to-b from-[#FFFFFF] to-[#E2F8EB] shadow-[0_3.5px_0_#92D6AE,0_6px_14px_rgba(22,128,71,0.14),inset_0_2px_0_#FFFFFF] flex items-center justify-center gap-1.5"
            >
              {/* Smoothly rising +N earned badge strictly positioned above (never shifts layout!) */}
              <AnimatePresence>
                {victory.foodEarned > 0 && bambooPhase === 'floating' && (
                  <motion.span
                    initial={{ opacity: 0, y: 8, scale: 0.7 }}
                    animate={{ opacity: 1, y: -6, scale: 1 }}
                    exit={{ opacity: 0, y: -14, scale: 0.85 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full bg-gradient-to-b from-[#34C776] to-[#178A4C] text-white font-mono text-xs font-black shadow-[0_2px_6px_rgba(21,131,72,0.32)] whitespace-nowrap"
                  >
                    +{victory.foodEarned}
                  </motion.span>
                )}
              </AnimatePresence>

              <BambooIcon className="w-6 h-6 shrink-0" />
              <span className="font-mono text-[19px] font-black text-[#145536] tabular-nums leading-none">
                {animatedBankCount}
              </span>
              {victory.foodEarned > 0 && bambooPhase === 'done' && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 20 }}
                  className="text-[11px] font-black text-[#12683B] bg-[#CEF4DE] px-1.5 py-0.5 rounded-full tabular-nums leading-none"
                >
                  +{victory.foodEarned}
                </motion.span>
              )}
            </motion.div>
          </div>
        </div>

        {/* Center Stage: Live Dancing 3D Panda + Comic Star-Explanation Bubble (Floats openly, NO outer white box!) */}
        <div className="px-1 py-2 flex items-center gap-2.5 text-left my-auto">
          <InteractivePanda
            equippedAccessories={equippedAccessories}
            victoryMode={selectedStarTip.mood}
            victoryBoostSeq={selectedStarTip.seq}
          />

          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedStarTip.seq}
                initial={{ opacity: 0, scale: 0.82, x: -8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 440, damping: 24 }}
                className="relative px-3.5 py-2.5 bg-white text-[#18201C] text-[13px] leading-snug font-extrabold rounded-[22px] border-[2.5px] border-[#18201C] shadow-[3px_3px_0_#18201C]"
              >
                <span className="flex flex-wrap gap-x-1 gap-y-0.5">
                  {bubbleWords.map((word, idx) => (
                    <motion.span
                      key={`${selectedStarTip.seq}-${idx}`}
                      initial={{ opacity: 0, y: 4, scale: 0.85 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        delay: 0.04 + idx * 0.035,
                        type: 'spring',
                        stiffness: 460,
                        damping: 24,
                      }}
                      className="inline-block"
                    >
                      {word}
                    </motion.span>
                  ))}
                </span>

                <span
                  aria-hidden="true"
                  className="absolute -left-2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-[#18201C]"
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom Thumb-Zone Action Buttons */}
        <div className="space-y-2.5 pt-1">
          {nextCampaignLevel ? (
            <GameButton
              variant="emerald"
              size="lg"
              fullWidth
              onClick={() => {
                soundFx.buttonTap();
                onSelectSession({ kind: 'campaign', level: nextCampaignLevel });
              }}
            >
              <span className="truncate font-display text-[18px] tracking-wide">
                {session.kind === 'campaign' &&
                nextCampaignLevel.world !== session.level.world &&
                nextLevelCampaign
                  ? `Next: ${nextLevelCampaign.name}`
                  : `Next: ${nextCampaignLevel.title}`}
              </span>
            </GameButton>
          ) : (
            <GameButton
              variant="emerald"
              size="lg"
              fullWidth
              onClick={() => {
                soundFx.buttonTap();
                onBackToHub();
              }}
            >
              <span className="font-display text-[18px] tracking-wide">Back to Map</span>
            </GameButton>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <GameButton
              variant="violet"
              size="md"
              fullWidth
              icon={<AnimatedPandaShopIcon className="w-5 h-5" />}
              onClick={() => {
                soundFx.buttonTap();
                onOpenStudio();
              }}
            >
              <span className="font-display text-[15px]">Panda Shop</span>
            </GameButton>

            {victory.stars < 3 ? (
              <GameButton
                variant="amber"
                size="md"
                fullWidth
                icon={<AnimatedReplayIcon className="w-5 h-5 text-white" />}
                onClick={handleRestartSameLevel}
              >
                <span
                  className="font-display text-[15px]"
                  style={{ textShadow: '0 1.5px 0 rgba(135,65,0,0.35)' }}
                >
                  Replay
                </span>
              </GameButton>
            ) : (
              <GameButton
                variant="sky"
                size="md"
                fullWidth
                onClick={() => {
                  soundFx.buttonTap();
                  onBackToHub();
                }}
              >
                <span
                  className="font-display text-[15px]"
                  style={{ textShadow: '0 1.5px 0 rgba(13,92,153,0.35)' }}
                >
                  Map
                </span>
              </GameButton>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // ===========================================================================
  // ACTIVE PUZZLE PLAY SCREEN — Distinct Kid-Friendly Stage Badge (NOT like a Campaign Header!)
  // ===========================================================================
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col px-3.5 pb-2.5 gap-2 relative overflow-hidden overscroll-none"
    >
      {/* Airy Borderless Stage Header — Medallion + Title + Buddy + Clock + Replay float cleanly on canvas! */}
      <div className="px-0.5 pt-0.5 space-y-2 shrink-0">
        {/* Row 1: Unmistakable Round Stage Medallion + Playful Level Name */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {session.kind === 'campaign' && activeCampaign ? (
              <div
                className="w-10 h-10 rounded-full border-[3px] border-white flex items-center justify-center shrink-0 font-display text-lg font-black text-white tabular-nums"
                style={{
                  background: `linear-gradient(180deg, ${activeCampaign.theme.trackStart}, ${activeCampaign.theme.accent})`,
                  boxShadow: `0 3px 0 ${activeCampaign.theme.accentDark}, 0 6px 12px rgba(18,52,32,0.18)`,
                }}
                aria-label={`Stage ${session.level.stageNumber}`}
              >
                {session.level.stageNumber}
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#FFF3C4] to-[#FFD45E] border-[3px] border-white shadow-[0_3px_0_#C67D00] flex items-center justify-center shrink-0">
                <AnimatedDailySunIcon className="w-7 h-7" />
              </div>
            )}

            <div className="min-w-0">
              <h2 className="font-display text-[17px] font-black text-[#173022] leading-tight">
                {config.title}
              </h2>
              <p
                className={`font-extrabold text-[#4F6B5C] leading-tight flex items-center gap-1 mt-0.5 ${
                  session.kind === 'daily' ? 'text-[13px] text-[#9A5800]' : 'text-[11px]'
                }`}
              >
                {session.kind === 'campaign' && activeCampaign && (
                  <AnimatedCampaignIcon id={activeCampaign.id} className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="truncate">{config.subtitle}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Row 2: Live Board Buddy + Glossy Rolling MM:SS Timer + Sculpted Toy Pause Button */}
        <div className="flex items-center justify-between gap-2">
          <BoardBuddyPanda reaction={buddyReaction} sizeClass="w-11 h-11" />

          <AnimatedGameTimer elapsedMs={elapsedMs} paused={effectivePaused} />

          <motion.button
            type="button"
            whileHover={{ scale: 1.06, y: -1 }}
            whileTap={{ scale: 0.92, y: 2 }}
            onClick={handleTogglePause}
            aria-label={isPaused ? 'Resume game' : 'Pause game'}
            aria-pressed={isPaused}
            className="h-[42px] px-3.5 inline-flex items-center justify-center gap-1.5 text-[#17462E] bg-gradient-to-b from-[#FFFFFF] to-[#E9F6EE] shadow-[0_3.5px_0_#B4D0BE,0_6px_14px_rgba(20,62,38,0.12),inset_0_2px_0_#FFFFFF] rounded-full cursor-pointer shrink-0"
          >
            <Pause className="w-4 h-4 fill-[#17462E] text-[#17462E] shrink-0" />
            <span className="font-display text-[13.5px] font-black text-[#17462E]">Pause</span>
          </motion.button>
        </div>
      </div>

      {/* Main 3D Pandoku Board (Hidden while paused, preserving all placed marks!) */}
      <div className="relative flex-1 flex flex-col justify-center min-h-0">
        <div
          className={effectivePaused ? 'invisible pointer-events-none select-none' : ''}
          aria-hidden={effectivePaused}
        >
          <PandokuBoard
            key={boardPuzzle.id}
            puzzle={boardPuzzle}
            showPatterns={showPatterns}
            autoX={autoX}
            soloSolution={config.colorMode === 'scattered' ? null : puzzle.solution}
            disabled={effectivePaused}
            onSolved={handleSolved}
            onBoardReaction={handleBoardReaction}
          />
        </div>

        {/* Small Cozy Pause Popup over the Hidden Board */}
        <AnimatePresence>
          {isPaused && !externalPaused && (
            <motion.div
              key="solo-pause-popup"
              initial={{ opacity: 0, scale: 0.88, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 8 }}
              transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="solo-pause-heading"
              className="absolute inset-0 z-20 flex items-center justify-center p-4"
            >
              <div className="w-full max-w-[296px] rounded-[30px] bg-gradient-to-b from-[#FFFFFF] via-[#F7FDF9] to-[#E7F7ED] p-5 shadow-[0_8px_0_#AEE0C2,0_20px_42px_rgba(16,58,36,0.2),inset_0_2px_0_#FFFFFF] flex flex-col items-center text-center gap-3.5">
                {/* Cute Cozy Resting Panda Emblem */}
                <motion.div
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-16 h-16 rounded-full bg-gradient-to-b from-[#FFF9DC] to-[#FFE89E] shadow-[0_4px_0_#E3B84F] flex items-center justify-center"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none">
                    <circle cx="19" cy="20" r="8" fill="#18201C" />
                    <circle cx="45" cy="20" r="8" fill="#18201C" />
                    <ellipse cx="32" cy="35" rx="19" ry="17" fill="#FFFFFF" stroke="#18201C" strokeWidth="2.8" />
                    <ellipse cx="24" cy="34" rx="5" ry="4" transform="rotate(-12 24 34)" fill="#18201C" />
                    <ellipse cx="40" cy="34" rx="5" ry="4" transform="rotate(12 40 34)" fill="#18201C" />
                    <path d="M21 34.5 Q24 37 27 34.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
                    <path d="M37 34.5 Q40 37 43 34.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
                    <ellipse cx="32" cy="39.5" rx="3" ry="2.2" fill="#18201C" />
                    <path d="M28.5 43 Q32 46 35.5 43" stroke="#18201C" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="19" cy="40" r="3" fill="#FF9EB5" opacity="0.65" />
                    <circle cx="45" cy="40" r="3" fill="#FF9EB5" opacity="0.65" />
                  </svg>
                </motion.div>

                <div>
                  <h3
                    id="solo-pause-heading"
                    className="font-display text-[24px] font-black text-[#163826] leading-tight"
                  >
                    Paused
                  </h3>
                  <p className="mt-1 text-xs font-extrabold text-[#4E6D5B]">
                    Take a quick bamboo break!
                  </p>
                </div>

                <div className="w-full flex flex-col gap-2.5 pt-1">
                  <GameButton
                    variant="emerald"
                    size="lg"
                    fullWidth
                    icon={<AnimatedPlayArrowIcon className="w-4.5 h-4.5 text-white" />}
                    onClick={handleResume}
                  >
                    <span
                      className="font-display text-[17px] tracking-wide"
                      style={{ textShadow: '0 1.5px 0 rgba(10,65,34,0.35)' }}
                    >
                      Resume
                    </span>
                  </GameButton>

                  <GameButton
                    variant="amber"
                    size="md"
                    fullWidth
                    icon={<AnimatedReplayIcon className="w-5 h-5 text-white" />}
                    onClick={handleRestartSameLevel}
                  >
                    <span
                      className="font-display text-[16px] tracking-wide"
                      style={{ textShadow: '0 1.5px 0 rgba(135,65,0,0.35)' }}
                    >
                      Restart
                    </span>
                  </GameButton>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
