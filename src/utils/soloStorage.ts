import {
  AccessoryId,
  AccessorySlot,
  AnyTrickId,
  DEFAULT_HOME_TRICKS,
  PANDA_ACCESSORIES,
  PANDA_TRICKS,
  PandaTrickId,
} from '../shared/soloCatalog';

export interface LevelProgressRecord {
  stars: 1 | 2 | 3;
  bestTimeMs: number;
  bestXp?: number;
}

export function estimateLevelXp(
  stars: 1 | 2 | 3,
  bestTimeMs: number,
  par2Sec: number
): number {
  const solveSec = bestTimeMs / 1000;
  const speedRatio = Math.max(0, Math.min(1, 1 - solveSec / Math.max(20, par2Sec * 1.4)));
  const speedBonus = Math.round(speedRatio * 500);
  const starBonus = stars * 150;
  return Math.max(350, 1000 + speedBonus + starBonus);
}

export interface PlayerLevelInfo {
  level: number;
  totalXp: number;
  currentSlotXp: number;
  requiredSlotXp: number;
  progressRatio: number;
}

/**
 * Returns the XP required to advance through a given player level slot.
 * Level 1 -> 2 requires 10,000 XP, and each following slot increases by 50%
 * (10K, 15K, 22.5K, 34K, 50.5K, ...).
 */
export function getXpSlotRequirement(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  if (safeLevel === 1) return 10_000;
  const raw = 10_000 * Math.pow(1.5, safeLevel - 1);
  return Math.round(raw / 500) * 500;
}

export function getPlayerLevelInfo(totalXp: number): PlayerLevelInfo {
  const safeTotal = Math.max(0, Math.floor(totalXp));
  let level = 1;
  let remaining = safeTotal;
  let required = getXpSlotRequirement(level);

  while (remaining >= required && level < 99) {
    remaining -= required;
    level += 1;
    required = getXpSlotRequirement(level);
  }

  return {
    level,
    totalXp: safeTotal,
    currentSlotXp: remaining,
    requiredSlotXp: required,
    progressRatio: Math.max(0, Math.min(1, remaining / required)),
  };
}

export function formatCompactXp(xp: number): string {
  if (xp >= 1_000_000) return `${(xp / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (xp >= 10_000) return `${(xp / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  if (xp >= 1_000) return `${(xp / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(Math.floor(xp));
}

export interface SoloProgressState {
  /** In-game Bamboo currency earned by solving single-player levels & Daily Challenge */
  pandaFood: number;
  /** Lifetime player XP powering the Player Level meter */
  totalXp: number;
  /** Stored best stars & time per Campaign Level ID (1..40) */
  levelRecords: Record<number, LevelProgressRecord>;
  /** Stored Daily Challenge completions keyed by YYYY-MM-DD */
  dailyRecords: Record<string, LevelProgressRecord>;
  /** Purchased accessory IDs */
  unlockedAccessories: AccessoryId[];
  /** Currently equipped accessory per slot */
  equippedAccessories: Record<AccessorySlot, AccessoryId | null>;
  /** Purchased special panda animation / trick IDs */
  unlockedTricks: PandaTrickId[];
  /** 3 selected tricks pinned to the Home Screen quick action bar */
  homeTricks: [AnyTrickId, AnyTrickId, AnyTrickId];
  /** Unlocked via secret cheat code */
  allLevelsUnlocked?: boolean;
}

const STORAGE_KEY = 'pandoku_solo_progress_v1';
const SETTINGS_STORAGE_KEY = 'pandoku_game_settings_v1';

export interface GameSettings {
  showPatterns: boolean;
  autoX: boolean;
}

export function loadGameSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { showPatterns: false, autoX: true };
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      showPatterns: typeof parsed.showPatterns === 'boolean' ? parsed.showPatterns : false,
      autoX: typeof parsed.autoX === 'boolean' ? parsed.autoX : true,
    };
  } catch {
    return { showPatterns: false, autoX: true };
  }
}

export function saveGameSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}

export function createInitialSoloProgress(): SoloProgressState {
  return {
    pandaFood: 0,
    totalXp: 0,
    levelRecords: {},
    dailyRecords: {},
    unlockedAccessories: [],
    equippedAccessories: {
      head: null,
      face: null,
      neck: null,
      prop: null,
    },
    unlockedTricks: [],
    homeTricks: [...DEFAULT_HOME_TRICKS] as [AnyTrickId, AnyTrickId, AnyTrickId],
    allLevelsUnlocked: false,
  };
}

export function loadSoloProgress(): SoloProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialSoloProgress();
    const parsed = JSON.parse(raw) as Partial<SoloProgressState>;
    const base = createInitialSoloProgress();
    const loadedHome =
      Array.isArray(parsed.homeTricks) && parsed.homeTricks.length === 3
        ? (parsed.homeTricks as [AnyTrickId, AnyTrickId, AnyTrickId])
        : base.homeTricks;
    const levelRecords =
      parsed.levelRecords && typeof parsed.levelRecords === 'object' ? parsed.levelRecords : {};
    const dailyRecords =
      parsed.dailyRecords && typeof parsed.dailyRecords === 'object' ? parsed.dailyRecords : {};

    // Backfill totalXp gracefully for players who earned XP before totalXp existed
    let totalXp =
      typeof parsed.totalXp === 'number' && parsed.totalXp >= 0 ? Math.floor(parsed.totalXp) : 0;
    if (typeof parsed.totalXp !== 'number') {
      for (const rec of Object.values(levelRecords)) {
        if (rec) totalXp += rec.bestXp ?? estimateLevelXp(rec.stars, rec.bestTimeMs, 120);
      }
      for (const rec of Object.values(dailyRecords)) {
        if (rec) totalXp += rec.bestXp ?? estimateLevelXp(rec.stars, rec.bestTimeMs, 120);
      }
    }

    return {
      pandaFood: typeof parsed.pandaFood === 'number' && parsed.pandaFood >= 0 ? Math.floor(parsed.pandaFood) : 0,
      totalXp,
      levelRecords,
      dailyRecords,
      unlockedAccessories: Array.isArray(parsed.unlockedAccessories) ? parsed.unlockedAccessories : [],
      equippedAccessories: {
        ...base.equippedAccessories,
        ...(parsed.equippedAccessories ?? {}),
      },
      unlockedTricks: Array.isArray(parsed.unlockedTricks) ? parsed.unlockedTricks : [],
      homeTricks: loadedHome,
      allLevelsUnlocked: Boolean(parsed.allLevelsUnlocked),
    };
  } catch {
    return createInitialSoloProgress();
  }
}

export function saveSoloProgress(state: SoloProgressState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function addPlayerXp(state: SoloProgressState, deltaXp: number): SoloProgressState {
  const safeDelta = Math.max(0, Math.floor(deltaXp));
  if (safeDelta <= 0) return state;
  const nextState: SoloProgressState = {
    ...state,
    totalXp: state.totalXp + safeDelta,
  };
  saveSoloProgress(nextState);
  return nextState;
}

export function isCampaignLevelUnlocked(
  state: SoloProgressState,
  levelId: number
): boolean {
  if (state.allLevelsUnlocked) return true;
  if (levelId <= 1) return true;
  return Boolean(state.levelRecords[levelId - 1]);
}

export function isCampaignUnlocked(
  state: SoloProgressState,
  campaignId: 1 | 2 | 3 | 4
): boolean {
  if (state.allLevelsUnlocked) return true;
  if (campaignId === 1) return true;
  const requiredPrevLastLevelId = (campaignId - 1) * 10;
  return Boolean(state.levelRecords[requiredPrevLastLevelId]);
}

export function activateCheatUnlockAll(state: SoloProgressState): SoloProgressState {
  const nextState: SoloProgressState = {
    ...state,
    pandaFood: state.pandaFood + 100,
    allLevelsUnlocked: true,
  };
  saveSoloProgress(nextState);
  return nextState;
}

/**
 * Records a Campaign level solve. Awards up to 3 Bamboo total per level
 * and adds earned XP to the player's lifetime XP meter.
 */
export function recordCampaignLevelSolve(
  state: SoloProgressState,
  levelId: number,
  stars: 1 | 2 | 3,
  solveTimeMs: number,
  xpEarned?: number
): { nextState: SoloProgressState; foodEarned: number; isNewBest: boolean } {
  const prev = state.levelRecords[levelId];
  const prevStars = prev?.stars ?? 0;
  const foodEarned = Math.max(0, stars - prevStars);
  const nextStars = (Math.max(prevStars, stars) as 1 | 2 | 3);
  const nextBestTime = prev ? Math.min(prev.bestTimeMs, solveTimeMs) : solveTimeMs;
  const gainedXp = typeof xpEarned === 'number' && xpEarned > 0 ? Math.floor(xpEarned) : 0;
  const nextBestXp =
    typeof xpEarned === 'number'
      ? Math.max(prev?.bestXp ?? 0, xpEarned)
      : prev?.bestXp;
  const isNewBest =
    !prev ||
    stars > prevStars ||
    solveTimeMs < prev.bestTimeMs ||
    (typeof xpEarned === 'number' && xpEarned > (prev.bestXp ?? 0));

  const nextState: SoloProgressState = {
    ...state,
    pandaFood: state.pandaFood + foodEarned,
    totalXp: state.totalXp + gainedXp,
    levelRecords: {
      ...state.levelRecords,
      [levelId]: {
        stars: nextStars,
        bestTimeMs: nextBestTime,
        ...(typeof nextBestXp === 'number' ? { bestXp: nextBestXp } : {}),
      },
    },
  };
  saveSoloProgress(nextState);
  return { nextState, foodEarned, isNewBest };
}

/**
 * Records a Challenge of the Day solve. Awards up to 3 Bamboo per daily date
 * and adds earned XP to the player's lifetime XP meter.
 */
export function recordDailyChallengeSolve(
  state: SoloProgressState,
  dateKey: string,
  stars: 1 | 2 | 3,
  solveTimeMs: number,
  xpEarned?: number
): { nextState: SoloProgressState; foodEarned: number; isNewBest: boolean } {
  const prev = state.dailyRecords[dateKey];
  const prevStars = prev?.stars ?? 0;
  const foodEarned = Math.max(0, stars - prevStars);
  const nextStars = (Math.max(prevStars, stars) as 1 | 2 | 3);
  const nextBestTime = prev ? Math.min(prev.bestTimeMs, solveTimeMs) : solveTimeMs;
  const gainedXp = typeof xpEarned === 'number' && xpEarned > 0 ? Math.floor(xpEarned) : 0;
  const nextBestXp =
    typeof xpEarned === 'number'
      ? Math.max(prev?.bestXp ?? 0, xpEarned)
      : prev?.bestXp;
  const isNewBest =
    !prev ||
    stars > prevStars ||
    solveTimeMs < prev.bestTimeMs ||
    (typeof xpEarned === 'number' && xpEarned > (prev.bestXp ?? 0));

  const nextState: SoloProgressState = {
    ...state,
    pandaFood: state.pandaFood + foodEarned,
    totalXp: state.totalXp + gainedXp,
    dailyRecords: {
      ...state.dailyRecords,
      [dateKey]: {
        stars: nextStars,
        bestTimeMs: nextBestTime,
        ...(typeof nextBestXp === 'number' ? { bestXp: nextBestXp } : {}),
      },
    },
  };
  saveSoloProgress(nextState);
  return { nextState, foodEarned, isNewBest };
}

export function purchaseAccessory(
  state: SoloProgressState,
  accessoryId: AccessoryId
): SoloProgressState | null {
  const item = PANDA_ACCESSORIES.find((a) => a.id === accessoryId);
  if (!item) return null;
  if (state.unlockedAccessories.includes(accessoryId)) return null;
  if (state.pandaFood < item.price) return null;

  const nextState: SoloProgressState = {
    ...state,
    pandaFood: state.pandaFood - item.price,
    unlockedAccessories: [...state.unlockedAccessories, accessoryId],
    equippedAccessories: {
      ...state.equippedAccessories,
      [item.slot]: accessoryId, // Auto-equip upon purchase!
    },
  };
  saveSoloProgress(nextState);
  return nextState;
}

export function toggleEquipAccessory(
  state: SoloProgressState,
  accessoryId: AccessoryId
): SoloProgressState {
  const item = PANDA_ACCESSORIES.find((a) => a.id === accessoryId);
  if (!item || !state.unlockedAccessories.includes(accessoryId)) return state;
  const currentlyEquipped = state.equippedAccessories[item.slot] === accessoryId;
  const nextState: SoloProgressState = {
    ...state,
    equippedAccessories: {
      ...state.equippedAccessories,
      [item.slot]: currentlyEquipped ? null : accessoryId,
    },
  };
  saveSoloProgress(nextState);
  return nextState;
}

export function purchaseTrick(
  state: SoloProgressState,
  trickId: PandaTrickId
): SoloProgressState | null {
  const item = PANDA_TRICKS.find((t) => t.id === trickId);
  if (!item) return null;
  if (state.unlockedTricks.includes(trickId)) return null;
  if (state.pandaFood < item.price) return null;

  const nextState: SoloProgressState = {
    ...state,
    pandaFood: state.pandaFood - item.price,
    unlockedTricks: [...state.unlockedTricks, trickId],
  };
  saveSoloProgress(nextState);
  return nextState;
}

/**
 * Sets a specific Home Screen shortcut slot (0, 1, or 2) to an unlocked trick.
 * If the trick is already in another slot, swaps the two slots cleanly.
 */
export function assignHomeTrickSlot(
  state: SoloProgressState,
  slotIndex: 0 | 1 | 2,
  trickId: AnyTrickId
): SoloProgressState {
  const next: [AnyTrickId, AnyTrickId, AnyTrickId] = [...state.homeTricks];
  const existingIdx = next.indexOf(trickId);
  if (existingIdx === slotIndex) return state;
  if (existingIdx !== -1) {
    next[existingIdx] = next[slotIndex];
  }
  next[slotIndex] = trickId;
  const nextState: SoloProgressState = {
    ...state,
    homeTricks: next,
  };
  saveSoloProgress(nextState);
  return nextState;
}
