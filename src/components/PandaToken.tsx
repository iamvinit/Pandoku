import React, { useState } from 'react';

/**
 * 8 rich, daylight-legible, colorblind-distinguishable board-game territory colors.
 * Vivid enough to remain unmistakably distinct under 3D studio lighting while keeping
 * crisp contrast against dark sumi-ink X marks and white/black Panda tokens.
 */
export const REGION_COLORS: ReadonlyArray<{
  bg: string;
  name: string;
}> = [
  { bg: '#6ED4A0', name: 'Emerald Bamboo' },
  { bg: '#6EC2F5', name: 'Sky Azure' },
  { bg: '#F5CA5C', name: 'Golden Honey' },
  { bg: '#F28DA8', name: 'Sakura Rose' },
  { bg: '#B49BF2', name: 'Wisteria Violet' },
  { bg: '#F5A26B', name: 'Apricot Peach' },
  { bg: '#5ED1C8', name: 'Lagoon Teal' },
  { bg: '#D4B38C', name: 'Warm Sand' },
];

export const AVATAR_PATHS: Record<0 | 1, string> = {
  0: '/src/assets/images/panda_avatar_a_1795077627698.jpg',
  1: '/src/assets/images/panda_avatar_b_1795077627818.jpg',
};

export const HERO_MASCOT_PATH = '/src/assets/images/panda_mascot_hero_1795077624378.jpg';

export function PandaFaceSvg({
  className = 'w-8 h-8',
  isConflict = false,
}: {
  className?: string;
  isConflict?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Ears */}
      <circle cx="15.5" cy="17" r="9" fill={isConflict ? '#991B1B' : '#18201C'} />
      <circle cx="48.5" cy="17" r="9" fill={isConflict ? '#991B1B' : '#18201C'} />
      {/* Inner ear highlights */}
      <circle cx="16.5" cy="18" r="3.5" fill={isConflict ? '#DC2626' : '#33413A'} />
      <circle cx="47.5" cy="18" r="3.5" fill={isConflict ? '#DC2626' : '#33413A'} />

      {/* Head */}
      <ellipse
        cx="32"
        cy="35"
        rx="23.5"
        ry="21"
        fill="#FFFFFF"
        stroke={isConflict ? '#B91C1C' : '#18201C'}
        strokeWidth="3.2"
      />

      {/* Left eye patch */}
      <ellipse
        cx="22"
        cy="34"
        rx="6.2"
        ry="7.6"
        transform="rotate(14 22 34)"
        fill={isConflict ? '#991B1B' : '#18201C'}
      />
      {/* Right eye patch */}
      <ellipse
        cx="42"
        cy="34"
        rx="6.2"
        ry="7.6"
        transform="rotate(-14 42 34)"
        fill={isConflict ? '#991B1B' : '#18201C'}
      />

      {/* Eyes */}
      <circle cx="23" cy="33" r="2.3" fill="#FFFFFF" />
      <circle cx="41" cy="33" r="2.3" fill="#FFFFFF" />
      <circle cx="23.6" cy="32.4" r="0.9" fill="#18201C" />
      <circle cx="40.4" cy="32.4" r="0.9" fill="#18201C" />

      {/* Nose */}
      <ellipse cx="32" cy="40.2" rx="4.2" ry="2.8" fill={isConflict ? '#991B1B' : '#18201C'} />

      {/* Smile / frown on conflict */}
      {isConflict ? (
        <path
          d="M27.5 47.5C29 45.2 35 45.2 36.5 47.5"
          stroke="#991B1B"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M27 45.2C28.8 47.6 31.2 47.6 32 45.8C32.8 47.6 35.2 47.6 37 45.2"
          stroke="#18201C"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

export function PlayerAvatar({
  avatarIndex,
  name,
  sizeClass = 'w-11 h-11',
}: {
  avatarIndex: 0 | 1;
  name: string;
  sizeClass?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`${sizeClass} rounded-full flex items-center justify-center border border-[#D4DCD1] shrink-0 ${
          avatarIndex === 0 ? 'bg-[#CBE5D2]' : 'bg-[#C6E0F5]'
        }`}
        aria-label={name}
      >
        <PandaFaceSvg className="w-3/4 h-3/4" />
      </div>
    );
  }

  return (
    <img
      src={AVATAR_PATHS[avatarIndex]}
      alt={`${name} panda avatar`}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${sizeClass} rounded-full object-cover border border-[#D4DCD1] shrink-0 bg-[#EEF2EB]`}
    />
  );
}
