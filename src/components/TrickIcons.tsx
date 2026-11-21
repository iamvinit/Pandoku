import React from 'react';
import { AnyTrickId } from '../shared/soloCatalog';

interface TrickIconProps {
  id: AnyTrickId;
  className?: string;
}

/**
 * 13 bespoke, kid-friendly, hand-crafted SVG icons — one unique intuitive graphic
 * for every single Panda animation/trick.
 */
export function TrickIcon({ id, className = 'w-5 h-5' }: TrickIconProps) {
  switch (id) {
    case 'munch':
      // Fresh crispy bamboo shoot with tiny bite notch & leaf
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path
            d="M19 11C21.5 7.5 26 6.5 28.5 8C26.5 11.2 22.8 12.4 19 11Z"
            fill="#4ADE80"
            stroke="#14532D"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <rect
            x="11"
            y="5"
            width="8"
            height="10"
            rx="2.5"
            fill="#34D399"
            stroke="#14532D"
            strokeWidth="1.8"
          />
          <rect
            x="10.5"
            y="16"
            width="9"
            height="11"
            rx="2.5"
            fill="#10B981"
            stroke="#14532D"
            strokeWidth="1.8"
          />
          <line x1="9.5" y1="15.5" x2="20.5" y2="15.5" stroke="#14532D" strokeWidth="2.2" strokeLinecap="round" />
          {/* Cute little bite-mark crescent */}
          <circle cx="11" cy="10" r="2.2" fill="#E7F5EC" />
        </svg>
      );

    case 'pet':
      // Cozy warm heart with cute panda paw-pad print inside
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path
            d="M16 27.2C16 27.2 5 20.5 5 12.2C5 8.5 7.9 5.8 11.3 5.8C13.5 5.8 15.2 7 16 8.6C16.8 7 18.5 5.8 20.7 5.8C24.1 5.8 27 8.5 27 12.2C27 20.5 16 27.2 16 27.2Z"
            fill="#FB7185"
            stroke="#9F1239"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M9.6 10.6C10.3 9.4 11.5 8.8 12.8 9"
            stroke="#FFE4E6"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'dance':
      // Playful twin bouncing music notes with rhythm wave
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path
            d="M12.5 22.5V8.5L25 6V19.5"
            stroke="#92400E"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M12.5 12.8L25 10.3" stroke="#92400E" strokeWidth="2.2" strokeLinecap="round" />
          <ellipse cx="9.5" cy="23.2" rx="4" ry="3.1" fill="#F59E0B" stroke="#92400E" strokeWidth="1.8" />
          <ellipse cx="22" cy="20.4" rx="4" ry="3.1" fill="#FBBF24" stroke="#92400E" strokeWidth="1.8" />
        </svg>
      );

    case 'wave':
      // Friendly waving panda paw with happy motion arcs
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          {/* Motion arcs */}
          <path d="M5 11C5.5 8 7.5 6 10 5.5" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" />
          <path d="M27 11C26.5 8 24.5 6 22 5.5" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" />
          {/* Cute dark panda paw */}
          <ellipse cx="16" cy="20.5" rx="7.5" ry="6.5" fill="#1F2937" stroke="#111827" strokeWidth="1.6" />
          {/* 3 cute toe beans + palm pad */}
          <circle cx="10.2" cy="12" r="2.6" fill="#1F2937" />
          <circle cx="16" cy="10" r="2.8" fill="#1F2937" />
          <circle cx="21.8" cy="12" r="2.6" fill="#1F2937" />
          <ellipse cx="16" cy="21" rx="3.8" ry="2.9" fill="#E5E7EB" />
        </svg>
      );

    case 'belly_drum':
      // Red & gold festival Taiko drum with two crossed drumsticks
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          {/* Crossed drumsticks on top */}
          <line x1="7" y1="6" x2="15" y2="12.5" stroke="#92400E" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="6.5" cy="5.8" r="2" fill="#EF4444" />
          <line x1="25" y1="6" x2="17" y2="12.5" stroke="#92400E" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="25.5" cy="5.8" r="2" fill="#EF4444" />
          {/* Drum shell */}
          <rect x="6.5" y="13.5" width="19" height="12.5" rx="4" fill="#DC2626" stroke="#7F1D1D" strokeWidth="1.8" />
          {/* Cream drumhead oval */}
          <ellipse cx="16" cy="14" rx="9.5" ry="3.8" fill="#FEF3C7" stroke="#B45309" strokeWidth="1.8" />
          {/* Gold tack band */}
          <circle cx="11" cy="21" r="1.3" fill="#FBBF24" />
          <circle cx="16" cy="21.5" r="1.3" fill="#FBBF24" />
          <circle cx="21" cy="21" r="1.3" fill="#FBBF24" />
        </svg>
      );

    case 'backflip':
      // Bouncy circular somersault flip arrow
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path
            d="M23.5 11.5C21.8 8 18.2 6 14.2 6.5C9.2 7.1 5.6 11.6 6.2 16.7C6.8 21.8 11.4 25.4 16.5 24.8C20.2 24.4 23.2 21.8 24.3 18.4"
            stroke="#EA580C"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M24.8 6.5L24.5 13L18 12.2"
            stroke="#EA580C"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Little center star */}
          <path
            d="M16 11.8L17.3 14.5L20.2 14.9L18.1 16.9L18.6 19.8L16 18.4L13.4 19.8L13.9 16.9L11.8 14.9L14.7 14.5L16 11.8Z"
            fill="#FBBF24"
            stroke="#B45309"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'dizzy_spin':
      // Playful cartoon spiral swirl with tiny spinning star
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path
            d="M16 16.5C16 14.8 17.5 13.8 19 14.4C20.8 15.1 21.2 17.6 20 19.3C18.3 21.7 14.5 21.9 12.3 19.8C9.5 17.2 9.6 12.4 12.6 9.8C16.2 6.7 22 7.4 24.8 11.3C27 14.4 26.8 18.8 24.6 22"
            stroke="#9333EA"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <circle cx="8" cy="23.5" r="2.2" fill="#F59E0B" />
          <circle cx="25" cy="7.5" r="1.8" fill="#C084FC" />
        </svg>
      );

    case 'sleepy_nap':
      // Cozy crescent moon + floating Zzz
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path
            d="M19.5 23.5C13.8 24.4 8.7 20.1 8.5 14.3C8.3 10.1 10.8 6.4 14.6 5C12.7 8.4 13.4 12.9 16.3 15.7C19 18.3 23 19 26.2 17.6C25.2 20.8 22.7 23 19.5 23.5Z"
            fill="#60A5FA"
            stroke="#1D4ED8"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M18.5 7.5H23.5L18.5 13H23.8"
            stroke="#1D4ED8"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'kung_fu':
      // Martial arts red headband with flying ribbon tails & power spark
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          {/* Flowing red ribbon tails */}
          <path
            d="M21 15L28 11.5L26 16.5L29 20.5L21 18.5"
            fill="#EF4444"
            stroke="#991B1B"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Headband loop */}
          <rect x="4.5" y="12" width="17" height="7" rx="3.2" fill="#EF4444" stroke="#991B1B" strokeWidth="1.8" />
          {/* Golden center emblem */}
          <circle cx="13" cy="15.5" r="2.2" fill="#FDE047" />
          {/* Action lines */}
          <path d="M6 8.5L10 9.5" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
          <path d="M6 23.5L10.5 22.5" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'juggle':
      // 3 bright colorful juggling berries arcing through the air
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <path
            d="M8.5 21.5C9.5 10.5 22.5 10.5 23.5 21.5"
            stroke="#CBD5E1"
            strokeWidth="2"
            strokeDasharray="3 3"
            strokeLinecap="round"
          />
          <circle cx="16" cy="8.5" r="4.2" fill="#F43F5E" stroke="#9F1239" strokeWidth="1.6" />
          <circle cx="8" cy="21" r="4.2" fill="#3B82F6" stroke="#1E40AF" strokeWidth="1.6" />
          <circle cx="24" cy="21" r="4.2" fill="#F59E0B" stroke="#92400E" strokeWidth="1.6" />
          {/* Tiny specular glints */}
          <circle cx="14.7" cy="7.2" r="1.1" fill="#FFFFFF" />
          <circle cx="6.7" cy="19.7" r="1.1" fill="#FFFFFF" />
          <circle cx="22.7" cy="19.7" r="1.1" fill="#FFFFFF" />
        </svg>
      );

    case 'moonwalk':
      // Cool sliding shoe with sparkling glide trail
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          {/* Speed glide lines */}
          <line x1="4" y1="22" x2="10" y2="22" stroke="#6366F1" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="6" y1="18" x2="10.5" y2="18" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" />
          {/* Funky tilted dance sneaker */}
          <path
            d="M12.5 13L18.5 10.5L21 15.5L26.5 17.5C27.8 18 28.2 19.6 27.6 21L27 22.5H12.5V13Z"
            fill="#4F46E5"
            stroke="#312E81"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <line x1="12" y1="23.2" x2="27.5" y2="23.2" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="8.5" cy="10" r="2" fill="#FBBF24" />
        </svg>
      );

    case 'levitate':
      // Peaceful glowing floating lotus orb above levitation rings
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          {/* Floating emerald-teal lotus gem */}
          <path
            d="M16 5L22.5 12.5L16 19L9.5 12.5L16 5Z"
            fill="#2DD4BF"
            stroke="#0F766E"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M16 8L19.2 12.5L16 15.8L12.8 12.5L16 8Z" fill="#CCFBF1" />
          {/* Levitation rings beneath */}
          <ellipse cx="16" cy="23" rx="9.5" ry="2.6" stroke="#14B8A6" strokeWidth="2" />
          <ellipse cx="16" cy="27" rx="6" ry="1.8" stroke="#5EEAD4" strokeWidth="1.8" />
        </svg>
      );

    case 'super_star':
      // Radiant golden superstar with celebratory burst rays
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <line x1="16" y1="2.5" x2="16" y2="5.5" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="5.5" y1="8.5" x2="8" y2="10.2" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="26.5" y1="8.5" x2="24" y2="10.2" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" />
          <path
            d="M16 7.2L19 13.3L25.8 14.3L20.9 19L22.1 25.8L16 22.6L9.9 25.8L11.1 19L6.2 14.3L13 13.3L16 7.2Z"
            fill="#FACC15"
            stroke="#B45309"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="16.8" r="2.2" fill="#FEF9C3" />
        </svg>
      );

    default:
      return null;
  }
}
