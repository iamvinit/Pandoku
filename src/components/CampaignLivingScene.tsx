import React from 'react';

/**
 * Reusable painterly storybook cloud SVG with soft rim highlight & underside tint
 */
function StorybookCloud({
  fill = '#FFFFFF',
  shade = '#EBF5F0',
  variant = 'puffy',
}: {
  fill?: string;
  shade?: string;
  variant?: 'puffy' | 'long';
}) {
  if (variant === 'long') {
    return (
      <svg
        viewBox="0 0 156 54"
        fill="none"
        className="w-full h-auto overflow-visible drop-shadow-[0_3px_5px_rgba(24,52,40,0.08)]"
      >
        <path
          d="M22 44 H130 C142 44 150 38 150 30 C150 22 143 16 132 16 C128 8 118 4 108 5 C101 2 90 3 83 9 C76 4 64 5 57 12 C49 10 39 13 35 20 C24 19 14 25 13 33 C12 40 16 44 22 44 Z"
          fill={fill}
        />
        <path
          d="M20 44 H130 C139 44 146 40 148 35 C136 39 116 40 94 39 C70 38 45 40 16 37 C17 41 18 44 20 44 Z"
          fill={shade}
          opacity="0.72"
        />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 130 56"
      fill="none"
      className="w-full h-auto overflow-visible drop-shadow-[0_3px_5px_rgba(24,52,40,0.08)]"
    >
      <path
        d="M22 46 H104 C115 46 123 39 123 30 C123 22 116 15 106 15 C103 6 94 2 84 2 C72 2 62 9 59 19 C54 16 47 16 41 20 C37 15 30 13 24 16 C14 19 8 27 9 36 C10 42 15 46 22 46 Z"
        fill={fill}
      />
      <path
        d="M20 46 H104 C112 46 118 42 121 36 C113 40 103 41 90 40 C73 39 58 42 40 41 C28 40 19 39 11 39 C13 43 16 46 20 46 Z"
        fill={shade}
        opacity="0.74"
      />
    </svg>
  );
}

/**
 * Cute Animated Wing-Flapping Storybook Bird gliding across the open sky
 */
function GlidingSkyBird({
  topPx,
  duration,
  delay,
  scale = 1,
  direction = 'ltr',
  color = '#2C5947',
  wingColor = '#3E7A62',
}: {
  topPx: number;
  duration: number;
  delay: number;
  scale?: number;
  direction?: 'ltr' | 'rtl';
  color?: string;
  wingColor?: string;
}) {
  const isRtl = direction === 'rtl';
  return (
    <div
      className="absolute left-0 pointer-events-none"
      style={{
        top: `${topPx}px`,
        animation: `${isRtl ? 'pandoku-drift-rtl' : 'pandoku-drift-ltr'} ${duration}s linear ${delay}s infinite`,
      }}
    >
      <div
        style={{
          animation: `pandoku-bird-bob ${2.4 + (scale % 1) * 1.1}s ease-in-out ${delay * 0.4}s infinite`,
        }}
      >
        <svg
          viewBox="0 0 42 24"
          className="overflow-visible"
          style={{
            width: `${30 * scale}px`,
            height: `${18 * scale}px`,
            transform: isRtl ? 'scaleX(-1)' : undefined,
          }}
        >
          <g
            style={{
              transformOrigin: '20px 13px',
              animation: `pandoku-wing-flap 0.56s ease-in-out ${delay * 0.25}s infinite`,
            }}
          >
            <path d="M19 13 Q13 2 5 7 Q12 11 19 13 Z" fill={wingColor} opacity="0.82" />
          </g>
          <path d="M9 14 Q18 10 29 13 Q23 18 13 16 L7 18 L10 14 Z" fill={color} />
          <g
            style={{
              transformOrigin: '21px 13px',
              animation: `pandoku-wing-flap 0.56s ease-in-out ${delay * 0.25 + 0.08}s infinite`,
            }}
          >
            <path d="M21 13 Q25 1 35 6 Q28 11 21 13 Z" fill={color} />
          </g>
          <circle cx="26.5" cy="12.8" r="1" fill="#FFFFFF" />
        </svg>
      </div>
    </div>
  );
}

/**
 * Cute Colorful Fluttering Butterfly dancing gently over the lower meadow & lotus ponds
 */
function FlutteringButterfly({
  left,
  topPx,
  wingPrimary,
  wingSecondary,
  delay = 0,
  scale = 1,
}: {
  left: string;
  topPx: number;
  wingPrimary: string;
  wingSecondary: string;
  delay?: number;
  scale?: number;
}) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left,
        top: `${topPx}px`,
        animation: `pandoku-butterfly-dance 6.8s ease-in-out ${delay}s infinite`,
      }}
    >
      <svg
        viewBox="0 0 32 26"
        className="overflow-visible drop-shadow-[0_2px_3px_rgba(0,0,0,0.12)]"
        style={{ width: `${20 * scale}px`, height: `${16 * scale}px` }}
      >
        <g
          style={{
            transformOrigin: '16px 13px',
            animation: `pandoku-butterfly-wings 0.34s ease-in-out ${delay}s infinite`,
          }}
        >
          <ellipse cx="9" cy="9" rx="7.5" ry="6" transform="rotate(-22 9 9)" fill={wingPrimary} />
          <ellipse cx="10.5" cy="17" rx="5" ry="4.5" transform="rotate(18 10.5 17)" fill={wingSecondary} />
          <ellipse cx="23" cy="9" rx="7.5" ry="6" transform="rotate(22 23 9)" fill={wingPrimary} />
          <ellipse cx="21.5" cy="17" rx="5" ry="4.5" transform="rotate(-18 21.5 17)" fill={wingSecondary} />
          <circle cx="8" cy="8.5" r="2" fill="#FFFFFF" opacity="0.75" />
          <circle cx="24" cy="8.5" r="2" fill="#FFFFFF" opacity="0.75" />
        </g>
        <rect x="14.9" y="7" width="2.2" height="12" rx="1.1" fill="#362823" />
      </svg>
    </div>
  );
}

/**
 * Sky Clouds distributed cleanly across the upper sky zone of the compact single-screen map (~460px tall)
 * Uses negative CSS animationDelay so clouds are ALREADY mid-flight on frame 1!
 */
const SKY_CLOUDS: ReadonlyArray<{
  topPx: number;
  width: number;
  duration: number;
  delay: number;
  opacity: number;
  variant: 'puffy' | 'long';
}> = [
  { topPx: 14, width: 92, duration: 24, delay: -6, opacity: 0.9, variant: 'puffy' },
  { topPx: 54, width: 80, duration: 30, delay: -18, opacity: 0.82, variant: 'long' },
  { topPx: 112, width: 86, duration: 28, delay: -12, opacity: 0.68, variant: 'puffy' },
];

/**
 * Natural, Seamless Living Sky & Atmosphere Overlay for each expanded single-screen Campaign map.
 * Pure atmospheric elements ONLY (no pasted-on ground flora!) so everything blends harmoniously
 * with the painted landscape artwork!
 */
export function CampaignLivingOverlay({ campaignId }: { campaignId: 1 | 2 | 3 | 4 }) {
  const cloudFill =
    campaignId === 2 ? '#FFF6E8' : campaignId === 4 ? '#F6F3FF' : '#FFFFFF';
  const cloudShade =
    campaignId === 1
      ? '#DCF2E5'
      : campaignId === 2
        ? '#F9DFBF'
        : campaignId === 3
          ? '#D5F2EE'
          : '#DCD8F8';

  const birdColors =
    campaignId === 1
      ? { body: '#2B5B46', wing: '#438466' }
      : campaignId === 2
        ? { body: '#8C431A', wing: '#B8612C' }
        : { body: '#FFFFFF', wing: '#DDF6F5' };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {/* 1. Radiant Animated Storybook Sun (Worlds 1-3) OR Crescent Moon + Twinkling Stars + Shooting Star (World 4) */}
      {campaignId !== 4 ? (
        <div
          className="absolute"
          style={{
            top: '12px',
            right: '16px',
          }}
        >
          <div
            className="w-28 h-28 -m-8 rounded-full"
            style={{
              background:
                campaignId === 1
                  ? 'radial-gradient(circle, rgba(255,235,112,0.88) 0%, rgba(255,235,112,0) 70%)'
                  : campaignId === 2
                    ? 'radial-gradient(circle, rgba(255,196,76,0.92) 0%, rgba(255,172,56,0) 72%)'
                    : 'radial-gradient(circle, rgba(255,247,176,0.88) 0%, rgba(165,243,252,0) 72%)',
              animation: 'pandoku-sun-pulse 4.2s ease-in-out infinite',
            }}
          />

          <svg
            viewBox="0 0 92 92"
            className="absolute -top-2.5 -left-2.5 w-[64px] h-[64px] overflow-visible"
            style={{ animation: 'pandoku-sun-spin 26s linear infinite' }}
          >
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, idx) => (
              <line
                key={deg}
                x1="46"
                y1={idx % 2 === 0 ? '4' : '9'}
                x2="46"
                y2="19"
                stroke={campaignId === 2 ? '#FFD166' : '#FFF199'}
                strokeWidth={idx % 2 === 0 ? '4.2' : '3.2'}
                strokeLinecap="round"
                opacity="0.95"
                transform={`rotate(${deg} 46 46)`}
              />
            ))}
            <circle
              cx="46"
              cy="46"
              r="18"
              fill={campaignId === 2 ? '#FFCF4D' : '#FFE86E'}
            />
            <circle cx="46" cy="46" r="12.5" fill="#FFF9D6" opacity="0.82" />
          </svg>
        </div>
      ) : (
        <div className="absolute inset-x-0 top-0 h-[210px]">
          <svg
            viewBox="0 0 76 76"
            className="absolute top-3 right-4 w-[54px] h-[54px] drop-shadow-[0_0_16px_rgba(255,244,176,0.9)]"
            style={{ animation: 'pandoku-float-bob 5s ease-in-out infinite' }}
          >
            <path
              d="M46 12 C32 13, 21 25, 22 39 C23 53, 35 63, 50 62 C41 56, 36 46, 38 36 C40 27, 46 19, 54 16 C51 13, 48 12, 46 12 Z"
              fill="#FFF6BD"
            />
          </svg>

          {[
            { left: '12%', top: '16px', delay: -0.4, size: 15 },
            { left: '38%', top: '12px', delay: -1.1, size: 12 },
            { left: '62%', top: '28px', delay: -1.8, size: 14 },
            { left: '24%', top: '76px', delay: -0.7, size: 12 },
            { left: '54%', top: '98px', delay: -1.5, size: 11 },
            { left: '78%', top: '112px', delay: -0.2, size: 13 },
          ].map((st, i) => (
            <svg
              key={i}
              viewBox="0 0 20 20"
              style={{
                left: st.left,
                top: st.top,
                width: st.size,
                height: st.size,
                animation: `pandoku-twinkle 2.2s ease-in-out ${st.delay}s infinite`,
              }}
              className="absolute"
            >
              <path d="M10 1 L12 8 L19 10 L12 12 L10 19 L8 12 L1 10 L8 8 Z" fill="#FFFAD1" />
            </svg>
          ))}

          <div
            className="absolute top-[36px] left-0 w-24 h-[3px] rounded-full"
            style={{
              background: 'linear-gradient(90deg, rgba(255,252,214,0.98) 0%, rgba(255,252,214,0) 100%)',
              animation: 'pandoku-shooting-star 9.5s ease-out -7.2s infinite',
            }}
          />
        </div>
      )}

      {/* 2. Soft Warm Diagonal Sunbeam Glow */}
      <div
        className="absolute -inset-x-10 top-0 h-[240px]"
        style={{
          background:
            campaignId === 1
              ? 'linear-gradient(125deg, transparent 22%, rgba(255,250,204,0.42) 45%, transparent 64%)'
              : campaignId === 2
                ? 'linear-gradient(125deg, transparent 20%, rgba(255,220,120,0.44) 48%, transparent 68%)'
                : campaignId === 3
                  ? 'linear-gradient(125deg, transparent 24%, rgba(204,252,255,0.42) 48%, transparent 66%)'
                  : 'linear-gradient(125deg, transparent 25%, rgba(235,232,255,0.34) 50%, transparent 70%)',
          animation: 'pandoku-mist-glide 11s ease-in-out infinite',
        }}
      />

      {/* 3. Instant-On Drifting Storybook Clouds (Already gliding across the sky on frame 1!) */}
      {SKY_CLOUDS.map((cloud, idx) => (
        <div
          key={`cloud-${idx}`}
          className="absolute left-0"
          style={{
            top: `${cloud.topPx}px`,
            width: `${cloud.width}px`,
            opacity: cloud.opacity,
            animation: `pandoku-drift-ltr ${cloud.duration}s linear ${cloud.delay}s infinite`,
          }}
        >
          <StorybookCloud fill={cloudFill} shade={cloudShade} variant={cloud.variant} />
        </div>
      ))}

      {/* 4. Cute Animated Wing-Flapping Storybook Birds in the Upper Sky (Worlds 1, 2, 3) */}
      {campaignId !== 4 && (
        <>
          <GlidingSkyBird
            topPx={48}
            duration={15}
            delay={-5}
            scale={0.96}
            direction="ltr"
            color={birdColors.body}
            wingColor={birdColors.wing}
          />
          <GlidingSkyBird
            topPx={62}
            duration={15}
            delay={-4.1}
            scale={0.76}
            direction="ltr"
            color={birdColors.body}
            wingColor={birdColors.wing}
          />
          <GlidingSkyBird
            topPx={128}
            duration={19}
            delay={-11}
            scale={0.85}
            direction="rtl"
            color={birdColors.body}
            wingColor={birdColors.wing}
          />
        </>
      )}

      {/* 5. Gentle Ambient Water Shimmer, Mist & Butterflies Over the Lower Landscape */}
      {campaignId === 1 && (
        <>
          {[288, 316].map((topPx, idx) => (
            <div
              key={topPx}
              className="absolute left-16 right-16 h-1 rounded-full bg-white/60"
              style={{
                top: `${topPx}px`,
                animation: `pandoku-water-shimmer ${3.8 + idx * 0.6}s ease-in-out ${-idx * 1.1}s infinite`,
              }}
            />
          ))}
          <FlutteringButterfly left="14%" topPx={235} wingPrimary="#FFD147" wingSecondary="#FF9F1C" delay={-1.2} scale={0.92} />
          <FlutteringButterfly left="76%" topPx={356} wingPrimary="#FF87B2" wingSecondary="#FFD1E3" delay={-3.4} scale={0.88} />
        </>
      )}

      {campaignId === 2 && (
        <>
          {[
            { left: '16%', topPx: 255, delay: -0.4 },
            { left: '80%', topPx: 332, delay: -1.6 },
            { left: '24%', topPx: 405, delay: -0.9 },
          ].map((sp, i) => (
            <svg
              key={i}
              viewBox="0 0 20 20"
              className="absolute w-3.5 h-3.5"
              style={{
                left: sp.left,
                top: `${sp.topPx}px`,
                animation: `pandoku-twinkle 2.8s ease-in-out ${sp.delay}s infinite`,
              }}
            >
              <path d="M10 1 L12.5 7.5 L19 10 L12.5 12.5 L10 19 L7.5 12.5 L1 10 L7.5 7.5 Z" fill="#FFD166" />
            </svg>
          ))}
        </>
      )}

      {campaignId === 3 && (
        <>
          {[278, 344, 404].map((topPx, idx) => (
            <div
              key={topPx}
              className="absolute left-12 right-12 h-1 rounded-full bg-white/58"
              style={{
                top: `${topPx}px`,
                animation: `pandoku-water-shimmer ${4.0 + idx * 0.55}s ease-in-out ${-idx * 0.9}s infinite`,
              }}
            />
          ))}
          <FlutteringButterfly left="74%" topPx={228} wingPrimary="#6CF2E8" wingSecondary="#C6FFF9" delay={-0.9} scale={0.9} />
          <FlutteringButterfly left="18%" topPx={365} wingPrimary="#FF9BC2" wingSecondary="#FFE1EE" delay={-2.8} scale={0.88} />
        </>
      )}

      {campaignId === 4 && (
        <>
          {[236, 336].map((topPx, idx) => (
            <div
              key={topPx}
              className="absolute -inset-x-12 h-14 rounded-full blur-xl bg-white/36"
              style={{
                top: `${topPx}px`,
                animation: `pandoku-mist-glide ${11 + idx * 2.5}s ease-in-out ${-idx * 3}s infinite`,
              }}
            />
          ))}
          {[
            { left: '16%', topPx: 256, delay: -0.5, size: 11 },
            { left: '82%', topPx: 312, delay: -1.4, size: 12 },
            { left: '26%', topPx: 392, delay: -0.9, size: 10 },
          ].map((flake, idx) => (
            <div
              key={idx}
              className="absolute rounded-full bg-white/90 shadow-[0_0_8px_rgba(255,255,255,0.9)]"
              style={{
                left: flake.left,
                top: `${flake.topPx}px`,
                width: `${flake.size * 0.5}px`,
                height: `${flake.size * 0.5}px`,
                animation: `pandoku-float-bob 3.6s ease-in-out ${flake.delay}s infinite`,
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}

/**
 * Compact Living Sky Overlay for Collapsed Campaign Header Banners!
 * Uses CSS negative animation-delay so clouds & shimmering sun are ALREADY moving on frame 1!
 */
export function CampaignHeaderLivingOverlay({ campaignId }: { campaignId: 1 | 2 | 3 | 4 }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div
        className="absolute left-0 top-1.5 w-16 opacity-75"
        style={{ animation: 'pandoku-drift-ltr 20s linear -7s infinite' }}
      >
        <StorybookCloud fill="#FFFFFF" shade="#EBF5F0" variant="puffy" />
      </div>
      <div
        className="absolute left-0 top-5 w-14 opacity-55"
        style={{ animation: 'pandoku-drift-ltr 26s linear -18s infinite' }}
      >
        <StorybookCloud fill="#FFFFFF" shade="#EBF5F0" variant="long" />
      </div>

      <div
        className="absolute -right-6 -top-6 w-28 h-28 rounded-full"
        style={{
          background:
            campaignId === 1
              ? 'radial-gradient(circle, rgba(255,235,120,0.72), transparent 70%)'
              : campaignId === 2
                ? 'radial-gradient(circle, rgba(255,196,74,0.75), transparent 70%)'
                : campaignId === 3
                  ? 'radial-gradient(circle, rgba(165,243,252,0.72), transparent 70%)'
                  : 'radial-gradient(circle, rgba(235,228,255,0.7), transparent 70%)',
          animation: 'pandoku-sun-pulse 4.5s ease-in-out infinite',
        }}
      />
    </div>
  );
}
