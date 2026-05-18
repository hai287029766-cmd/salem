import { useCallback, useEffect, useState } from "react";
import { Client, Room } from "colyseus.js";
import { COLYSEUS_ROOM_NAME } from "@salem/shared";
import type { CardType } from "@salem/shared";
import type { ClientMessage } from "@salem/shared";

type PendingMainlineClientMessage =
  | { type: "end_turn" }
  | { type: "use_character_skill"; cardCount?: number; cardIndexes?: number[]; deckOrder?: CardType[]; targetId?: string };

type SalemClientMessage = ClientMessage | PendingMainlineClientMessage;

const WS_ENDPOINT =
  import.meta.env.VITE_COLYSEUS_URL ||
  `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.hostname}${
    window.location.port === "5173" ? ":2567" : window.location.port ? `:${window.location.port}` : ""
  }`;

let clientInstance: Client | null = null;
let activeRoom: Room | null = null;
let activeRoomCode: string | null = null;
const roomSubscribers = new Set<(room: Room | null) => void>();

function getClient(): Client {
  if (!clientInstance) {
    clientInstance = new Client(WS_ENDPOINT);
  }
  return clientInstance;
}

function setActiveRoom(room: Room | null, roomCode?: string): void {
  activeRoom = room;
  activeRoomCode = room ? roomCode ?? activeRoomCode : null;
  if (room) {
    sessionStorage.setItem("salem_player_id", room.sessionId);
    (window as unknown as { __salemRoom?: Room }).__salemRoom = room;
  } else {
    sessionStorage.removeItem("salem_player_id");
    delete (window as unknown as { __salemRoom?: Room }).__salemRoom;
  }
  roomSubscribers.forEach((subscriber) => subscriber(activeRoom));
}

function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL as string | undefined;
  if (configured) return configured.replace(/\/$/, "");
  return window.location.origin;
}

function readStateRoomCode(room: Room): string | undefined {
  const state = room.state as { roomCode?: string } | undefined;
  return state?.roomCode;
}

async function waitForRoomCode(room: Room): Promise<string> {
  const existing = readStateRoomCode(room);
  if (existing) return existing;

  return await new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      room.onStateChange.remove(listener);
      reject(new Error("房间码同步超时"));
    }, 3000);

    const listener = (state: unknown) => {
      const roomCode = (state as { roomCode?: string }).roomCode;
      if (roomCode) {
        window.clearTimeout(timeout);
        room.onStateChange.remove(listener);
        resolve(roomCode);
      }
    };

    room.onStateChange(listener as (state: unknown) => void);
  });
}

async function resolveRoomId(roomCode: string): Promise<string> {
  const response = await fetch(`${getApiBaseUrl()}/api/rooms/${encodeURIComponent(roomCode)}`);
  if (!response.ok) {
    throw new Error("房间不存在或已关闭");
  }

  const payload = (await response.json()) as { data?: { roomId?: string } };
  const roomId = payload.data?.roomId;
  if (!roomId) {
    throw new Error("房间信息无效");
  }

  return roomId;
}

export interface UseColyseusReturn {
  room: Room | null;
  error: string | null;
  connecting: boolean;
  createRoom: (name: string) => Promise<{ room: Room; roomCode: string }>;
  joinRoom: (roomCode: string, name: string) => Promise<Room>;
  leaveRoom: () => void;
  sendMessage: (msg: SalemClientMessage) => void;
}

export function useColyseus(): UseColyseusReturn {
  const [room, setRoom] = useState<Room | null>(activeRoom);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    roomSubscribers.add(setRoom);
    return () => {
      roomSubscribers.delete(setRoom);
    };
  }, []);

  const createRoom = useCallback(async (name: string): Promise<{ room: Room; roomCode: string }> => {
    setConnecting(true);
    setError(null);
    try {
      const client = getClient();
      const createdRoom = await client.create(COLYSEUS_ROOM_NAME, { name });
      const roomCode = await waitForRoomCode(createdRoom);
      sessionStorage.setItem("salem_nickname", name);
      sessionStorage.setItem("salem_room_code", roomCode);
      setActiveRoom(createdRoom, roomCode);
      return { room: createdRoom, roomCode };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "创建房间失败";
      setError(message);
      throw err;
    } finally {
      setConnecting(false);
    }
  }, []);

  const joinRoom = useCallback(async (roomCode: string, name: string): Promise<Room> => {
    setConnecting(true);
    setError(null);
    try {
      const normalizedRoomCode = roomCode.toUpperCase();
      if (activeRoom && activeRoomCode === normalizedRoomCode) {
        return activeRoom;
      }

      const client = getClient();
      const roomId = await resolveRoomId(normalizedRoomCode);
      const reconnectToken = sessionStorage.getItem(`salem_reconnect_${normalizedRoomCode}`) || undefined;
      const joinedRoom = await client.joinById(roomId, { name, roomCode: normalizedRoomCode, reconnectToken });
      sessionStorage.setItem("salem_nickname", name);
      sessionStorage.setItem("salem_room_code", normalizedRoomCode);
      setActiveRoom(joinedRoom, normalizedRoomCode);
      return joinedRoom;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "加入房间失败";
      setError(message);
      throw err;
    } finally {
      setConnecting(false);
    }
  }, []);

  const leaveRoom = useCallback(() => {
    if (activeRoom) {
      activeRoom.leave();
      setActiveRoom(null);
    }
  }, []);

  const sendMessage = useCallback((msg: SalemClientMessage) => {
    if (activeRoom) {
      activeRoom.send(msg.type, msg);
    }
  }, []);

  return {
    room,
    error,
    connecting,
    createRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
  };
}
