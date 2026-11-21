import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Check,
  Copy,
  Link2,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  Difficulty,
  DIFFICULTY_CONFIGS,
  formatDurationClock,
  PublicRoomState,
  RoomSettings,
} from '../shared/types';
import { PlayerAvatar } from './PandaToken';
import { InteractivePanda } from './InteractivePanda';
import { RoundClockPicker } from './RoundClockPicker';
import { ModeGraphicBadge, ModeIconGraphic } from './ModeGraphic';
import {
  AnimatedAdventureIcon,
  AnimatedDuelIcon,
  GameButton,
} from './GameAnimatedIcons';
import { AccessoryId, AccessorySlot, AnyTrickId } from '../shared/soloCatalog';
import { soundFx } from '../utils/sound';

interface LobbyViewProps {
  roomState: PublicRoomState | null;
  playerId: string | null;
  error: string | null;
  equippedAccessories: Record<AccessorySlot, AccessoryId | null>;
  homeTricks: [AnyTrickId, AnyTrickId, AnyTrickId];
  unlockedCount: number;
  onUpdateSettings: (settings: RoomSettings) => void;
  onToggleReady: () => void;
  onStartMatch: () => void;
  onLeaveRoom: () => void;
  onOpenDuelMenu: () => void;
  onOpenSoloHub: () => void;
  onOpenStudio: () => void;
  onCheatUnlockAll: () => void;
}

export function LobbyView({
  roomState,
  playerId,
  error,
  equippedAccessories,
  homeTricks,
  unlockedCount,
  onUpdateSettings,
  onToggleReady,
  onStartMatch,
  onLeaveRoom,
  onOpenDuelMenu,
  onOpenSoloHub,
  onOpenStudio,
  onCheatUnlockAll,
}: LobbyViewProps) {
  const [copiedType, setCopiedType] = useState<'code' | 'link' | null>(null);

  const handleCopy = async (text: string, type: 'code' | 'link') => {
    soundFx.buttonTap();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  // =========================================================================
  // MOBILE MULTIPLAYER WAITING ROOM LOBBY
  // =========================================================================
  if (roomState && roomState.phase === 'LOBBY') {
    const me = roomState.players.find((p) => p.id === playerId) ?? null;
    const isHost = Boolean(me?.isHost);
    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${roomState.code}`;
    const hasTwoPlayers = roomState.players.length === 2;
    const bothReady = hasTwoPlayers && roomState.players.every((p) => p.ready);

    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
        className="flex-1 min-h-0 flex flex-col justify-between px-3.5 pt-1 pb-2.5 gap-2 overflow-hidden"
      >
        <div className="space-y-2">
          {/* Compact Room Code Strip */}
          <div className="toy-surface rounded-[22px] px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-[#4D6457] tabular-nums leading-none">
                  <span>
                    {DIFFICULTY_CONFIGS[roomState.settings.difficulty].size}×
                    {DIFFICULTY_CONFIGS[roomState.settings.difficulty].size}
                  </span>
                  <ModeGraphicBadge mode={roomState.settings.colorMode} size="xs" />
                  <span>{formatDurationClock(roomState.settings.roundTimeLimitSeconds)}</span>
                </div>
                <p className="font-mono text-xl font-black tracking-[0.16em] text-[#173625] tabular-nums leading-tight mt-0.5">
                  {roomState.code}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(roomState.code, 'code')}
                  className="h-[38px] w-[38px] inline-flex items-center justify-center text-xs font-bold text-[#183827] bg-gradient-to-b from-[#FFFFFF] to-[#E9F4ED] shadow-[0_3px_0_#B8D2C2] rounded-xl active:translate-y-[2px] cursor-pointer"
                  aria-label="Copy room code"
                >
                  {copiedType === 'code' ? (
                    <Check className="w-4 h-4 text-[#1B7A4E]" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(inviteUrl, 'link')}
                  className="h-[38px] inline-flex items-center gap-1.5 px-3 text-xs font-extrabold text-white bg-gradient-to-b from-[#34C776] to-[#178A4C] shadow-[0_3px_0_#0E5B31] rounded-xl active:translate-y-[2px] cursor-pointer whitespace-nowrap"
                >
                  {copiedType === 'link' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Invite</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Compact Horizontal VS Player Strip */}
          <div className="grid grid-cols-2 gap-2">
            {[0, 1].map((slot) => {
              const p = roomState.players[slot];
              if (!p) {
                return (
                  <div
                    key={slot}
                    className="px-2.5 py-2 rounded-[20px] bg-white/55 shadow-[inset_0_2px_8px_rgba(24,62,40,0.08)] flex items-center gap-2 min-h-[58px]"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#DCEFE3] flex items-center justify-center text-[#517562] shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 leading-tight">
                      <p className="text-xs font-extrabold text-[#496355] truncate">Waiting…</p>
                      <p className="text-[10px] font-semibold text-[#6F887A] truncate">Share link</p>
                    </div>
                  </div>
                );
              }

              const isMe = p.id === playerId;
              return (
                <motion.div
                  key={p.id}
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`px-2.5 py-2 rounded-[20px] flex items-center gap-2 min-h-[58px] ${
                    p.ready
                      ? 'bg-gradient-to-b from-[#FFFFFF] to-[#E5FAEE] shadow-[0_3.5px_0_#8FD8AE,0_8px_16px_rgba(22,128,71,0.12)]'
                      : 'toy-surface'
                  }`}
                >
                  <PlayerAvatar avatarIndex={p.avatarIndex} name={p.name} sizeClass="w-9 h-9 shrink-0" />
                  <div className="min-w-0 leading-tight">
                    <p className="text-xs font-black text-[#182B20] truncate">
                      {p.name}
                    </p>
                    <p className="text-[10.5px] font-bold mt-0.5 flex items-center gap-1 truncate">
                      {p.ready ? (
                        <span className="text-[#147A46] inline-flex items-center gap-0.5">
                          <UserCheck className="w-3 h-3 shrink-0" />
                          Ready
                        </span>
                      ) : (
                        <span className="text-[#6F8578]">Not ready</span>
                      )}
                      {isMe && <span className="text-[#4E6457]">· You</span>}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Match Settings — Mode, Grid Size, Rounds (Compact Cushion) */}
          <div className="toy-surface rounded-[22px] px-3 py-2.5 space-y-2">
            <div>
              <p className="text-[10.5px] font-extrabold text-[#3D594A] mb-1 leading-none">
                Puzzle Mode {isHost ? '' : '· Host Controls'}
              </p>
              <div className="grid grid-cols-2 gap-1.5 p-1 toy-well rounded-2xl">
                {(
                  [
                    { id: 'connected', title: 'Easy', sub: 'Grouped' },
                    { id: 'scattered', title: 'Hard', sub: 'Scattered' },
                  ] as const
                ).map((mode) => {
                  const active = roomState.settings.colorMode === mode.id;
                  const isEasy = mode.id === 'connected';
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      disabled={!isHost}
                      onClick={() => {
                        soundFx.buttonTap();
                        onUpdateSettings({ ...roomState.settings, colorMode: mode.id });
                      }}
                      className={`min-h-[38px] px-2 py-1 rounded-xl transition-all inline-flex items-center justify-center gap-1.5 text-left ${
                        active
                          ? isEasy
                            ? 'bg-gradient-to-b from-[#FFFFFF] to-[#E1FAEC] text-[#0D6B3C] shadow-[0_2.5px_0_#7AD6A2]'
                            : 'bg-gradient-to-b from-[#FFFFFF] to-[#FFEBE6] text-[#B8321F] shadow-[0_2.5px_0_#F29A8C]'
                          : 'bg-transparent text-[#50665A]'
                      } ${isHost ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <ModeIconGraphic mode={mode.id} className="w-5 h-5 shrink-0" />
                      <div className="leading-tight">
                        <p className="text-xs font-extrabold">{mode.title}</p>
                        <p className="text-[9.5px] font-semibold opacity-80">{mode.sub}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10.5px] font-extrabold text-[#3D594A] mb-1 leading-none">Grid Size</p>
                <div className="grid grid-cols-3 gap-1 p-1 toy-well rounded-2xl">
                  {(['easy', 'classic', 'master'] as Difficulty[]).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      disabled={!isHost}
                      onClick={() => {
                        soundFx.buttonTap();
                        onUpdateSettings({ ...roomState.settings, difficulty: diff });
                      }}
                      className={`min-h-[32px] text-[11.5px] font-extrabold rounded-xl transition-all whitespace-nowrap ${
                        roomState.settings.difficulty === diff
                          ? 'bg-white text-[#145536] shadow-[0_2px_0_#B4D0BE]'
                          : 'text-[#50665A]'
                      } ${isHost ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      {DIFFICULTY_CONFIGS[diff].size}×{DIFFICULTY_CONFIGS[diff].size}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10.5px] font-extrabold text-[#3D594A] mb-1 leading-none">Rounds</p>
                <div className="grid grid-cols-2 gap-1 p-1 toy-well rounded-2xl">
                  {([3, 5] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      disabled={!isHost}
                      onClick={() => {
                        soundFx.buttonTap();
                        onUpdateSettings({ ...roomState.settings, totalRounds: r });
                      }}
                      className={`min-h-[32px] text-[11.5px] font-extrabold rounded-xl transition-all whitespace-nowrap ${
                        roomState.settings.totalRounds === r
                          ? 'bg-white text-[#145536] shadow-[0_2px_0_#B4D0BE]'
                          : 'text-[#50665A]'
                      } ${isHost ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      {r} Rnds
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Compact Round Clock (own clean cushion — zero double-nesting!) */}
          <RoundClockPicker
            compact
            valueSeconds={roomState.settings.roundTimeLimitSeconds}
            disabled={!isHost}
            label={isHost ? 'Time Limit per Round' : 'Time Limit (Host)'}
            onChange={(nextSec) =>
              onUpdateSettings({
                ...roomState.settings,
                roundTimeLimitSeconds: nextSec,
              })
            }
          />

          {error && (
            <div className="px-3 py-1.5 rounded-xl bg-[#FFEAEA] text-[11px] font-bold text-[#B91C1C]">
              {error}
            </div>
          )}
        </div>

        {/* Always-Visible Bottom Action Row — Zero Scroll! */}
        <div className="space-y-1.5 pt-0.5 shrink-0">
          {isHost ? (
            <GameButton
              variant="emerald"
              size="md"
              fullWidth
              disabled={!hasTwoPlayers}
              bgMotif={<AnimatedDuelIcon className="w-14 h-14" />}
              onClick={() => {
                soundFx.buttonTap();
                onStartMatch();
              }}
            >
              <span className="font-display text-[17px] tracking-wide">
                {!hasTwoPlayers
                  ? 'Waiting for Friend to Join…'
                  : bothReady
                    ? 'Start 1v1 Duel!'
                    : 'Start Duel Now'}
              </span>
            </GameButton>
          ) : (
            <GameButton
              variant={me?.ready ? 'white' : 'emerald'}
              size="md"
              fullWidth
              onClick={() => {
                soundFx.buttonTap();
                onToggleReady();
              }}
            >
              <span className="font-display text-[17px] tracking-wide">
                {me?.ready ? 'Ready! Waiting for Host…' : 'Tap When Ready'}
              </span>
            </GameButton>
          )}

          <button
            type="button"
            onClick={() => {
              soundFx.buttonTap();
              onLeaveRoom();
            }}
            className="w-full h-[34px] rounded-full bg-white/75 text-xs font-extrabold text-[#496656] hover:text-[#18201C] shadow-[0_2px_0_#C8DDD0] active:translate-y-[1px] transition-all cursor-pointer"
          >
            Leave Room
          </button>
        </div>
      </motion.div>
    );
  }

  // =========================================================================
  // MOBILE GAME HOME SCREEN (Storybook Sunlit Meadow + Three.js 3D Panda)
  // =========================================================================
  return (
    <div className="flex-1 min-h-0 flex flex-col justify-between px-3.5 min-[380px]:px-4 pt-0.5 pb-3 min-[400px]:pb-4 gap-1 relative overflow-hidden">
      {/* Gentle Storybook Meadow Backdrop — Soft Drifting Clouds & Rolling Green Hills */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        {/* Soft sunlit puff clouds */}
        <motion.div
          animate={{ x: [-8, 12, -8] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-6 left-4 w-24 h-9 rounded-full bg-white/75 blur-[1px]"
        >
          <span className="absolute -top-3 left-5 w-12 h-8 rounded-full bg-white/85" />
          <span className="absolute -top-2 right-3 w-8 h-6 rounded-full bg-white/80" />
        </motion.div>
        <motion.div
          animate={{ x: [10, -10, 10] }}
          transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-12 right-5 w-20 h-7 rounded-full bg-white/65 blur-[1px]"
        >
          <span className="absolute -top-2.5 left-4 w-10 h-7 rounded-full bg-white/80" />
        </motion.div>

        {/* Soft layered pastel meadow hills grounding the 3D Panda & bottom toy buttons */}
        <svg
          viewBox="0 0 440 240"
          preserveAspectRatio="none"
          className="absolute bottom-0 inset-x-0 w-full h-[52%]"
        >
          <path
            d="M0 105 Q110 55 240 88 T440 72 L440 240 L0 240 Z"
            fill="#CFEFD9"
            opacity="0.72"
          />
          <path
            d="M0 142 Q140 96 290 128 T440 116 L440 240 L0 240 Z"
            fill="#B7E8C7"
            opacity="0.76"
          />
          <path
            d="M0 185 Q180 156 440 176 L440 240 L0 240 Z"
            fill="#A1DFB6"
            opacity="0.65"
          />
        </svg>
      </div>

      {/* Stylized Pandoku Game Wordmark with Cute Panda inside the 'o' */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 shrink-0 flex flex-col items-center justify-center pt-0.5"
      >
        <h1
          aria-label="Pandoku"
          className="font-display text-[clamp(38px,6.2dvh,58px)] leading-none font-black tracking-tight select-none inline-flex items-center"
          style={{
            filter: 'drop-shadow(0 4px 0 rgba(255, 255, 255, 0.96)) drop-shadow(0 8px 16px rgba(20, 85, 54, 0.2))',
          }}
        >
          <span className="text-[#193024]">Pand</span>
          <span
            aria-hidden="true"
            className="relative inline-flex items-center justify-center mx-[1px] -translate-y-[1px]"
            style={{ width: '0.92em', height: '0.92em' }}
          >
            {/* Cute Panda Head forming the 'o' of Pandoku */}
            <svg viewBox="0 0 64 64" className="w-full h-full overflow-visible">
              {/* Tiny bamboo sprout peeking from top */}
              <path
                d="M32 10 C32 4, 38 2, 42 5 C39 9, 35 10, 32 10 Z"
                fill="#2F9D66"
              />
              <path
                d="M32 10 C31 5, 25 3, 22 6 C25 10, 29 10, 32 10 Z"
                fill="#4EC485"
              />
              {/* Round dark panda ears */}
              <circle cx="13" cy="17" r="10.5" fill="#193024" />
              <circle cx="13.5" cy="17.5" r="5" fill="#3B4741" />
              <circle cx="51" cy="17" r="10.5" fill="#193024" />
              <circle cx="50.5" cy="17.5" r="5" fill="#3B4741" />
              {/* Outer ring / round panda head acting as the letter O */}
              <circle
                cx="32"
                cy="35"
                r="24.5"
                fill="#FFFFFF"
                stroke="#193024"
                strokeWidth="4.5"
              />
              {/* Tilted cute eye patches */}
              <ellipse
                cx="22"
                cy="34"
                rx="6.2"
                ry="7.8"
                transform="rotate(-16 22 34)"
                fill="#193024"
              />
              <ellipse
                cx="42"
                cy="34"
                rx="6.2"
                ry="7.8"
                transform="rotate(16 42 34)"
                fill="#193024"
              />
              {/* Sparkling eyes */}
              <circle cx="23" cy="33" r="2.4" fill="#FFFFFF" />
              <circle cx="41" cy="33" r="2.4" fill="#FFFFFF" />
              {/* Tiny button nose + happy :3 smile */}
              <ellipse cx="32" cy="40.5" rx="3.8" ry="2.5" fill="#193024" />
              <path
                d="M27.5 44.5 Q30 47.5 32 44.5 Q34 47.5 36.5 44.5"
                fill="none"
                stroke="#193024"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="text-[#198E51]">ku</span>
        </h1>
      </motion.div>

      {/* Center Stage: Three.js 3D Talking-Tom Panda (Flexes cleanly across all mobile heights) */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center">
        <InteractivePanda
          equippedAccessories={equippedAccessories}
          homeTricks={homeTricks}
          onOpenStudio={onOpenStudio}
          onCheatUnlockAll={onCheatUnlockAll}
          unlockedCount={unlockedCount}
        />
      </div>

      {/* Natural Bottom Thumb Zone: 2 Big Juicy Sculpted Toy Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, type: 'spring', stiffness: 360, damping: 28 }}
        className="relative z-10 shrink-0 space-y-2 pt-1"
      >
        <GameButton
          variant="emerald"
          size="lg"
          fullWidth
          bgMotif={<AnimatedAdventureIcon className="w-14 h-14 min-[400px]:w-16 min-[400px]:h-16" />}
          className="min-h-[clamp(48px,6.8dvh,58px)]"
          onClick={() => {
            soundFx.buttonTap();
            onOpenSoloHub();
          }}
        >
          <span
            className="font-display text-[clamp(17px,2.4dvh,20px)] tracking-wide"
            style={{ textShadow: '0 2px 0 rgba(10, 65, 34, 0.35)' }}
          >
            Single Player
          </span>
        </GameButton>

        <GameButton
          variant="amber"
          size="lg"
          fullWidth
          bgMotif={<AnimatedDuelIcon className="w-14 h-14 min-[400px]:w-16 min-[400px]:h-16" />}
          className="min-h-[clamp(48px,6.8dvh,58px)]"
          onClick={() => {
            soundFx.buttonTap();
            onOpenDuelMenu();
          }}
        >
          <span
            className="font-display text-[clamp(16px,2.3dvh,19px)] tracking-wide"
            style={{ textShadow: '0 2px 0 rgba(135, 65, 0, 0.35)' }}
          >
            Play 1v1 Duel
          </span>
        </GameButton>
      </motion.div>
    </div>
  );
}
