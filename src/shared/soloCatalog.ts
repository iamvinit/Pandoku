import { ColorMode, Difficulty } from './types';

export interface CampaignLevel {
  id: number;
  world: 1 | 2 | 3 | 4;
  /** 1..10 stage number within its campaign */
  stageNumber: number;
  title: string;
  difficulty: Difficulty;
  colorMode: ColorMode;
  seed: string;
  /** Solve time thresholds (in seconds) for 3 stars and 2 stars */
  par3Sec: number;
  par2Sec: number;
}

export interface CampaignSpec {
  id: 1 | 2 | 3 | 4;
  name: string;
  subtitle: string;
  difficulty: Difficulty;
  colorMode: ColorMode;
  gridLabel: string;
  modeLabel: 'Easy' | 'Hard';
  theme: {
    bgFrom: string;
    bgVia: string;
    bgTo: string;
    border: string;
    hillTop: string;
    hillBottom: string;
    accent: string;
    accentDark: string;
    trackStart: string;
    trackMid: string;
    trackEnd: string;
    bamboo: string;
  };
  levels: ReadonlyArray<CampaignLevel>;
}

function buildCampaignLevels(
  world: 1 | 2 | 3 | 4,
  difficulty: Difficulty,
  colorMode: ColorMode,
  seedPrefix: string,
  basePar3: number,
  basePar2: number,
  titles: ReadonlyArray<string>
): ReadonlyArray<CampaignLevel> {
  const idOffset = (world - 1) * 10;
  return titles.map((title, idx) => ({
    id: idOffset + idx + 1,
    world,
    stageNumber: idx + 1,
    title,
    difficulty,
    colorMode,
    seed: `pandoku-${seedPrefix}-lv${String(idx + 1).padStart(2, '0')}`,
    par3Sec: basePar3 + idx * 3,
    par2Sec: basePar2 + idx * 6,
  }));
}

/**
 * 4 Complete Campaigns (10 levels each = 40 levels total):
 * - Campaign 1: 6×6 Easy (Connected)
 * - Campaign 2: 6×6 Hard (Scattered)
 * - Campaign 3: 7×7 Easy (Connected)
 * - Campaign 4: 7×7 Hard (Scattered)
 */
export const CAMPAIGNS: ReadonlyArray<CampaignSpec> = [
  {
    id: 1,
    name: 'Bamboo Meadow',
    subtitle: '6×6 · Easy',
    difficulty: 'easy',
    colorMode: 'connected',
    gridLabel: '6×6',
    modeLabel: 'Easy',
    theme: {
      bgFrom: '#EAF7EC',
      bgVia: '#F2FBF0',
      bgTo: '#E2F2E5',
      border: '#C4DEC7',
      hillTop: '#D4ECD8',
      hillBottom: '#C1E2C7',
      accent: '#1B7A4E',
      accentDark: '#115032',
      trackStart: '#269A61',
      trackMid: '#1B7A4E',
      trackEnd: '#E5A210',
      bamboo: '#2A8C5A',
    },
    levels: buildCampaignLevels(1, 'easy', 'connected', 'c1-6e', 42, 90, [
      'Sprout Path',
      'Morning Dew',
      'River Bend',
      'Stone Lantern',
      'Moss Bridge',
      'Sunlit Clearing',
      'Cricket Hollow',
      'Tea Pavilion',
      'Willow Brook',
      'Meadow Crown',
    ]),
  },
  {
    id: 2,
    name: 'Amber Canyon',
    subtitle: '6×6 · Hard',
    difficulty: 'easy',
    colorMode: 'scattered',
    gridLabel: '6×6',
    modeLabel: 'Hard',
    theme: {
      bgFrom: '#FDF5E6',
      bgVia: '#FFFBF2',
      bgTo: '#F6EBD4',
      border: '#E6CFA0',
      hillTop: '#F3DFB8',
      hillBottom: '#EBD1A0',
      accent: '#C4770E',
      accentDark: '#8A5104',
      trackStart: '#E29822',
      trackMid: '#C4770E',
      trackEnd: '#B84B14',
      bamboo: '#B97822',
    },
    levels: buildCampaignLevels(2, 'easy', 'scattered', 'c2-6h', 58, 125, [
      'Scattered Leaves',
      'Stepping Stones',
      'Copper Ridge',
      'Canyon Echo',
      'Sunstone Arch',
      'Saffron Steps',
      'Golden Terraces',
      'Redwood Pass',
      'Windy Bluff',
      'Canyon Crest',
    ]),
  },
  {
    id: 3,
    name: 'Jade Valley',
    subtitle: '7×7 · Easy',
    difficulty: 'classic',
    colorMode: 'connected',
    gridLabel: '7×7',
    modeLabel: 'Easy',
    theme: {
      bgFrom: '#E7F6F4',
      bgVia: '#F1FBF9',
      bgTo: '#DDF0ED',
      border: '#B8DDD7',
      hillTop: '#C9E8E3',
      hillBottom: '#B5DDD6',
      accent: '#0E7C74',
      accentDark: '#09524D',
      trackStart: '#18A095',
      trackMid: '#0E7C74',
      trackEnd: '#D99B16',
      bamboo: '#19857C',
    },
    levels: buildCampaignLevels(3, 'classic', 'connected', 'c3-7e', 72, 150, [
      'Bamboo Crossing',
      'Emerald Mist',
      'Lotus Pond',
      'Terrace Falls',
      'Jade Pagoda',
      'Whispering Reeds',
      'Silver Stream',
      'Cloud Garden',
      'Mirror Lake',
      'Valley Heart',
    ]),
  },
  {
    id: 4,
    name: 'Misty Peaks',
    subtitle: '7×7 · Hard',
    difficulty: 'classic',
    colorMode: 'scattered',
    gridLabel: '7×7',
    modeLabel: 'Hard',
    theme: {
      bgFrom: '#EDF0FA',
      bgVia: '#F5F7FD',
      bgTo: '#E3E8F7',
      border: '#C4CEEA',
      hillTop: '#D6DDF3',
      hillBottom: '#C4CEEC',
      accent: '#4346B8',
      accentDark: '#2B2E82',
      trackStart: '#5E62D6',
      trackMid: '#4346B8',
      trackEnd: '#D99612',
      bamboo: '#5257AE',
    },
    levels: buildCampaignLevels(4, 'classic', 'scattered', 'c4-7h', 95, 195, [
      'Moonlit Grove',
      'Jade Mosaic',
      'Frost Trail',
      'Alpine Gate',
      'Starlight Steps',
      'Cloud Bridge',
      'Echo Summit',
      'Dragon Spine',
      'Sky Lanterns',
      'Peak Guardian',
    ]),
  },
];

export const ALL_CAMPAIGN_LEVELS: ReadonlyArray<CampaignLevel> = CAMPAIGNS.flatMap(
  (c) => c.levels
);

export const WORLD_1_LEVELS: ReadonlyArray<CampaignLevel> = CAMPAIGNS[0].levels;

export interface DailyChallengeSpec {
  dateKey: string;
  displayDate: string;
  title: string;
  difficulty: Difficulty;
  colorMode: ColorMode;
  seed: string;
  par3Sec: number;
  par2Sec: number;
}

export function getTodayDateKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDailyChallengeSpec(now = new Date()): DailyChallengeSpec {
  const dateKey = getTodayDateKey(now);
  const displayDate = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  // Deterministic daily rotation: balanced 6x6 Easy, 6x6 Hard, and 7x7 Easy puzzles
  const dayNum = now.getDate();
  const mod = dayNum % 3;
  if (mod === 0) {
    return {
      dateKey,
      displayDate,
      title: 'Daily Bamboo Grid',
      difficulty: 'classic',
      colorMode: 'connected',
      seed: `pandoku-daily-${dateKey}`,
      par3Sec: 80,
      par2Sec: 165,
    };
  }
  if (mod === 1) {
    return {
      dateKey,
      displayDate,
      title: 'Daily Grove Challenge',
      difficulty: 'easy',
      colorMode: 'scattered',
      seed: `pandoku-daily-${dateKey}`,
      par3Sec: 70,
      par2Sec: 145,
    };
  }
  return {
    dateKey,
    displayDate,
    title: 'Daily Emerald Sprint',
    difficulty: 'easy',
    colorMode: 'connected',
    seed: `pandoku-daily-${dateKey}`,
    par3Sec: 50,
    par2Sec: 110,
  };
}

/**
 * Calculates 1..3 stars (= 1..3 Panda Food) based on solve speed and mistakes.
 */
export function calculateSoloStars(
  solveTimeMs: number,
  mistakes: number,
  par3Sec: number,
  par2Sec: number
): 1 | 2 | 3 {
  const sec = solveTimeMs / 1000;
  if (sec <= par3Sec && mistakes <= 1) return 3;
  if (sec <= par2Sec && mistakes <= 3) return 2;
  return 1;
}

// ============================================================================
// 10 UNLOCKABLE 3D PANDA ACCESSORIES (Prices 2 - 20 Panda Food)
// ============================================================================
export type AccessorySlot = 'head' | 'face' | 'neck' | 'prop';

export type AccessoryId =
  | 'leaf_bandana'
  | 'red_bowtie'
  | 'cool_shades'
  | 'flower_clip'
  | 'party_hat'
  | 'chef_toque'
  | 'golden_scarf'
  | 'wizard_hat'
  | 'bamboo_staff'
  | 'royal_crown';

export interface PandaAccessoryItem {
  id: AccessoryId;
  name: string;
  slot: AccessorySlot;
  price: number;
  accentColor: string;
  description: string;
}

export const PANDA_ACCESSORIES: ReadonlyArray<PandaAccessoryItem> = [
  {
    id: 'leaf_bandana',
    name: 'Bamboo Bandana',
    slot: 'neck',
    price: 2,
    accentColor: '#2F9D66',
    description: 'Crisp forest bandana tied snugly around the neck',
  },
  {
    id: 'red_bowtie',
    name: 'Dapper Bowtie',
    slot: 'neck',
    price: 3,
    accentColor: '#DC2626',
    description: 'Bright crimson bowtie for sharp puzzle solvers',
  },
  {
    id: 'cool_shades',
    name: 'Cool Shades',
    slot: 'face',
    price: 4,
    accentColor: '#1E293B',
    description: 'Glossy dark shades with effortless chill energy',
  },
  {
    id: 'flower_clip',
    name: 'Sakura Blossom',
    slot: 'head',
    price: 5,
    accentColor: '#F472B6',
    description: 'Fresh cherry blossom tucked right beside the ear',
  },
  {
    id: 'party_hat',
    name: 'Party Cone Hat',
    slot: 'head',
    price: 6,
    accentColor: '#F59E0B',
    description: 'Festive golden party hat topped with a fluffy pom-pom',
  },
  {
    id: 'chef_toque',
    name: 'Bamboo Chef Hat',
    slot: 'head',
    price: 8,
    accentColor: '#64748B',
    description: 'Puffy master chef toque for gourmet bamboo snacks',
  },
  {
    id: 'golden_scarf',
    name: 'Cozy Winter Scarf',
    slot: 'neck',
    price: 10,
    accentColor: '#D97706',
    description: 'Warm amber scarf wrapped soft for mountain trails',
  },
  {
    id: 'wizard_hat',
    name: 'Starlight Hat',
    slot: 'head',
    price: 13,
    accentColor: '#4F46E5',
    description: 'Mystical indigo wizard hat ringed in starry gold',
  },
  {
    id: 'bamboo_staff',
    name: 'Jade Magic Staff',
    slot: 'prop',
    price: 16,
    accentColor: '#10B981',
    description: 'Glowing emerald crystal bamboo wand held at its side',
  },
  {
    id: 'royal_crown',
    name: 'Royal Crown',
    slot: 'head',
    price: 20,
    accentColor: '#EAB308',
    description: 'Jeweled golden crown worthy of the Pandoku Champion',
  },
];

// ============================================================================
// 3 DEFAULT UNLOCKED + 10 UNLOCKABLE 3D PANDA ANIMATIONS (Prices 2 - 20 Food)
// ============================================================================
export type DefaultTrickId = 'munch' | 'pet' | 'dance';

export type PandaTrickId =
  | 'wave'
  | 'belly_drum'
  | 'backflip'
  | 'dizzy_spin'
  | 'sleepy_nap'
  | 'kung_fu'
  | 'juggle'
  | 'moonwalk'
  | 'levitate'
  | 'super_star';

export type AnyTrickId = DefaultTrickId | PandaTrickId;

export interface PandaTrickItem {
  id: AnyTrickId;
  name: string;
  shortLabel: string;
  price: number;
  isDefault?: boolean;
  accentColor: string;
  speechLine: string;
  description: string;
}

export const DEFAULT_PANDA_TRICKS: ReadonlyArray<PandaTrickItem> = [
  {
    id: 'munch',
    name: 'Bamboo Feed',
    shortLabel: 'Feed',
    price: 0,
    isDefault: true,
    accentColor: '#1B7A4E',
    speechLine: 'Nom nom nom! Yummy crunchy bamboo!',
    description: 'Munches a crispy bamboo stalk happily',
  },
  {
    id: 'pet',
    name: 'Cozy Ear Rub',
    shortLabel: 'Pet',
    price: 0,
    isDefault: true,
    accentColor: '#E11D48',
    speechLine: 'Hehe! Dat feels sooo squishy-soft!',
    description: 'Sweet head sway with happy squinting eyes',
  },
  {
    id: 'dance',
    name: 'Bamboo Dance',
    shortLabel: 'Dance',
    price: 0,
    isDefault: true,
    accentColor: '#D97706',
    speechLine: 'Wiggle wiggle! Look at my silly dance!',
    description: 'Bouncy 360 spin dance with cheering paws',
  },
];

export const PANDA_TRICKS: ReadonlyArray<PandaTrickItem> = [
  {
    id: 'wave',
    name: 'Friendly Wave',
    shortLabel: 'Wave',
    price: 2,
    accentColor: '#1B7A4E',
    speechLine: 'Hiiii bestie!! Wanna play wif me?',
    description: 'Sweet head tilt and enthusiastic paw wave',
  },
  {
    id: 'belly_drum',
    name: 'Bamboo Drum',
    shortLabel: 'Drum',
    price: 3,
    accentColor: '#D97706',
    speechLine: 'Boom boom bam! I am a big drummer!',
    description: 'Plays a joyful rhythmic solo on a 3D festival drum',
  },
  {
    id: 'backflip',
    name: 'Panda Flip',
    shortLabel: 'Flip',
    price: 5,
    accentColor: '#2563EB',
    speechLine: 'Whoaaa! Look how high I can jump!',
    description: 'Soars into the air for a clean 360° somersault',
  },
  {
    id: 'dizzy_spin',
    name: 'Whirlwind Spin',
    shortLabel: 'Spin',
    price: 6,
    accentColor: '#7C3AED',
    speechLine: 'Wheeeee! Whoa, my head is all wobbly!',
    description: 'High-speed triple tornado spin with arms wide',
  },
  {
    id: 'sleepy_nap',
    name: 'Cozy Nap',
    shortLabel: 'Nap',
    price: 8,
    accentColor: '#0284C7',
    speechLine: 'Zzz... yummy bamboo clouds... zzz...',
    description: 'Peaceful snooze with gentle sleepy sway',
  },
  {
    id: 'kung_fu',
    name: 'Bamboo Kung Fu',
    shortLabel: 'Kung Fu',
    price: 10,
    accentColor: '#DC2626',
    speechLine: 'Hi-yah!! Super ninja panda power!',
    description: 'Crisp double karate chops and martial arts kick',
  },
  {
    id: 'juggle',
    name: 'Berry Juggle',
    shortLabel: 'Juggle',
    price: 12,
    accentColor: '#EA580C',
    speechLine: 'Ooh ooh! Catch the bouncy berries!',
    description: 'Juggles 3 colorful 3D berries in a smooth aerial arc',
  },
  {
    id: 'moonwalk',
    name: 'Moonwalk Glide',
    shortLabel: 'Glide',
    price: 15,
    accentColor: '#4F46E5',
    speechLine: 'Slidey paws! Hee-hee, watch me zoom!',
    description: 'Silky side-to-side glide with alternating paw taps',
  },
  {
    id: 'levitate',
    name: 'Zen Levitate',
    shortLabel: 'Zen',
    price: 18,
    accentColor: '#0D9488',
    speechLine: 'Ommm... I am floating like a fluffy cloud!',
    description: 'Meditates mid-air with calm floating balance',
  },
  {
    id: 'super_star',
    name: 'Superstar Finale',
    shortLabel: 'Superstar',
    price: 20,
    accentColor: '#CA8A04',
    speechLine: 'TA-DA!! Yay yay yay, super star me!',
    description: 'Triple victory leaps, 360 spin, and golden sparkle burst',
  },
];

export const ALL_PANDA_TRICKS: ReadonlyArray<PandaTrickItem> = [
  ...DEFAULT_PANDA_TRICKS,
  ...PANDA_TRICKS,
];

export const DEFAULT_HOME_TRICKS: [AnyTrickId, AnyTrickId, AnyTrickId] = [
  'munch',
  'pet',
  'dance',
];
