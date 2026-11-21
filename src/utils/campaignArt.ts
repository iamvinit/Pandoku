import campaignBgBamboo from '../assets/images/campaign_plate_bamboo_1795172623998.jpg';
import campaignBgCanyon from '../assets/images/campaign_plate_canyon_1795172624897.jpg';
import campaignBgJade from '../assets/images/campaign_plate_jade_1795172648084.jpg';
import campaignBgPeaks from '../assets/images/campaign_plate_peaks_1795172627384.jpg';
import outfitShopBg from '../assets/images/panda_outfit_shop_bg_1795178670035.jpg';
import trickSchoolBg from '../assets/images/panda_trick_school_bg_1795178670693.jpg';
import duelArenaBg from '../assets/images/duel_dojo_fullscreen_1795182908434.jpg';

export const CAMPAIGN_BG_IMAGES: Record<1 | 2 | 3 | 4, string> = {
  1: campaignBgBamboo,
  2: campaignBgCanyon,
  3: campaignBgJade,
  4: campaignBgPeaks,
};

export const SCENE_BG_IMAGES = {
  outfitShop: outfitShopBg,
  trickSchool: trickSchoolBg,
  duelArena: duelArenaBg,
} as const;

let preloadStarted = false;
const preloadedRefs: HTMLImageElement[] = [];

/**
 * Eagerly fetches & decodes all campaign, shop, school, and duel backdrop plates at app startup
 * so entering any screen displays crisp art instantaneously without pop-in.
 */
export function preloadCampaignArt(): void {
  if (preloadStarted || typeof window === 'undefined') return;
  preloadStarted = true;

  const urls = [
    ...Object.values(CAMPAIGN_BG_IMAGES),
    ...Object.values(SCENE_BG_IMAGES),
  ];
  for (const url of urls) {
    const img = new Image();
    img.decoding = 'sync';
    img.src = url;
    if (typeof img.decode === 'function') {
      img.decode().catch(() => {});
    }
    preloadedRefs.push(img);
  }
}
