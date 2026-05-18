import { useState } from "react";
import type { PlayerState } from "../hooks/useGameState";
import Timer from "./Timer";
import { parseTryalCard, TRYAL_LABELS } from "../utils/tryalCardParser";
import type { TryalCardType } from "@salem/shared";

const TRYAL_CARD_CLASSES: Record<TryalCardType, string> = {
  witch: "border-salem-witch bg-salem-witch/30 text-salem-text-primary",
  not_witch: "border-salem-townfolk bg-salem-townfolk/30 text-salem-text-primary",
  constable: "border-salem-constable bg-salem-constable/30 text-salem-text-primary",
};

interface ConspiracyOverlayProps {
  players: PlayerState[];
  myId: string;
  timer: number;
  submitted: boolean;
  onChoose: (cardIndex: number) => void;
}

function getLeftHandAlivePlayer(players: PlayerState[], myId: string): PlayerState | null {
  const alivePlayers = players.filter((p) => p.isAlive).sort((a, b) => a.seatIndex - b.seatIndex);
  const myIndex = alivePlayers.findIndex((p) => p.id === myId);
  if (myIndex < 0 || alivePlayers.length <= 1) return null;
  return alivePlayers[(myIndex - 1 + alivePlayers.length) % alivePlayers.length];
}

export default function ConspiracyOverlay({
  players,
  myId,
  timer,
  submitted,
  onChoose,
}: ConspiracyOverlayProps) {
  const myPlayer = players.find((p) => p.id === myId);
  const sourcePlayer = getLeftHandAlivePlayer(players, myId);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);

  if (!myPlayer?.isAlive || !sourcePlayer) {
    return (
      <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80 px-6">
        <h2 className="font-heading text-2xl text-salem-accent-gold">阴谋</h2>
        <p className="mt-3 text-center text-sm text-salem-text-ink">等待玩家选择身份牌</p>
        <div className="mt-4"><Timer seconds={timer} isPaused={false} /></div>
      </div>
    );
  }

  const cardCount = Math.max(
    sourcePlayer.tryalCardCount,
    sourcePlayer.publicTryalCards.length,
    sourcePlayer.tryalCards.length,
  );
  const cardSlots = Array.from({ length: cardCount }, (_, index) => {
    const parsed = parseTryalCard(sourcePlayer.publicTryalCards[index]);
    return {
      index,
      publicCard: parsed?.type ? parsed : null,
      faceUp: parsed?.faceUp ?? false,
    };
  });
  const selectableSlots = cardSlots.filter((c) => !c.faceUp);

  return (
    <div
      data-testid="conspiracy-overlay"
      className="absolute inset-0 z-40 flex flex-col bg-black/85 px-5 py-4"
    >
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="font-heading text-lg text-salem-accent-gold">阴谋</h2>
          <p className="mt-0.5 text-xs text-salem-text-primary">
            从<span className="font-heading text-salem-accent-gold">{sourcePlayer.name}</span>处选择一张未公开的身份牌
          </p>
        </div>
        <Timer seconds={timer} isPaused={false} />
      </div>

      {submitted ? (
        <div className="flex-1 flex items-center justify-center">
          <p data-testid="conspiracy-submitted" className="text-sm text-salem-text-ink">
            已选择，等待其他玩家...
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="flex flex-wrap justify-center gap-4">
            {cardSlots.map((card) => (
              <button
                key={card.index}
                data-testid={`conspiracy-card-${card.index}`}
                className={`flex h-28 w-20 flex-col items-center justify-center rounded-card border-2 text-sm font-bold transition-all
                  ${card.publicCard?.type
                    ? TRYAL_CARD_CLASSES[card.publicCard.type]
                    : card.faceUp
                    ? "border-salem-text-secondary/40 bg-salem-bg-secondary text-salem-text-secondary"
                    : pendingIndex === card.index
                    ? "border-salem-accent-gold bg-salem-accent-gold/20 shadow-glow scale-105"
                    : "border-salem-accent-gold/60 bg-salem-accent-black text-salem-accent-gold hover:shadow-glow active:scale-95"}`}
                disabled={card.faceUp}
                onClick={() => setPendingIndex(card.index)}
              >
                <span>{card.publicCard?.type ? TRYAL_LABELS[card.publicCard.type] : card.faceUp ? "已公开" : "?"}</span>
                {!card.faceUp && !card.publicCard?.type && (
                  <span className="mt-1 text-[10px] font-normal text-salem-accent-gold/60">
                    {pendingIndex === card.index ? "已选中" : "点击选择"}
                  </span>
                )}
              </button>
            ))}
          </div>
          {pendingIndex !== null && (
            <button
              className="btn-primary mt-4 px-8"
              onClick={() => onChoose(pendingIndex)}
            >
              确认选择
            </button>
          )}
          {selectableSlots.length === 0 && (
            <p className="mt-4 text-center text-xs text-salem-text-ink">没有可选择的未公开身份牌</p>
          )}
        </div>
      )}
    </div>
  );
}
