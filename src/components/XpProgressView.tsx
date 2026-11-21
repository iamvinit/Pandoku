import React from 'react';
import { motion } from 'motion/react';
import { AccessoryId, AccessorySlot } from '../shared/soloCatalog';
import { formatCompactXp, getPlayerLevelInfo, SoloProgressState } from '../utils/soloStorage';
import { InteractivePanda } from './InteractivePanda';
import { XpIcon } from './PandaFoodIcon';

interface XpProgressViewProps {
  progress: SoloProgressState;
  equippedAccessories: Record<AccessorySlot, AccessoryId | null>;
}

export function XpProgressView({
  progress,
  equippedAccessories,
}: XpProgressViewProps) {
  const info = getPlayerLevelInfo(progress.totalXp);
  const xpRemaining = Math.max(0, info.requiredSlotXp - info.currentSlotXp);
  const pct = Math.max(0, Math.min(1, info.progressRatio));

  // Circular SVG Ring Geometry (tuned for zero-scroll single-screen fit on mobile)
  const size = 242;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - pct);

  // Glowing indicator orb along the circular progress arc
  const angleRad = (pct * 360 - 90) * (Math.PI / 180);
  const tipX = size / 2 + radius * Math.cos(angleRad);
  const tipY = size / 2 + radius * Math.sin(angleRad);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col justify-evenly px-4 pt-1 pb-4 gap-3 overflow-hidden"
    >
      {/* Hero Section: Cleanly Spaced Level Badge + Circular Animated XP Ring + Below-Ring Next Badge (ZERO overlap!) */}
      <div className="flex flex-col items-center justify-center gap-2">
        {/* Current Level Number Medallion cleanly ABOVE the ring */}
        <motion.div
          initial={{ scale: 0.78, y: -6 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 20 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-b from-[#3B82F6] to-[#1D4ED8] border-[3px] border-white shadow-[0_6px_16px_rgba(37,99,235,0.3)]"
        >
          <XpIcon className="w-5 h-5 shrink-0" />
          <span className="font-display text-xl font-black text-white tabular-nums leading-none">
            {info.level}
          </span>
        </motion.div>

        {/* Circular Animated XP Ring Surrounding the 3D Panda */}
        <div className="relative flex items-center justify-center w-[clamp(186px,31dvh,242px)] h-[clamp(186px,31dvh,242px)]">
          {/* Soft ambient halo behind ring */}
          <div
            aria-hidden="true"
            className="absolute inset-3.5 rounded-full bg-gradient-to-b from-[#EFF6FF] via-[#F2FBF7] to-[#E6F4EC] shadow-inner"
          />

          {/* Live 3D Panda Centered Inside the Circular XP Ring */}
          <div className="relative z-10 w-[78%] h-[78%] rounded-full overflow-hidden flex items-center justify-center">
            <InteractivePanda
              equippedAccessories={equippedAccessories}
              compact
            />
          </div>

          {/* Animated Circular Progress Ring SVG */}
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="absolute inset-0 w-full h-full z-20 pointer-events-none overflow-visible"
            aria-label={`Level ${info.level}, ${Math.round(pct * 100)}% toward ${info.level + 1}`}
          >
            <defs>
              <linearGradient id="xpRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60A5FA" />
                <stop offset="55%" stopColor="#2563EB" />
                <stop offset="100%" stopColor="#1D4ED8" />
              </linearGradient>
            </defs>

            {/* Recessed Track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#DCE9F8"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={2}
              strokeDasharray="4 10"
              opacity="0.75"
            />

            {/* Animated Progress Arc */}
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="url(#xpRingGrad)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />

            {/* Glowing Tip Spark */}
            {pct > 0.01 && (
              <motion.circle
                cx={tipX}
                cy={tipY}
                r={7}
                fill="#FFFFFF"
                stroke="#2563EB"
                strokeWidth="3.5"
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.25, 1] }}
                transition={{ delay: 0.7, duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
          </svg>
        </div>

        {/* Next Level Goal Badge cleanly BELOW the circle — borderless floating sky pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/88 shadow-[0_3px_0_#A6CBF7,0_6px_14px_rgba(37,99,235,0.12)]">
          <span className="text-xs font-extrabold text-[#2F538C]">Next</span>
          <span className="w-6 h-6 rounded-full bg-gradient-to-b from-[#4992FF] to-[#1D4ED8] text-white font-display text-sm font-black inline-flex items-center justify-center tabular-nums">
            {info.level + 1}
          </span>
        </div>
      </div>

      {/* Airy Borderless Sky-Cloud XP Countdown Cushion */}
      <div className="bg-gradient-to-b from-[#FFFFFF]/92 to-[#EBF5FF]/90 rounded-[30px] p-4 shadow-[0_5px_0_#B4D3F8,0_12px_24px_rgba(37,99,235,0.1),inset_0_2px_0_#FFFFFF] space-y-3 text-center">
        <div>
          <p className="text-xs font-extrabold text-[#3E5C85]">
            Needed to reach {info.level + 1}
          </p>
          <div className="mt-1 flex items-center justify-center gap-2">
            <XpIcon className="w-7 h-7 shrink-0" />
            <span className="font-mono text-3xl font-black text-[#1D4ED8] tabular-nums leading-none">
              {xpRemaining.toLocaleString()}
            </span>
          </div>
          <p className="text-xs font-bold text-[#4B6890] mt-1.5 tabular-nums">
            {info.currentSlotXp.toLocaleString()} / {info.requiredSlotXp.toLocaleString()} XP earned
          </p>
        </div>

        {/* Clean visual milestone strip showing current -> next */}
        <div className="flex items-center gap-2.5 pt-1">
          <span className="w-9 h-9 rounded-full bg-[#DBEAFE] font-display text-base font-black text-[#1E40AF] shadow-[0_2.5px_0_#93C5FD] inline-flex items-center justify-center shrink-0 tabular-nums">
            {info.level}
          </span>
          <div className="flex-1 h-4 rounded-full bg-[#D5E8FC] overflow-hidden shadow-inner">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#60A5FA] via-[#3B82F6] to-[#1D4ED8]"
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(6, Math.round(pct * 100))}%` }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <span className="w-9 h-9 rounded-full bg-gradient-to-b from-[#4992FF] to-[#1D4ED8] font-display text-base font-black text-white shadow-[0_2.5px_0_#1539A3] inline-flex items-center justify-center shrink-0 tabular-nums">
            {info.level + 1}
          </span>
        </div>

        <p className="text-[11px] font-bold text-[#526D91]">
          Total XP collected:{' '}
          <strong className="font-mono text-[#173022] tabular-nums">
            {formatCompactXp(info.totalXp)}
          </strong>{' '}
          ({info.totalXp.toLocaleString()} XP)
        </p>
      </div>
    </motion.div>
  );
}
