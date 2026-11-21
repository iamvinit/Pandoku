import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import {
  calculateSpeedScore,
  generatePandokuPuzzle,
  validatePandokuBoard,
} from './src/shared/puzzleGenerator.ts';
import {
  clampRoundTimeSeconds,
  type ClientMessage,
  type ColorMode,
  type PandokuPuzzleWithSolution,
  type PlayerInfo,
  type PublicRoomState,
  type RoomPhase,
  type RoomSettings,
  type RoundResultEntry,
  type RoundSummary,
  type ServerMessage,
} from './src/shared/types.ts';
import {
  buildDailyChallengeFeed,
  DAILY_CHALLENGE_BANK_31,
} from './src/shared/dailyChallenges.ts';

function sanitizeTimeLimit(raw?: number): number {
  return clampRoundTimeSeconds(raw);
}

function sanitizeColorMode(raw?: string): ColorMode {
  return raw === 'scattered' ? 'scattered' : 'connected';
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const FINISH_SPRINT_MS = 15_000;
const COUNTDOWN_SECONDS = 3;

interface InternalPlayer extends PlayerInfo {
  ws: WebSocket | null;
  disconnectTimer: ReturnType<typeof setTimeout> | null;
}

interface GameRoom {
  code: string;
  phase: RoomPhase;
  settings: RoomSettings;
  players: InternalPlayer[];
  currentRound: number;
  countdownRemaining: number;
  puzzle: PandokuPuzzleWithSolution | null;
  roundStartedAt: number | null;
  sprintEndsAt: number | null;
  roundEndsAt: number | null;
  firstFinisherId: string | null;
  roundSummaries: RoundSummary[];
  readyForNextRoundIds: Set<string>;
  activeTimers: Array<ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>>;
  lastActivityAt: number;
}

const rooms = new Map<string, GameRoom>();
const socketSession = new WeakMap<WebSocket, { roomCode: string; playerId: string }>();

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRoomCode(): string {
  for (let tries = 0; tries < 50; tries++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    if (!rooms.has(code)) return code;
  }
  return `P${Date.now().toString(36).slice(-5).toUpperCase()}`;
}

function generatePlayerId(): string {
  return `pl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function clearRoomTimers(room: GameRoom) {
  for (const timer of room.activeTimers) {
    clearTimeout(timer);
    clearInterval(timer);
  }
  room.activeTimers = [];
}

function send(ws: WebSocket | null, message: ServerMessage) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function serializeRoom(room: GameRoom): PublicRoomState {
  return {
    code: room.code,
    phase: room.phase,
    settings: room.settings,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatarIndex: p.avatarIndex,
      ready: p.ready,
      connected: p.connected,
      score: p.score,
      pandasPlaced: p.pandasPlaced,
      roundSolveTimeMs: p.roundSolveTimeMs,
      roundPointsEarned: p.roundPointsEarned,
      mistakesInRound: p.mistakesInRound,
      isHost: p.isHost,
    })),
    currentRound: room.currentRound,
    countdownRemaining: room.countdownRemaining,
    puzzle: room.puzzle
      ? {
          id: room.puzzle.id,
          size: room.puzzle.size,
          difficulty: room.puzzle.difficulty,
          colorMode: room.puzzle.colorMode,
          regions: room.puzzle.regions,
        }
      : null,
    roundStartedAt: room.roundStartedAt,
    sprintEndsAt: room.sprintEndsAt,
    roundEndsAt: room.roundEndsAt,
    firstFinisherId: room.firstFinisherId,
    roundSummaries: room.roundSummaries,
    readyForNextRoundIds: Array.from(room.readyForNextRoundIds),
    serverTime: Date.now(),
  };
}

function broadcastRoom(room: GameRoom) {
  room.lastActivityAt = Date.now();
  const payload: ServerMessage = {
    type: 'room:state',
    state: serializeRoom(room),
  };
  for (const player of room.players) {
    send(player.ws, payload);
  }
}

function sanitizeName(raw: string): string {
  const trimmed = (raw || '').trim().replace(/\s+/g, ' ').slice(0, 18);
  return trimmed || 'Panda Player';
}

function startRoundCountdown(room: GameRoom, roundNumber: number) {
  clearRoomTimers(room);
  room.currentRound = roundNumber;
  room.phase = 'COUNTDOWN';
  room.countdownRemaining = COUNTDOWN_SECONDS;
  room.puzzle = null;
  room.roundStartedAt = null;
  room.sprintEndsAt = null;
  room.roundEndsAt = null;
  room.firstFinisherId = null;
  room.readyForNextRoundIds.clear();

  for (const p of room.players) {
    p.pandasPlaced = 0;
    p.roundSolveTimeMs = null;
    p.roundPointsEarned = 0;
    p.mistakesInRound = 0;
  }

  // Generate the round's unique-solution puzzle upfront so launch is instantaneous at 0
  const nextPuzzle = generatePandokuPuzzle(
    room.settings.difficulty,
    room.settings.colorMode
  );
  broadcastRoom(room);

  const interval = setInterval(() => {
    room.countdownRemaining -= 1;
    if (room.countdownRemaining <= 0) {
      clearInterval(interval);
      launchActiveRound(room, nextPuzzle);
    } else {
      broadcastRoom(room);
    }
  }, 1000);

  room.activeTimers.push(interval);
}

function launchActiveRound(room: GameRoom, puzzle: PandokuPuzzleWithSolution) {
  clearRoomTimers(room);
  const now = Date.now();
  const limitSeconds = sanitizeTimeLimit(room.settings.roundTimeLimitSeconds);

  room.phase = 'PLAYING';
  room.countdownRemaining = 0;
  room.puzzle = puzzle;
  room.roundStartedAt = now;
  room.roundEndsAt = now + limitSeconds * 1000;
  room.sprintEndsAt = null;
  room.firstFinisherId = null;

  broadcastRoom(room);

  const hardTimeout = setTimeout(() => {
    if (room.phase === 'PLAYING') {
      finishCurrentRound(room);
    }
  }, limitSeconds * 1000);

  room.activeTimers.push(hardTimeout);
}

function finishCurrentRound(room: GameRoom) {
  if (room.phase !== 'PLAYING' || !room.puzzle) return;
  clearRoomTimers(room);

  const isFinalRound = room.currentRound >= room.settings.totalRounds;
  const results: RoundResultEntry[] = room.players.map((p) => {
    const isFirst = room.firstFinisherId === p.id;
    const breakdown = calculateSpeedScore({
      solveTimeMs: p.roundSolveTimeMs,
      difficulty: room.settings.difficulty,
      isFirstFinisher: isFirst,
      isFinalRound,
      roundTimeLimitSeconds: room.settings.roundTimeLimitSeconds,
    });

    // Authoritative score addition
    p.roundPointsEarned = breakdown.totalRoundPoints;
    p.score += breakdown.totalRoundPoints;

    return {
      playerId: p.id,
      playerName: p.name,
      solveTimeMs: p.roundSolveTimeMs,
      basePoints: breakdown.basePoints,
      speedBonus: breakdown.speedBonus,
      firstFinishBonus: breakdown.firstFinishBonus,
      multiplier: breakdown.multiplier,
      totalRoundPoints: breakdown.totalRoundPoints,
      mistakes: p.mistakesInRound,
    };
  });

  // Sort results by totalRoundPoints desc, then solveTimeMs asc
  const sorted = [...results].sort((a, b) => {
    if (b.totalRoundPoints !== a.totalRoundPoints) {
      return b.totalRoundPoints - a.totalRoundPoints;
    }
    if (a.solveTimeMs === null && b.solveTimeMs === null) return 0;
    if (a.solveTimeMs === null) return 1;
    if (b.solveTimeMs === null) return -1;
    return a.solveTimeMs - b.solveTimeMs;
  });

  const winnerId =
    sorted.length >= 2 && sorted[0].totalRoundPoints > sorted[1].totalRoundPoints
      ? sorted[0].playerId
      : sorted.length === 1 && sorted[0].totalRoundPoints > 0
        ? sorted[0].playerId
        : null;

  const summary: RoundSummary = {
    roundNumber: room.currentRound,
    totalRounds: room.settings.totalRounds,
    isFinalRound,
    solution: room.puzzle.solution,
    results,
    winnerId,
  };

  room.roundSummaries.push(summary);
  room.readyForNextRoundIds.clear();

  if (isFinalRound) {
    room.phase = 'MATCH_OVER';
    broadcastRoom(room);
  } else {
    room.phase = 'ROUND_SUMMARY';
    broadcastRoom(room);

    // Auto-advance after 12 seconds if players don't click Next Round early
    const autoNext = setTimeout(() => {
      if (room.phase === 'ROUND_SUMMARY' && room.players.length >= 2) {
        startRoundCountdown(room, room.currentRound + 1);
      }
    }, 12_000);
    room.activeTimers.push(autoNext);
  }
}

function removePlayerFromRoom(room: GameRoom, playerId: string) {
  const idx = room.players.findIndex((p) => p.id === playerId);
  if (idx === -1) return;

  const [removed] = room.players.splice(idx, 1);
  if (removed.disconnectTimer) {
    clearTimeout(removed.disconnectTimer);
    removed.disconnectTimer = null;
  }

  if (room.players.length === 0) {
    clearRoomTimers(room);
    rooms.delete(room.code);
    return;
  }

  // Promote remaining player to host and normalize avatar index if needed
  room.players[0].isHost = true;
  if (room.phase !== 'LOBBY' && room.phase !== 'MATCH_OVER') {
    clearRoomTimers(room);
    room.phase = 'LOBBY';
    room.puzzle = null;
    room.currentRound = 0;
    room.roundStartedAt = null;
    room.sprintEndsAt = null;
    room.roundEndsAt = null;
    room.firstFinisherId = null;
    room.roundSummaries = [];
    room.players[0].ready = false;
    room.players[0].score = 0;
  }

  broadcastRoom(room);
}

function handleClientMessage(ws: WebSocket, raw: string) {
  let msg: ClientMessage;
  try {
    msg = JSON.parse(raw) as ClientMessage;
  } catch {
    return;
  }

  if (msg.type === 'ping') {
    send(ws, { type: 'pong', serverTime: Date.now() });
    return;
  }

  if (msg.type === 'room:create') {
    // Clean up prior session if any
    const prev = socketSession.get(ws);
    if (prev) {
      const prevRoom = rooms.get(prev.roomCode);
      if (prevRoom) removePlayerFromRoom(prevRoom, prev.playerId);
    }

    const code = generateRoomCode();
    const playerId = generatePlayerId();
    const difficulty = msg.settings?.difficulty ?? 'classic';
    const colorMode = sanitizeColorMode(msg.settings?.colorMode);
    const totalRounds = msg.settings?.totalRounds === 5 ? 5 : 3;
    const roundTimeLimitSeconds = sanitizeTimeLimit(msg.settings?.roundTimeLimitSeconds);

    const host: InternalPlayer = {
      id: playerId,
      name: sanitizeName(msg.playerName),
      avatarIndex: 0,
      ready: true,
      connected: true,
      score: 0,
      pandasPlaced: 0,
      roundSolveTimeMs: null,
      roundPointsEarned: 0,
      mistakesInRound: 0,
      isHost: true,
      ws,
      disconnectTimer: null,
    };

    const room: GameRoom = {
      code,
      phase: 'LOBBY',
      settings: { difficulty, colorMode, totalRounds, roundTimeLimitSeconds },
      players: [host],
      currentRound: 0,
      countdownRemaining: 0,
      puzzle: null,
      roundStartedAt: null,
      sprintEndsAt: null,
      roundEndsAt: null,
      firstFinisherId: null,
      roundSummaries: [],
      readyForNextRoundIds: new Set(),
      activeTimers: [],
      lastActivityAt: Date.now(),
    };

    rooms.set(code, room);
    socketSession.set(ws, { roomCode: code, playerId });
    send(ws, { type: 'session:assigned', playerId, roomCode: code });
    broadcastRoom(room);
    return;
  }

  if (msg.type === 'room:join') {
    const code = (msg.code || '').trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      send(ws, {
        type: 'room:error',
        message: `Room "${code}" was not found. Double-check the invite code.`,
      });
      return;
    }

    if (room.players.length >= 2) {
      send(ws, {
        type: 'room:error',
        message: `Room "${code}" already has 2 players competing.`,
      });
      return;
    }

    if (room.phase !== 'LOBBY') {
      send(ws, {
        type: 'room:error',
        message: 'That match is already in progress.',
      });
      return;
    }

    const prev = socketSession.get(ws);
    if (prev) {
      const prevRoom = rooms.get(prev.roomCode);
      if (prevRoom) removePlayerFromRoom(prevRoom, prev.playerId);
    }

    const playerId = generatePlayerId();
    const usedAvatar = room.players[0]?.avatarIndex ?? 0;
    const guest: InternalPlayer = {
      id: playerId,
      name: sanitizeName(msg.playerName),
      avatarIndex: usedAvatar === 0 ? 1 : 0,
      ready: false,
      connected: true,
      score: 0,
      pandasPlaced: 0,
      roundSolveTimeMs: null,
      roundPointsEarned: 0,
      mistakesInRound: 0,
      isHost: false,
      ws,
      disconnectTimer: null,
    };

    room.players.push(guest);
    socketSession.set(ws, { roomCode: code, playerId });
    send(ws, { type: 'session:assigned', playerId, roomCode: code });
    broadcastRoom(room);
    return;
  }

  if (msg.type === 'room:reconnect') {
    const code = (msg.code || '').trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      send(ws, { type: 'room:error', message: 'Room expired or closed.' });
      return;
    }
    const player = room.players.find((p) => p.id === msg.playerId);
    if (!player) {
      send(ws, { type: 'room:error', message: 'Session no longer active in this room.' });
      return;
    }
    if (player.disconnectTimer) {
      clearTimeout(player.disconnectTimer);
      player.disconnectTimer = null;
    }
    player.ws = ws;
    player.connected = true;
    socketSession.set(ws, { roomCode: code, playerId: player.id });
    send(ws, { type: 'session:assigned', playerId: player.id, roomCode: code });
    broadcastRoom(room);
    return;
  }

  // All remaining events require an active session
  const session = socketSession.get(ws);
  if (!session) return;
  const room = rooms.get(session.roomCode);
  if (!room) return;
  const player = room.players.find((p) => p.id === session.playerId);
  if (!player) return;

  switch (msg.type) {
    case 'room:update_settings': {
      if (!player.isHost || room.phase !== 'LOBBY') return;
      room.settings = {
        difficulty: msg.settings.difficulty,
        colorMode: sanitizeColorMode(msg.settings.colorMode),
        totalRounds: msg.settings.totalRounds === 5 ? 5 : 3,
        roundTimeLimitSeconds: sanitizeTimeLimit(msg.settings.roundTimeLimitSeconds),
      };
      broadcastRoom(room);
      break;
    }

    case 'room:toggle_ready': {
      if (room.phase !== 'LOBBY') return;
      player.ready = !player.ready;
      broadcastRoom(room);
      break;
    }

    case 'match:start': {
      if (!player.isHost || room.phase !== 'LOBBY') return;
      if (room.players.length < 2) {
        send(ws, {
          type: 'room:error',
          message: 'Invite an opponent to join before starting the duel.',
        });
        return;
      }
      // Reset match stats
      room.roundSummaries = [];
      for (const p of room.players) {
        p.score = 0;
        p.ready = true;
      }
      startRoundCountdown(room, 1);
      break;
    }

    case 'round:progress': {
      if (room.phase !== 'PLAYING' || !room.puzzle) return;
      if (player.roundSolveTimeMs !== null) return;
      player.pandasPlaced = Math.max(0, Math.min(room.puzzle.size, msg.pandasPlaced));
      player.mistakesInRound = Math.max(0, msg.mistakes);
      broadcastRoom(room);
      break;
    }

    case 'round:submit': {
      if (room.phase !== 'PLAYING' || !room.puzzle || !room.roundStartedAt) return;
      if (player.roundSolveTimeMs !== null) return; // Idempotent guard

      const validation = validatePandokuBoard(room.puzzle.regions, msg.pandas);
      if (!validation.solved) {
        send(ws, {
          type: 'round:submission_rejected',
          reason: validation.summaryMessage ?? 'Board does not yet satisfy all Pandoku rules.',
        });
        return;
      }

      const now = Date.now();
      player.roundSolveTimeMs = Math.max(250, now - room.roundStartedAt);
      player.pandasPlaced = room.puzzle.size;
      player.mistakesInRound = Math.max(0, msg.mistakes);

      if (!room.firstFinisherId) {
        room.firstFinisherId = player.id;
      }

      const allSolved = room.players.every((p) => p.roundSolveTimeMs !== null);
      if (allSolved) {
        finishCurrentRound(room);
      } else {
        // Trigger 15-second Finish Sprint for the remaining opponent!
        const sprintDeadline = Math.min(
          now + FINISH_SPRINT_MS,
          room.roundEndsAt ?? now + FINISH_SPRINT_MS
        );
        room.sprintEndsAt = sprintDeadline;
        broadcastRoom(room);

        const sprintTimer = setTimeout(() => {
          if (room.phase === 'PLAYING') {
            finishCurrentRound(room);
          }
        }, Math.max(500, sprintDeadline - Date.now()));
        room.activeTimers.push(sprintTimer);
      }
      break;
    }

    case 'round:next_ready': {
      if (room.phase !== 'ROUND_SUMMARY') return;
      room.readyForNextRoundIds.add(player.id);
      if (room.players.every((p) => room.readyForNextRoundIds.has(p.id))) {
        startRoundCountdown(room, room.currentRound + 1);
      } else {
        broadcastRoom(room);
      }
      break;
    }

    case 'match:rematch': {
      if (room.phase !== 'MATCH_OVER') return;
      clearRoomTimers(room);
      room.phase = 'LOBBY';
      room.currentRound = 0;
      room.puzzle = null;
      room.roundStartedAt = null;
      room.sprintEndsAt = null;
      room.roundEndsAt = null;
      room.firstFinisherId = null;
      room.roundSummaries = [];
      room.readyForNextRoundIds.clear();
      for (const p of room.players) {
        p.score = 0;
        p.ready = p.isHost;
        p.pandasPlaced = 0;
        p.roundSolveTimeMs = null;
        p.roundPointsEarned = 0;
        p.mistakesInRound = 0;
      }
      broadcastRoom(room);
      break;
    }

    case 'room:leave': {
      socketSession.delete(ws);
      removePlayerFromRoom(room, player.id);
      break;
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', activeRooms: rooms.size });
  });

  app.get('/api/daily-challenges', (req, res) => {
    const rawDays = Number(req.query.days);
    const daysCount = Number.isFinite(rawDays) ? Math.max(1, Math.min(31, Math.floor(rawDays))) : 15;
    const feed = buildDailyChallengeFeed(new Date(), daysCount);
    res.json({
      totalBankDays: DAILY_CHALLENGE_BANK_31.length,
      challenges: feed,
      todayIndex: Math.max(0, feed.length - 1),
    });
  });

  app.get('/api/rooms/:code', (req, res) => {
    const code = req.params.code.trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      res.status(404).json({ exists: false });
      return;
    }
    res.json({
      exists: true,
      code: room.code,
      phase: room.phase,
      playerCount: room.players.length,
      hostName: room.players.find((p) => p.isHost)?.name ?? 'Host',
      settings: room.settings,
    });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    ws.on('message', (data) => {
      handleClientMessage(ws, data.toString());
    });

    ws.on('close', () => {
      const session = socketSession.get(ws);
      if (!session) return;
      const room = rooms.get(session.roomCode);
      if (!room) return;
      const player = room.players.find((p) => p.id === session.playerId);
      if (!player) return;

      player.connected = false;
      player.ws = null;
      broadcastRoom(room);

      // Give 20 seconds grace period for reconnects before removing player
      player.disconnectTimer = setTimeout(() => {
        if (!player.connected) {
          removePlayerFromRoom(room, player.id);
        }
      }, 20_000);
    });
  });

  // Periodic cleanup for abandoned rooms (> 45 mins idle)
  setInterval(() => {
    const cutoff = Date.now() - 45 * 60 * 1000;
    for (const [code, room] of rooms.entries()) {
      if (room.lastActivityAt < cutoff) {
        clearRoomTimers(room);
        rooms.delete(code);
      }
    }
  }, 5 * 60 * 1000);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Pandoku server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Pandoku server:', err);
  process.exit(1);
});
