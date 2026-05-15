import type { TryalCardType } from "@salem/shared";
import type { PlayerState } from "../hooks/useGameState";
import Timer from "./Timer";
import { parseTryalCard, TRYAL_LABELS } from "../utils/tryalCardParser";

const TRYAL_CARD_CLASSES: Record<TryalCardType, string> = {
  witch: "border-salem-witch bg-salem-witch/30 text-salem-text-primary",
  not_witch: "border-salem-townfolk bg-salem-townfolk/30 text-salem-text-primary",
  constable: "border-salem-constable bg-salem-constable/30 text-salem-text-primary",
};

interface TryalOverlayProps {
  state: {
    tryalTargetId: string;
    tryalChooserId: string;
    players: Map<string, PlayerState>;
    timer: number;
  };
  myId: string;
  onChoose: (targetId: string, cardIndex: number) => void;
}

export default function TryalOverlay({ state, myId, onChoose }: TryalOverlayProps) {
  const target = state.players.get(state.tryalTargetId);
  if (!target) return null;

  const canChoose = state.tryalChooserId === myId;
  const cardSlots = Array.from({
    length: Math.max(target.tryalCardCount, target.publicTryalCards.length, target.tryalCards.length),
  }, (_, i) => i);
  const faceUpCount = target.tryalCardFaceUp;

  return (
    <div className="absolute inset-0 z-40 bg-black/80 flex flex-col items-center justify-center px-6">
      <h2 className="font-heading text-2xl text-salem-accent-gold mb-2">审判: {target.name}</h2>
      <p className="text-salem-text-ink text-sm mb-6">指控值已达门槛</p>
      <p className="text-sm text-salem-text-primary mb-4">选择一张审判卡翻开：</p>
      <div className="flex gap-3 flex-wrap justify-center">
        {cardSlots.map((i) => {
          const publicCard = parseTryalCard(target.publicTryalCards[i]);
          const isRevealed = Boolean(publicCard) || i < faceUpCount;
          return (
            <button
              key={i}
              data-testid={`tryal-card-${i}`}
              disabled={isRevealed || !canChoose}
              onClick={() => onChoose(state.tryalTargetId, i)}
              className={`w-14 h-20 rounded-card flex items-center justify-center text-lg font-bold transition-all
                ${publicCard
                  ? `${TRYAL_CARD_CLASSES[publicCard.type]} border-2 text-xs`
                  : isRevealed
                  ? "bg-salem-bg-secondary border border-salem-text-secondary/40 text-salem-text-secondary"
                  : "bg-salem-accent-black border-2 border-salem-accent-gold/60 text-salem-accent-gold hover:shadow-glow cursor-pointer"}`}
            >
              {publicCard ? TRYAL_LABELS[publicCard.type] : isRevealed ? "已公开" : "?"}
            </button>
          );
        })}
      </div>
      <div className="mt-4">
        <Timer seconds={state.timer} isPaused={false} />
      </div>
    </div>
  );
}
