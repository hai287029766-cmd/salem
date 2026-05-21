import { useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { useColyseus } from "../hooks/useColyseus";
import ConfirmDialog from "../components/ConfirmDialog";
import { ROOM_CODE_LENGTH } from "@salem/shared";

function normalizeRoomCode(value: string | null): string {
  return (value || "").toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, ROOM_CODE_LENGTH);
}

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { createRoom, joinRoom, connecting, error } = useColyseus();
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState(() => normalizeRoomCode(searchParams.get("room")));
  const [showRules, setShowRules] = useState(false);

  const handleCreate = useCallback(async () => {
    if (!nickname.trim()) return;
    try {
      const { roomCode } = await createRoom(nickname.trim());
      navigate(`/lobby/${roomCode}`);
    } catch {
      // error handled by hook
    }
  }, [nickname, createRoom, navigate]);

  const handleJoin = useCallback(async () => {
    if (!nickname.trim() || roomCode.length !== ROOM_CODE_LENGTH) return;
    try {
      const normalizedRoomCode = roomCode.toUpperCase();
      await joinRoom(normalizedRoomCode, nickname.trim());
      navigate(`/lobby/${normalizedRoomCode}`);
    } catch {
      // error handled by hook
    }
  }, [nickname, roomCode, joinRoom, navigate]);

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center px-6 py-8 bg-salem-bg-primary">
      {/* Background texture overlay */}
      <div className="fixed inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDBoMTAwdjEwMEgweiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZDRhNTc0IiBzdHJva2Utd2lkdGg9IjAuNSIgb3BhY2l0eT0iMC4zIi8+PC9zdmc+')] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">
        {/* Title */}
        <div className="text-center">
          <h1 className="font-heading text-4xl font-bold text-salem-accent-gold drop-shadow-lg tracking-wider">
            Salem 1692
          </h1>
          <p className="mt-2 font-heading text-lg text-salem-text-secondary">
            女巫镇塞勒姆
          </p>
        </div>

        {/* Nickname input */}
        <div className="w-full">
          <input
            data-testid="home-nickname-input"
            type="text"
            className="input-field"
            placeholder="输入你的昵称"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={12}
          />
        </div>

        {/* Create room */}
        <button
          data-testid="home-create-room-button"
          className="btn-primary w-full"
          onClick={handleCreate}
          disabled={!nickname.trim() || connecting}
        >
          创建新房间
        </button>

        {/* Divider */}
        <div className="w-full flex items-center gap-3">
          <div className="flex-1 h-px bg-salem-text-secondary/30" />
          <span className="text-sm text-salem-text-secondary">或者</span>
          <div className="flex-1 h-px bg-salem-text-secondary/30" />
        </div>

        {/* Join room */}
        <div className="w-full flex flex-col gap-3">
          {roomCode.length === ROOM_CODE_LENGTH && (
            <p className="text-center text-xs text-salem-accent-gold">
              准备加入房间 {roomCode}
            </p>
          )}
          <input
            data-testid="home-room-code-input"
            type="text"
            className="input-field text-center tracking-[0.3em] uppercase"
            placeholder="输入房间码"
            value={roomCode}
            onChange={(e) => setRoomCode(normalizeRoomCode(e.target.value))}
            maxLength={ROOM_CODE_LENGTH}
          />
          <button
            data-testid="home-join-room-button"
            className={`${roomCode.length === ROOM_CODE_LENGTH ? "btn-primary" : "btn-secondary"} w-full`}
            onClick={handleJoin}
            disabled={!nickname.trim() || roomCode.length !== ROOM_CODE_LENGTH || connecting}
          >
            加入已有房间
          </button>
          <p className="text-center text-[11px] leading-relaxed text-salem-text-ink">
            加入朋友的房间时，输入昵称和房间码后点击“加入已有房间”。
          </p>
        </div>

        {/* Error display */}
        {error && (
          <p data-testid="home-error" className="text-salem-danger text-sm text-center">{error}</p>
        )}

        {/* Rules link */}
        <button
          className="flex items-center gap-2 text-salem-text-secondary hover:text-salem-accent-gold transition-colors min-h-[44px]"
          onClick={() => setShowRules(true)}
        >
          <BookOpen size={18} />
          <span className="text-sm">玩法说明</span>
        </button>
      </div>

      {/* Rules dialog */}
      {showRules && (
        <ConfirmDialog
          title="Salem 1692 玩法简介"
          message="每位玩家拥有隐藏身份牌，身份可能是女巫、警长或镇民。白天可出牌指控他人，达到门槛后翻开身份牌；也可以抽牌，但抽牌会直接结束回合。夜间女巫选择击杀目标，警长选择保护对象。"
          confirmText="了解了"
          onConfirm={() => setShowRules(false)}
        />
      )}
    </div>
  );
}
