import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, Mic, MicOff, Users } from "lucide-react";
import { useColyseus } from "../hooks/useColyseus";
import { useGameState, type PlayerState } from "../hooks/useGameState";
import { useVoiceConnection } from "../hooks/useVoiceConnection";
import { MIN_PLAYERS, MAX_PLAYERS } from "@salem/shared";
import type { Room } from "colyseus.js";

export default function Lobby() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { room: activeRoom, joinRoom, sendMessage } = useColyseus();
  const [room, setRoom] = useState<Room | null>(activeRoom);
  const { state, myId } = useGameState(room);
  const [coordinatorId, setCoordinatorId] = useState<string>("");

  useEffect(() => {
    if (activeRoom && activeRoom !== room) {
      setRoom(activeRoom);
    }
  }, [activeRoom, room]);

  useEffect(() => {
    if (!room && !activeRoom && roomCode) {
      const nickname = sessionStorage.getItem("salem_nickname") || "Player";
      joinRoom(roomCode, nickname)
        .then((r) => setRoom(r))
        .catch(() => navigate("/"));
    }
  }, [room, activeRoom, roomCode, joinRoom, navigate]);

  useEffect(() => {
    if (state?.gamePhase === "dealing" || state?.gamePhase === "day_turn") {
      navigate(`/game/${roomCode}`);
    }
  }, [state?.gamePhase, roomCode, navigate]);

  const players = state ? Array.from(state.players.values()) : [];
  const myPlayer = players.find((p) => p.id === myId);
  const { micEnabled, toggleMic, connected, voiceStatus } = useVoiceConnection(room, state?.roomCode || roomCode, myPlayer);
  const isHost = myPlayer?.isHost ?? false;
  const allReady = players.filter((p) => !p.isHost).every((p) => p.isReady);
  const canStart = isHost && players.length >= MIN_PLAYERS && allReady;

  const handleReady = useCallback(() => {
    sendMessage({ type: "ready" });
  }, [sendMessage]);

  const handleStart = useCallback(() => {
    sendMessage({ type: "start_game", coordinatorId: coordinatorId || undefined });
  }, [sendMessage, coordinatorId]);

  const renderSeat = (index: number) => {
    const player = players.find((p) => p.seatIndex === index);
    if (!player) {
      return (
        <div className="w-16 h-16 rounded-full border-2 border-dashed border-salem-text-secondary/40 flex items-center justify-center">
          <span className="text-salem-text-secondary text-2xl">+</span>
        </div>
      );
    }
    return (
      <SeatAvatar player={player} isCurrentUser={player.id === myId} />
    );
  };

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-salem-bg-primary safe-area-top">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-salem-text-secondary/20">
        <button
          className="flex items-center gap-1 text-salem-text-secondary hover:text-salem-text-primary min-h-[44px] min-w-[44px]"
          onClick={() => navigate("/")}
        >
          <ArrowLeft size={20} />
          <span className="text-sm">返回</span>
        </button>
        <div className="text-center">
          <span className="font-heading text-lg text-salem-accent-gold tracking-[0.2em]">
            <span data-testid="lobby-room-code">{state?.roomCode || roomCode}</span>
          </span>
        </div>
        <div className="w-[44px]" />
      </header>

      {/* Player grid */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        <div className="grid grid-cols-3 gap-4 max-w-xs w-full">
          {Array.from({ length: MAX_PLAYERS }, (_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div data-testid={`lobby-seat-${i}`}>{renderSeat(i)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Voice control */}
      <div className="flex items-center justify-center gap-6 px-4 py-3 border-t border-salem-text-secondary/20">
        <button
          data-testid="lobby-mic-button"
          className="flex items-center gap-2 min-h-[44px] min-w-[44px] px-4 py-2 rounded-button bg-salem-bg-secondary disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={toggleMic}
          disabled={!connected}
          aria-label={connected ? (micEnabled ? "关闭麦克风" : "开启麦克风") : "语音不可用"}
        >
          {micEnabled && connected ? (
            <Mic size={20} className="text-salem-success" />
          ) : (
            <MicOff size={20} className="text-salem-danger" />
          )}
          <span data-testid="lobby-voice-status" className="text-sm">
            {connected ? (micEnabled ? "麦克风开" : "麦克风关") : voiceStatus === "unconfigured" ? "语音未配置" : "语音未连接"}
          </span>
        </button>
      </div>

      {/* Bottom actions */}
      <div className="px-4 pb-4 safe-area-bottom space-y-3">
        <div className="flex items-center justify-between text-sm text-salem-text-secondary">
          <div className="flex items-center gap-1">
            <Users size={16} />
            <span data-testid="lobby-player-count">{players.length}/{MAX_PLAYERS} 玩家</span>
          </div>
          <span>最少 {MIN_PLAYERS} 人开始</span>
        </div>

        {isHost && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-salem-text-secondary shrink-0">协调员:</label>
            <select
              data-testid="lobby-coordinator-select"
              className="input-field text-sm py-2"
              value={coordinatorId}
              onChange={(e) => setCoordinatorId(e.target.value)}
            >
              <option value="">自动(房主)</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        {!isHost && (
          <button
            data-testid="lobby-ready-button"
            className={`w-full ${myPlayer?.isReady ? "btn-danger" : "btn-primary"}`}
            onClick={handleReady}
          >
            {myPlayer?.isReady ? "取消准备" : "准备"}
          </button>
        )}

        {isHost && (
          <button
            data-testid="lobby-start-button"
            className="btn-primary w-full"
            onClick={handleStart}
            disabled={!canStart}
          >
            开始游戏
          </button>
        )}
      </div>
    </div>
  );
}

function SeatAvatar({ player, isCurrentUser }: { player: PlayerState; isCurrentUser: boolean }) {
  const initial = player.name.charAt(0).toUpperCase();
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold relative
          ${isCurrentUser ? "bg-salem-accent-gold/20 border-2 border-salem-accent-gold" : "bg-salem-bg-secondary border-2 border-salem-text-secondary/40"}
          ${player.isReady ? "shadow-glow" : ""}`}
      >
        <span className={isCurrentUser ? "text-salem-accent-gold" : "text-salem-text-primary"}>
          {initial}
        </span>
        {player.isHost && (
          <Crown size={14} className="absolute -top-1 -right-1 text-salem-warning" />
        )}
      </div>
      <span className="text-xs text-salem-text-secondary truncate max-w-[64px]">
        {player.name}
      </span>
      {player.isReady && (
        <span className="text-[10px] text-salem-success">已准备</span>
      )}
    </div>
  );
}
