import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

export type BoardReactionKind = 'idle' | 'cross' | 'panda' | 'mistake' | 'undo' | 'solved';

export interface BoardReaction {
  kind: BoardReactionKind;
  seq: number;
}

interface BoardBuddyPandaProps {
  reaction: BoardReaction;
  urgent?: boolean;
  sizeClass?: string;
}

export function BoardBuddyPanda({
  reaction,
  urgent = false,
  sizeClass = 'w-11 h-11',
}: BoardBuddyPandaProps) {
  const [activeMood, setActiveMood] = useState<BoardReactionKind>('idle');
  const [isBlinking, setIsBlinking] = useState<boolean>(false);

  // Trigger transient animation mood on each board event, then return cleanly to idle (or stay happy if solved)
  useEffect(() => {
    if (reaction.seq === 0 || reaction.kind === 'idle') {
      setActiveMood('idle');
      return;
    }
    setActiveMood(reaction.kind);
    if (reaction.kind === 'solved') return;

    const duration =
      reaction.kind === 'mistake' ? 880 : reaction.kind === 'panda' ? 760 : 480;
    const timer = window.setTimeout(() => {
      setActiveMood('idle');
    }, duration);
    return () => window.clearTimeout(timer);
  }, [reaction.kind, reaction.seq]);

  // Gentle natural idle blink every ~3.4s
  useEffect(() => {
    if (activeMood !== 'idle') {
      setIsBlinking(false);
      return;
    }
    const interval = window.setInterval(() => {
      setIsBlinking(true);
      window.setTimeout(() => setIsBlinking(false), 140);
    }, 3400);
    return () => window.clearInterval(interval);
  }, [activeMood]);

  // Expressive body motion variants per reaction (smooth, zero jitter!)
  const bodyAnimate =
    activeMood === 'panda'
      ? { y: [0, -7, 0], scale: [1, 1.12, 1], rotate: [0, -6, 6, 0] }
      : activeMood === 'cross'
        ? { y: [0, 2, 0], scale: [1, 0.94, 1.03, 1], rotate: [0, 8, 0] }
        : activeMood === 'mistake'
          ? { x: [0, -5, 5, -4, 3, 0], y: [0, -2, 0], rotate: [0, -10, 10, -6, 0] }
          : activeMood === 'undo'
            ? { rotate: [0, -14, 0], scale: [1, 0.94, 1] }
            : activeMood === 'solved'
              ? { y: [0, -8, 0, -5, 0], scale: [1, 1.12, 1, 1.08, 1], rotate: [0, -8, 8, 0] }
              : { x: 0, y: 0, scale: 1, rotate: 0 };

  const bodyTransition =
    activeMood === 'solved'
      ? { duration: 1.1, ease: 'easeInOut' as const, repeat: 2 }
      : { duration: activeMood === 'mistake' ? 0.45 : 0.38, ease: 'easeOut' as const };

  const isHappy = activeMood === 'panda' || activeMood === 'solved';
  const isMistake = activeMood === 'mistake';
  const isCross = activeMood === 'cross';
  const isWorried = urgent && activeMood === 'idle';

  const earFill = isMistake ? '#991B1B' : '#18201C';

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${sizeClass}`}
      aria-hidden="true"
    >
      {/* Floating micro reaction indicator above the buddy panda */}
      <AnimatePresence>
        {activeMood !== 'idle' && (
          <motion.span
            key={`${activeMood}-${reaction.seq}`}
            initial={{ opacity: 0, y: 4, scale: 0.5 }}
            animate={{ opacity: [0, 1, 1, 0], y: -14, scale: [0.6, 1.1, 0.95] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            className={`absolute -top-1.5 -right-1 pointer-events-none font-bold text-[11px] leading-none px-1 py-0.5 rounded-md shadow-xs z-10 ${
              isMistake
                ? 'bg-[#FEE2E2] text-[#B91C1C]'
                : isHappy
                  ? 'bg-[#DCFCE7] text-[#15803D]'
                  : 'bg-[#EEF2EE] text-[#18201C]'
            }`}
          >
            {isMistake ? '!' : isHappy ? '★' : isCross ? '×' : '↺'}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Cute Animated SVG Panda Buddy */}
      <motion.svg
        key={`panda-pose-${activeMood}-${reaction.seq}`}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
        animate={bodyAnimate}
        transition={bodyTransition}
      >
        {/* Tiny Bamboo Leaf Sprout on Head */}
        <path
          d="M32 13 C33 7 39 5 42 7 C40 11 35 13 32 13 Z"
          fill="#2F9D66"
        />
        <path
          d="M32 13 C30 8 25 6 22 8 C24 12 29 13 32 13 Z"
          fill="#48B97E"
        />

        {/* Ears */}
        <circle cx="15" cy="19" r="8.5" fill={earFill} />
        <circle cx="49" cy="19" r="8.5" fill={earFill} />
        <circle cx="16" cy="20" r="3.2" fill={isMistake ? '#DC2626' : '#35453D'} />
        <circle cx="48" cy="20" r="3.2" fill={isMistake ? '#DC2626' : '#35453D'} />

        {/* Round Head */}
        <ellipse
          cx="32"
          cy="36"
          rx="22.5"
          ry="20"
          fill="#FFFFFF"
          stroke={isMistake ? '#B91C1C' : '#18201C'}
          strokeWidth="3"
        />

        {/* Eye Patches */}
        <ellipse
          cx="22"
          cy="35"
          rx="6"
          ry="7.4"
          transform="rotate(14 22 35)"
          fill={earFill}
        />
        <ellipse
          cx="42"
          cy="35"
          rx="6"
          ry="7.4"
          transform="rotate(-14 42 35)"
          fill={earFill}
        />

        {/* Expressive Eyes */}
        {isHappy ? (
          <>
            <path
              d="M19 35.5 Q22.2 31.5 25.4 35.5"
              stroke="#FFFFFF"
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M38.6 35.5 Q41.8 31.5 45 35.5"
              stroke="#FFFFFF"
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
            />
          </>
        ) : isMistake ? (
          <>
            <path
              d="M19.5 32.5 L24.5 37.5 M24.5 32.5 L19.5 37.5"
              stroke="#FFFFFF"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M39.5 32.5 L44.5 37.5 M44.5 32.5 L39.5 37.5"
              stroke="#FFFFFF"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </>
        ) : isCross ? (
          <>
            {/* Focused cheeky wink when placing a cross */}
            <circle cx="22.6" cy="34.2" r="2.2" fill="#FFFFFF" />
            <path
              d="M39 35 Q42 32.5 45 35"
              stroke="#FFFFFF"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </>
        ) : isBlinking ? (
          <>
            <line x1="19.5" y1="35" x2="25" y2="35" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="39" y1="35" x2="44.5" y2="35" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="22.8" cy={isWorried ? 33.4 : 34} r={isWorried ? 2.6 : 2.3} fill="#FFFFFF" />
            <circle cx="41.2" cy={isWorried ? 33.4 : 34} r={isWorried ? 2.6 : 2.3} fill="#FFFFFF" />
            <circle cx="23.5" cy="33.4" r="0.9" fill="#18201C" />
            <circle cx="40.5" cy="33.4" r="0.9" fill="#18201C" />
          </>
        )}

        {/* Sweat drop on Mistake or Sprint Urgency */}
        {(isMistake || isWorried) && (
          <path
            d="M52 24 C54 27 55 29.5 52 31.2 C49 29.5 50 27 52 24 Z"
            fill="#60A5FA"
            stroke="#2563EB"
            strokeWidth="1"
          />
        )}

        {/* Nose */}
        <ellipse cx="32" cy="40.8" rx="4" ry="2.7" fill={earFill} />

        {/* Expressive Mouth */}
        {isMistake ? (
          <ellipse cx="32" cy="47.2" rx="3.4" ry="3" fill="#991B1B" />
        ) : isHappy ? (
          <path
            d="M26.5 45.2 C28.5 49.5 35.5 49.5 37.5 45.2 Z"
            fill="#F48DA2"
            stroke="#18201C"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        ) : isWorried ? (
          <path
            d="M27.5 47.4 Q32 44.5 36.5 47.4"
            stroke="#18201C"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        ) : (
          <path
            d="M27 45.6 C28.8 47.8 31.2 47.8 32 46 C32.8 47.8 35.2 47.8 37 45.6"
            stroke="#18201C"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Little Cheering Paws when Placing Panda / Solved */}
        {isHappy && (
          <>
            <ellipse
              cx="9"
              cy="47"
              rx="5.5"
              ry="4.2"
              transform="rotate(-25 9 47)"
              fill="#18201C"
            />
            <ellipse
              cx="55"
              cy="47"
              rx="5.5"
              ry="4.2"
              transform="rotate(25 55 47)"
              fill="#18201C"
            />
          </>
        )}
      </motion.svg>
    </div>
  );
}
