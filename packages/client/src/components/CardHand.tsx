import GameCard from "./GameCard";
import type { CardType } from "@salem/shared";

interface CardHandProps {
  cards: CardType[];
  selectedCardIndexes: number[];
  onSelectCard: (card: CardType, index: number) => void;
  disabled: boolean;
}

export default function CardHand({
  cards,
  selectedCardIndexes,
  onSelectCard,
  disabled,
}: CardHandProps) {
  if (cards.length === 0) return null;

  return (
    <div className="border-t border-salem-text-secondary/20 bg-salem-bg-secondary/60 backdrop-blur-sm">
      <div className="px-3 py-1">
        <span className="text-xs text-salem-text-secondary">
          我的手牌 ({cards.length}张)
        </span>
      </div>
      <div className="flex gap-2 px-3 pb-2 overflow-x-auto scrollbar-hide">
        {cards.map((card, index) => {
          const isSelected = selectedCardIndexes.includes(index);
          return (
            <GameCard
              key={`${card}-${index}`}
              cardType={card}
              selected={isSelected}
              disabled={disabled}
              onSelect={() => onSelectCard(card, index)}
              testId={`game-hand-card-${index}`}
            />
          );
        })}
      </div>
    </div>
  );
}
