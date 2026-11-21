import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CellCoord,
  ClientMessage,
  PublicRoomState,
  RoomSettings,
  ServerMessage,
} from '../shared/types';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

interface SessionIdentity {
  playerId: string;
  roomCode: string;
}

const SESSION_KEY = 'pandoku_ws_session_v1';

function loadSavedSession(): SessionIdentity | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionIdentity;
    if (parsed.playerId && parsed.roomCode) return parsed;
  } catch {
    // Ignore storage access errors
  }
  return null;
}

function saveSession(session: SessionIdentity | null) {
  try {
    if (!session) {
      sessionStorage.removeItem(SESSION_KEY);
    } else {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  } catch {
    // Ignore storage access errors
  }
}

export function useMultiplayer() {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [roomState, setRoomState] = useState<PublicRoomState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [serverOffsetMs, setServerOffsetMs] = useState<number>(0);

  const wsRef = useRef<WebSocket | null>(null);
  const pendingQueueRef = useRef<ClientMessage[]>([]);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionRef = useRef<SessionIdentity | null>(loadSavedSession());

  const sendMessage = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    } else {
      pendingQueueRef.current.push(msg);
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    setStatus('connecting');
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      setError(null);

      // Flush queued messages
      while (pendingQueueRef.current.length > 0) {
        const next = pendingQueueRef.current.shift()!;
        ws.send(JSON.stringify(next));
      }

      // Attempt automatic session resume if user refreshed mid-room
      const saved = sessionRef.current;
      if (saved && !roomState) {
        ws.send(
          JSON.stringify({
            type: 'room:reconnect',
            code: saved.roomCode,
            playerId: saved.playerId,
          } satisfies ClientMessage)
        );
      }

      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
      pingTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' } satisfies ClientMessage));
        }
      }, 15_000);
    };

    ws.onmessage = (event) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(event.data) as ServerMessage;
      } catch {
        return;
      }

      switch (msg.type) {
        case 'session:assigned': {
          const identity = { playerId: msg.playerId, roomCode: msg.roomCode };
          sessionRef.current = identity;
          saveSession(identity);
          setPlayerId(msg.playerId);
          setError(null);
          break;
        }
        case 'room:state': {
          setServerOffsetMs(msg.state.serverTime - Date.now());
          setRoomState(msg.state);
          setSubmissionError(null);
          break;
        }
        case 'round:submission_rejected': {
          setSubmissionError(msg.reason);
          break;
        }
        case 'room:error': {
          // If auto-reconnect failed because room expired, silently clear stale session
          if (msg.message.includes('expired') || msg.message.includes('no longer active')) {
            sessionRef.current = null;
            saveSession(null);
            setPlayerId(null);
            setRoomState(null);
          } else {
            setError(msg.message);
          }
          break;
        }
        case 'pong': {
          setServerOffsetMs(msg.serverTime - Date.now());
          break;
        }
      }
    };

    ws.onclose = () => {
      setStatus('disconnected');
      if (pingTimerRef.current) {
        clearInterval(pingTimerRef.current);
        pingTimerRef.current = null;
      }
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, 2000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [roomState]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createRoom = useCallback(
    (playerName: string, settings: RoomSettings) => {
      setError(null);
      sendMessage({ type: 'room:create', playerName, settings });
    },
    [sendMessage]
  );

  const joinRoom = useCallback(
    (code: string, playerName: string) => {
      setError(null);
      sendMessage({ type: 'room:join', code: code.trim().toUpperCase(), playerName });
    },
    [sendMessage]
  );

  const updateSettings = useCallback(
    (settings: RoomSettings) => {
      sendMessage({ type: 'room:update_settings', settings });
    },
    [sendMessage]
  );

  const toggleReady = useCallback(() => {
    sendMessage({ type: 'room:toggle_ready' });
  }, [sendMessage]);

  const startMatch = useCallback(() => {
    setError(null);
    sendMessage({ type: 'match:start' });
  }, [sendMessage]);

  const reportProgress = useCallback(
    (pandasPlaced: number, mistakes: number) => {
      sendMessage({ type: 'round:progress', pandasPlaced, mistakes });
    },
    [sendMessage]
  );

  const submitSolution = useCallback(
    (pandas: CellCoord[], mistakes: number) => {
      sendMessage({ type: 'round:submit', pandas, mistakes });
    },
    [sendMessage]
  );

  const readyNextRound = useCallback(() => {
    sendMessage({ type: 'round:next_ready' });
  }, [sendMessage]);

  const requestRematch = useCallback(() => {
    sendMessage({ type: 'match:rematch' });
  }, [sendMessage]);

  const leaveRoom = useCallback(() => {
    sendMessage({ type: 'room:leave' });
    sessionRef.current = null;
    saveSession(null);
    setRoomState(null);
    setPlayerId(null);
    setError(null);
    setSubmissionError(null);
    // Clean ?room= param from URL so refreshing doesn't re-prompt
    const url = new URL(window.location.href);
    if (url.searchParams.has('room')) {
      url.searchParams.delete('room');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, [sendMessage]);

  const clearError = useCallback(() => setError(null), []);

  return {
    status,
    roomState,
    playerId,
    error,
    submissionError,
    serverOffsetMs,
    createRoom,
    joinRoom,
    updateSettings,
    toggleReady,
    startMatch,
    reportProgress,
    submitSolution,
    readyNextRound,
    requestRematch,
    leaveRoom,
    clearError,
  };
}
