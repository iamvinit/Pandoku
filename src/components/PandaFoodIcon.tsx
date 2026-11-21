import React, { useId } from 'react';
import { motion } from 'motion/react';

interface PandaFoodIconProps {
  className?: string;
}

/**
 * Minimal, crisp, gently animated Bamboo stalk currency icon.
 * Exported as both `BambooIcon` and `PandaFoodIcon` for clean compatibility.
 */
export function PandaFoodIcon({ className = 'w-5 h-5' }: PandaFoodIconProps) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} overflow-visible`}
      aria-hidden="true"
    >
      {/* Gently swaying right bamboo leaf */}
      <motion.g
        style={{ transformOrigin: '20.5px 15px' }}
        animate={{ rotate: [-5, 7, -5] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path
          d="M21 15.2C23.4 10.6 28.5 8.6 32 10.2C30.2 14.2 25.8 16.2 21 15.2Z"
          fill="#43D07E"
          stroke="#135A36"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </motion.g>

      {/* Gently swaying left bamboo leaf */}
      <motion.g
        style={{ transformOrigin: '14.5px 22px' }}
        animate={{ rotate: [5, -6, 5] }}
        transition={{ duration: 3.1, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
      >
        <path
          d="M14.5 22.2C11.8 17.8 6.8 16.4 3.8 18.4C5.8 22.2 10 23.6 14.5 22.2Z"
          fill="#2EB66B"
          stroke="#135A36"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </motion.g>

      {/* Minimal 3-segment bright emerald bamboo stalk */}
      <g>
        <rect
          x="14.2"
          y="4.2"
          width="7.6"
          height="9.2"
          rx="2.6"
          fill="#3ED480"
          stroke="#135A36"
          strokeWidth="1.8"
        />
        <rect
          x="13.8"
          y="14.4"
          width="8.4"
          height="9.2"
          rx="2.6"
          fill="#29B969"
          stroke="#135A36"
          strokeWidth="1.8"
        />
        <rect
          x="14.2"
          y="24.6"
          width="7.6"
          height="7.6"
          rx="2.5"
          fill="#1F9D58"
          stroke="#135A36"
          strokeWidth="1.8"
        />

        <line x1="12.6" y1="14" x2="23.4" y2="14" stroke="#135A36" strokeWidth="2.3" strokeLinecap="round" />
        <line x1="12.6" y1="24.1" x2="23.4" y2="24.1" stroke="#135A36" strokeWidth="2.3" strokeLinecap="round" />

        <rect x="16.1" y="6.2" width="1.9" height="5.2" rx="0.95" fill="#A8F7C9" opacity="0.85" />
        <rect x="15.9" y="16.4" width="1.9" height="5.2" rx="0.95" fill="#90F0B8" opacity="0.7" />
      </g>
    </svg>
  );
}

export const BambooIcon = PandaFoodIcon;

const FILLED_STAR_D =
  'M18 3.2 C19.1 3.2 20.0 3.9 20.5 4.9 L23.5 11.0 L30.2 12.0 C31.4 12.2 32.2 13.3 32.0 14.5 C31.9 15.1 31.6 15.6 31.2 16.0 L26.3 20.8 L27.5 27.5 C27.7 28.7 26.9 29.9 25.7 30.1 C25.1 30.2 24.5 30.1 24.0 29.8 L18 26.6 L12.0 29.8 C10.9 30.4 9.5 29.9 9.0 28.8 C8.7 28.4 8.6 27.9 8.7 27.5 L9.9 20.8 L5.0 16.0 C4.1 15.1 4.1 13.7 5.0 12.8 C5.3 12.4 5.8 12.1 6.3 12.0 L13.0 11.0 L16.0 4.9 C16.5 3.9 17.2 3.2 18 3.2 Z';

/**
 * Plump, glossy, kid-friendly 3D-style Cartoon Star SVG!
 * Bright warm golden sheen when earned, soft pillowy recessed socket when empty.
 * Supports optional asynchronous shimmer shine (`shineDurationSec` & `shineDelaySec`).
 */
export function CartoonStar({
  filled,
  className = 'w-5 h-5',
  sparkle = false,
  shineDurationSec,
  shineDelaySec,
}: {
  filled: boolean;
  className?: string;
  sparkle?: boolean;
  shineDurationSec?: number;
  shineDelaySec?: number;
}) {
  const clipId = useId();
  const hasShine = filled && typeof shineDurationSec === 'number' && shineDurationSec > 0;

  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} overflow-visible shrink-0`}
      aria-hidden="true"
    >
      {hasShine && (
        <defs>
          <clipPath id={clipId}>
            <path d={FILLED_STAR_D} />
          </clipPath>
        </defs>
      )}
      {filled ? (
        <g>
          {/* Warm outer golden drop outline */}
          <path
            d={FILLED_STAR_D}
            fill="#F5A60A"
            stroke="#B46200"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          {/* Plump sunny golden inner body */}
          <path
            d="M18 5.8 L21.4 12.5 L28.8 13.6 L23.4 18.8 L24.7 26.2 L18 22.7 L11.3 26.2 L12.6 18.8 L7.2 13.6 L14.6 12.5 Z"
            fill="#FFD93D"
          />
          {/* Glossy candy top-left shine */}
          <path
            d="M17.2 8.2 L14.6 13.4 L9.8 14.3 C12.4 15.2 15.5 14.8 18.2 12.2 L18.6 8.2 Z"
            fill="#FFF7C2"
            opacity="0.92"
          />
          <circle cx="15.2" cy="15.2" r="1.6" fill="#FFFFFF" opacity="0.88" />

          {/* Asynchronous Periodic Gloss Shine Sweep + Sparkle Glint */}
          {hasShine && (
            <>
              <g clipPath={`url(#${clipId})`}>
                <g
                  style={{
                    animation: `pandoku-star-shine ${shineDurationSec}s ease-in-out ${shineDelaySec ?? 0}s infinite`,
                    willChange: 'transform, opacity',
                  }}
                >
                  <rect
                    x="11"
                    y="-8"
                    width="9.5"
                    height="52"
                    rx="4"
                    fill="#FFFFFF"
                    opacity="0.92"
                  />
                  <rect
                    x="22.5"
                    y="-8"
                    width="3.2"
                    height="52"
                    rx="1.6"
                    fill="#FFFBEB"
                    opacity="0.82"
                  />
                </g>
              </g>
              <g
                style={{
                  transformOrigin: '29.5px 7.5px',
                  animation: `pandoku-star-glint ${shineDurationSec}s ease-in-out ${shineDelaySec ?? 0}s infinite`,
                  willChange: 'transform, opacity',
                }}
              >
                <path
                  d="M29.5 2 L31.1 5.9 L35 7.5 L31.1 9.1 L29.5 13 L27.9 9.1 L24 7.5 L27.9 5.9 Z"
                  fill="#FFFFFF"
                  stroke="#F5A60A"
                  strokeWidth="0.7"
                />
              </g>
            </>
          )}

          {/* Optional static tiny twinkle glint when shine animation isn't active */}
          {sparkle && !hasShine && (
            <path
              d="M30 4 L31 6.5 L33.5 7.5 L31 8.5 L30 11 L29 8.5 L26.5 7.5 L29 6.5 Z"
              fill="#FFF3A3"
            />
          )}
        </g>
      ) : (
        <g>
          {/* Soft pillowy recessed empty star */}
          <path
            d="M18 3.8 C19.0 3.8 19.9 4.4 20.3 5.3 L23.2 11.2 L29.7 12.2 C30.8 12.4 31.6 13.4 31.4 14.5 C31.3 15.1 31.0 15.6 30.6 15.9 L25.9 20.5 L27.0 27.0 C27.2 28.1 26.5 29.2 25.4 29.4 C24.8 29.5 24.3 29.4 23.8 29.1 L18 26.0 L12.2 29.1 C11.2 29.6 9.9 29.2 9.4 28.2 C9.1 27.8 9.0 27.4 9.1 27.0 L10.2 20.5 L5.5 15.9 C4.7 15.1 4.7 13.8 5.5 13.0 C5.8 12.6 6.2 12.3 6.7 12.2 L13.2 11.2 L16.1 5.3 C16.5 4.4 17.2 3.8 18 3.8 Z"
            fill="#E7EFE9"
            stroke="#BACCC0"
            strokeWidth="2.1"
            strokeLinejoin="round"
          />
          <path
            d="M18 7.5 L20.4 12.5 L25.8 13.3 L21.9 17.1 L22.8 22.5 L18 20.0 L13.2 22.5 L14.1 17.1 L10.2 13.3 L15.6 12.5 Z"
            fill="#F4F8F5"
            opacity="0.7"
          />
        </g>
      )}
    </svg>
  );
}

interface StarRatingProps {
  stars: number;
  max?: number;
  sizeClass?: string;
}

export function StarRating({ stars, max = 3, sizeClass = 'w-4 h-4' }: StarRatingProps) {
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${stars} of ${max} stars`}>
      {Array.from({ length: max }, (_, idx) => (
        <CartoonStar key={idx} filled={idx < stars} className={sizeClass} />
      ))}
    </div>
  );
}

interface XpIconProps {
  className?: string;
}

/**
 * Glossy vibrant BLUE "XP" shield badge icon (clearly reads as XP, never energy/lightning!).
 */
export function XpIcon({ className = 'w-5 h-5' }: XpIconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} shrink-0 overflow-visible`}
      aria-hidden="true"
    >
      {/* Rounded cobalt-blue badge with bold dark-blue border */}
      <rect
        x="2"
        y="3"
        width="28"
        height="26"
        rx="9"
        fill="#2563EB"
        stroke="#1E3A8A"
        strokeWidth="2.2"
      />
      {/* Bright sky-blue candy top sheen */}
      <path
        d="M6.5 5.6 H25.5 C27 5.6 28 6.8 28 8.2 V13.5 C22 15.8 10 15.8 4 13.5 V8.2 C4 6.8 5 5.6 6.5 5.6 Z"
        fill="#60A5FA"
        opacity="0.72"
      />
      {/* Crisp white "XP" lettering */}
      <text
        x="16"
        y="20.6"
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily="Bricolage Grotesque, system-ui, sans-serif"
        fontWeight="900"
        fontSize="13.5"
        letterSpacing="-0.4"
      >
        XP
      </text>
      {/* Tiny corner sparkle */}
      <circle cx="25.5" cy="7.5" r="1.4" fill="#E0F2FE" />
    </svg>
  );
}
