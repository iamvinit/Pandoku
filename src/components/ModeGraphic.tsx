import React from 'react';
import { motion } from 'motion/react';
import { ColorMode } from '../shared/types';

/**
 * Kid-friendly, bright visual Easy vs Hard graphic icon:
 * - Easy ('connected'): 2×2 connected bright emerald puzzle blocks + tiny sprout
 * - Hard ('scattered'): 2×2 colorful split/scattered blocks + bright lightning spark
 */
export function ModeIconGraphic({
  mode,
  className = 'w-6 h-6',
}: {
  mode: ColorMode;
  className?: string;
}) {
  if (mode === 'connected') {
    return (
      <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
        {/* Connected joined emerald-mint tile cluster */}
        <rect x="4" y="8" width="28" height="24" rx="7" fill="#18A360" stroke="#0E6B3E" strokeWidth="2.2" />
        {/* Soft inner quadrant guides showing grouped blocks */}
        <line x1="18" y1="9.5" x2="18" y2="30.5" stroke="#8CF0BE" strokeWidth="1.8" strokeOpacity="0.65" />
        <line x1="5.5" y1="20" x2="30.5" y2="20" stroke="#8CF0BE" strokeWidth="1.8" strokeOpacity="0.65" />
        {/* Glossy highlight */}
        <rect x="7" y="10.5" width="9" height="4" rx="2" fill="#B9FAD8" opacity="0.7" />
        {/* Happy little bamboo sprout on top */}
        <path d="M18 8 C18 3.5, 23 2, 26 4.5 C23.5 7.5, 20.5 8, 18 8 Z" fill="#4CE08A" stroke="#0E6B3E" strokeWidth="1.3" />
        <path d="M18 8 C17.5 4, 13 2.5, 10.5 5 C13 7.8, 15.8 8, 18 8 Z" fill="#2DC472" stroke="#0E6B3E" strokeWidth="1.3" />
        {/* Tiny smiling center star */}
        <circle cx="18" cy="20" r="3.4" fill="#FFF7D6" stroke="#0E6B3E" strokeWidth="1.3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
      {/* 4 bright scattered/split puzzle tiles */}
      <rect x="3" y="6" width="12.5" height="12.5" rx="3.5" fill="#FF6B57" stroke="#9E2516" strokeWidth="1.9" />
      <rect x="20.5" y="4" width="12.5" height="12.5" rx="3.5" fill="#FFB703" stroke="#9A5B00" strokeWidth="1.9" />
      <rect x="4" y="21" width="12.5" height="12.5" rx="3.5" fill="#7C5CFF" stroke="#4228A6" strokeWidth="1.9" />
      <rect x="19.5" y="20" width="12.5" height="12.5" rx="3.5" fill="#FF6B57" stroke="#9E2516" strokeWidth="1.9" />
      {/* Bright golden lightning spark in center showing extra challenge */}
      <path
        d="M20.2 9.5 L13.5 19 H18.2 L16.2 27.5 L23.5 17.5 H18.8 Z"
        fill="#FFE652"
        stroke="#7A3E00"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Bright, child-friendly Easy / Hard visual tag combining the playful graphic + clear bold label
 */
export function ModeGraphicBadge({
  mode,
  size = 'sm',
  inverted = false,
}: {
  mode: ColorMode;
  size?: 'xs' | 'sm' | 'md';
  inverted?: boolean;
}) {
  const isEasy = mode === 'connected';
  const iconSize = size === 'xs' ? 'w-4 h-4' : size === 'md' ? 'w-6 h-6' : 'w-5 h-5';
  const textSize = size === 'xs' ? 'text-[11px]' : size === 'md' ? 'text-sm' : 'text-xs';
  const pad = size === 'xs' ? 'px-1.5 py-0.5 gap-1' : size === 'md' ? 'px-3 py-1.5 gap-2' : 'px-2 py-0.5 gap-1.5';

  const colorClasses = inverted
    ? isEasy
      ? 'bg-[#18A360] text-white border-[#0E6B3E]'
      : 'bg-[#E8533F] text-white border-[#9E2516]'
    : isEasy
      ? 'bg-[#E5FAEE] text-[#0D6B3C] border-[#7EDBA8]'
      : 'bg-[#FFF0EC] text-[#B8321F] border-[#F9AD9E]';

  return (
    <span
      className={`inline-flex items-center ${pad} rounded-xl border-2 font-extrabold tracking-tight leading-none whitespace-nowrap shadow-2xs ${colorClasses}`}
    >
      <ModeIconGraphic mode={mode} className={`${iconSize} shrink-0`} />
      <span className={textSize}>{isEasy ? 'Easy' : 'Hard'}</span>
    </span>
  );
}

/**
 * Animated Full-Body Chibi Panda Mascot for the Campaign Adventure Track!
 * Matches the Home page 3D Panda: plush white tummy, dark shoulder band,
 * cute green bamboo sprout on top of head, round floppy ears, adorable kawaii
 * blinking button eyes, rosy cheeks, waving arms & hopping feet with pink paw pads.
 */
export function AnimatedTrackPanda({
  className = 'w-14 h-16',
  accentColor = '#1B7A4E',
}: {
  className?: string;
  accentColor?: string;
}) {
  return (
    <motion.div
      className={`relative flex flex-col items-center justify-end select-none ${className}`}
      animate={{ y: [0, -7, 0] }}
      transition={{ duration: 1.45, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* Soft ground shadow pulsing subtly as the panda hops */}
      <motion.div
        animate={{ scale: [1, 0.72, 1], opacity: [0.34, 0.18, 0.34] }}
        transition={{ duration: 1.45, repeat: Infinity, ease: 'easeInOut' }}
        className="w-9 h-2.5 rounded-full bg-[#143022] blur-[1px] absolute bottom-0"
      />

      <motion.svg
        viewBox="0 0 88 98"
        className="w-full h-full overflow-visible relative z-10 drop-shadow-[0_4px_6px_rgba(20,45,30,0.28)]"
        animate={{ rotate: [-3.5, 3.5, -3.5] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Left & Right Hopping Feet with Cute Pink Paw Beans */}
        <motion.g
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 0.72, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ellipse cx="30" cy="83" rx="10.5" ry="7.5" fill="#1B2124" />
          <ellipse cx="30" cy="84" rx="5" ry="3.5" fill="#F9B4C4" />
          <circle cx="25.5" cy="80.5" r="1.7" fill="#F9B4C4" />
          <circle cx="30" cy="79.5" r="1.7" fill="#F9B4C4" />
          <circle cx="34.5" cy="80.5" r="1.7" fill="#F9B4C4" />
        </motion.g>
        <motion.g
          animate={{ y: [-3, 0, -3] }}
          transition={{ duration: 0.72, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ellipse cx="58" cy="83" rx="10.5" ry="7.5" fill="#1B2124" />
          <ellipse cx="58" cy="84" rx="5" ry="3.5" fill="#F9B4C4" />
          <circle cx="53.5" cy="80.5" r="1.7" fill="#F9B4C4" />
          <circle cx="58" cy="79.5" r="1.7" fill="#F9B4C4" />
          <circle cx="62.5" cy="80.5" r="1.7" fill="#F9B4C4" />
        </motion.g>

        {/* Waving Left Arm */}
        <motion.g
          style={{ transformOrigin: '26px 59px' }}
          animate={{ rotate: [12, -26, 12] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ellipse cx="18" cy="60" rx="10" ry="6.5" transform="rotate(-24 18 60)" fill="#1B2124" />
          <circle cx="12.5" cy="57.5" r="3.2" fill="#F9B4C4" />
        </motion.g>

        {/* Waving Right Arm */}
        <motion.g
          style={{ transformOrigin: '62px 59px' }}
          animate={{ rotate: [-12, 28, -12] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay: 0.25 }}
        >
          <ellipse cx="70" cy="58" rx="10" ry="6.5" transform="rotate(28 70 58)" fill="#1B2124" />
          <circle cx="75.5" cy="55" r="3.2" fill="#F9B4C4" />
        </motion.g>

        {/* Plump Plush White Tummy */}
        <ellipse
          cx="44"
          cy="68"
          rx="21"
          ry="18"
          fill="#FFFFFF"
          stroke="#1B2124"
          strokeWidth="3.2"
        />
        {/* Soft Tummy Shading */}
        <ellipse cx="44" cy="72" rx="13" ry="9" fill="#F3F7F4" />

        {/* Classic Dark Panda Shoulder Band + Tiny Scarf Accent */}
        <path
          d="M25 58 Q44 65 63 58 Q61 52 44 52 Q27 52 25 58 Z"
          fill="#1B2124"
        />
        <path
          d="M31 56 Q44 62 57 56"
          fill="none"
          stroke={accentColor}
          strokeWidth="3.2"
          strokeLinecap="round"
        />

        {/* Animated Head Group (gentle happy bob + ear wiggle) */}
        <motion.g
          style={{ transformOrigin: '44px 42px' }}
          animate={{ rotate: [2, -2, 2] }}
          transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Cute Bamboo Sprout on top of head (matching Home 3D Panda!) */}
          <motion.g
            style={{ transformOrigin: '44px 12px' }}
            animate={{ rotate: [-8, 10, -8] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <path
              d="M44 13 C44 5, 53 2, 58 6.5 C54 11.5, 48.5 13, 44 13 Z"
              fill="#2F9D66"
              stroke="#145536"
              strokeWidth="1.6"
            />
            <path
              d="M44 13 C43 6, 35 3, 30.5 7.5 C34.5 12, 39.5 13, 44 13 Z"
              fill="#4EC485"
              stroke="#145536"
              strokeWidth="1.6"
            />
          </motion.g>

          {/* Fluffy Round Ears */}
          <circle cx="21" cy="20" r="10.5" fill="#1B2124" />
          <circle cx="21.5" cy="20.5" r="5" fill="#465056" />
          <circle cx="67" cy="20" r="10.5" fill="#1B2124" />
          <circle cx="66.5" cy="20.5" r="5" fill="#465056" />

          {/* Round Chubby Plush Head */}
          <ellipse
            cx="44"
            cy="37"
            rx="26.5"
            ry="23.5"
            fill="#FFFFFF"
            stroke="#1B2124"
            strokeWidth="3.4"
          />

          {/* Soft Baby-Panda Tilted Eye Patches */}
          <ellipse
            cx="32"
            cy="36.5"
            rx="7.5"
            ry="9.2"
            transform="rotate(14 32 36.5)"
            fill="#1B2124"
          />
          <ellipse
            cx="56"
            cy="36.5"
            rx="7.5"
            ry="9.2"
            transform="rotate(-14 56 36.5)"
            fill="#1B2124"
          />

          {/* Cute Soft Blinking Eyes (gentle friendly beads, no big creepy anime eyes) */}
          <motion.g
            style={{ transformOrigin: '44px 36px' }}
            animate={{ scaleY: [1, 1, 1, 0.1, 1, 1] }}
            transition={{ duration: 3.2, repeat: Infinity, times: [0, 0.72, 0.76, 0.8, 0.85, 1] }}
          >
            {/* Friendly cute smiling eye arcs */}
            <path
              d="M28.5 36.5 Q32.5 31.8 36.5 36.5"
              fill="none"
              stroke="#FFF8EA"
              strokeWidth="3.1"
              strokeLinecap="round"
            />
            <path
              d="M51.5 36.5 Q55.5 31.8 59.5 36.5"
              fill="none"
              stroke="#FFF8EA"
              strokeWidth="3.1"
              strokeLinecap="round"
            />
          </motion.g>

          {/* Tiny Button Nose + Happy ':3' Smile */}
          <ellipse cx="44" cy="42.5" rx="4.2" ry="2.7" fill="#1B2124" />
          <path
            d="M38.5 47 Q41.3 50.5 44 47 Q46.7 50.5 49.5 47"
            fill="none"
            stroke="#1B2124"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.g>
      </motion.svg>
    </motion.div>
  );
}
