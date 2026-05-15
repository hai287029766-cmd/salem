import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Room as LiveKitRoom,
  RoomEvent,
  Track,
  Participant,
  createLocalTracks,
} from "livekit-client";

export interface UseLiveKitReturn {
  connected: boolean;
  connecting: boolean;
  micEnabled: boolean;
  error: string | null;
  speakingParticipants: Set<string>;
  toggleMic: () => void;
  connect: (token: string, url: string) => Promise<void>;
  disconnect: () => void;
}

export function useLiveKit(): UseLiveKitReturn {
  const roomRef = useRef<LiveKitRoom | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [speakingParticipants, setSpeakingParticipants] = useState<Set<string>>(new Set());

  const connect = useCallback(async (token: string, url: string) => {
    if (roomRef.current && connected) return;

    setConnecting(true);
    setError(null);
    const room = new LiveKitRoom();
    roomRef.current = room;

    room.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
      const ids = new Set(speakers.map((s) => s.identity));
      setSpeakingParticipants(ids);
    });

    room.on(RoomEvent.Connected, () => setConnected(true));
    room.on(RoomEvent.Disconnected, () => setConnected(false));

    try {
      await room.connect(url, token);

      const tracks = await createLocalTracks({ audio: true, video: false });
      for (const track of tracks) {
        if (track.kind === Track.Kind.Audio) {
          await room.localParticipant.publishTrack(track);
        }
      }
      setMicEnabled(room.localParticipant.isMicrophoneEnabled);
    } catch (err) {
      room.disconnect();
      roomRef.current = null;
      const message = err instanceof Error ? err.message : "语音连接失败";
      setError(message);
      throw err;
    } finally {
      setConnecting(false);
    }
  }, [connected]);

  const disconnect = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    setConnected(false);
  }, []);

  const toggleMic = useCallback(() => {
    if (roomRef.current) {
      const participant = roomRef.current.localParticipant;
      const enabled = !participant.isMicrophoneEnabled;
      void participant.setMicrophoneEnabled(enabled);
      setMicEnabled(enabled);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
  }, []);

  return useMemo(() => ({
    connected,
    connecting,
    micEnabled,
    error,
    speakingParticipants,
    toggleMic,
    connect,
    disconnect,
  }), [connected, connecting, micEnabled, error, speakingParticipants, toggleMic, connect, disconnect]);
}
