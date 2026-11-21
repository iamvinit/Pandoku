export type Difficulty = 'easy' | 'classic' | 'master';

export interface DifficultyConfig {
  id: Difficulty;
  label: string;
  size: number;
  parSeconds: number;
  maxRoundSeconds: number;
  description: string;
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: {
    id: 'easy',
    label: 'Quick 6×6',
    size: 6,
    parSeconds: 30,
    maxRoundSeconds: 120,
    description: '6 bamboo territories · brisk warm-up duel',
  },
  classic: {
    id: 'classic',
    label: 'Classic 7×7',
    size: 7,
    parSeconds: 45,
    maxRoundSeconds: 150,
    description: '7 bamboo territories · balanced tactical play',
  },
  master: {
    id: 'master',
    label: 'Master 8×8',
    size: 8,
    parSeconds: 70,
    maxRoundSeconds: 180,
    description: '8 bamboo territories · deep spatial deduction',
  },
};

export type ColorMode = 'connected' | 'scattered';

export const MIN_ROUND_TIME_SECONDS = 15;
export const MAX_ROUND_TIME_SECONDS = 900; // 15 minutes
export const DEFAULT_ROUND_TIME_SECONDS = 180; // 3:00

export function clampRoundTimeSeconds(raw?: number): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return DEFAULT_ROUND_TIME_SECONDS;
  }
  return Math.max(MIN_ROUND_TIME_SECONDS, Math.min(MAX_ROUND_TIME_SECONDS, Math.round(raw)));
}

export function formatDurationClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export interface CellCoord {
  row: number;
  col: number;
}

export type CellMark = 'empty' | 'x' | 'panda';

export interface PandokuPuzzle {
  id: string;
  size: number;
  difficulty: Difficulty;
  colorMode: ColorMode;
  /** regions[row][col] = regionId (0..size-1) */
  regions: number[][];
}

export interface PandokuPuzzleWithSolution extends PandokuPuzzle {
  /** solution[row] = col index where the panda belongs */
  solution: number[];
}

export type ConflictReason = 'row' | 'col' | 'region' | 'adjacent';

export interface BoardValidation {
  valid: boolean;
  solved: boolean;
  pandaCount: number;
  /** Keyed by `${row},${col}` */
  conflictCells: Record<string, ConflictReason[]>;
  summaryMessage: string | null;
}

export interface PlayerInfo {
  id: string;
  name: string;
  avatarIndex: 0 | 1;
  ready: boolean;
  connected: boolean;
  score: number;
  /** Number of pandas currently placed during an active round */
  pandasPlaced: number;
  /** Solve time in ms for the current round, or null if not yet solved */
  roundSolveTimeMs: number | null;
  roundPointsEarned: number;
  mistakesInRound: number;
  isHost: boolean;
}

export interface RoundResultEntry {
  playerId: string;
  playerName: string;
  solveTimeMs: number | null;
  basePoints: number;
  speedBonus: number;
  firstFinishBonus: number;
  multiplier: number;
  totalRoundPoints: number;
  mistakes: number;
}

export interface RoundSummary {
  roundNumber: number;
  totalRounds: number;
  isFinalRound: boolean;
  solution: number[];
  results: RoundResultEntry[];
  winnerId: string | null;
}

export type RoomPhase =
  | 'LOBBY'
  | 'COUNTDOWN'
  | 'PLAYING'
  | 'ROUND_SUMMARY'
  | 'MATCH_OVER';

export interface RoomSettings {
  difficulty: Difficulty;
  colorMode: ColorMode;
  totalRounds: 3 | 5;
  /** Flexible round time limit in seconds (15s to 900s / 15:00) */
  roundTimeLimitSeconds: number;
}

export interface PublicRoomState {
  code: string;
  phase: RoomPhase;
  settings: RoomSettings;
  players: PlayerInfo[];
  currentRound: number;
  countdownRemaining: number;
  puzzle: PandokuPuzzle | null;
  roundStartedAt: number | null;
  /** Timestamp when the 15s Finish Sprint ends after 1st player solves */
  sprintEndsAt: number | null;
  /** Hard timestamp when the round ends */
  roundEndsAt: number | null;
  firstFinisherId: string | null;
  roundSummaries: RoundSummary[];
  readyForNextRoundIds: string[];
  serverTime: number;
}

/** Client → Server WebSocket Messages */
export type ClientMessage =
  | {
      type: 'room:create';
      playerName: string;
      settings: RoomSettings;
    }
  | {
      type: 'room:join';
      code: string;
      playerName: string;
    }
  | {
      type: 'room:reconnect';
      code: string;
      playerId: string;
    }
  | {
      type: 'room:update_settings';
      settings: RoomSettings;
    }
  | {
      type: 'room:toggle_ready';
    }
  | {
      type: 'match:start';
    }
  | {
      type: 'round:progress';
      pandasPlaced: number;
      mistakes: number;
    }
  | {
      type: 'round:submit';
      pandas: CellCoord[];
      mistakes: number;
    }
  | {
      type: 'round:next_ready';
    }
  | {
      type: 'match:rematch';
    }
  | {
      type: 'room:leave';
    }
  | {
      type: 'ping';
    };

/** Server → Client WebSocket Messages */
export type ServerMessage =
  | {
      type: 'session:assigned';
      playerId: string;
      roomCode: string;
    }
  | {
      type: 'room:state';
      state: PublicRoomState;
    }
  | {
      type: 'round:submission_rejected';
      reason: string;
    }
  | {
      type: 'room:error';
      message: string;
    }
  | {
      type: 'pong';
      serverTime: number;
    };
