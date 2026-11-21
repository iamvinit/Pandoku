// Client-only static ES imports for all 31 rotating Daily Challenge storybook illustrations.
// Keep this module strictly client-side (never imported by server.ts).
import daily01Sunrise from '../assets/images/daily_01_sunrise_1795184338163.jpg';
import daily02Sprout from '../assets/images/daily_02_sprout_1795183426244.jpg';
import daily03Dewdrop from '../assets/images/daily_03_dewdrop_1795184610875.jpg';
import daily04Emerald from '../assets/images/daily_04_emerald_1795184330289.jpg';
import daily05Sunbeam from '../assets/images/daily_05_sunbeam_1795183451854.jpg';
import daily06Pebble from '../assets/images/daily_06_pebble_1795184444934.jpg';
import daily07Mossy from '../assets/images/daily_07_mossy_1795183454034.jpg';
import daily08Golden from '../assets/images/daily_08_golden_1795184377275.jpg';
import daily09Cricket from '../assets/images/daily_09_cricket_1795183455781.jpg';
import daily10River from '../assets/images/daily_10_river_1795184331943.jpg';
import daily11Lantern from '../assets/images/daily_11_lantern_1795183455029.jpg';
import daily12Lotus from '../assets/images/daily_12_lotus_1795184342210.jpg';
import daily13Meadow from '../assets/images/daily_13_meadow_1795184338973.jpg';
import daily14Jade from '../assets/images/daily_14_jade_1795184332333.jpg';
import daily15Canyon from '../assets/images/daily_15_canyon_1795183455160.jpg';
import daily16Cloud from '../assets/images/daily_16_cloud_1795184093561.jpg';
import daily17Willow from '../assets/images/daily_17_willow_1795184334119.jpg';
import daily18Honeycomb from '../assets/images/daily_18_honeycomb_1795184727632.jpg';
import daily19Starlight from '../assets/images/daily_19_starlight_1795183455193.jpg';
import daily20Picnic from '../assets/images/daily_20_picnic_1795184722244.jpg';
import daily21Waterfall from '../assets/images/daily_21_waterfall_1795183457336.jpg';
import daily22Amber from '../assets/images/daily_22_amber_1795183457303.jpg';
import daily23Cherry from '../assets/images/daily_23_cherry_1795183454005.jpg';
import daily24Dragonfly from '../assets/images/daily_24_dragonfly_1795184721003.jpg';
import daily25Rainbow from '../assets/images/daily_25_rainbow_1795184724676.jpg';
import daily26Moonbeam from '../assets/images/daily_26_moonbeam_1795183455631.jpg';
import daily27Acorn from '../assets/images/daily_27_acorn_1795184773746.jpg';
import daily28Terrace from '../assets/images/daily_28_terrace_1795183426728.jpg';
import daily29Brook from '../assets/images/daily_29_brook_1795183426693.jpg';
import daily30Summit from '../assets/images/daily_30_summit_1795184735139.jpg';
import daily31Festival from '../assets/images/daily_31_festival_1795183457861.jpg';

export const DAILY_CHALLENGE_IMAGES: Record<number, string> = {
  1: daily01Sunrise,
  2: daily02Sprout,
  3: daily03Dewdrop,
  4: daily04Emerald,
  5: daily05Sunbeam,
  6: daily06Pebble,
  7: daily07Mossy,
  8: daily08Golden,
  9: daily09Cricket,
  10: daily10River,
  11: daily11Lantern,
  12: daily12Lotus,
  13: daily13Meadow,
  14: daily14Jade,
  15: daily15Canyon,
  16: daily16Cloud,
  17: daily17Willow,
  18: daily18Honeycomb,
  19: daily19Starlight,
  20: daily20Picnic,
  21: daily21Waterfall,
  22: daily22Amber,
  23: daily23Cherry,
  24: daily24Dragonfly,
  25: daily25Rainbow,
  26: daily26Moonbeam,
  27: daily27Acorn,
  28: daily28Terrace,
  29: daily29Brook,
  30: daily30Summit,
  31: daily31Festival,
};

export function getDailyChallengeImage(dayOfMonth: number): string {
  const normalized = (((Math.floor(dayOfMonth) - 1) % 31) + 31) % 31 + 1;
  return DAILY_CHALLENGE_IMAGES[normalized] ?? daily01Sunrise;
}

let dailyPreloadStarted = false;
const preloadedDailyRefs: HTMLImageElement[] = [];

/**
 * Eagerly fetches & decodes Daily Challenge illustrations starting from Today
 * and walking backward through the 15-day carousel feed, so opening Daily Challenge
 * and swiping cards displays every artwork instantaneously with zero pop-in.
 */
export function preloadDailyChallengeArt(referenceDate: Date = new Date()): void {
  if (dailyPreloadStarted || typeof window === 'undefined') return;
  dailyPreloadStarted = true;

  // Build priority-ordered unique day list: Today first, then previous 14 days in the feed, then rest
  const seenDays = new Set<number>();
  const feedDays: number[] = [];
  for (let offset = 0; offset < 15; offset++) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - offset);
    const dayNum = d.getDate();
    if (!seenDays.has(dayNum)) {
      seenDays.add(dayNum);
      feedDays.push(dayNum);
    }
  }

  const remainingDays: number[] = [];
  for (let dayNum = 1; dayNum <= 31; dayNum++) {
    if (!seenDays.has(dayNum)) {
      remainingDays.push(dayNum);
    }
  }

  const loadOne = (dayNum: number, highPriority: boolean) => {
    const url = getDailyChallengeImage(dayNum);
    const img = new Image();
    img.decoding = 'sync';
    img.referrerPolicy = 'no-referrer';
    if (highPriority && 'fetchPriority' in img) {
      (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = 'high';
    }
    img.src = url;
    if (typeof img.decode === 'function') {
      img.decode().catch(() => {});
    }
    preloadedDailyRefs.push(img);
  };

  // Immediately preload the 15 visible carousel days (Today + top neighbors at high priority)
  feedDays.forEach((dayNum, idx) => {
    loadOne(dayNum, idx < 4);
  });

  // Warm the rest of the 31-day bank shortly after without competing with the active feed
  const warmRest = () => {
    for (const dayNum of remainingDays) {
      loadOne(dayNum, false);
    }
  };
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(warmRest, { timeout: 1200 });
  } else {
    window.setTimeout(warmRest, 300);
  }
}
