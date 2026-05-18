import { useState, useCallback } from "react";
import { ArrowUp, ArrowDown, Check, X } from "lucide-react";
import type { CardType } from "@salem/shared";
import { CARD_DEFINITIONS } from "@salem/shared";
import Timer from "./Timer";

const CARD_COLOR_MAP: Record<string, string> = {
  red: "border-salem-accent-red/60 bg-salem-accent-red/15 text-salem-accent-red",
  green: "border-salem-accent-green/60 bg-salem-accent-green/15 text-salem-accent-green",
  blue: "border-salem-constable/60 bg-salem-constable/15 text-[#80b8e0]",
  black: "border-salem-text-secondary/60 bg-salem-text-secondary/15 text-salem-text-secondary",
};

interface TitubaSkillOverlayProps {
  deck: CardType[];
  timer: number;
  onConfirm: (newOrder: CardType[]) => void;
  onCancel: () => void;
}

export default function TitubaSkillOverlay({ deck, timer, onConfirm, onCancel }: TitubaSkillOverlayProps) {
  const [cards, setCards] = useState<CardType[]>([...deck]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const moveCard = useCallback((from: number, to: number) => {
    setCards((prev) => {
      const next = [...prev];
      const [removed] = next.splice(from, 1);
      next.splice(to, 0, removed);
      return next;
    });
    setSelectedIndex(to);
  }, []);

  const handleTap = useCallback((index: number) => {
    if (selectedIndex === null) {
      setSelectedIndex(index);
      return;
    }
    if (selectedIndex === index) {
      setSelectedIndex(null);
      return;
    }
    moveCard(selectedIndex, index);
  }, [selectedIndex, moveCard]);

  const handleMoveUp = useCallback(() => {
    if (selectedIndex !== null && selectedIndex > 0) {
      moveCard(selectedIndex, selectedIndex - 1);
    }
  }, [selectedIndex, moveCard]);

  const handleMoveDown = useCallback(() => {
    if (selectedIndex !== null && selectedIndex < cards.length - 1) {
      moveCard(selectedIndex, selectedIndex + 1);
    }
  }, [selectedIndex, cards.length, moveCard]);

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-salem-bg-dark/98 px-4 py-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-heading text-lg text-salem-accent-gold">
          提图芭 -- 重排牌堆
        </h2>
        <Timer seconds={timer} isPaused={false} />
      </div>

      <p className="text-xs text-salem-text-secondary mb-3">
        点击选中一张卡，再点击目标位置插入。顶部为牌堆顶(先抽到)。
      </p>

      {selectedIndex !== null && (
        <div className="flex justify-center gap-4 mb-2">
          <button
            className="flex items-center gap-1 px-3 py-1.5 rounded-card bg-salem-bg-secondary border border-salem-accent-gold/30 text-salem-accent-gold text-xs disabled:opacity-30"
            onClick={handleMoveUp}
            disabled={selectedIndex <= 0}
            aria-label="上移"
          >
            <ArrowUp size={14} /> 上移
          </button>
          <button
            className="flex items-center gap-1 px-3 py-1.5 rounded-card bg-salem-bg-secondary border border-salem-accent-gold/30 text-salem-accent-gold text-xs disabled:opacity-30"
            onClick={handleMoveDown}
            disabled={selectedIndex >= cards.length - 1}
            aria-label="下移"
          >
            <ArrowDown size={14} /> 下移
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-1 mb-3">
        {cards.map((card, index) => {
          const def = CARD_DEFINITIONS[card];
          const colorClass = def ? CARD_COLOR_MAP[def.color] || CARD_COLOR_MAP.black : CARD_COLOR_MAP.black;
          const isSelected = selectedIndex === index;

          return (
            <button
              key={`${card}-${index}`}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-card border text-left text-sm transition-all
                ${colorClass}
                ${isSelected ? "ring-2 ring-salem-accent-gold shadow-glow" : ""}
              `}
              onClick={() => handleTap(index)}
            >
              <span className="w-6 text-center text-[10px] opacity-50 font-heading shrink-0">{index + 1}</span>
              <span className="font-heading">{def?.nameCn || card}</span>
              <span className="text-[10px] opacity-60 ml-auto">{def?.nameEn || ""}</span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button
          className="btn-secondary flex-1 gap-1"
          onClick={onCancel}
        >
          <X size={16} /> 取消
        </button>
        <button
          className="btn-primary flex-1 gap-1"
          onClick={() => onConfirm(cards)}
        >
          <Check size={16} /> 确认排序
        </button>
      </div>
    </div>
  );
}
