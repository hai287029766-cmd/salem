import { useState, useEffect, useCallback } from "react";
import type { Room } from "colyseus.js";
import type { GamePhase, CardType } from "@salem/shared";
import type { ServerEvent } from "@salem/shared";

export interface PlayerState {
  id: string;
  name: string;
  seatIndex: number;
  isAlive: boolean;
  isReady: boolean;
  isHost: boolean;
  characterName: string;
  characterAbility: string;
  accusationPoints: number;
  hasStocks: boolean;
  hasAsylum: boolean;
  hasPiety: boolean;
  hasMatchmaker: boolean;
  hasBlackCat: boolean;
  handCardCount: number;
  tryalCardCount: number;
  tryalCardFaceUp: number;
  handCards: CardType[];
  tryalCards: string[];
  publicTryalCards: string[];
}

export interface RevealEntry {
  playerId: string;
  name: string;
  isWitch: boolean;
  isConstable: boolean;
  character?: string;
}

export interface GameState {
  gamePhase: GamePhase;
  currentPlayerId: string;
  timer: number;
  isPaused: boolean;
  coordinatorId: string;
  round: number;
  deckRemaining: number;
  currentTurnCanEnd: boolean;
  players: Map<string, PlayerState>;
  gameLog: string[];
  blackCatOwnerId: string;
  isNightKillResolved: boolean;
  roomCode: string;
  tryalTargetId: string;
  tryalChooserId: string;
}

export interface RoleInfo {
  isWitch: boolean;
  isConstable: boolean;
  witchPartners: string[];
}

export interface UseGameStateReturn {
  state: GameState | null;
  myId: string | null;
  roleInfo: RoleInfo | null;
  logs: string[];
  lastEvent: ServerEvent | null;
  gameResult: { winner: "townspeople" | "witches"; reveals: RevealEntry[] } | null;
}

const DEFAULT_STATE: GameState = {
  gamePhase: "lobby",
  currentPlayerId: "",
  timer: 0,
  isPaused: false,
  coordinatorId: "",
  round: 0,
  deckRemaining: 0,
  currentTurnCanEnd: false,
  players: new Map(),
  gameLog: [],
  blackCatOwnerId: "",
  isNightKillResolved: false,
  roomCode: "",
  tryalTargetId: "",
  tryalChooserId: "",
};

function toArray<T>(value: unknown): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as T[];
  if (typeof (value as { forEach?: unknown }).forEach === "function") {
    const result: T[] = [];
    (value as { forEach: (callback: (item: T) => void) => void }).forEach((item) => {
      result.push(item);
    });
    return result;
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, T>)
      .filter(([key]) => !key.startsWith("$"))
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, item]) => item);
  }
  return [];
}

function mapPlayerState(p: Record<string, unknown>, key: string): PlayerState {
  const handCards = toArray<CardType>(p.handCards);
  return {
    id: (p.id as string) || key,
    name: (p.name as string) || "",
    seatIndex: (p.seatIndex as number) || 0,
    isAlive: (p.isAlive as boolean) ?? true,
    isReady: (p.isReady as boolean) ?? false,
    isHost: (p.isHost as boolean) ?? false,
    characterName: (p.characterName as string) || "",
    characterAbility: (p.characterAbility as string) || "",
    accusationPoints: (p.accusationPoints as number) || 0,
    hasStocks: (p.hasStocks as boolean) ?? false,
    hasAsylum: (p.hasAsylum as boolean) ?? false,
    hasPiety: (p.hasPiety as boolean) ?? false,
    hasMatchmaker: (p.hasMatchmaker as boolean) ?? false,
    hasBlackCat: (p.hasBlackCat as boolean) ?? false,
    handCardCount: (p.handCardCount as number) || handCards.length,
    tryalCardCount: (p.tryalCardCount as number) || 0,
    tryalCardFaceUp: (p.tryalCardFaceUp as number) || 0,
    handCards,
    tryalCards: toArray<string>(p.tryalCards),
    publicTryalCards: toArray<string>(p.publicTryalCards),
  };
}

export function useGameState(room: Room | null): UseGameStateReturn {
  const [state, setState] = useState<GameState | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [roleInfo, setRoleInfo] = useState<RoleInfo | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [lastEvent, setLastEvent] = useState<ServerEvent | null>(null);
  const [gameResult, setGameResult] = useState<{ winner: "townspeople" | "witches"; reveals: RevealEntry[] } | null>(null);

  const handleStateChange = useCallback((roomState: Record<string, unknown>) => {
    const players = new Map<string, PlayerState>();
    const playersMap = roomState.players as
      | { forEach?: (callback: (value: Record<string, unknown>, key: string) => void) => void }
      | Record<string, Record<string, unknown>>
      | undefined;
    if (playersMap && typeof playersMap.forEach === "function") {
      playersMap.forEach((p, key) => {
        players.set(key, mapPlayerState(p, key));
      });
    } else if (playersMap) {
      Object.entries(playersMap).forEach(([key, p]) => {
        if (!p || key.startsWith("$")) return;
        players.set(key, mapPlayerState(p, key));
      });
    }

    const gameLog = (roomState.gameLog as string[]) || [];

    setState({
      gamePhase: (roomState.gamePhase as GamePhase) || "lobby",
      currentPlayerId: (roomState.currentPlayerId as string) || "",
      timer: (roomState.timer as number) || 0,
      isPaused: (roomState.isPaused as boolean) ?? false,
      coordinatorId: (roomState.coordinatorId as string) || "",
      round: (roomState.round as number) || 0,
      deckRemaining: (roomState.deckRemaining as number) || 0,
      currentTurnCanEnd: (roomState.currentTurnCanEnd as boolean) ?? false,
      players,
      gameLog,
      blackCatOwnerId: (roomState.blackCatOwnerId as string) || "",
      isNightKillResolved: (roomState.isNightKillResolved as boolean) ?? false,
      roomCode: (roomState.roomCode as string) || "",
      tryalTargetId: (roomState.tryalTargetId as string) || "",
      tryalChooserId: (roomState.tryalChooserId as string) || "",
    });
  }, []);

  useEffect(() => {
    if (!room) {
      setState(null);
      setMyId(null);
      setRoleInfo(null);
      setLogs([]);
      setGameResult(null);
      return;
    }

    setMyId(room.sessionId);

    if (room.state) {
      handleStateChange(room.state as unknown as Record<string, unknown>);
    }

    room.onStateChange((roomState) => {
      handleStateChange(roomState as unknown as Record<string, unknown>);
    });

    room.onMessage("your_role", (data: { isWitch: boolean; isConstable: boolean; witchPartners?: string[] }) => {
      setRoleInfo({
        isWitch: data.isWitch,
        isConstable: data.isConstable,
        witchPartners: data.witchPartners || [],
      });
    });

    room.onMessage("log", (data: { message: string }) => {
      setLogs((prev) => [...prev, data.message]);
    });

    room.onMessage("character_skill_result", (data: { message?: string; skill?: string }) => {
      const message = data.message || `${data.skill || "character"} ability resolved`;
      setLogs((prev) => [...prev, message]);
    });

    room.onMessage("game_over", (data: { winner: "townspeople" | "witches"; reveals?: RevealEntry[] }) => {
      setGameResult({
        winner: data.winner,
        reveals: data.reveals || [],
      });
    });

    room.onMessage("*", (type, message) => {
      setLastEvent({ type, ...message } as unknown as ServerEvent);
    });

    return () => {
      room.removeAllListeners();
    };
  }, [room, handleStateChange]);

  return {
    state: state || DEFAULT_STATE,
    myId,
    roleInfo,
    logs,
    lastEvent,
    gameResult,
  };
}
