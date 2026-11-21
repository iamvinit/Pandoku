import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  ColorMode,
  DEFAULT_ROUND_TIME_SECONDS,
  Difficulty,
  DIFFICULTY_CONFIGS,
  RoomSettings,
} from '../shared/types';
import { AccessoryId, AccessorySlot } from '../shared/soloCatalog';
import { RoundClockPicker } from './RoundClockPicker';
import { ModeIconGraphic } from './ModeGraphic';
import { InteractivePanda } from './InteractivePanda';
import {
  AnimatedDuelIcon,
  AnimatedTicketKeyIcon,
  GameButton,
} from './GameAnimatedIcons';
import { soundFx } from '../utils/sound';

const NAME_STORAGE_KEY = 'pandoku_player_name_v1';

export type DuelMenuStep = 'choose' | 'create' | 'join';

interface DuelMenuViewProps {
  initialStep?: DuelMenuStep;
  initialInviteCode: string;
  equippedAccessories: Record<AccessorySlot, AccessoryId | null>;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  error: string | null;
  onStepChange?: (step: DuelMenuStep) => void;
  onClearError: () => void;
  onCreateRoom: (playerName: string, settings: RoomSettings) => void;
  onJoinRoom: (code: string, playerName: string) => void;
}

/** Animated Mysterious Shadow Panda Opponent Silhouette (Right side of the 1v1 Duel Arena!) */
function ShadowRivalPanda({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`relative shrink-0 flex items-end justify-center select-none pointer-events-none ${
        compact ? 'w-[104px] h-[106px]' : 'w-[136px] h-[142px]'
      }`}
    >
      {/* Swirling dark twilight shadow aura */}
      <motion.div
        aria-hidden="true"
        className={`absolute bottom-2 rounded-full bg-[#4C1D95]/45 blur-xl ${
          compact ? 'w-20 h-20' : 'w-28 h-28'
        }`}
        animate={{ scale: [0.92, 1.12, 0.92], opacity: [0.55, 0.85, 0.55] }}
        transition={{ duration: 2.3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Floating Mystery "?" Crest signifying an unknown opponent */}
      <motion.div
        aria-hidden="true"
        className={`absolute right-3 z-20 rounded-full bg-[#1E1438] border-2 border-[#C084FC] shadow-[0_0_12px_rgba(192,132,252,0.75)] flex items-center justify-center font-display font-black text-[#F5D0FE] ${
          compact ? 'top-0.5 w-6 h-6 text-xs' : 'top-1.5 w-7 h-7 text-sm'
        }`}
        animate={{ y: [0, -4, 0], rotate: [-6, 6, -6] }}
        transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
      >
        ?
      </motion.div>

      {/* Contact shadow under feet */}
      <div className="absolute bottom-1 w-16 h-3 rounded-full bg-[#090414]/60 blur-[3px]" />

      {/* Mirrored Fighting-Stance Shadow Panda SVG */}
      <motion.svg
        viewBox="0 0 120 130"
        className={`relative z-10 overflow-visible drop-shadow-[0_0_12px_rgba(168,85,247,0.55)] ${
          compact ? 'w-[92px] h-[98px]' : 'w-[116px] h-[126px]'
        }`}
        animate={{ y: [0, -5, 0], scaleY: [0.97, 1.03, 0.97] }}
        transition={{ duration: 0.72, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="shadowPandaBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#261B42" />
            <stop offset="55%" stopColor="#130E24" />
            <stop offset="100%" stopColor="#090612" />
          </linearGradient>
        </defs>

        {/* Fluttering Shadow Headband Ribbons trailing right */}
        <motion.path
          d="M84 42 Q102 36 114 45 Q102 52 84 48 Z"
          fill="#7C3AED"
          opacity="0.88"
          style={{ transformOrigin: '84px 45px' }}
          animate={{ rotate: [-6, 9, -6] }}
          transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Standing Wide Combat Legs */}
        <rect x="33" y="92" width="17" height="27" rx="8.5" fill="#0B0717" stroke="#6D28D9" strokeWidth="1.6" />
        <rect x="66" y="92" width="17" height="27" rx="8.5" fill="#0B0717" stroke="#6D28D9" strokeWidth="1.6" />
        <ellipse cx="38" cy="118" rx="12" ry="6" fill="#0B0717" stroke="#7C3AED" strokeWidth="1.4" />
        <ellipse cx="75" cy="118" rx="12" ry="6" fill="#0B0717" stroke="#7C3AED" strokeWidth="1.4" />

        {/* Muscular Chibi Shadow Torso */}
        <ellipse cx="58" cy="79" rx="28" ry="26" fill="url(#shadowPandaBody)" stroke="#7C3AED" strokeWidth="2" />

        {/* Back Guard Arm (raised right) */}
        <motion.g
          style={{ transformOrigin: '78px 68px' }}
          animate={{ rotate: [-5, 7, -5] }}
          transition={{ duration: 0.72, repeat: Infinity, ease: 'easeInOut' }}
        >
          <rect x="74" y="56" width="15" height="25" rx="7.5" transform="rotate(-32 82 68)" fill="#0F0A1E" stroke="#8B5CF6" strokeWidth="1.6" />
        </motion.g>

        {/* Ears */}
        <circle cx="38" cy="24" r="11" fill="#0D081A" stroke="#8B5CF6" strokeWidth="1.8" />
        <circle cx="76" cy="24" r="11" fill="#0D081A" stroke="#8B5CF6" strokeWidth="1.8" />

        {/* Shadow Panda Head facing left toward Player Panda */}
        <ellipse cx="56" cy="44" rx="28" ry="24" fill="url(#shadowPandaBody)" stroke="#8B5CF6" strokeWidth="2.2" />

        {/* Subtle glowing headband stripe */}
        <path d="M31 37 Q56 32 81 37" stroke="#A855F7" strokeWidth="4" strokeLinecap="round" opacity="0.85" />

        {/* Fierce Glowing Rival Eyes slanted inward toward the left */}
        <motion.g
          animate={{ opacity: [0.82, 1, 0.82] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path d="M36 44 L48 48 L38 51 Z" fill="#F0ABFC" />
          <path d="M64 44 L52 48 L62 51 Z" fill="#F0ABFC" />
          <circle cx="42" cy="48" r="1.5" fill="#FFFFFF" />
          <circle cx="58" cy="48" r="1.5" fill="#FFFFFF" />
        </motion.g>

        {/* Front Attack Fist thrusting left! */}
        <motion.g
          style={{ transformOrigin: '36px 72px' }}
          animate={{ x: [0, -7, 0], rotate: [0, 8, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <rect x="14" y="64" width="26" height="14" rx="7" fill="#140D28" stroke="#A855F7" strokeWidth="1.8" />
          <circle cx="17" cy="71" r="8" fill="#1D123A" stroke="#C084FC" strokeWidth="1.8" />
        </motion.g>
      </motion.svg>
    </div>
  );
}

/** Transparent Dojo Stage Face-Off planted squarely on the carved stone dojo platform floor */
function DuelArenaStage({
  equippedAccessories,
  compact = false,
}: {
  equippedAccessories: Record<AccessorySlot, AccessoryId | null>;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative w-full flex flex-col justify-between overflow-visible ${
        compact ? 'shrink-0 pt-0.5' : 'h-full pt-1'
      }`}
    >
      {/* Martial Arts Dojo Swinging Lanterns + Stylized 1v1 DUEL Signboard nestled between Pagoda Eaves */}
      <div className="relative z-20 select-none pointer-events-none">
        <div className="relative flex items-start justify-center px-3">
          <motion.div
            className="absolute left-5 top-0.5 w-3.5 h-5 rounded-full bg-gradient-to-b from-[#FEF08A] via-[#F97316] to-[#DC2626] border border-[#7C2D12] shadow-[0_0_12px_#F59E0B]"
            style={{ transformOrigin: '50% 0%' }}
            animate={{ rotate: [-6, 6, -6] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute right-5 top-0.5 w-3.5 h-5 rounded-full bg-gradient-to-b from-[#F5D0FE] via-[#A855F7] to-[#581C87] border border-[#3B0764] shadow-[0_0_12px_#A855F7]"
            style={{ transformOrigin: '50% 0%' }}
            animate={{ rotate: [6, -6, 6] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div
            className={`relative rounded-2xl bg-gradient-to-b from-[#FFFDF7] to-[#FDE7BE] border-2 border-[#D97706] shadow-[0_6px_16px_rgba(16,8,4,0.42)] ${
              compact ? 'px-4 py-1' : 'px-6 py-1.5'
            }`}
            style={{
              transformOrigin: '50% -6px',
              animation: 'pandoku-awning-sway 4s ease-in-out infinite',
            }}
          >
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
            <h1
              className={`font-display font-black tracking-wide leading-none bg-gradient-to-r from-[#14603D] via-[#B45309] to-[#6D28D9] bg-clip-text text-transparent ${
                compact ? 'text-[17px]' : 'text-[23px]'
              }`}
            >
              1v1 DUEL
            </h1>
          </div>
        </div>
      </div>

      {/* Face-Off Stage: Feet planted firmly along the carved stone dueling ring floor! */}
      <div
        className={`relative z-10 flex items-end justify-between px-4 ${
          compact ? 'h-[112px] pt-1' : 'pb-1'
        }`}
      >
        {/* Left Side: Player's Equipped 3D Panda planted solidly on stone platform */}
        <div className="relative flex flex-col items-center">
          {/* Grounded stone-floor contact shadow directly under paws */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute bottom-1.5 rounded-full bg-[#1C1208]/45 blur-[4px] ${
              compact ? 'w-16 h-3' : 'w-24 h-3.5'
            }`}
          />
          <InteractivePanda
            equippedAccessories={equippedAccessories}
            duelReady
            duelCompact={compact}
            hideStageProps
          />
        </div>

        {/* Center: Animated Electric VS Clash Emblem hovering cleanly between the two fighters */}
        <motion.div
          aria-hidden="true"
          className={`self-center relative z-20 rounded-full bg-gradient-to-b from-[#FDE047] via-[#F59E0B] to-[#DC2626] border-[3px] border-white shadow-[0_0_20px_rgba(251,191,36,0.85)] flex items-center justify-center shrink-0 ${
            compact ? 'w-10 h-10 mb-2' : 'w-13 h-13 mb-4'
          }`}
          animate={{ scale: [0.95, 1.1, 0.95], rotate: [-4, 4, -4] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span
            className={`font-display font-black text-white tracking-tight drop-shadow-[0_1.5px_0_rgba(124,20,10,0.8)] ${
              compact ? 'text-[15px]' : 'text-[20px]'
            }`}
          >
            VS
          </span>
        </motion.div>

        {/* Right Side: Unknown Opponent Shadow Panda planted solidly on stone platform */}
        <ShadowRivalPanda compact={compact} />
      </div>
    </div>
  );
}

export function DuelMenuView({
  initialStep = 'choose',
  initialInviteCode,
  equippedAccessories,
  connectionStatus,
  error,
  onStepChange,
  onClearError,
  onCreateRoom,
  onJoinRoom,
}: DuelMenuViewProps) {
  const [step, setStep] = useState<DuelMenuStep>(
    initialInviteCode ? 'join' : initialStep
  );

  useEffect(() => {
    onStepChange?.(step);
  }, [step, onStepChange]);
  const [playerName, setPlayerName] = useState<string>(() => {
    try {
      return localStorage.getItem(NAME_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const [joinCode, setJoinCode] = useState<string>(initialInviteCode);
  const [difficulty, setDifficulty] = useState<Difficulty>('classic');
  const [colorMode, setColorMode] = useState<ColorMode>('connected');
  const [totalRounds, setTotalRounds] = useState<3 | 5>(3);
  const [roundTimeLimitSeconds, setRoundTimeLimitSeconds] = useState<number>(
    DEFAULT_ROUND_TIME_SECONDS
  );

  useEffect(() => {
    if (initialInviteCode) {
      setJoinCode(initialInviteCode);
      setStep('join');
    }
  }, [initialInviteCode]);

  const persistName = (name: string) => {
    setPlayerName(name);
    try {
      localStorage.setItem(NAME_STORAGE_KEY, name);
    } catch {
      // ignore
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.buttonTap();
    onClearError();
    onCreateRoom(playerName.trim() || 'Bamboo Master', {
      difficulty,
      colorMode,
      totalRounds,
      roundTimeLimitSeconds,
    });
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    soundFx.buttonTap();
    onClearError();
    onJoinRoom(joinCode.trim().toUpperCase(), playerName.trim() || 'Swift Panda');
  };

  // =========================================================================
  // STEP 1: FULL-SCREEN DOJO COURTYARD + CONSISTENT SCULPTED EMERALD/AMBER CTAs
  // =========================================================================
  if (step === 'choose') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 min-h-0 flex flex-col overflow-hidden"
      >
        {/* Upper ~49%: Sky + Pagoda Signboard -> Pandas firmly planted on the carved stone dueling platform! */}
        <div className="h-[49%] min-h-[205px] shrink-0">
          <DuelArenaStage equippedAccessories={equippedAccessories} />
        </div>

        {/* Lower ~51%: Over the mossy stone courtyard steps below the platform */}
        <div className="flex-1 min-h-0 flex flex-col justify-center px-4 pb-4 pt-2.5 gap-2.5">
          <p
            className="text-center text-xs font-extrabold text-[#FFF9E8] tracking-wide"
            style={{ textShadow: '0 1.5px 4px rgba(10, 18, 26, 0.85)' }}
          >
            Race a friend head-to-head on the exact same puzzle!
          </p>

          <GameButton
            variant="emerald"
            size="lg"
            fullWidth
            align="left"
            bgMotif={<AnimatedDuelIcon className="w-18 h-18" />}
            onClick={() => {
              soundFx.buttonTap();
              onClearError();
              setStep('create');
            }}
            className="py-3 px-4.5 min-h-[clamp(62px,9.5dvh,76px)]"
          >
            <div className="flex flex-col items-start text-left pr-10">
              <span
                className="font-display text-[clamp(18px,2.5dvh,21px)] font-black leading-tight"
                style={{ textShadow: '0 2px 0 rgba(10,65,34,0.38)' }}
              >
                Create Room
              </span>
              <span className="text-[11.5px] font-bold text-white/90 mt-0.5 whitespace-normal leading-snug">
                Start a new duel &amp; share your secret code
              </span>
            </div>
          </GameButton>

          <GameButton
            variant="amber"
            size="lg"
            fullWidth
            align="left"
            bgMotif={<AnimatedTicketKeyIcon className="w-18 h-18" />}
            onClick={() => {
              soundFx.buttonTap();
              onClearError();
              setStep('join');
            }}
            className="py-3 px-4.5 min-h-[clamp(62px,9.5dvh,76px)]"
          >
            <div className="flex flex-col items-start text-left pr-10">
              <span
                className="font-display text-[21px] font-black leading-tight"
                style={{ textShadow: '0 2px 0 rgba(135,65,0,0.4)' }}
              >
                Join Room
              </span>
              <span className="text-[11.5px] font-bold text-white/95 mt-0.5 whitespace-normal leading-snug">
                Enter a friend&apos;s room code to jump in
              </span>
            </div>
          </GameButton>
        </div>
      </motion.div>
    );
  }

  // =========================================================================
  // STEP 2: FULL-SCREEN DOJO SINGLE-SCREEN CREATE ROOM / JOIN ROOM (ZERO SCROLL!)
  // =========================================================================
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 min-h-0 flex flex-col justify-between gap-2 pb-3 overflow-hidden"
    >
      <DuelArenaStage equippedAccessories={equippedAccessories} compact />

      <div className="flex-1 min-h-0 flex flex-col justify-between px-4 gap-2">
        {/* Consistent Sculpted 3D Menu Buttons (Create Room / Join Room) */}
        <div className="grid grid-cols-2 gap-2.5 shrink-0">
          <GameButton
            variant={step === 'create' ? 'emerald' : 'white'}
            size="sm"
            fullWidth
            bgMotif={<AnimatedDuelIcon className="w-10 h-10" />}
            onClick={() => {
              soundFx.buttonTap();
              onClearError();
              setStep('create');
            }}
            className={`min-h-[40px] ${step === 'create' ? '' : 'opacity-85'}`}
          >
            <span
              className="font-display text-[14.5px] tracking-wide"
              style={
                step === 'create'
                  ? { textShadow: '0 1.5px 0 rgba(10,65,34,0.35)' }
                  : undefined
              }
            >
              Create Room
            </span>
          </GameButton>

          <GameButton
            variant={step === 'join' ? 'amber' : 'white'}
            size="sm"
            fullWidth
            bgMotif={<AnimatedTicketKeyIcon className="w-10 h-10" />}
            onClick={() => {
              soundFx.buttonTap();
              onClearError();
              setStep('join');
            }}
            className={`min-h-[40px] ${step === 'join' ? '' : 'opacity-85'}`}
          >
            <span
              className="font-display text-[14.5px] tracking-wide"
              style={
                step === 'join'
                  ? { textShadow: '0 1.5px 0 rgba(135,65,0,0.35)' }
                  : undefined
              }
            >
              Join Room
            </span>
          </GameButton>
        </div>

        {/* Floating Translucent Storybook Controls directly over the Full-Screen Dojo Courtyard */}
        <div className="space-y-2 flex-1 flex flex-col justify-between">
          {/* Compact Inline Player Name Pill */}
          <div className="bg-white/92 backdrop-blur-xs rounded-full px-3.5 py-0.5 flex items-center gap-2.5 shadow-[0_3.5px_0_rgba(18,38,28,0.22),0_8px_18px_rgba(0,0,0,0.16)]">
            <label
              htmlFor="duel-player-name"
              className="text-xs font-extrabold text-[#2B4939] whitespace-nowrap shrink-0"
            >
              Your Name
            </label>
            <input
              id="duel-player-name"
              type="text"
              maxLength={18}
              value={playerName}
              onChange={(e) => persistName(e.target.value)}
              placeholder="Bamboo Master"
              className="flex-1 min-w-0 h-[34px] px-2 text-sm font-bold text-[#173625] bg-transparent rounded-full focus:outline-none text-right"
            />
          </div>

          {step === 'create' ? (
            <form onSubmit={handleCreateSubmit} className="space-y-2 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                {/* Puzzle Mode — Two Plump Toy Tiles */}
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: 'connected', title: 'Easy', sub: 'Grouped' },
                      { id: 'scattered', title: 'Hard', sub: 'Scattered' },
                    ] as const
                  ).map((mode) => {
                    const active = colorMode === mode.id;
                    const isEasy = mode.id === 'connected';
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => {
                          soundFx.buttonTap();
                          setColorMode(mode.id);
                        }}
                        className={`min-h-[42px] px-3 py-1 rounded-[18px] transition-all cursor-pointer inline-flex items-center justify-center gap-2 text-left ${
                          active
                            ? isEasy
                              ? 'bg-gradient-to-b from-[#FFFFFF] to-[#DCFCEB] text-[#0D6B3C] shadow-[0_3.5px_0_#6CD19B,0_8px_16px_rgba(0,0,0,0.2)]'
                              : 'bg-gradient-to-b from-[#FFFFFF] to-[#FFE7E2] text-[#B8321F] shadow-[0_3.5px_0_#F29282,0_8px_16px_rgba(0,0,0,0.2)]'
                            : 'bg-white/75 text-[#3F594C]'
                        }`}
                      >
                        <ModeIconGraphic mode={mode.id} className="w-5 h-5 shrink-0" />
                        <div className="leading-tight">
                          <p className="text-xs font-black">{mode.title}</p>
                          <p className="text-[10px] font-bold opacity-80">{mode.sub}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Board Size + Rounds Side-by-Side */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      className="block text-[10.5px] font-extrabold text-[#FFF9E8] mb-1 pl-1"
                      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.75)' }}
                    >
                      Board Size
                    </label>
                    <div className="grid grid-cols-3 gap-1 p-1 bg-white/85 rounded-full shadow-[0_3px_10px_rgba(0,0,0,0.16)]">
                      {(['easy', 'classic', 'master'] as Difficulty[]).map((diff) => (
                        <button
                          key={diff}
                          type="button"
                          onClick={() => {
                            soundFx.buttonTap();
                            setDifficulty(diff);
                          }}
                          className={`min-h-[30px] text-xs font-black rounded-full transition-all cursor-pointer ${
                            difficulty === diff
                              ? 'bg-gradient-to-b from-[#34C776] to-[#178A4C] text-white shadow-[0_2px_0_#0D5C31]'
                              : 'text-[#3F594C]'
                          }`}
                        >
                          {DIFFICULTY_CONFIGS[diff].size}×{DIFFICULTY_CONFIGS[diff].size}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label
                      className="block text-[10.5px] font-extrabold text-[#FFF9E8] mb-1 pl-1"
                      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.75)' }}
                    >
                      Rounds
                    </label>
                    <div className="grid grid-cols-2 gap-1 p-1 bg-white/85 rounded-full shadow-[0_3px_10px_rgba(0,0,0,0.16)]">
                      {([3, 5] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            soundFx.buttonTap();
                            setTotalRounds(r);
                          }}
                          className={`min-h-[30px] text-xs font-black rounded-full transition-all cursor-pointer ${
                            totalRounds === r
                              ? 'bg-gradient-to-b from-[#34C776] to-[#178A4C] text-white shadow-[0_2px_0_#0D5C31]'
                              : 'text-[#3F594C]'
                          }`}
                        >
                          {r} Rnds
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <RoundClockPicker
                  valueSeconds={roundTimeLimitSeconds}
                  onChange={setRoundTimeLimitSeconds}
                  label="Time Limit"
                  compact
                />

                {error && (
                  <p className="text-xs font-bold text-[#B91C1C] bg-[#FFEAEA] rounded-2xl p-2">
                    {error}
                  </p>
                )}
              </div>

              <GameButton
                type="submit"
                variant="emerald"
                size="md"
                fullWidth
                bgMotif={<AnimatedDuelIcon className="w-14 h-14" />}
                disabled={connectionStatus === 'disconnected'}
                className="min-h-[48px] shrink-0"
              >
                <span
                  className="font-display text-[17px] tracking-wide"
                  style={{ textShadow: '0 2px 0 rgba(10,65,34,0.35)' }}
                >
                  Create Room
                </span>
              </GameButton>
            </form>
          ) : (
            <form onSubmit={handleJoinSubmit} className="space-y-3 pt-1 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="bg-white/92 backdrop-blur-xs rounded-[24px] p-3.5 space-y-1.5 shadow-[0_5px_0_rgba(18,38,28,0.22),0_12px_24px_rgba(0,0,0,0.18)]">
                  <label
                    htmlFor="duel-room-code"
                    className="block text-xs font-extrabold text-[#2B4939]"
                  >
                    6-Character Room Code
                  </label>
                  <input
                    id="duel-room-code"
                    type="text"
                    maxLength={8}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="e.g. K7M4P2"
                    className="w-full min-h-[48px] px-4 font-mono text-xl font-black tracking-[0.22em] uppercase text-[#173625] toy-well rounded-2xl focus:outline-none text-center"
                  />
                </div>

                {error && (
                  <p className="text-xs font-bold text-[#B91C1C] bg-[#FFEAEA] rounded-2xl p-2.5">
                    {error}
                  </p>
                )}
              </div>

              <GameButton
                type="submit"
                variant="amber"
                size="md"
                fullWidth
                bgMotif={<AnimatedTicketKeyIcon className="w-14 h-14" />}
                disabled={!joinCode.trim() || connectionStatus === 'disconnected'}
                className="min-h-[50px] shrink-0"
              >
                <span
                  className="font-display text-[17px] tracking-wide"
                  style={{ textShadow: '0 2px 0 rgba(135,65,0,0.35)' }}
                >
                  Join Room
                </span>
              </GameButton>
            </form>
          )}
        </div>
      </div>
    </motion.div>
  );
}
