import { useLocation, useNavigate } from "react-router-dom";
import { Home, RotateCcw } from "lucide-react";

interface RevealEntry {
  playerId: string;
  name: string;
  isWitch: boolean;
  isConstable: boolean;
}

interface ResultLocationState {
  winner?: "townspeople" | "witches";
  reveals?: RevealEntry[];
  roomCode?: string;
}

export default function Result() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as ResultLocationState) || {};
  const { winner, reveals, roomCode } = locationState;

  const winnerText = winner === "witches" ? "女巫胜利" : "镇民胜利";
  const winnerSubtext =
    winner === "witches"
      ? "女巫已控制了塞勒姆镇"
      : "所有女巫已被揭露";

  const getRoleLabel = (entry: RevealEntry): string => {
    if (entry.isWitch) return "女巫";
    if (entry.isConstable) return "警长";
    return "镇民";
  };

  const getRoleColor = (entry: RevealEntry): string => {
    if (entry.isWitch) return "text-salem-witch";
    if (entry.isConstable) return "text-salem-constable";
    return "text-salem-townfolk";
  };

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col items-center bg-salem-bg-primary px-6 py-8 safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="text-center mb-8 mt-4">
        <h1 className="font-heading text-3xl text-salem-accent-gold mb-2">
          游戏结束
        </h1>
        <h2
          className={`font-heading text-2xl font-bold ${
            winner === "witches" ? "text-salem-witch" : "text-salem-townfolk"
          }`}
        >
          {winnerText}
        </h2>
        <p className="text-salem-text-secondary text-sm mt-1">{winnerSubtext}</p>
      </div>

      {/* Identity reveals */}
      {reveals && reveals.length > 0 && (
        <div className="w-full max-w-sm mb-8">
          <h3 className="font-heading text-lg text-salem-accent-gold mb-3">
            身份揭示
          </h3>
          <div className="space-y-2">
            {reveals.map((entry) => (
              <div
                key={entry.playerId}
                className="flex items-center justify-between px-4 py-3 bg-salem-bg-secondary rounded-card"
              >
                <span className="text-salem-text-primary">{entry.name}</span>
                <span className={`font-semibold ${getRoleColor(entry)}`}>
                  {getRoleLabel(entry)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No data fallback */}
      {(!reveals || reveals.length === 0) && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-salem-text-secondary">暂无结算数据</p>
        </div>
      )}

      {/* Actions */}
      <div className="w-full max-w-sm space-y-3 mt-auto">
        {roomCode && (
          <button
            className="btn-primary w-full gap-2"
            onClick={() => navigate(`/lobby/${roomCode}`)}
          >
            <RotateCcw size={18} />
            再来一局
          </button>
        )}
        <button
          className="btn-secondary w-full gap-2"
          onClick={() => navigate("/")}
        >
          <Home size={18} />
          返回首页
        </button>
      </div>
    </div>
  );
}
