import { useEffect, useState } from "react";
import type { Room } from "colyseus.js";
import { useLiveKit } from "./useLiveKit";
import type { PlayerState } from "./useGameState";

interface LiveKitConfigResponse {
  data?: {
    url?: string;
    available?: boolean;
  };
}

interface LiveKitTokenResponse {
  data?: {
    token?: string;
  };
}

function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL as string | undefined;
  if (configured) return configured.replace(/\/$/, "");
  return window.location.origin;
}

export function useVoiceConnection(
  room: Room | null,
  roomCode: string | undefined,
  myPlayer: PlayerState | null | undefined,
) {
  const liveKit = useLiveKit();
  const [status, setStatus] = useState<"unconfigured" | "connecting" | "connected" | "error">("unconfigured");
  const { connected, connecting, connect } = liveKit;
  const playerId = myPlayer?.id;
  const playerName = myPlayer?.name;

  useEffect(() => {
    let cancelled = false;

    async function connectVoice() {
      if (!room || !roomCode || !playerId || !playerName || connected || connecting) return;

      try {
        const configResponse = await fetch(`${getApiBaseUrl()}/api/livekit-config`);
        if (!configResponse.ok) {
          throw new Error("语音配置获取失败");
        }

        const config = (await configResponse.json()) as LiveKitConfigResponse;
        const url = config.data?.url || (import.meta.env.VITE_LIVEKIT_URL as string | undefined) || "";

        if (config.data?.available === false || !url) {
          if (!cancelled) setStatus("unconfigured");
          return;
        }

        if (!cancelled) setStatus("connecting");
        const tokenResponse = await fetch(`${getApiBaseUrl()}/api/livekit-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomCode,
            playerId: room.sessionId,
            playerName,
          }),
        });

        if (!tokenResponse.ok) {
          throw new Error("语音 token 获取失败");
        }

        const tokenPayload = (await tokenResponse.json()) as LiveKitTokenResponse;
        const token = tokenPayload.data?.token;
        if (!token) {
          throw new Error("语音 token 缺失");
        }

        await connect(token, url);
        if (!cancelled) setStatus("connected");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    void connectVoice();

    return () => {
      cancelled = true;
    };
  }, [room, roomCode, playerId, playerName, connected, connecting, connect]);

  return {
    ...liveKit,
    voiceStatus: connected ? "connected" : status,
  };
}
