import { BookOpen, CircleStop, SkipForward, Swords } from "lucide-react";

type ActionMode = "idle" | "play_card" | "select_target";

interface ActionPanelProps {
  isMyTurn: boolean;
  actionMode: ActionMode;
  onPlayMode: () => void;
  onDrawCards: () => void;
  onCancelPlayMode: () => void;
  onEndTurn: () => void;
  canEndTurn: boolean;
}

export default function ActionPanel({
  isMyTurn,
  actionMode,
  onPlayMode,
  onDrawCards,
  onCancelPlayMode,
  onEndTurn,
  canEndTurn,
}: ActionPanelProps) {
  const inPlayMode = actionMode === "play_card" || actionMode === "select_target";

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-t border-salem-text-secondary/20 bg-salem-bg-secondary/80 safe-area-bottom">
      {inPlayMode ? (
        <>
          <p className="flex-1 text-sm text-salem-accent-gold">
            {actionMode === "play_card" ? "选择手牌" : "选择目标玩家"}
          </p>
          <button
            data-testid="game-action-cancel-play"
            className="btn-secondary gap-1 py-2 px-4"
            onClick={onCancelPlayMode}
          >
            <CircleStop size={16} />
            取消
          </button>
          <button
            data-testid="game-action-end-turn"
            className="btn-primary gap-1 py-2 px-4 text-sm"
            onClick={onEndTurn}
            disabled={!isMyTurn || !canEndTurn}
          >
            <SkipForward size={16} />
            结束回合
          </button>
        </>
      ) : (
        <>
          <button
            data-testid="game-action-play"
            className="btn-primary flex-1 gap-1 px-3 text-sm"
            onClick={onPlayMode}
            disabled={!isMyTurn}
          >
            <Swords size={18} />
            出牌
          </button>
          <button
            data-testid="game-action-draw"
            className="btn-secondary flex-1 gap-1 px-3 text-sm"
            onClick={onDrawCards}
            disabled={!isMyTurn}
          >
            <BookOpen size={18} />
            抽牌
          </button>
          <button
            data-testid="game-action-end-turn"
            className="btn-secondary flex-1 gap-1 px-3 text-sm"
            onClick={onEndTurn}
            disabled={!isMyTurn || !canEndTurn}
          >
            <SkipForward size={18} />
            结束
          </button>
        </>
      )}
    </div>
  );
}
