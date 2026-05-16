import { Sparkles } from "lucide-react";
import GameCard from "./GameCard";
import type { CardType } from "@salem/shared";

interface CardHandStripProps {
  cards: CardType[];
  selectedCardIndexes: number[];
  onSelectCard: (card: CardType, index: number) => void;
  disabled: boolean;
  characterName?: string;
  characterLabel?: string;
  onUseSkill?: () => void;
  skillDisabled?: boolean;
  skillLabel?: string;
}

export default function CardHandStrip({
  cards,
  selectedCardIndexes,
  onSelectCard,
  disabled,
  characterName,
  characterLabel,
  onUseSkill,
  skillDisabled = false,
  skillLabel,
}: CardHandStripProps) {
  return (
    <div className="fixed bottom-[96px] left-0 right-0 max-w-[430px] mx-auto border-t border-salem-accent-gold/10 bg-salem-bg-dark/95 backdrop-blur-sm px-3 py-1.5 z-20">
      <div className="flex items-center gap-2">
        {characterName && onUseSkill && (
          <button
            type="button"
            data-testid="game-role-skill-button"
            className="shrink-0 h-[48px] rounded-md border border-salem-accent-gold/25 bg-salem-accent-gold/10 px-2.5
              flex items-center gap-1.5 text-[11px] font-heading text-salem-accent-gold
              disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            onClick={onUseSkill}
            disabled={skillDisabled}
            aria-label={skillLabel || "使用技能"}
            title={characterLabel}
          >
            <Sparkles size={14} />
            <span className="max-w-[56px] truncate leading-tight">
              {skillLabel || "技能"}
            </span>
          </button>
        )}

        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
          {cards.length === 0 ? (
            <span className="text-[11px] text-salem-text-ink italic px-1">
              无手牌
            </span>
          ) : (
            cards.map((card, index) => (
              <GameCard
                key={`${card}-${index}`}
                cardType={card}
                selected={selectedCardIndexes.includes(index)}
                disabled={disabled}
                onSelect={() => onSelectCard(card, index)}
                testId={`game-hand-card-${index}`}
                compact
              />
            ))
          )}
        </div>

        <span className="shrink-0 text-[10px] text-salem-text-ink font-heading tabular-nums">
          {cards.length}
        </span>
      </div>
    </div>
  );
}
