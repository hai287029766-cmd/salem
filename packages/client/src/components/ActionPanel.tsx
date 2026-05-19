import { useState } from "react";
import { BookOpen, CircleStop, HelpCircle, SkipForward, Swords } from "lucide-react";

type ActionMode = "idle" | "play_card" | "select_target";

interface ActionPanelProps {
  isMyTurn: boolean;
  actionMode: ActionMode;
  onPlayMode: () => void;
  onDrawCards: () => void;
  onCancelPlayMode: () => void;
  onEndTurn: () => void;
  canEndTurn: boolean;
  round?: number;
  currentPlayerName?: string;
}

export default function ActionPanel({
  isMyTurn,
  actionMode,
  onPlayMode,
  onDrawCards,
  onCancelPlayMode,
  onEndTurn,
  canEndTurn,
  round = 0,
  currentPlayerName = "",
}: ActionPanelProps) {
  const inPlayMode = actionMode === "play_card" || actionMode === "select_target";
  const [helpDismissed, setHelpDismissed] = useState(false);
  const autoShow = !inPlayMode && isMyTurn && round <= 2 && !helpDismissed;
  const [showHelp, setShowHelp] = useState(false);
  const hintVisible = autoShow || showHelp;

  return (
    <div className="fixed bottom-[calc(46px+env(safe-area-inset-bottom,0px))] left-0 right-0 max-w-[430px] mx-auto flex flex-col border-t border-salem-accent-gold/10 bg-salem-bg-dark/95 backdrop-blur-sm px-4 py-1.5 z-20">
      {hintVisible && (
        <p className="text-[10px] text-salem-text-ink text-center mb-1">
          你的回合: 出牌对他人使用，或抽牌(抽牌将直接结束回合)
        </p>
      )}
      {!isMyTurn && !inPlayMode && (
        <p className="text-[10px] text-salem-text-ink text-center mb-1 break-words [overflow-wrap:anywhere]">
          等待{currentPlayerName ? ` ${currentPlayerName} ` : "其他玩家"}操作
        </p>
      )}
      <div className="flex items-center gap-3">
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
            <button
              className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-colors ${hintVisible ? "text-salem-accent-gold" : "text-salem-text-ink hover:text-salem-accent-gold"}`}
              onClick={() => {
                if (autoShow) { setHelpDismissed(true); }
                else { setShowHelp((v) => !v); }
              }}
              aria-label="帮助"
            >
              <HelpCircle size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
