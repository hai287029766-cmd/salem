import { useState, useCallback } from "react";
import { Sparkles, X } from "lucide-react";
import { CARD_DEFINITIONS } from "@salem/shared";
import type { CardType, CardColor } from "@salem/shared";
import GameCard from "./GameCard";

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
  isPlayMode?: boolean;
}

const COLOR_ACCENT: Record<CardColor, string> = {
  red: "border-salem-accent-red/40 bg-salem-accent-red/10",
  green: "border-salem-accent-green/40 bg-salem-accent-green/10",
  blue: "border-salem-accent-blue/40 bg-salem-accent-blue/10",
  black: "border-salem-text-secondary/40 bg-salem-text-secondary/10",
};

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
  isPlayMode = false,
}: CardHandStripProps) {
  const [detailCard, setDetailCard] = useState<{ card: CardType; index: number } | null>(null);

  const handleCardClick = useCallback((card: CardType, index: number) => {
    if (isPlayMode) {
      onSelectCard(card, index);
    } else {
      setDetailCard({ card, index });
    }
  }, [isPlayMode, onSelectCard]);

  return (
    <>
      <div className="fixed bottom-[96px] left-0 right-0 max-w-[430px] mx-auto border-t border-salem-accent-gold/10 bg-salem-bg-dark/95 backdrop-blur-sm px-3 py-1.5 z-20">
        <div className="flex items-center gap-2">
          {characterName && onUseSkill && (
            <button
              type="button"
              data-testid="game-role-skill-button"
              className="shrink-0 h-[56px] rounded-md border border-salem-accent-gold/25 bg-salem-accent-gold/10 px-2.5
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
                  onSelect={() => handleCardClick(card, index)}
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

      {detailCard && (
        <CardDetailPopup
          card={detailCard.card}
          onUse={() => {
            onSelectCard(detailCard.card, detailCard.index);
            setDetailCard(null);
          }}
          onClose={() => setDetailCard(null)}
          canUse={!disabled}
        />
      )}
    </>
  );
}

function CardDetailPopup({
  card,
  onUse,
  onClose,
  canUse,
}: {
  card: CardType;
  onUse: () => void;
  onClose: () => void;
  canUse: boolean;
}) {
  const def = CARD_DEFINITIONS[card];
  if (!def) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`relative w-[280px] rounded-card border-2 ${COLOR_ACCENT[def.color]} p-5`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-3 right-3 text-salem-text-secondary hover:text-salem-text-primary transition-colors"
          onClick={onClose}
          aria-label="关闭"
        >
          <X size={18} />
        </button>

        <p className="text-[11px] uppercase tracking-wider text-salem-text-ink mb-1">
          {def.nameEn}
        </p>
        <h3 className="font-heading text-xl text-salem-text-bright mb-3">
          {def.nameCn}
        </h3>

        <p className="text-sm text-salem-text-primary leading-relaxed mb-4">
          {def.description}
        </p>

        {def.accusationValue !== undefined && def.accusationValue > 0 && (
          <p className="text-xs text-salem-accent-red font-heading mb-4">
            指控值: +{def.accusationValue}
          </p>
        )}

        <div className="flex gap-2">
          {canUse && (
            <button className="btn-primary flex-1" onClick={onUse}>
              使用
            </button>
          )}
          <button className="btn-secondary flex-1" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
