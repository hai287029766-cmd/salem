import { useState } from "react";
import type { PlayerState } from "../hooks/useGameState";
import Timer from "./Timer";

interface DawnBlackCatOverlayProps {
  roleInfo: { isWitch: boolean } | null;
  players: PlayerState[];
  timer: number;
  blackCatOwnerId: string;
  onChoose: (targetId: string) => void;
}

export default function DawnBlackCatOverlay({
  roleInfo,
  players,
  timer,
  blackCatOwnerId,
  onChoose,
}: DawnBlackCatOverlayProps) {
  const alivePlayers = players.filter((p) => p.isAlive);
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);

  return (
    <div
      data-testid="dawn-black-cat-overlay"
      className="absolute inset-0 z-40 flex flex-col bg-black/85 px-4 py-4"
    >
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="font-heading text-lg text-salem-accent-gold">黎明 - 放置黑猫</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-salem-text-ink">
            选择一名玩家放置黑猫，持有者先手行动
          </p>
        </div>
        <Timer seconds={timer} isPaused={false} />
      </div>

      {roleInfo === null ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-salem-text-ink animate-pulse">角色确认中...</p>
        </div>
      ) : roleInfo.isWitch ? (
        <div className="flex-1 mt-3 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2.5">
            {alivePlayers.map((player) => (
              <button
                key={player.id}
                data-testid={`dawn-black-cat-target-${player.seatIndex}`}
                className={`rounded-card border px-3 py-3 text-left transition-all ${
                  player.id === blackCatOwnerId
                    ? "border-salem-accent-gold bg-salem-accent-gold/20 shadow-glow"
                    : pendingTarget === player.id
                    ? "border-salem-accent-gold bg-salem-accent-gold/15 ring-1 ring-salem-accent-gold/40"
                    : "border-salem-accent-gold/30 bg-salem-bg-secondary/80 hover:border-salem-accent-gold active:scale-95"
                }`}
                onClick={() => setPendingTarget(player.id)}
              >
                <span className="block font-heading text-sm text-salem-text-primary">{player.name}</span>
                <span className="mt-0.5 block text-[10px] text-salem-text-ink">
                  {player.id === blackCatOwnerId ? "黑猫在此" : pendingTarget === player.id ? "已选中" : "放置黑猫"}
                </span>
              </button>
            ))}
          </div>
          {pendingTarget && (
            <button
              className="btn-primary w-full mt-3"
              onClick={() => { onChoose(pendingTarget); setPendingTarget(null); }}
            >
              {pendingTarget === blackCatOwnerId ? "确认保持原位" : "确认放置"}
            </button>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="rounded-card border border-salem-accent-gold/20 bg-salem-bg-secondary/80 p-5 text-center">
            <p className="font-heading text-lg text-salem-text-primary">所有人闭眼</p>
            <p className="mt-2 text-sm text-salem-text-ink">
              女巫正在放置黑猫...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
