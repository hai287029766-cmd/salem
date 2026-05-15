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
  const selectedOwner = players.find((p) => p.id === blackCatOwnerId);

  return (
    <div
      data-testid="dawn-black-cat-overlay"
      className="absolute inset-0 z-40 flex flex-col bg-black/85 px-4 py-6"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl text-salem-accent-gold">黎明 - 放置黑猫</h2>
          <p className="mt-1 text-sm leading-relaxed text-salem-text-ink">
            女巫选择一名玩家放置黑猫。黑猫持有者先手行动。
          </p>
        </div>
        <Timer seconds={timer} isPaused={false} />
      </div>

      {roleInfo?.isWitch ? (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {alivePlayers.map((player) => (
            <button
              key={player.id}
              data-testid={`dawn-black-cat-target-${player.seatIndex}`}
              className={`rounded-card border px-4 py-4 text-left transition-all ${
                player.id === blackCatOwnerId
                  ? "border-salem-accent-gold bg-salem-accent-gold/20"
                  : "border-salem-accent-gold/30 bg-salem-bg-secondary/80 hover:border-salem-accent-gold"
              }`}
              onClick={() => onChoose(player.id)}
            >
              <span className="block font-heading text-base text-salem-text-primary">{player.name}</span>
              <span className="mt-1 block text-xs text-salem-text-ink">
                {player.id === blackCatOwnerId ? "黑猫在此" : "放置黑猫"}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-12 rounded-card border border-salem-accent-gold/20 bg-salem-bg-secondary/80 p-5 text-center">
          <p className="font-heading text-lg text-salem-text-primary">所有人闭眼</p>
          <p className="mt-2 text-sm text-salem-text-ink">
            等待女巫放置黑猫
            {selectedOwner ? `: ${selectedOwner.name}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
