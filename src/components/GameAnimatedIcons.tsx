import React from 'react';
import { motion } from 'motion/react';

// ============================================================================
// STANDARDIZED TACTILE KID-FRIENDLY GAME BUTTON
// ============================================================================
export type GameButtonVariant =
  | 'emerald'
  | 'amber'
  | 'cream'
  | 'white'
  | 'violet'
  | 'sky'
  | 'slate';

export type GameButtonSize = 'sm' | 'md' | 'lg';

interface GameButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  variant?: GameButtonVariant;
  size?: GameButtonSize;
  fullWidth?: boolean;
  /** Optional leading icon aligned cleanly beside label */
  icon?: React.ReactNode;
  /** Optional decorative animated motif rendered as a soft background graphic */
  bgMotif?: React.ReactNode;
  /** Text alignment inside the button */
  align?: 'center' | 'left';
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
  title?: string;
}

const VARIANT_CLASSES: Record<GameButtonVariant, string> = {
  emerald:
    'text-white bg-gradient-to-b from-[#34C776] via-[#20A55E] to-[#158348] shadow-[0_5px_0_#0D5C31,0_10px_22px_rgba(21,131,72,0.28),inset_0_2px_0_rgba(255,255,255,0.4)] active:shadow-[0_2px_0_#0D5C31,0_4px_10px_rgba(21,131,72,0.22)]',
  amber:
    'text-white bg-gradient-to-b from-[#FFC43D] via-[#F29D12] to-[#DA7D04] shadow-[0_5px_0_#A15600,0_10px_22px_rgba(218,125,4,0.28),inset_0_2px_0_rgba(255,255,255,0.45)] active:shadow-[0_2px_0_#A15600,0_4px_10px_rgba(218,125,4,0.22)]',
  cream:
    'text-[#5D3703] bg-gradient-to-b from-[#FFFDF2] via-[#FFF1C4] to-[#FDE092] shadow-[0_5px_0_#DCA847,0_10px_20px_rgba(196,138,28,0.18),inset_0_2px_0_rgba(255,255,255,0.9)] active:shadow-[0_2px_0_#DCA847,0_4px_8px_rgba(196,138,28,0.15)]',
  white:
    'text-[#1A3326] bg-gradient-to-b from-[#FFFFFF] via-[#F8FCF9] to-[#EAF4EE] shadow-[0_4px_0_#BFD5C6,0_8px_18px_rgba(24,58,38,0.1),inset_0_2px_0_rgba(255,255,255,0.95)] active:shadow-[0_1.5px_0_#BFD5C6,0_3px_8px_rgba(24,58,38,0.08)]',
  violet:
    'text-white bg-gradient-to-b from-[#A78BFA] via-[#835CF2] to-[#693CD9] shadow-[0_5px_0_#4923A6,0_10px_20px_rgba(105,60,217,0.25),inset_0_2px_0_rgba(255,255,255,0.38)] active:shadow-[0_2px_0_#4923A6,0_4px_8px_rgba(105,60,217,0.2)]',
  sky:
    'text-white bg-gradient-to-b from-[#55C7FF] via-[#2AA3F0] to-[#1782CE] shadow-[0_5px_0_#0D5C99,0_10px_20px_rgba(23,130,206,0.25),inset_0_2px_0_rgba(255,255,255,0.4)] active:shadow-[0_2px_0_#0D5C99,0_4px_8px_rgba(23,130,206,0.2)]',
  slate:
    'text-white bg-gradient-to-b from-[#33463C] to-[#1B2821] shadow-[0_5px_0_#0B120E,0_10px_20px_rgba(21,36,28,0.24),inset_0_2px_0_rgba(255,255,255,0.22)] active:shadow-[0_2px_0_#0B120E]',
};

const SIZE_CLASSES: Record<GameButtonSize, string> = {
  sm: 'min-h-[44px] px-4 text-xs rounded-[18px] gap-2',
  md: 'min-h-[52px] px-4.5 text-sm rounded-[22px] gap-2.5',
  lg: 'min-h-[58px] px-5 text-base rounded-[24px] gap-2.5',
};

export function GameButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
  variant = 'emerald',
  size = 'md',
  fullWidth = false,
  icon,
  bgMotif,
  align = 'center',
  className = '',
  style,
  ariaLabel,
  title,
}: GameButtonProps) {
  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      whileHover={disabled ? undefined : { y: -1.5, scale: 1.018 }}
      whileTap={disabled ? undefined : { y: 3, scale: 0.965 }}
      transition={{ type: 'spring', stiffness: 520, damping: 24 }}
      style={style}
      className={`relative overflow-hidden inline-flex items-center font-extrabold tracking-tight select-none cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B7A4E] ${
        align === 'left' ? 'justify-start text-left' : 'justify-center text-center'
      } ${fullWidth ? 'w-full' : ''} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
    >
      {/* Plump glossy candy highlight curve along top */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-3 top-[3px] h-[34%] rounded-full bg-white/25"
      />
      {/* Optional Background Icon Motif tucked softly in the right corner */}
      {bgMotif && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-2 -bottom-2.5 opacity-28 rotate-[-10deg] scale-105 select-none"
        >
          {bgMotif}
        </span>
      )}
      <span
        className={`relative z-10 inline-flex items-center gap-2 min-w-0 ${
          align === 'left' ? 'justify-start pr-5' : 'justify-center'
        }`}
      >
        {icon && <span className="shrink-0 inline-flex items-center">{icon}</span>}
        {children}
      </span>
    </motion.button>
  );
}

// ============================================================================
// ANIMATED CAMPAIGN THEME ICONS (Unique for all 4 Worlds!)
// ============================================================================
export function AnimatedCampaignIcon({
  id,
  className = 'w-7 h-7',
}: {
  id: 1 | 2 | 3 | 4;
  className?: string;
}) {
  if (id === 1) {
    // 1. Bamboo Meadow: Swaying twin emerald bamboo shoots + floating leaf
    return (
      <svg viewBox="0 0 36 36" fill="none" className={`${className} shrink-0 overflow-visible`} aria-hidden="true">
        <circle cx="18" cy="18" r="16" fill="#E3F8EA" stroke="#229C5F" strokeWidth="2.2" />
        <ellipse cx="18" cy="29.5" rx="10" ry="3.2" fill="#8BE0AE" />
        <motion.g
          style={{ transformOrigin: '14px 29px' }}
          animate={{ rotate: [-5, 5, -5] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <rect x="11.5" y="10" width="4.6" height="19" rx="2.2" fill="#21A55E" stroke="#115532" strokeWidth="1.5" />
          <line x1="11" y1="16.5" x2="16.6" y2="16.5" stroke="#115532" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="11" y1="22.5" x2="16.6" y2="22.5" stroke="#115532" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M11.5 12 C7 9.5, 6 6.5, 9 6 C11 6.8, 12 9.5, 11.5 12 Z" fill="#47DB85" stroke="#115532" strokeWidth="1.2" />
        </motion.g>
        <motion.g
          style={{ transformOrigin: '22px 29px' }}
          animate={{ rotate: [5, -5, 5] }}
          transition={{ duration: 2.9, repeat: Infinity, ease: 'easeInOut' }}
        >
          <rect x="19.5" y="13.5" width="4.6" height="15.5" rx="2.2" fill="#32C474" stroke="#115532" strokeWidth="1.5" />
          <line x1="19" y1="20" x2="24.6" y2="20" stroke="#115532" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M24 14.5 C28 11.5, 30 12.5, 29 15.5 C27.2 17, 25 16.2, 24 14.5 Z" fill="#5CE897" stroke="#115532" strokeWidth="1.2" />
        </motion.g>
      </svg>
    );
  }

  if (id === 2) {
    // 2. Amber Canyon: Glowing rising sun with rotating rays over warm mesa arches
    return (
      <svg viewBox="0 0 36 36" fill="none" className={`${className} shrink-0 overflow-visible`} aria-hidden="true">
        <circle cx="18" cy="18" r="16" fill="#FFF3D6" stroke="#D9820B" strokeWidth="2.2" />
        {/* Rotating glowing sun */}
        <motion.g
          style={{ transformOrigin: '18px 14px' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
        >
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <line
              key={deg}
              x1="18"
              y1="6.2"
              x2="18"
              y2="8.4"
              stroke="#F59E0B"
              strokeWidth="2"
              strokeLinecap="round"
              transform={`rotate(${deg} 18 14)`}
            />
          ))}
        </motion.g>
        <motion.circle
          cx="18"
          cy="14"
          r="4.5"
          fill="#FFD037"
          stroke="#C26A04"
          strokeWidth="1.5"
          animate={{ scale: [1, 1.09, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '18px 14px' }}
        />
        {/* Warm canyon mesas */}
        <path
          d="M4.5 24 L9.5 18.5 H14 L16 23 H21 L23.5 17 H27.5 L31.5 24 C29 29.5 24 32.5 18 32.5 C12 32.5 7 29.5 4.5 24 Z"
          fill="#E07A22"
          stroke="#8F4308"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M9.5 26 Q18 23 26.5 26" stroke="#F8B45A" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (id === 3) {
    // 3. Jade Valley: Shimmering turquoise waterfall & gentle rippling waves
    return (
      <svg viewBox="0 0 36 36" fill="none" className={`${className} shrink-0 overflow-visible`} aria-hidden="true">
        <circle cx="18" cy="18" r="16" fill="#E0F8F5" stroke="#0E857B" strokeWidth="2.2" />
        {/* Jade hills */}
        <path d="M4.5 22 Q11 12 18 20 Q25 12 31.5 22 L31.5 25 H4.5 Z" fill="#1FA89A" />
        {/* Sparkling waterfall stream */}
        <motion.rect
          x="15.2"
          y="14"
          width="5.6"
          height="11"
          rx="2.6"
          fill="#7CEEE8"
          animate={{ opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Rippling waves */}
        <motion.path
          d="M6.5 25 Q12 22.5 18 25 Q24 27.5 29.5 25"
          stroke="#0B6D65"
          strokeWidth="2.3"
          strokeLinecap="round"
          animate={{ x: [-1.8, 1.8, -1.8] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.path
          d="M9.5 29 Q14 27 18 29 Q22 31 26.5 29"
          stroke="#26C4B8"
          strokeWidth="2.1"
          strokeLinecap="round"
          animate={{ x: [1.8, -1.8, 1.8] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </svg>
    );
  }

  // 4. Misty Peaks: Snowy alpine peak with drifting cloud & twinkling star
  return (
    <svg viewBox="0 0 36 36" fill="none" className={`${className} shrink-0 overflow-visible`} aria-hidden="true">
      <circle cx="18" cy="18" r="16" fill="#ECEFFF" stroke="#4D52C7" strokeWidth="2.2" />
      {/* Twinkling alpine star */}
      <motion.path
        d="M26 7 L27 9.5 L29.5 10.5 L27 11.5 L26 14 L25 11.5 L22.5 10.5 L25 9.5 Z"
        fill="#FFD23F"
        animate={{ scale: [0.75, 1.2, 0.75], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '26px 10.5px' }}
      />
      {/* Mountain peak + snowcap */}
      <path
        d="M6 27.5 L16.5 10.5 L27.5 27.5 Z"
        fill="#6A72DB"
        stroke="#2F3387"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M16.5 10.5 L20.2 16.5 L17.6 15.3 L16.5 17 L14.8 15.2 L12.8 16.5 Z" fill="#FFFFFF" />
      {/* Drifting soft cloud */}
      <motion.g
        animate={{ x: [-2.2, 2.6, -2.2] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path
          d="M14 27 H26.5 C28.5 27 29.8 25.6 29.8 24 C29.8 22.3 28.4 21 26.7 21 C26.3 19.2 24.7 18 22.8 18 C20.8 18 19.2 19.3 18.8 21.1 C17.9 20.8 16.7 21.2 16.1 22 C14.5 22.2 13.4 23.4 13.4 24.8 C13.4 26 14 27 14 27 Z"
          fill="#FFFFFF"
          stroke="#4D52C7"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </motion.g>
    </svg>
  );
}

// ============================================================================
// ANIMATED LEVEL ICONS (Unique joyful nature/adventure icons per stage!)
// ============================================================================
export function AnimatedLevelIcon({
  world,
  stageNumber,
  className = 'w-6 h-6',
}: {
  world: 1 | 2 | 3 | 4;
  stageNumber: number;
  className?: string;
}) {
  // 10 distinct cheerful stage silhouettes colored to match their world
  const palette =
    world === 1
      ? { bg: '#E6F9EE', primary: '#1F9E5B', accent: '#FFD037', stroke: '#105432' }
      : world === 2
        ? { bg: '#FFF3DA', primary: '#DE7F12', accent: '#FFE05C', stroke: '#874505' }
        : world === 3
          ? { bg: '#E1F9F6', primary: '#129A8E', accent: '#6CEEE6', stroke: '#085650' }
          : { bg: '#EEF0FF', primary: '#575CD4', accent: '#FFADD2', stroke: '#2B2F85' };

  const idx = ((stageNumber - 1) % 10) + 1;

  return (
    <svg viewBox="0 0 32 32" fill="none" className={`${className} shrink-0 overflow-visible`} aria-hidden="true">
      <circle cx="16" cy="16" r="14.2" fill={palette.bg} stroke={palette.primary} strokeWidth="2" />

      {idx === 1 && (
        // Sprout / New Trail
        <motion.g
          style={{ transformOrigin: '16px 24px' }}
          animate={{ rotate: [-6, 6, -6] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path d="M16 24 V14" stroke={palette.stroke} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M16 15 C16 9 22 8 24 11 C22 15 18 16 16 15 Z" fill={palette.primary} stroke={palette.stroke} strokeWidth="1.4" />
          <path d="M16 16 C15 11 10 10 8.5 13 C10.5 16.5 14 17 16 16 Z" fill={palette.accent} stroke={palette.stroke} strokeWidth="1.4" />
        </motion.g>
      )}

      {idx === 2 && (
        // Dewdrop / Stepping Gem
        <motion.g
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path
            d="M16 7 C16 7 23 14.5 23 19 C23 22.8 19.9 25.5 16 25.5 C12.1 25.5 9 22.8 9 19 C9 14.5 16 7 16 7 Z"
            fill={palette.primary}
            stroke={palette.stroke}
            strokeWidth="1.7"
          />
          <circle cx="13.5" cy="18.2" r="2.1" fill="#FFFFFF" opacity="0.85" />
        </motion.g>
      )}

      {idx === 3 && (
        // River Wave / Lotus Petal
        <motion.g
          animate={{ x: [-1.5, 1.5, -1.5] }}
          transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path d="M7 14 Q11.5 10 16 14 Q20.5 18 25 14" stroke={palette.primary} strokeWidth="2.8" strokeLinecap="round" />
          <path d="M7 20 Q11.5 16 16 20 Q20.5 24 25 20" stroke={palette.stroke} strokeWidth="2.4" strokeLinecap="round" />
        </motion.g>
      )}

      {idx === 4 && (
        // Glowing Lantern / Gate
        <motion.g
          style={{ transformOrigin: '16px 8px' }}
          animate={{ rotate: [-7, 7, -7] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <rect x="11" y="10" width="10" height="12" rx="4" fill={palette.accent} stroke={palette.stroke} strokeWidth="1.7" />
          <line x1="12" y1="9" x2="20" y2="9" stroke={palette.stroke} strokeWidth="2.2" strokeLinecap="round" />
          <line x1="12" y1="23" x2="20" y2="23" stroke={palette.stroke} strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="16" cy="16" r="2.4" fill="#FFFFFF" />
        </motion.g>
      )}

      {idx === 5 && (
        // Arch Bridge / Pagoda
        <motion.g
          animate={{ scale: [1, 1.07, 1] }}
          transition={{ duration: 2.3, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '16px 17px' }}
        >
          <path d="M7 21 Q16 10 25 21" stroke={palette.primary} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M9 22 H23" stroke={palette.stroke} strokeWidth="2" strokeLinecap="round" />
          <circle cx="16" cy="11.5" r="2.2" fill={palette.accent} stroke={palette.stroke} strokeWidth="1.2" />
        </motion.g>
      )}

      {idx === 6 && (
        // Radiant Sunburst
        <motion.g
          style={{ transformOrigin: '16px 16px' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        >
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <line
              key={deg}
              x1="16"
              y1="6.5"
              x2="16"
              y2="9.2"
              stroke={palette.primary}
              strokeWidth="2.2"
              strokeLinecap="round"
              transform={`rotate(${deg} 16 16)`}
            />
          ))}
          <circle cx="16" cy="16" r="4.8" fill={palette.accent} stroke={palette.stroke} strokeWidth="1.6" />
        </motion.g>
      )}

      {idx === 7 && (
        // Sparkling Twin Gems / Echo
        <motion.g
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path d="M16 7.5 L22.5 16 L16 24.5 L9.5 16 Z" fill={palette.primary} stroke={palette.stroke} strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M16 11 L19.2 16 L16 21 L12.8 16 Z" fill={palette.accent} />
        </motion.g>
      )}

      {idx === 8 && (
        // Cozy Cup / Cloud Swirl
        <motion.g
          animate={{ rotate: [-5, 5, -5] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '16px 18px' }}
        >
          <path d="M9.5 14 H21.5 V19 C21.5 22.3 18.8 24.5 15.5 24.5 C12.2 24.5 9.5 22.3 9.5 19 Z" fill={palette.primary} stroke={palette.stroke} strokeWidth="1.7" />
          <path d="M21.5 15.5 H23.5 C24.6 15.5 25.2 16.4 25.2 17.5 C25.2 18.6 24.5 19.5 23.3 19.5 H21.5" stroke={palette.stroke} strokeWidth="1.7" />
          <path d="M13.5 10.5 Q14.5 8.5 13.5 7.5" stroke={palette.accent} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M17.5 10.5 Q18.5 8.5 17.5 7.5" stroke={palette.accent} strokeWidth="1.8" strokeLinecap="round" />
        </motion.g>
      )}

      {idx === 9 && (
        // Glowing Shooting Star / Sky Lantern
        <motion.g
          animate={{ scale: [0.9, 1.14, 0.9], rotate: [-8, 8, -8] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '16px 16px' }}
        >
          <path
            d="M16 7.5 L18.6 12.8 L24.5 13.6 L20.2 17.7 L21.2 23.5 L16 20.7 L10.8 23.5 L11.8 17.7 L7.5 13.6 L13.4 12.8 Z"
            fill={palette.accent}
            stroke={palette.stroke}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </motion.g>
      )}

      {idx === 10 && (
        // Grand Finale Crown!
        <motion.g
          animate={{ y: [0, -2, 0], rotate: [-4, 4, -4] }}
          transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '16px 18px' }}
        >
          <path
            d="M8.5 22 L7.5 12 L12.5 16 L16 9.5 L19.5 16 L24.5 12 L23.5 22 Z"
            fill="#FFD037"
            stroke="#8A5200"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="18.2" r="1.8" fill={palette.primary} />
        </motion.g>
      )}
    </svg>
  );
}

// ============================================================================
// PURPOSE-BUILT ANIMATED BUTTON ICONS (Replacing flat generic outlines!)
// ============================================================================

/** Play 1v1 Duel: Clashing crossed bamboo swords with tiny golden spark */
export function AnimatedDuelIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={`${className} shrink-0 overflow-visible`} aria-hidden="true">
      {/* Left sword rocking slightly */}
      <motion.g
        style={{ transformOrigin: '16px 16px' }}
        animate={{ rotate: [-4, 5, -4] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path d="M7 7 L22 22" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M18.5 23.5 L23.5 18.5" stroke="#FFD857" strokeWidth="2.8" strokeLinecap="round" />
        <path d="M22 22 L25.5 25.5" stroke="#92400E" strokeWidth="3" strokeLinecap="round" />
      </motion.g>
      {/* Right sword clashing */}
      <motion.g
        style={{ transformOrigin: '16px 16px' }}
        animate={{ rotate: [4, -5, 4] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path d="M25 7 L10 22" stroke="#E0FFF0" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M8.5 18.5 L13.5 23.5" stroke="#FFD857" strokeWidth="2.8" strokeLinecap="round" />
        <path d="M10 22 L6.5 25.5" stroke="#92400E" strokeWidth="3" strokeLinecap="round" />
      </motion.g>
      {/* Tiny clash spark */}
      <motion.circle
        cx="16"
        cy="13"
        r="2.4"
        fill="#FFE652"
        animate={{ scale: [0.5, 1.35, 0.5], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '16px 13px' }}
      />
    </svg>
  );
}

/** Join Code: Bouncing bright emerald-gold invite key */
export function AnimatedTicketKeyIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 32 32"
      fill="none"
      className={`${className} shrink-0 overflow-visible`}
      animate={{ rotate: [-6, 8, -6] }}
      transition={{ duration: 2.3, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden="true"
    >
      <circle cx="11.5" cy="16" r="6" fill="#3ED480" stroke="#135A36" strokeWidth="2.2" />
      <circle cx="11.5" cy="16" r="2.2" fill="#FFFFFF" />
      <path d="M17.5 16 H27.5" stroke="#135A36" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M23 16 V20.5" stroke="#135A36" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M26.5 16 V19.5" stroke="#135A36" strokeWidth="2.8" strokeLinecap="round" />
    </motion.svg>
  );
}

/** Single Player: Adventure golden compass with gently wiggling needle */
export function AnimatedAdventureIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={`${className} shrink-0 overflow-visible`} aria-hidden="true">
      <circle cx="16" cy="16" r="12.5" fill="#FFD449" stroke="#9E6004" strokeWidth="2.2" />
      <circle cx="16" cy="16" r="9.2" fill="#FFFDF5" />
      <motion.g
        style={{ transformOrigin: '16px 16px' }}
        animate={{ rotate: [-18, 22, -18] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path d="M16 8.2 L19.2 16 L16 14.5 L12.8 16 Z" fill="#EF4444" stroke="#991B1B" strokeWidth="1" strokeLinejoin="round" />
        <path d="M16 23.8 L12.8 16 L16 17.5 L19.2 16 Z" fill="#1B7A4E" stroke="#115032" strokeWidth="1" strokeLinejoin="round" />
      </motion.g>
      <circle cx="16" cy="16" r="1.8" fill="#18201C" />
    </svg>
  );
}

/** Campaigns Tab / Level Map: Waving adventure flag on a bright green hill */
export function AnimatedCampaignMapIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={`${className} shrink-0 overflow-visible`} aria-hidden="true">
      {/* Green hill */}
      <path d="M4 26 Q16 16 28 26 Z" fill="#32C474" stroke="#135A36" strokeWidth="2" strokeLinejoin="round" />
      {/* Flag pole */}
      <line x1="14" y1="7" x2="14" y2="21.5" stroke="#135A36" strokeWidth="2.4" strokeLinecap="round" />
      {/* Waving flag */}
      <motion.path
        d="M14 7.5 C17.5 6.5 21 9.5 25 8 V15.5 C21 17 17.5 14 14 15 Z"
        fill="#F5B014"
        stroke="#9A5C00"
        strokeWidth="1.7"
        strokeLinejoin="round"
        style={{ transformOrigin: '14px 11px' }}
        animate={{ skewY: [-5, 5, -5] }}
        transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
      />
    </svg>
  );
}

/** Daily Challenge Tab: Cheerful rotating sunburst calendar */
export function AnimatedDailySunIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={`${className} shrink-0 overflow-visible`} aria-hidden="true">
      <motion.g
        style={{ transformOrigin: '16px 16px' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
      >
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <line
            key={deg}
            x1="16"
            y1="3.5"
            x2="16"
            y2="6.5"
            stroke="#E5930A"
            strokeWidth="2.4"
            strokeLinecap="round"
            transform={`rotate(${deg} 16 16)`}
          />
        ))}
      </motion.g>
      <motion.circle
        cx="16"
        cy="16"
        r="7.4"
        fill="#FFD449"
        stroke="#B36900"
        strokeWidth="2"
        animate={{ scale: [1, 1.07, 1] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '16px 16px' }}
      />
      <circle cx="13.8" cy="15" r="1.1" fill="#7A4400" />
      <circle cx="18.2" cy="15" r="1.1" fill="#7A4400" />
      <path d="M13.8 18 Q16 20 18.2 18" stroke="#7A4400" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Panda Shop / Wardrobe: Cute animated Panda Dress-Up Bag with Bowtie & Hat (replaces Wand2!) */
export function AnimatedPandaShopIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 32 32"
      fill="none"
      className={`${className} shrink-0 overflow-visible`}
      animate={{ rotate: [-4, 4, -4], y: [0, -1.5, 0] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden="true"
    >
      {/* Bag handle */}
      <path d="M11.5 11.5 V9 C11.5 6.5 13.5 5 16 5 C18.5 5 20.5 6.5 20.5 9 V11.5" stroke="#372B96" strokeWidth="2.3" strokeLinecap="round" />
      {/* Cute rounded shopping tote */}
      <rect x="6.5" y="10.5" width="19" height="16.5" rx="4.5" fill="#7C73F6" stroke="#372B96" strokeWidth="2" />
      {/* Mini Panda face emblem on bag */}
      <circle cx="11.5" cy="15.2" r="2.2" fill="#18201C" />
      <circle cx="20.5" cy="15.2" r="2.2" fill="#18201C" />
      <ellipse cx="16" cy="19.5" rx="5.5" ry="4.5" fill="#FFFFFF" stroke="#18201C" strokeWidth="1.4" />
      <circle cx="14" cy="19" r="1.2" fill="#18201C" />
      <circle cx="18" cy="19" r="1.2" fill="#18201C" />
      {/* Bright red bowtie on the bag! */}
      <path d="M13 24 L16 22.8 L19 24 L16 25.3 Z" fill="#F43F5E" stroke="#9F1239" strokeWidth="1" strokeLinejoin="round" />
    </motion.svg>
  );
}

/** Animations / Tricks Tab: Bouncing golden stage star with motion notes */
export function AnimatedTricksDanceIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={`${className} shrink-0 overflow-visible`} aria-hidden="true">
      <motion.g
        style={{ transformOrigin: '16px 17px' }}
        animate={{ rotate: [-10, 10, -10], scale: [0.95, 1.08, 0.95] }}
        transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path
          d="M16 5.5 L19.2 12.2 L26.5 13.2 L21.2 18.2 L22.5 25.5 L16 22 L9.5 25.5 L10.8 18.2 L5.5 13.2 L12.8 12.2 Z"
          fill="#FFD037"
          stroke="#A66000"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="14" cy="15.5" r="1.2" fill="#7A4400" />
        <circle cx="18" cy="15.5" r="1.2" fill="#7A4400" />
        <path d="M14.2 18.2 Q16 19.8 17.8 18.2" stroke="#7A4400" strokeWidth="1.4" strokeLinecap="round" />
      </motion.g>
    </svg>
  );
}

/** Music Top HUD Button: Bouncing twin emerald music notes */
export function AnimatedMusicIcon({
  active,
  className = 'w-6 h-6',
}: {
  active: boolean;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={`${className} shrink-0 overflow-visible`} aria-hidden="true">
      <motion.g
        animate={active ? { y: [0, -2.2, 0], rotate: [-5, 5, -5] } : { y: 0, rotate: 0 }}
        transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '16px 16px' }}
      >
        <path
          d="M13 21.5 V9.5 L24 7.5 V19"
          stroke={active ? '#14603D' : '#8A9890'}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <ellipse cx="10.2" cy="22" rx="3.5" ry="2.7" fill={active ? '#29B969' : '#B5C2BA'} stroke={active ? '#14603D' : '#8A9890'} strokeWidth="1.8" />
        <ellipse cx="21.2" cy="19.5" rx="3.5" ry="2.7" fill={active ? '#29B969' : '#B5C2BA'} stroke={active ? '#14603D' : '#8A9890'} strokeWidth="1.8" />
      </motion.g>
      {!active && (
        <line x1="6.5" y1="6.5" x2="25.5" y2="25.5" stroke="#D94848" strokeWidth="2.6" strokeLinecap="round" />
      )}
    </svg>
  );
}

/** Settings Top HUD Button: Friendly gently turning gear */
export function AnimatedSettingsGearIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 32 32"
      fill="none"
      className={`${className} shrink-0 overflow-visible`}
      animate={{ rotate: 360 }}
      transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
      aria-hidden="true"
    >
      <path
        d="M14 5.5 H18 L18.8 8.3 C19.8 8.6 20.8 9.1 21.6 9.8 L24.3 8.8 L26.3 12.2 L24.2 14.2 C24.4 15.3 24.4 16.7 24.2 17.8 L26.3 19.8 L24.3 23.2 L21.6 22.2 C20.8 22.9 19.8 23.4 18.8 23.7 L18 26.5 H14 L13.2 23.7 C12.2 23.4 11.2 22.9 10.4 22.2 L7.7 23.2 L5.7 19.8 L7.8 17.8 C7.6 16.7 7.6 15.3 7.8 14.2 L5.7 12.2 L7.7 8.8 L10.4 9.8 C11.2 9.1 12.2 8.6 13.2 8.3 Z"
        fill="#DCE8E0"
        stroke="#274033"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="4" fill="#FFFFFF" stroke="#274033" strokeWidth="2" />
    </motion.svg>
  );
}

/** Help Top HUD Button: Friendly gently bobbing guide question badge */
export function AnimatedHelpIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 32 32"
      fill="none"
      className={`${className} shrink-0 overflow-visible`}
      animate={{ y: [0, -1.6, 0] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="12" fill="#FEF3C7" stroke="#B87306" strokeWidth="2.2" />
      <path
        d="M12.8 12.8 C12.8 10.8 14.3 9.5 16.2 9.5 C18.2 9.5 19.5 10.7 19.5 12.4 C19.5 14 18.2 14.8 16.9 15.5 C16.2 15.9 16 16.4 16 17.4"
        stroke="#8A5200"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="16" cy="21.6" r="1.6" fill="#8A5200" />
    </motion.svg>
  );
}

/** Animated Play / Next Arrow */
export function AnimatedPlayArrowIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 28 28"
      fill="none"
      className={`${className} shrink-0 overflow-visible`}
      animate={{ x: [0, 2.5, 0] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden="true"
    >
      <path
        d="M8.5 6.8 C8.5 5.4 10 4.6 11.2 5.3 L22.2 12.5 C23.3 13.2 23.3 14.8 22.2 15.5 L11.2 22.7 C10 23.4 8.5 22.6 8.5 21.2 Z"
        fill="currentColor"
        stroke="rgba(0,0,0,0.18)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
}

/** Classic Universal Game Replay Arrow (chunky circular counter-clockwise arrow) */
export function AnimatedReplayIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 28 28"
      fill="none"
      className={`${className} shrink-0 overflow-visible`}
      whileHover={{ rotate: -220 }}
      transition={{ type: 'spring', stiffness: 320, damping: 18 }}
      aria-hidden="true"
    >
      {/* Classic thick circular replay arc */}
      <path
        d="M8.1 9.6 A7.6 7.6 0 1 1 6.7 15.8"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      {/* Chunky solid arrowhead pointing counter-clockwise */}
      <path
        d="M5.4 5.6 L5.2 12.1 L11.4 10.6 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
}
