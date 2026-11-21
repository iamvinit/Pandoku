import type { ColorMode, Difficulty } from './types.ts';

export interface DailyChallengeTemplate {
  dayOfMonth: number; // 1..31
  title: string;
  difficulty: Difficulty;
  colorMode: ColorMode;
  seed: string;
  par3Sec: number;
  par2Sec: number;
  accentFrom: string;
  accentTo: string;
  borderColor: string;
}

export interface ServerDailyChallenge {
  dayOfMonth: number;
  dateKey: string;
  displayDate: string;
  relativeLabel: string;
  isToday: boolean;
  title: string;
  difficulty: Difficulty;
  colorMode: ColorMode;
  seed: string;
  par3Sec: number;
  par2Sec: number;
  accentFrom: string;
  accentTo: string;
  borderColor: string;
}

const DAILY_TITLES_31: ReadonlyArray<string> = [
  'Bamboo Sunrise',
  'Sprout Sprint',
  'Dewdrop Dash',
  'Emerald Trail',
  'Sunbeam Grove',
  'Pebble Hop',
  'Mossy Hollow',
  'Golden Stalk',
  'Cricket Chorus',
  'River Breeze',
  'Lantern Glow',
  'Lotus Leap',
  'Meadow Bounce',
  'Jade Ripple',
  'Canyon Spark',
  'Cloud Tumble',
  'Willow Swing',
  'Honeycomb Path',
  'Starlight Sprout',
  'Panda Picnic',
  'Waterfall Mist',
  'Amber Steps',
  'Cherry Flutter',
  'Dragonfly Glide',
  'Rainbow Clearing',
  'Moonbeam Trail',
  'Acorn Roll',
  'Breezy Terrace',
  'Crystal Brook',
  'Summit Cheer',
  'Festival Finale',
];

const CARD_THEMES = [
  { from: '#FFF9E8', to: '#ECFDF3', border: '#E9CA79' },
  { from: '#ECFEFF', to: '#EEF2FF', border: '#93D5EA' },
  { from: '#FFF1F2', to: '#FEF9C3', border: '#F6B4BE' },
  { from: '#F0FDF4', to: '#FEFCE8', border: '#8BD9A8' },
  { from: '#FFF7ED', to: '#FDF2F8', border: '#F5B98A' },
];

/**
 * 31-Day Rotating Challenge of the Day Bank (Day 1 through Day 31).
 * Repeats forever every month based on day-of-month (1..31).
 */
export const DAILY_CHALLENGE_BANK_31: ReadonlyArray<DailyChallengeTemplate> =
  DAILY_TITLES_31.map((title, idx) => {
    const day = idx + 1;
    const mod = day % 4;
    // Kid-friendly balanced rotation: 6×6 Easy, 6×6 Hard, 7×7 Easy, 6×6 Easy
    let difficulty: Difficulty = 'easy';
    let colorMode: ColorMode = 'connected';
    let par3Sec = 48;
    let par2Sec = 105;

    if (mod === 1) {
      difficulty = 'easy';
      colorMode = 'connected';
      par3Sec = 46;
      par2Sec = 100;
    } else if (mod === 2) {
      difficulty = 'easy';
      colorMode = 'scattered';
      par3Sec = 64;
      par2Sec = 138;
    } else if (mod === 3) {
      difficulty = 'classic';
      colorMode = 'connected';
      par3Sec = 78;
      par2Sec = 160;
    } else {
      difficulty = 'classic';
      colorMode = 'scattered';
      par3Sec = 95;
      par2Sec = 195;
    }

    const palette = CARD_THEMES[idx % CARD_THEMES.length];

    return {
      dayOfMonth: day,
      title,
      difficulty,
      colorMode,
      seed: `pandoku-daily-m31-day-${String(day).padStart(2, '0')}`,
      par3Sec,
      par2Sec,
      accentFrom: palette.from,
      accentTo: palette.to,
      borderColor: palette.border,
    };
  });

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Builds the scrollable story list of daily challenges ending on Today
 * (e.g. past 14 days + Today = 15 swipeable cards, each pulling from the 31-day repeating bank).
 */
export function buildDailyChallengeFeed(
  now = new Date(),
  daysCount = 15
): ServerDailyChallenge[] {
  const count = Math.max(1, Math.min(31, daysCount));
  const result: ServerDailyChallenge[] = [];
  const todayBase = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Chronological order: oldest on the left -> Today on the far right (swipe left/right like stories)
  for (let offset = count - 1; offset >= 0; offset--) {
    const d = new Date(todayBase);
    d.setDate(todayBase.getDate() - offset);
    const dayOfMonth = d.getDate(); // 1..31
    const template =
      DAILY_CHALLENGE_BANK_31[(dayOfMonth - 1) % DAILY_CHALLENGE_BANK_31.length];

    const displayDate = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    const relativeLabel =
      offset === 0
        ? 'Today'
        : offset === 1
          ? 'Yesterday'
          : `${offset} days ago`;

    result.push({
      dayOfMonth,
      dateKey: formatDateKey(d),
      displayDate,
      relativeLabel,
      isToday: offset === 0,
      title: template.title,
      difficulty: template.difficulty,
      colorMode: template.colorMode,
      seed: template.seed,
      par3Sec: template.par3Sec,
      par2Sec: template.par2Sec,
      accentFrom: template.accentFrom,
      accentTo: template.accentTo,
      borderColor: template.borderColor,
    });
  }

  return result;
}
