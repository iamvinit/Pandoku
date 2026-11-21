import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  Crown,
  Flame,
  Gauge,
  Hand,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import { PandaFaceSvg, REGION_COLORS } from './PandaToken';
import { XpIcon } from './PandaFoodIcon';
import { ModeGraphicBadge } from './ModeGraphic';

interface HowToPlayModalProps {
  open: boolean;
  onClose: () => void;
}

interface MiniBoardProps {
  regions: number[][];
  pandas: Set<string>;
  showAutoX?: boolean;
  sizeClass?: string;
  pandaSizeClass?: string;
}

function MiniExampleBoard({
  regions,
  pandas,
  showAutoX = true,
  sizeClass = 'w-28 h-28',
  pandaSizeClass = 'w-5 h-5',
}: MiniBoardProps) {
  return (
    <div
      className={`${sizeClass} shrink-0 grid grid-cols-4 border-2 border-[#18201C] rounded-xl overflow-hidden bg-[#18201C] shadow-xs`}
    >
      {regions.map((row, r) =>
        row.map((reg, c) => {
          const key = `${r},${c}`;
          const hasPanda = pandas.has(key);
          const topDiff = r > 0 && regions[r - 1][c] !== reg;
          const leftDiff = c > 0 && regions[r][c - 1] !== reg;
          return (
            <div
              key={key}
              className="flex items-center justify-center"
              style={{
                backgroundColor: REGION_COLORS[reg].bg,
                borderTop:
                  r === 0
                    ? 'none'
                    : topDiff
                      ? '2px solid #18201C'
                      : '1px solid rgba(24,32,28,0.15)',
                borderLeft:
                  c === 0
                    ? 'none'
                    : leftDiff
                      ? '2px solid #18201C'
                      : '1px solid rgba(24,32,28,0.15)',
              }}
            >
              {hasPanda ? (
                <PandaFaceSvg className={pandaSizeClass} />
              ) : showAutoX ? (
                <span className="text-[10px] font-bold text-[#18201C]/35 leading-none">×</span>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}

/** Tiny kid-friendly visual rule icons so kids don't have to read paragraphs */
function RulePictogram({ kind }: { kind: 'row' | 'col' | 'color' | 'notouch' }) {
  if (kind === 'row') {
    return (
      <svg viewBox="0 0 36 24" className="w-8 h-5 shrink-0" aria-hidden="true">
        <rect x="2" y="5" width="32" height="14" rx="4" fill="#D1FAE5" stroke="#10B981" strokeWidth="2" />
        <circle cx="18" cy="12" r="4.5" fill="#18201C" />
        <circle cx="18" cy="12" r="2.2" fill="#FFFFFF" />
      </svg>
    );
  }
  if (kind === 'col') {
    return (
      <svg viewBox="0 0 24 36" className="w-5 h-7 shrink-0" aria-hidden="true">
        <rect x="5" y="2" width="14" height="32" rx="4" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="2" />
        <circle cx="12" cy="18" r="4.5" fill="#18201C" />
        <circle cx="12" cy="18" r="2.2" fill="#FFFFFF" />
      </svg>
    );
  }
  if (kind === 'color') {
    return (
      <svg viewBox="0 0 32 32" className="w-6 h-6 shrink-0" aria-hidden="true">
        <rect x="3" y="3" width="26" height="26" rx="7" fill="#FDE68A" stroke="#D97706" strokeWidth="2" />
        <circle cx="16" cy="16" r="6" fill="#FFFFFF" stroke="#18201C" strokeWidth="2" />
        <circle cx="12" cy="11.5" r="2.2" fill="#18201C" />
        <circle cx="20" cy="11.5" r="2.2" fill="#18201C" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" className="w-6 h-6 shrink-0" aria-hidden="true">
      <rect x="2" y="2" width="13" height="13" rx="3" fill="#FEE2E2" stroke="#EF4444" strokeWidth="1.8" />
      <rect x="17" y="17" width="13" height="13" rx="3" fill="#FEE2E2" stroke="#EF4444" strokeWidth="1.8" />
      <line x1="6" y1="26" x2="26" y2="6" stroke="#DC2626" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

export function HowToPlayModal({ open, onClose }: HowToPlayModalProps) {
  // Valid 4x4 solution: (0,1), (1,3), (2,0), (3,2) — 1 per row, col, color, no touching
  const easyRegions = [
    [0, 0, 1, 1],
    [0, 2, 1, 1],
    [2, 2, 3, 3],
    [2, 3, 3, 3],
  ];
  const hardRegions = [
    [1, 0, 3, 2],
    [3, 2, 0, 1],
    [2, 1, 3, 0],
    [0, 2, 3, 1],
  ];
  const miniPandas = new Set(['0,1', '1,3', '2,0', '3,2']);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#18201C]/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="how-to-play-title"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="w-full max-w-[440px] bg-gradient-to-b from-[#FFFFFF] to-[#F3FAF5] rounded-t-[32px] sm:rounded-[32px] shadow-[0_24px_60px_rgba(14,48,28,0.28)] overflow-hidden max-h-[89dvh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-11 h-1.5 rounded-full bg-[#CDE0D4] mx-auto mt-3 sm:hidden" />

            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[#E6FAEE] to-[#FFF6D6]">
              <div className="flex items-center gap-2">
                <PandaFaceSvg className="w-7 h-7 shrink-0" />
                <h2 id="how-to-play-title" className="font-display text-xl font-black text-[#173022]">
                  How to Play!
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close rules"
                className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center text-[#3D5B4A] hover:bg-white cursor-pointer"
              >
                <X className="w-5 h-5 stroke-[2.6]" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto kid-scrollbar space-y-3.5 text-xs text-[#2B3730]">
              {/* 1. SUPER VISUAL 4 RULES + EXAMPLE BOARD */}
              <div className="flex items-center gap-3 bg-[#EBF7F0] rounded-[24px] p-3">
                <MiniExampleBoard
                  regions={easyRegions}
                  pandas={miniPandas}
                  showAutoX
                  sizeClass="w-[106px] h-[106px]"
                  pandaSizeClass="w-5 h-5"
                />

                <div className="flex-1 grid grid-cols-1 gap-1.5">
                  <div className="flex items-center gap-2 bg-white/90 px-2.5 py-1.5 rounded-full shadow-2xs">
                    <RulePictogram kind="row" />
                    <span className="font-extrabold text-[#0F5B37]">1 Panda / Row</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/90 px-2.5 py-1.5 rounded-full shadow-2xs">
                    <RulePictogram kind="col" />
                    <span className="font-extrabold text-[#1D4ED8]">1 Panda / Column</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/90 px-2.5 py-1.5 rounded-full shadow-2xs">
                    <RulePictogram kind="color" />
                    <span className="font-extrabold text-[#9A5B00]">1 Panda / Color</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/90 px-2.5 py-1.5 rounded-full shadow-2xs">
                    <RulePictogram kind="notouch" />
                    <span className="font-extrabold text-[#B91C1C]">Never Touch!</span>
                  </div>
                </div>
              </div>

              {/* 2. VISUAL TAP & SWIPE STRIP (Soft pastel cushions) */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#E8F3FF] rounded-[22px] p-2.5 flex flex-col items-center text-center gap-1 shadow-[0_3px_0_#BAD7FA]">
                  <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center font-black text-lg text-[#1D4ED8] shadow-2xs">
                    ×
                  </div>
                  <p className="font-extrabold text-[#1E3A8A] leading-tight">1 Tap</p>
                  <p className="text-[10px] font-bold text-[#3B5998]">Mark ×</p>
                </div>

                <div className="bg-[#E5FAEE] rounded-[22px] p-2.5 flex flex-col items-center text-center gap-1 shadow-[0_3px_0_#A1E2BE]">
                  <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-2xs">
                    <PandaFaceSvg className="w-7 h-7" />
                  </div>
                  <p className="font-extrabold text-[#14532D] leading-tight">2 Fast Taps</p>
                  <p className="text-[10px] font-bold text-[#15803D]">Put Panda!</p>
                </div>

                <div className="bg-[#F2ECFF] rounded-[22px] p-2.5 flex flex-col items-center text-center gap-1 shadow-[0_3px_0_#D2C1FC]">
                  <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#6D28D9] shadow-2xs">
                    <Hand className="w-5 h-5" />
                  </div>
                  <p className="font-extrabold text-[#4C1D95] leading-tight">Swipe</p>
                  <p className="text-[10px] font-bold text-[#6D28D9]">Fast × Line</p>
                </div>
              </div>

              {/* 3. BRIGHT EASY VS HARD VISUAL COMPARISON */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-gradient-to-b from-[#E5FAEE] to-[#F5FDF8] rounded-[24px] p-3 flex flex-col items-center text-center gap-2 shadow-[0_3.5px_0_#A6E1C0]">
                  <ModeGraphicBadge mode="connected" size="sm" />
                  <MiniExampleBoard
                    regions={easyRegions}
                    pandas={miniPandas}
                    showAutoX
                    sizeClass="w-[88px] h-[88px]"
                    pandaSizeClass="w-4 h-4"
                  />
                  <div className="space-y-0.5 text-[11px] font-bold text-[#0F5B37]">
                    <p className="inline-flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                      <span>Colors stay together</span>
                    </p>
                    <p className="inline-flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#16A34A]" />
                      <span>Helper × &amp; Hints ON</span>
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-b from-[#FFEBE7] to-[#FFF7F5] rounded-[24px] p-3 flex flex-col items-center text-center gap-2 shadow-[0_3.5px_0_#F7B6A9]">
                  <ModeGraphicBadge mode="scattered" size="sm" />
                  <MiniExampleBoard
                    regions={hardRegions}
                    pandas={miniPandas}
                    showAutoX={false}
                    sizeClass="w-[88px] h-[88px]"
                    pandaSizeClass="w-4 h-4"
                  />
                  <div className="space-y-0.5 text-[11px] font-bold text-[#9F2A1A]">
                    <p className="inline-flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-[#EA580C]" />
                      <span>Colors split apart</span>
                    </p>
                    <p className="inline-flex items-center gap-1">
                      <X className="w-3.5 h-3.5 text-[#DC2626]" />
                      <span>No Helper × or Hints</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. CRYSTAL-CLEAR VISUAL 1v1 SPEED XP RECIPE */}
              <div className="p-3.5 rounded-[24px] bg-gradient-to-br from-[#FFF7D6] via-[#FFFDF2] to-[#FDEAA8] shadow-[0_4px_0_#E6C166] space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="font-display text-sm font-black text-[#7C4700] inline-flex items-center gap-1.5">
                    <XpIcon className="w-5 h-5 shrink-0" />
                    <span>How 1v1 XP Works</span>
                  </p>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#E08A05] text-white text-[10px] font-black">
                    Same Board Race!
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/90 rounded-2xl p-2 flex items-center gap-2 shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-[#E6FAEE] text-[#15803D] flex items-center justify-center shrink-0">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-black text-[#15803D] leading-none">
                        +1,000 XP
                      </p>
                      <p className="text-[10px] font-bold text-[#495C50] mt-0.5">Solve Board</p>
                    </div>
                  </div>

                  <div className="bg-white/90 rounded-2xl p-2 flex items-center gap-2 shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-[#EAF2FF] text-[#2563EB] flex items-center justify-center shrink-0">
                      <Gauge className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-black text-[#1D4ED8] leading-none">
                        +0–500 XP
                      </p>
                      <p className="text-[10px] font-bold text-[#495C50] mt-0.5">Faster = More!</p>
                    </div>
                  </div>

                  <div className="bg-white/90 rounded-2xl p-2 flex items-center gap-2 shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] text-[#B45309] flex items-center justify-center shrink-0">
                      <Crown className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-black text-[#B45309] leading-none">
                        +200 XP
                      </p>
                      <p className="text-[10px] font-bold text-[#495C50] mt-0.5">Finish 1st!</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-[#FFEDD5] to-[#FEF08A] rounded-2xl p-2 flex items-center gap-2 shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-[#F59E0B] text-white flex items-center justify-center font-black text-xs shrink-0">
                      2×
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-black text-[#9A3412] leading-none">
                        DOUBLE XP!
                      </p>
                      <p className="text-[10px] font-bold text-[#7C2D12] mt-0.5">Last Round</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-white/80">
              <button
                type="button"
                onClick={onClose}
                className="w-full min-h-[50px] font-display text-base font-black text-white bg-gradient-to-b from-[#34C776] via-[#20A55E] to-[#158348] shadow-[0_5px_0_#0D5C31,0_10px_20px_rgba(21,131,72,0.24),inset_0_2px_0_rgba(255,255,255,0.4)] rounded-[22px] active:translate-y-[2px] transition-all cursor-pointer"
              >
                Got It — Let’s Play!
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
