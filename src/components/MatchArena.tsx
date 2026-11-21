import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Crown,
  Flame,
  RefreshCw,
  Trophy,
} from 'lucide-react';
import {
  CellCoord,
  DIFFICULTY_CONFIGS,
  formatDurationClock,
  PublicRoomState,
} from '../shared/types';
import { AccessoryId, AccessorySlot } from '../shared/soloCatalog';
import { PandokuBoard } from './PandokuBoard';
import { PlayerAvatar } from './PandaToken';
import {
  BoardBuddyPanda,
  BoardReaction,
  BoardReactionKind,
} from './BoardBuddyPanda';
import { InteractivePanda } from './InteractivePanda';
import { soundFx } from '../utils/sound';
import { CartoonStar, XpIcon } from './PandaFoodIcon';
import { GameButton } from './GameAnimatedIcons';

const OPPONENT_ACCESSORIES: Record<AccessorySlot, AccessoryId | null> = {
  head: null,
  face: null,
  neck: 'red_bowtie',
  prop: null,
};

interface MatchArenaProps {
  roomState: PublicRoomState;
  playerId: string;
  serverOffsetMs: number;
  submissionError: string | null;
  equippedAccessories: Record<AccessorySlot, AccessoryId | null>;
  showPatterns: boolean;
  autoX: boolean;
  onReportProgress: (pandasPlaced: number, mistakes: number) => void;
  onSubmitSolution: (pandas: CellCoord[], mistakes: number) => void;
  onReadyNextRound: () => void;
  onRematch: () => void;
  onLeaveRoom: () => void;
}

function formatMs(ms: number | null): string {
  if (ms === null) return 'DNF';
  const totalSec = ms / 1000;
  const mins = Math.floor(totalSec / 60);
  const secs = (totalSec % 60).toFixed(1).padStart(4, '0');
  return mins > 0 ? `${mins}:${secs}` : `${secs}s`;
}

function formatCountdown(ms: number): string {
  const clamped = Math.max(0, ms) / 1000;
  const mins = Math.floor(clamped / 60);
  const secs = Math.floor(clamped % 60)
    .toString()
    .padStart(2, '0');
  if (clamped < 10) {
    return `${clamped.toFixed(1)}s`;
  }
  return mins > 0 ? `${mins}:${secs}` : `${Math.ceil(clamped)}s`;
}

/** Smoothly counts from 1 to `value` within `durationMs` (<= 2s), optionally playing Mario coin ticks */
function AnimatedPoints({
  value,
  durationMs = 1400,
  prefix = '',
  playCoins = false,
}: {
  value: number;
  durationMs?: number;
  prefix?: string;
  playCoins?: boolean;
}) {
  const [display, setDisplay] = useState<number>(value > 0 ? 1 : 0);

  useEffect(() => {
    if (value <= 0) {
      setDisplay(0);
      return;
    }
    setDisplay(1);
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (playCoins) {
      const interval = 95;
      const ticks = Math.max(3, Math.floor((durationMs - 120) / interval));
      for (let i = 0; i < ticks; i++) {
        timers.push(setTimeout(() => soundFx.coinTick(i), 80 + i * interval));
      }
      timers.push(setTimeout(() => soundFx.coinFinish(), 80 + durationMs));
    }

    let rafId = 0;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 2.2);
      setDisplay(Math.max(1, Math.round(1 + (value - 1) * eased)));
      if (p < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        setDisplay(value);
      }
    };
    rafId = requestAnimationFrame(step);
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(rafId);
    };
  }, [value, durationMs, playCoins]);

  return (
    <>
      {prefix}
      {display.toLocaleString()}
    </>
  );
}

export function MatchArena({
  roomState,
  playerId,
  serverOffsetMs,
  submissionError,
  equippedAccessories,
  showPatterns,
  autoX,
  onReportProgress,
  onSubmitSolution,
  onReadyNextRound,
  onRematch,
  onLeaveRoom,
}: MatchArenaProps) {
  const [nowMs, setNowMs] = useState<number>(() => Date.now() + serverOffsetMs);
  const [buddyReaction, setBuddyReaction] = useState<BoardReaction>({
    kind: 'idle',
    seq: 0,
  });

  const handleBoardReaction = useCallback((kind: BoardReactionKind) => {
    setBuddyReaction((prev) => ({ kind, seq: prev.seq + 1 }));
  }, []);

  // Reset buddy panda mood cleanly whenever a new round starts
  useEffect(() => {
    setBuddyReaction({ kind: 'idle', seq: 0 });
  }, [roomState.currentRound, roomState.phase]);

  useEffect(() => {
    if (roomState.phase !== 'PLAYING') return;
    const interval = setInterval(() => {
      setNowMs(Date.now() + serverOffsetMs);
    }, 100);
    return () => clearInterval(interval);
  }, [roomState.phase, serverOffsetMs]);

  useEffect(() => {
    if (roomState.phase === 'COUNTDOWN' && roomState.countdownRemaining > 0) {
      soundFx.countdownTick(false);
    } else if (roomState.phase === 'PLAYING' && roomState.currentRound > 0) {
      soundFx.countdownTick(true);
    } else if (roomState.phase === 'MATCH_OVER') {
      soundFx.matchVictory();
    }
  }, [roomState.phase, roomState.countdownRemaining, roomState.currentRound]);

  const me = useMemo(
    () => roomState.players.find((p) => p.id === playerId) ?? roomState.players[0],
    [roomState.players, playerId]
  );
  const opponent = useMemo(
    () => roomState.players.find((p) => p.id !== playerId) ?? null,
    [roomState.players, playerId]
  );

  const isFinalRound = roomState.currentRound === roomState.settings.totalRounds;
  const iHaveSolvedRound = me?.roundSolveTimeMs !== null;

  // Effective countdown deadline: either the 15s Finish Sprint or the Round Time Limit
  const effectiveDeadline =
    roomState.sprintEndsAt !== null ? roomState.sprintEndsAt : roomState.roundEndsAt;
  const remainingMs =
    effectiveDeadline && roomState.phase === 'PLAYING'
      ? Math.max(0, effectiveDeadline - nowMs)
      : roomState.settings.roundTimeLimitSeconds * 1000;

  const sprintRemainingSec =
    roomState.sprintEndsAt && roomState.phase === 'PLAYING'
      ? Math.max(0, Math.ceil((roomState.sprintEndsAt - nowMs) / 1000))
      : null;

  // Dynamic Music Mood & Frequency Acceleration for the slower player!
  const opponentFinishedFirst = Boolean(
    roomState.phase === 'PLAYING' && roomState.sprintEndsAt !== null && !iHaveSolvedRound
  );
  const lowRoundTimeWarning = Boolean(
    roomState.phase === 'PLAYING' && !iHaveSolvedRound && remainingMs <= 10_000
  );

  useEffect(() => {
    if (roomState.phase === 'PLAYING') {
      if (iHaveSolvedRound) {
        soundFx.setMusicMood('victory');
      } else if (opponentFinishedFirst || lowRoundTimeWarning) {
        soundFx.setMusicMood('panic');
        // Ramp music tempo & pitch frequency up smoothly as remaining seconds drop to 0!
        const denom = opponentFinishedFirst ? 15_000 : 10_000;
        const urgency = 1 - Math.max(0, Math.min(1, remainingMs / denom));
        soundFx.setSprintUrgency(urgency);
      } else {
        soundFx.setMusicMood('duel');
      }
    } else if (roomState.phase === 'COUNTDOWN') {
      soundFx.setMusicMood('duel');
    } else if (roomState.phase === 'ROUND_SUMMARY' || roomState.phase === 'MATCH_OVER') {
      soundFx.setMusicMood('victory');
    } else {
      soundFx.setMusicMood('start');
    }
  }, [
    roomState.phase,
    iHaveSolvedRound,
    opponentFinishedFirst,
    lowRoundTimeWarning,
    remainingMs,
  ]);

  const latestSummary =
    roomState.roundSummaries[roomState.roundSummaries.length - 1] ?? null;

  // =========================================================================
  // MATCH OVER VICTORY SCREEN — LIVE 2-PANDA ANIMATED VICTORY STAGE!
  // =========================================================================
  if (roomState.phase === 'MATCH_OVER') {
    const sortedPlayers = [...roomState.players].sort((a, b) => b.score - a.score);
    const isTie =
      sortedPlayers.length >= 2 && sortedPlayers[0].score === sortedPlayers[1].score;
    const winner = isTie ? null : sortedPlayers[0];
    const loser = isTie ? null : sortedPlayers[1] ?? null;
    const iWon = winner?.id === playerId;

    const leftPlayer = isTie ? sortedPlayers[0] : winner;
    const rightPlayer = isTie ? sortedPlayers[1] ?? null : loser;

    const getPandaAccessories = (pid: string | undefined) =>
      pid === playerId ? equippedAccessories : OPPONENT_ACCESSORIES;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className="flex-1 flex flex-col justify-between px-4 py-2.5 gap-3"
      >
        <div className="space-y-3">
          {/* Celebratory Storybook Duel Headline */}
          <div className="text-center pt-0.5">
            <h1 className="font-display text-[28px] font-black text-[#163826] leading-tight drop-shadow-[0_2px_0_rgba(255,255,255,0.9)]">
              {isTie
                ? 'Dead Heat Draw!'
                : iWon
                  ? 'You Won the Duel!'
                  : `${winner?.name} Wins!`}
            </h1>
            <p className="mt-0.5 text-[11.5px] font-extrabold text-[#4A6857]">
              {DIFFICULTY_CONFIGS[roomState.settings.difficulty].label} ·{' '}
              {roomState.settings.totalRounds} Rounds ·{' '}
              {formatDurationClock(roomState.settings.roundTimeLimitSeconds)}
            </p>
          </div>

          {/* LIVE 2-PANDA VICTORY STAGE: Winner Standing Arms-Up vs Loser On Floor with Head Bandage & Tongue Out! */}
          <div className="relative rounded-[28px] pt-3 pb-3.5 px-2 overflow-hidden bg-gradient-to-b from-[#FFFDF2] via-[#F2FBF5] to-[#DDF3E4] shadow-[0_6px_0_#AEE0C2,0_14px_26px_rgba(20,76,46,0.14),inset_0_2px_0_rgba(255,255,255,0.95)]">
            {/* Subtle golden victory radial glow behind Winner + soft floor strip */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-6 left-4 w-44 h-44 rounded-full bg-[#FFE68A]/45 blur-2xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[58px] bg-gradient-to-t from-[#BBE5C9]/80 via-[#D2F0DC]/50 to-transparent"
            />

            <div className="relative z-10 grid grid-cols-2 gap-1 items-end">
              {/* LEFT SIDE: WINNER PANDA (Standing tall with both arms raised high!) */}
              {leftPlayer && (
                <div className="flex flex-col items-center">
                  <motion.div
                    initial={{ scale: 0.5, y: 12 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 20 }}
                    className={`mb-0.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black shadow-2xs ${
                      isTie
                        ? 'bg-[#E5F2FF] text-[#1D4ED8]'
                        : 'bg-gradient-to-b from-[#FFE37E] to-[#F4B433] text-[#704000]'
                    }`}
                  >
                    {isTie ? (
                      <Trophy className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <Crown className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{isTie ? 'Tied!' : 'Champion!'}</span>
                  </motion.div>

                  <div className="-my-2 flex items-end justify-center">
                    <InteractivePanda
                      key={`duel-left-${leftPlayer.id}-${isTie ? 'tie' : 'winner'}`}
                      equippedAccessories={getPandaAccessories(leftPlayer.id)}
                      duelOutcome={isTie ? 'tie' : 'winner'}
                      duelFacing="right"
                    />
                  </div>

                  {/* Winner Name & Score Ribbon */}
                  <div className="mt-1 w-full px-2 py-1.5 rounded-[18px] bg-white/92 shadow-[0_3px_0_#AEE2C4] text-center">
                    <p className="text-[12.5px] font-black text-[#163826] truncate leading-tight">
                      {leftPlayer.name}
                      {leftPlayer.id === playerId ? ' (You)' : ''}
                    </p>
                    <div className="mt-0.5 inline-flex items-center justify-center gap-1 font-mono text-[13.5px] font-black text-[#1649A8] tabular-nums leading-none">
                      <XpIcon className="w-3.5 h-3.5 shrink-0" />
                      <AnimatedPoints
                        value={leftPlayer.score}
                        durationMs={1400}
                        playCoins={leftPlayer.id === playerId}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* RIGHT SIDE: LOSER PANDA (On the floor with white head bandage, cute wincing face & tongue out!) */}
              {rightPlayer && (
                <div className="flex flex-col items-center">
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.12, type: 'spring', stiffness: 320, damping: 22 }}
                    className={`mb-0.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black shadow-2xs ${
                      isTie
                        ? 'bg-[#E5F2FF] text-[#1D4ED8]'
                        : 'bg-white/90 text-[#8F3548]'
                    }`}
                  >
                    <span>{isTie ? 'Tied!' : 'Bonked!'}</span>
                  </motion.div>

                  <div className="-my-2 translate-y-2 flex items-end justify-center">
                    <InteractivePanda
                      key={`duel-right-${rightPlayer.id}-${isTie ? 'tie' : 'loser'}`}
                      equippedAccessories={getPandaAccessories(rightPlayer.id)}
                      duelOutcome={isTie ? 'tie' : 'loser'}
                      duelFacing="left"
                    />
                  </div>

                  {/* Runner-Up Name & Score Ribbon */}
                  <div className="mt-1 w-full px-2 py-1.5 rounded-[18px] bg-white/86 shadow-[0_3px_0_#CBD9D0] text-center">
                    <p className="text-[12.5px] font-black text-[#2C4638] truncate leading-tight">
                      {rightPlayer.name}
                      {rightPlayer.id === playerId ? ' (You)' : ''}
                    </p>
                    <div className="mt-0.5 inline-flex items-center justify-center gap-1 font-mono text-[13.5px] font-black text-[#1649A8] tabular-nums leading-none">
                      <XpIcon className="w-3.5 h-3.5 shrink-0" />
                      <AnimatedPoints
                        value={rightPlayer.score}
                        durationMs={1400}
                        playCoins={rightPlayer.id === playerId}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Visual Head-to-Head Round Clash Board — Directly Aligned Left ↔ Right with the 2 Pandas Above! */}
          {(() => {
            const maxRoundPts = Math.max(
              1,
              ...roomState.roundSummaries.flatMap((s) =>
                s.results.map((r) => r.totalRoundPoints)
              )
            );

            let leftRoundsWon = 0;
            let rightRoundsWon = 0;
            for (const s of roomState.roundSummaries) {
              const lPts = s.results.find((r) => r.playerId === leftPlayer?.id)?.totalRoundPoints ?? 0;
              const rPts = s.results.find((r) => r.playerId === rightPlayer?.id)?.totalRoundPoints ?? 0;
              if (lPts > rPts) leftRoundsWon += 1;
              else if (rPts > lPts) rightRoundsWon += 1;
            }

            return (
              <div className="toy-surface rounded-[26px] p-3.5 space-y-2.5">
                {/* Aligned Top Duel Tally Header */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 pb-1 border-b border-[#E3EFE8]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[12px] font-black text-[#163826] truncate">
                      {leftPlayer?.name ?? 'Player 1'}
                    </span>
                    <span className="inline-flex items-center gap-0.5 shrink-0" aria-label={`${leftRoundsWon} rounds won`}>
                      {roomState.roundSummaries.map((s, idx) => (
                        <CartoonStar
                          key={`lw-${s.roundNumber}-${idx}`}
                          filled={idx < leftRoundsWon}
                          className="w-3.5 h-3.5"
                        />
                      ))}
                    </span>
                  </div>

                  <span className="font-display text-[11px] font-black text-[#587464] tracking-wide">
                    Rounds
                  </span>

                  <div className="flex items-center justify-end gap-1.5 min-w-0">
                    <span className="inline-flex items-center gap-0.5 shrink-0" aria-label={`${rightRoundsWon} rounds won`}>
                      {roomState.roundSummaries.map((s, idx) => (
                        <CartoonStar
                          key={`rw-${s.roundNumber}-${idx}`}
                          filled={idx < rightRoundsWon}
                          className="w-3.5 h-3.5"
                        />
                      ))}
                    </span>
                    <span className="text-[12px] font-black text-[#2C4638] truncate">
                      {rightPlayer?.name ?? 'Player 2'}
                    </span>
                  </div>
                </div>

                {/* Head-to-Head Animated Power Bars per Round */}
                <div className="space-y-2 tabular-nums">
                  {roomState.roundSummaries.map((summary, rowIdx) => {
                    const leftEntry = summary.results.find((r) => r.playerId === leftPlayer?.id);
                    const rightEntry = summary.results.find((r) => r.playerId === rightPlayer?.id);

                    const leftPts = leftEntry?.totalRoundPoints ?? 0;
                    const rightPts = rightEntry?.totalRoundPoints ?? 0;
                    const leftWon = leftPts > rightPts;
                    const rightWon = rightPts > leftPts;
                    const leftSolved = leftEntry?.solveTimeMs !== null && leftEntry?.solveTimeMs !== undefined;
                    const rightSolved = rightEntry?.solveTimeMs !== null && rightEntry?.solveTimeMs !== undefined;

                    const leftPct = leftPts > 0 ? Math.max(14, Math.round((leftPts / maxRoundPts) * 100)) : 0;
                    const rightPct = rightPts > 0 ? Math.max(14, Math.round((rightPts / maxRoundPts) * 100)) : 0;
                    const isDouble = summary.isFinalRound;

                    return (
                      <div
                        key={summary.roundNumber}
                        className={`grid grid-cols-[1fr_38px_1fr] items-center gap-2 rounded-[18px] px-2.5 py-2 ${
                          isDouble
                            ? 'bg-gradient-to-r from-[#FFFDF2] via-[#FFF4CE] to-[#FFFDF2]'
                            : rowIdx % 2 === 1
                              ? 'bg-[#F3FAF6]'
                              : 'bg-[#F9FCFA]'
                        }`}
                      >
                        {/* LEFT PLAYER LANE (grows left from center medallion) */}
                        <div className="flex flex-col items-end gap-1 min-w-0">
                          <div className="flex items-center justify-end gap-1 leading-none">
                            {leftWon && <CartoonStar filled className="w-4 h-4 shrink-0" />}
                            <XpIcon
                              className={`w-3.5 h-3.5 shrink-0 ${leftPts > 0 ? '' : 'opacity-40 grayscale'}`}
                            />
                            <span
                              className={`font-mono text-[13px] font-black whitespace-nowrap ${
                                leftPts > 0 ? 'text-[#1649A8]' : 'text-[#96AA9E]'
                              }`}
                            >
                              {leftPts > 0 ? `+${leftPts.toLocaleString()}` : '0'}
                            </span>
                          </div>

                          {/* Outward-growing Tug-of-War Power Bar (Right-aligned toward center) */}
                          <div className="h-3 w-full rounded-full bg-[#E3EFE8] overflow-hidden flex justify-end shadow-[inset_0_1.5px_2px_rgba(16,45,30,0.1)]">
                            {leftPct > 0 && (
                              <motion.div
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{
                                  delay: 0.14 + rowIdx * 0.1,
                                  duration: 0.55,
                                  ease: [0.16, 1, 0.3, 1],
                                }}
                                style={{
                                  width: `${leftPct}%`,
                                  transformOrigin: 'right center',
                                }}
                                className={`h-full rounded-full shadow-[inset_0_1.5px_0_rgba(255,255,255,0.45)] ${
                                  leftWon
                                    ? isDouble
                                      ? 'bg-gradient-to-l from-[#E89106] to-[#FFD54F]'
                                      : 'bg-gradient-to-l from-[#12864B] to-[#34D37B]'
                                    : 'bg-gradient-to-l from-[#4A8BE6] to-[#87BFFF]'
                                }`}
                              />
                            )}
                          </div>

                          <span
                            className={`inline-flex items-center gap-1 text-[10.5px] font-bold leading-none ${
                              leftSolved ? 'text-[#4B6958]' : 'text-[#96A99D]'
                            }`}
                          >
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>{leftSolved ? formatMs(leftEntry!.solveTimeMs) : 'Time up'}</span>
                          </span>
                        </div>

                        {/* CENTER ROUND MEDALLION */}
                        <div className="relative flex flex-col items-center justify-center">
                          <div
                            className={`w-9 h-9 rounded-full flex flex-col items-center justify-center font-display font-black leading-none ${
                              isDouble
                                ? 'bg-gradient-to-b from-[#FFE47A] to-[#F2A91D] text-[#6E3B00] shadow-[0_2.5px_0_#C27800]'
                                : 'bg-white text-[#173A27] shadow-[0_2px_0_#C8DDD0]'
                            }`}
                          >
                            <span className="text-[14px]">{summary.roundNumber}</span>
                            {isDouble && (
                              <span className="text-[8.5px] font-black tracking-tight -mt-0.5 text-[#7A3F00]">
                                2×
                              </span>
                            )}
                          </div>
                        </div>

                        {/* RIGHT PLAYER LANE (grows right from center medallion) */}
                        <div className="flex flex-col items-start gap-1 min-w-0">
                          <div className="flex items-center justify-start gap-1 leading-none">
                            <XpIcon
                              className={`w-3.5 h-3.5 shrink-0 ${rightPts > 0 ? '' : 'opacity-40 grayscale'}`}
                            />
                            <span
                              className={`font-mono text-[13px] font-black whitespace-nowrap ${
                                rightPts > 0 ? 'text-[#1649A8]' : 'text-[#96AA9E]'
                              }`}
                            >
                              {rightPts > 0 ? `+${rightPts.toLocaleString()}` : '0'}
                            </span>
                            {rightWon && <CartoonStar filled className="w-4 h-4 shrink-0" />}
                          </div>

                          {/* Outward-growing Tug-of-War Power Bar (Left-aligned from center) */}
                          <div className="h-3 w-full rounded-full bg-[#E3EFE8] overflow-hidden flex justify-start shadow-[inset_0_1.5px_2px_rgba(16,45,30,0.1)]">
                            {rightPct > 0 && (
                              <motion.div
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{
                                  delay: 0.14 + rowIdx * 0.1,
                                  duration: 0.55,
                                  ease: [0.16, 1, 0.3, 1],
                                }}
                                style={{
                                  width: `${rightPct}%`,
                                  transformOrigin: 'left center',
                                }}
                                className={`h-full rounded-full shadow-[inset_0_1.5px_0_rgba(255,255,255,0.45)] ${
                                  rightWon
                                    ? isDouble
                                      ? 'bg-gradient-to-r from-[#E89106] to-[#FFD54F]'
                                      : 'bg-gradient-to-r from-[#12864B] to-[#34D37B]'
                                    : 'bg-gradient-to-r from-[#4A8BE6] to-[#87BFFF]'
                                }`}
                              />
                            )}
                          </div>

                          <span
                            className={`inline-flex items-center gap-1 text-[10.5px] font-bold leading-none ${
                              rightSolved ? 'text-[#4B6958]' : 'text-[#96A99D]'
                            }`}
                          >
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>{rightSolved ? formatMs(rightEntry!.solveTimeMs) : 'Time up'}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        <div className="space-y-2.5 pb-2">
          <GameButton
            variant="emerald"
            onClick={() => {
              soundFx.buttonTap();
              onRematch();
            }}
            className="w-full min-h-[54px] text-base rounded-[22px]"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Play Rematch</span>
          </GameButton>

          <GameButton
            variant="cream"
            onClick={() => {
              soundFx.buttonTap();
              onLeaveRoom();
            }}
            className="w-full min-h-[44px] text-xs rounded-[20px]"
          >
            Back to Home
          </GameButton>
        </div>
      </motion.div>
    );
  }

  const isTimerUrgent =
    roomState.phase === 'PLAYING' && !iHaveSolvedRound && (remainingMs <= 10_000 || opponentFinishedFirst);

  return (
    <div
      className={`flex-1 flex flex-col px-3.5 py-2.5 gap-3 ${
        roomState.phase === 'PLAYING' ? 'overflow-hidden overscroll-none' : ''
      }`}
    >
      {/* Compact Mobile Storybook VS HUD */}
      <div className="toy-surface rounded-[24px] px-3 py-2.5">
        <div className="grid grid-cols-11 items-center gap-1.5">
          {/* Left: You */}
          <div className="col-span-4 flex items-center gap-2 min-w-0">
            {me && (
              <>
                <PlayerAvatar avatarIndex={me.avatarIndex} name={me.name} sizeClass="w-9 h-9" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-extrabold text-[#163826] truncate">{me.name}</p>
                  <p className="font-mono text-sm font-extrabold text-[#168A55] tabular-nums leading-tight">
                    {me.score.toLocaleString()}
                  </p>
                  {roomState.puzzle && (
                    <div className="mt-1 h-2 bg-[#E3F5EB] rounded-full overflow-hidden shadow-[inset_0_1px_2px_rgba(20,85,54,0.12)]">
                      <motion.div
                        className="h-full bg-gradient-to-r from-[#22B573] to-[#168A55] rounded-full"
                        animate={{ width: `${(me.pandasPlaced / roomState.puzzle.size) * 100}%` }}
                        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Center: Animated Buddy Panda + Round & Live Countdown Timer */}
          <div className="col-span-3 flex flex-col items-center justify-center text-center px-1">
            <BoardBuddyPanda
              reaction={buddyReaction}
              urgent={isTimerUrgent}
              sizeClass="w-8 h-8 -mt-0.5"
            />
            <p className="text-[10px] font-extrabold text-[#4E6C5B] whitespace-nowrap leading-tight">
              R{roomState.currentRound}/{roomState.settings.totalRounds}
              {isFinalRound ? ' · 2×' : ''}
            </p>
            <div
              className={`mt-0.5 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-mono text-[11px] font-extrabold tabular-nums leading-tight ${
                isTimerUrgent
                  ? 'bg-[#FFE5E5] text-[#C62828]'
                  : 'bg-[#EEF7F2] text-[#163826]'
              }`}
            >
              <Clock className="w-3 h-3 shrink-0" />
              <span>
                {roomState.phase === 'PLAYING'
                  ? formatCountdown(remainingMs)
                  : roomState.phase === 'COUNTDOWN'
                    ? formatDurationClock(roomState.settings.roundTimeLimitSeconds)
                    : 'Done'}
              </span>
            </div>
          </div>

          {/* Right: Opponent */}
          <div className="col-span-4 flex items-center justify-end gap-2 min-w-0">
            {opponent ? (
              <>
                <div className="min-w-0 flex-1 text-right">
                  <p className="text-[11px] font-extrabold text-[#163826] truncate">{opponent.name}</p>
                  <p className="font-mono text-sm font-extrabold text-[#D13B40] tabular-nums leading-tight">
                    {opponent.score.toLocaleString()}
                  </p>
                  {roomState.puzzle && (
                    <div className="mt-1 h-2 bg-[#FCE8E8] rounded-full overflow-hidden shadow-[inset_0_1px_2px_rgba(180,35,24,0.12)]">
                      <motion.div
                        className="h-full bg-gradient-to-l from-[#F05252] to-[#C93B3D] ml-auto rounded-full"
                        animate={{
                          width: `${(opponent.pandasPlaced / roomState.puzzle.size) * 100}%`,
                        }}
                        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                      />
                    </div>
                  )}
                </div>
                <PlayerAvatar
                  avatarIndex={opponent.avatarIndex}
                  name={opponent.name}
                  sizeClass="w-9 h-9"
                />
              </>
            ) : (
              <p className="text-[11px] font-bold text-[#788F82]">Left</p>
            )}
          </div>
        </div>
      </div>

      {/* 15s Finish Sprint Banner */}
      <AnimatePresence>
        {roomState.phase === 'PLAYING' && sprintRemainingSec !== null && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            className={`rounded-[18px] px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs ${
              iHaveSolvedRound
                ? 'bg-gradient-to-r from-[#DCFCE7] to-[#ECFDF5] text-[#115E38] shadow-[0_4px_0_#A7E4BE,0_8px_16px_rgba(22,138,85,0.14)]'
                : 'bg-gradient-to-r from-[#FFE4E6] to-[#FFF1F2] text-[#B42318] shadow-[0_4px_0_#FDA4AF,0_8px_16px_rgba(225,29,72,0.16)]'
            }`}
          >
            <div className="flex items-center gap-1.5 font-extrabold">
              {iHaveSolvedRound ? (
                <>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Solved in {formatMs(me.roundSolveTimeMs)}! Waiting…</span>
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4 shrink-0" />
                  <span>{opponent?.name} finished! Hurry up!</span>
                </>
              )}
            </div>
            <span className="font-mono font-extrabold text-sm tabular-nums shrink-0 px-2 py-0.5 rounded-full bg-white/75">
              {sprintRemainingSec}s
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {submissionError && (
        <div className="rounded-[18px] px-3.5 py-2.5 bg-[#FFE8E8] text-xs font-extrabold text-[#B91C1C] shadow-[0_4px_0_#F8B4B4]">
          {submissionError}
        </div>
      )}

      {/* Stage Area */}
      {roomState.phase === 'COUNTDOWN' && (
        <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 text-center">
          <span className="inline-block px-3.5 py-1.5 rounded-full bg-white/85 text-xs font-extrabold text-[#436854] shadow-[0_4px_12px_rgba(20,65,42,0.08)]">
            Round {roomState.currentRound} of {roomState.settings.totalRounds} ·{' '}
            {DIFFICULTY_CONFIGS[roomState.settings.difficulty].label} ·{' '}
            {roomState.settings.colorMode === 'scattered' ? 'Hard' : 'Easy'} ·{' '}
            {formatDurationClock(roomState.settings.roundTimeLimitSeconds)}
            {isFinalRound ? ' · 2× XP' : ''}
          </span>
          <AnimatePresence mode="wait">
            <motion.p
              key={roomState.countdownRemaining}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 450, damping: 22 }}
              className="mt-6 font-display text-[112px] leading-none font-extrabold text-[#168A55] tabular-nums drop-shadow-[0_6px_0_rgba(255,255,255,0.95)]"
            >
              {roomState.countdownRemaining}
            </motion.p>
          </AnimatePresence>
          <p className="mt-5 inline-block px-3.5 py-1 rounded-full bg-[#FFF7DC] text-xs font-extrabold text-[#9A5D00] shadow-[0_3px_0_#F3D37A]">
            Same board · Fastest solver gets +200 bonus!
          </p>
        </div>
      )}

      {roomState.phase === 'PLAYING' && roomState.puzzle && (
        <div className="flex-1 flex flex-col justify-center">
          <PandokuBoard
            key={roomState.puzzle.id}
            puzzle={roomState.puzzle}
            showPatterns={showPatterns}
            autoX={autoX}
            disabled={iHaveSolvedRound}
            onProgressChange={onReportProgress}
            onSolved={onSubmitSolution}
            onBoardReaction={handleBoardReaction}
          />
        </div>
      )}

      {roomState.phase === 'ROUND_SUMMARY' && latestSummary && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col justify-between py-2 gap-4"
        >
          <div className="space-y-4">
            <div className="text-center pt-1">
              <span className="inline-block px-3 py-1 rounded-full bg-white/80 text-[11px] font-extrabold text-[#4A6B59] shadow-[0_3px_10px_rgba(20,65,42,0.06)]">
                Round {latestSummary.roundNumber} Complete
              </span>
              <h2 className="font-display text-[26px] font-extrabold text-[#163826] mt-1.5 leading-tight drop-shadow-[0_2px_0_rgba(255,255,255,0.85)]">
                {latestSummary.winnerId === playerId
                  ? 'You won this round!'
                  : latestSummary.winnerId
                    ? `${
                        roomState.players.find((p) => p.id === latestSummary.winnerId)?.name ??
                        'Opponent'
                      } was faster!`
                    : 'Round Tied!'}
              </h2>
            </div>

            <div className="space-y-3">
              {latestSummary.results.map((res) => {
                const p = roomState.players.find((pl) => pl.id === res.playerId);
                const isRoundWinner = latestSummary.winnerId === res.playerId;
                return (
                  <div
                    key={res.playerId}
                    className={`p-4 rounded-[24px] ${
                      isRoundWinner
                        ? 'bg-gradient-to-r from-[#E6FCEF] to-[#F3FFF7] shadow-[0_5px_0_#AEE2C4,0_10px_20px_rgba(27,138,85,0.14),inset_0_2px_0_rgba(255,255,255,0.9)]'
                        : 'toy-surface'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {p && (
                          <PlayerAvatar
                            avatarIndex={p.avatarIndex}
                            name={p.name}
                            sizeClass="w-10 h-10"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-[#163826] truncate">
                            {res.playerName}
                          </p>
                          <p className="text-[11px] font-bold text-[#5A7566] font-mono tabular-nums">
                            {formatMs(res.solveTimeMs)}
                          </p>
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#EDF5FF] font-mono text-base font-extrabold text-[#1649A8] tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                        <XpIcon className="w-4 h-4 shrink-0" />
                        <AnimatedPoints
                          value={res.totalRoundPoints}
                          durationMs={1400}
                          prefix="+"
                          playCoins={res.playerId === playerId}
                        />
                        <span className="text-[10px] font-extrabold text-[#2E6EE6]">XP</span>
                      </div>
                    </div>
                    <div className="mt-2.5 px-3 py-1.5 rounded-full bg-white/75 flex items-center justify-between text-[11px] font-bold text-[#4D6B5A] tabular-nums">
                      <span>
                        Base <AnimatedPoints value={res.basePoints} durationMs={750} prefix="+" />
                      </span>
                      <span>
                        Speed <AnimatedPoints value={res.speedBonus} durationMs={850} prefix="+" />
                      </span>
                      {res.firstFinishBonus > 0 && (
                        <span className="font-extrabold text-[#C27803]">
                          1st <AnimatedPoints value={res.firstFinishBonus} durationMs={900} prefix="+" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <GameButton
            variant="emerald"
            onClick={() => {
              soundFx.buttonTap();
              onReadyNextRound();
            }}
            disabled={roomState.readyForNextRoundIds.includes(playerId)}
            className="mt-2 w-full min-h-[54px] text-base rounded-[22px]"
          >
            <span>
              {roomState.readyForNextRoundIds.includes(playerId)
                ? 'Waiting for opponent…'
                : `Ready for Round ${roomState.currentRound + 1}`}
            </span>
            <ArrowRight className="w-4 h-4" />
          </GameButton>
        </motion.div>
      )}
    </div>
  );
}
