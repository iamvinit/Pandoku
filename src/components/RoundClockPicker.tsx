import React from 'react';
import { Minus, Plus } from 'lucide-react';
import {
  clampRoundTimeSeconds,
  formatDurationClock,
  MAX_ROUND_TIME_SECONDS,
  MIN_ROUND_TIME_SECONDS,
} from '../shared/types';
import { soundFx } from '../utils/sound';

interface RoundClockPickerProps {
  valueSeconds: number;
  onChange: (nextSeconds: number) => void;
  disabled?: boolean;
  label?: string;
  compact?: boolean;
}

export function RoundClockPicker({
  valueSeconds,
  onChange,
  disabled = false,
  label = 'Round Clock',
  compact = false,
}: RoundClockPickerProps) {
  const safeTotal = clampRoundTimeSeconds(valueSeconds);
  const mins = Math.floor(safeTotal / 60);
  const secs = safeTotal % 60;

  // Analog clock geometry: minute hand spans 0..15 min full sweep, second hand spans 0..60s
  const minuteAngleDeg = (safeTotal / MAX_ROUND_TIME_SECONDS) * 360;
  const secondAngleDeg = (secs / 60) * 360;
  const ringCircumference = 2 * Math.PI * 19;
  const ringOffset = ringCircumference * (1 - safeTotal / MAX_ROUND_TIME_SECONDS);

  const commit = (nextRaw: number) => {
    if (disabled) return;
    const clamped = clampRoundTimeSeconds(nextRaw);
    if (clamped !== safeTotal) {
      soundFx.buttonTap();
      onChange(clamped);
    }
  };

  const handleMinutesInput = (raw: string) => {
    if (disabled) return;
    const parsed = parseInt(raw.replace(/\D/g, ''), 10);
    const nextMins = Number.isNaN(parsed) ? 0 : Math.min(15, Math.max(0, parsed));
    const nextTotal = nextMins === 15 ? 900 : nextMins * 60 + secs;
    onChange(clampRoundTimeSeconds(nextTotal));
  };

  const handleSecondsInput = (raw: string) => {
    if (disabled) return;
    const parsed = parseInt(raw.replace(/\D/g, ''), 10);
    const nextSecs = Number.isNaN(parsed) ? 0 : Math.min(59, Math.max(0, parsed));
    const nextTotal = mins * 60 + nextSecs;
    onChange(clampRoundTimeSeconds(nextTotal));
  };

  return (
    <div
      className={`toy-surface rounded-[22px] ${
        compact ? 'px-2.5 py-2 space-y-1.5' : 'p-3 space-y-2'
      }`}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 px-0.5">
        <span className="text-[11px] font-extrabold text-[#385445]">{label}</span>
        <span className="font-mono text-xs font-black text-[#168A4C] tabular-nums">
          {formatDurationClock(safeTotal)} / round
        </span>
      </div>

      {/* Main Analog Dial + Manual MM : SS Steppers */}
      <div className="flex items-center justify-between gap-2">
        {/* Live Tactile SVG Clock Face */}
        <div
          className={`shrink-0 flex items-center justify-center ${
            compact ? 'w-9 h-9' : 'w-12 h-12'
          }`}
        >
          <svg
            viewBox="0 0 48 48"
            className={`${compact ? 'w-9 h-9' : 'w-12 h-12'} drop-shadow-[0_2px_4px_rgba(20,68,42,0.12)]`}
            aria-hidden="true"
          >
            {/* Outer face */}
            <circle
              cx="24"
              cy="24"
              r="21"
              fill="#FFFFFF"
              stroke="#9DD6B6"
              strokeWidth="2.4"
            />
            {/* Sweep progress arc */}
            <circle
              cx="24"
              cy="24"
              r="18.5"
              fill="none"
              stroke="#20A55E"
              strokeOpacity="0.26"
              strokeWidth="3.2"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringOffset}
              transform="rotate(-90 24 24)"
              strokeLinecap="round"
            />
            {/* 12 dial ticks */}
            {Array.from({ length: 12 }, (_, idx) => {
              const angle = (idx * 30 * Math.PI) / 180;
              const isQuarter = idx % 3 === 0;
              const r1 = isQuarter ? 14.5 : 16;
              const r2 = 18.2;
              return (
                <line
                  key={idx}
                  x1={24 + Math.sin(angle) * r1}
                  y1={24 - Math.cos(angle) * r1}
                  x2={24 + Math.sin(angle) * r2}
                  y2={24 - Math.cos(angle) * r2}
                  stroke={isQuarter ? '#193527' : '#96B5A3'}
                  strokeWidth={isQuarter ? '1.8' : '1.1'}
                  strokeLinecap="round"
                />
              );
            })}
            {/* Minute hand */}
            <line
              x1="24"
              y1="24"
              x2="24"
              y2="12.5"
              stroke="#193527"
              strokeWidth="2.4"
              strokeLinecap="round"
              transform={`rotate(${minuteAngleDeg} 24 24)`}
            />
            {/* Second hand */}
            <line
              x1="24"
              y1="24"
              x2="24"
              y2="10"
              stroke="#1FA55C"
              strokeWidth="1.6"
              strokeLinecap="round"
              transform={`rotate(${secondAngleDeg} 24 24)`}
            />
            <circle cx="24" cy="24" r="2.4" fill="#193527" />
          </svg>
        </div>

        {/* Minutes Control */}
        <div className="flex-1 flex items-center justify-center gap-1.5">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 toy-well rounded-full p-0.5">
              <button
                type="button"
                disabled={disabled || safeTotal <= MIN_ROUND_TIME_SECONDS}
                onClick={() => commit(safeTotal - 60)}
                aria-label="Decrease minutes"
                className={`${
                  compact ? 'w-7 h-7' : 'w-8 h-8'
                } inline-flex items-center justify-center rounded-full bg-white text-[#17462E] shadow-[0_2px_0_#B4D0BE] active:translate-y-[1px] disabled:opacity-35 cursor-pointer disabled:cursor-default`}
              >
                <Minus className="w-3.5 h-3.5 stroke-[2.6]" />
              </button>
              <input
                type="text"
                inputMode="numeric"
                aria-label="Round minutes"
                disabled={disabled}
                value={mins}
                onChange={(e) => handleMinutesInput(e.target.value)}
                className={`${
                  compact ? 'w-7 h-7 text-xs' : 'w-9 h-8 text-sm'
                } text-center font-mono font-black text-[#173625] bg-transparent focus:outline-none tabular-nums`}
              />
              <button
                type="button"
                disabled={disabled || safeTotal >= MAX_ROUND_TIME_SECONDS}
                onClick={() => commit(safeTotal + 60)}
                aria-label="Increase minutes"
                className={`${
                  compact ? 'w-7 h-7' : 'w-8 h-8'
                } inline-flex items-center justify-center rounded-full bg-white text-[#17462E] shadow-[0_2px_0_#B4D0BE] active:translate-y-[1px] disabled:opacity-35 cursor-pointer disabled:cursor-default`}
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.6]" />
              </button>
            </div>
            {!compact && (
              <span className="text-[10px] font-bold text-[#526B5D] mt-0.5 uppercase tracking-wide">
                Min
              </span>
            )}
          </div>

          <span className={`font-mono text-base font-black text-[#476B57] ${compact ? '' : '-mt-4'}`}>
            :
          </span>

          {/* Seconds Control */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 toy-well rounded-full p-0.5">
              <button
                type="button"
                disabled={disabled || safeTotal <= MIN_ROUND_TIME_SECONDS}
                onClick={() => commit(safeTotal - 5)}
                aria-label="Decrease 5 seconds"
                className={`${
                  compact ? 'w-7 h-7' : 'w-8 h-8'
                } inline-flex items-center justify-center rounded-full bg-white text-[#17462E] shadow-[0_2px_0_#B4D0BE] active:translate-y-[1px] disabled:opacity-35 cursor-pointer disabled:cursor-default`}
              >
                <Minus className="w-3.5 h-3.5 stroke-[2.6]" />
              </button>
              <input
                type="text"
                inputMode="numeric"
                aria-label="Round seconds"
                disabled={disabled}
                value={secs.toString().padStart(2, '0')}
                onChange={(e) => handleSecondsInput(e.target.value)}
                className={`${
                  compact ? 'w-7 h-7 text-xs' : 'w-9 h-8 text-sm'
                } text-center font-mono font-black text-[#173625] bg-transparent focus:outline-none tabular-nums`}
              />
              <button
                type="button"
                disabled={disabled || safeTotal >= MAX_ROUND_TIME_SECONDS}
                onClick={() => commit(safeTotal + 5)}
                aria-label="Increase 5 seconds"
                className={`${
                  compact ? 'w-7 h-7' : 'w-8 h-8'
                } inline-flex items-center justify-center rounded-full bg-white text-[#17462E] shadow-[0_2px_0_#B4D0BE] active:translate-y-[1px] disabled:opacity-35 cursor-pointer disabled:cursor-default`}
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.6]" />
              </button>
            </div>
            {!compact && (
              <span className="text-[10px] font-bold text-[#526B5D] mt-0.5 uppercase tracking-wide">
                Sec
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Multiples / Delta Adjustment Row (Host Only) */}
      {!disabled && (
        <div className="grid grid-cols-5 gap-1 tabular-nums">
          {(
            [
              { label: '-30s', action: () => commit(safeTotal - 30) },
              { label: '+30s', action: () => commit(safeTotal + 30) },
              { label: '2:00', action: () => commit(120), active: safeTotal === 120 },
              { label: '3:00', action: () => commit(180), active: safeTotal === 180 },
              { label: '5:00', action: () => commit(300), active: safeTotal === 300 },
            ] as Array<{ label: string; action: () => void; active?: boolean }>
          ).map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={btn.action}
              className={`${
                compact ? 'min-h-[26px] text-[10.5px]' : 'min-h-[30px] text-[11px]'
              } font-extrabold rounded-full transition-all cursor-pointer whitespace-nowrap ${
                btn.active
                  ? 'bg-gradient-to-b from-[#34C776] to-[#178A4C] text-white shadow-[0_2px_0_#0E5B31]'
                  : 'bg-[#E9F5EE] text-[#2B4E3B] hover:bg-[#DCF0E4]'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
