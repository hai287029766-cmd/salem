import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Shield, UserRound } from "lucide-react";
import type { TryalCardType } from "@salem/shared";
import type { ServerEvent } from "@salem/shared";
import type { PlayerState } from "../hooks/useGameState";
import Timer from "./Timer";
import { parseTryalCard, TRYAL_LABELS } from "../utils/tryalCardParser";

const TRYAL_CARD_CLASSES: Record<TryalCardType, string> = {
  witch: "border-salem-witch bg-salem-witch/30 text-salem-text-primary",
  not_witch: "border-salem-townfolk bg-salem-townfolk/30 text-salem-text-primary",
  constable: "border-salem-constable bg-salem-constable/30 text-salem-text-primary",
};

const REVEAL_COLORS: Record<TryalCardType, string> = {
  witch: "border-salem-witch bg-salem-witch/40",
  not_witch: "border-salem-townfolk bg-salem-townfolk/40",
  constable: "border-salem-constable bg-salem-constable/40",
};

function TryalIcon({ type, size = 24 }: { type: TryalCardType; size?: number }) {
  if (type === "witch") return <Flame size={size} className="text-[#c090e0]" />;
  if (type === "constable") return <Shield size={size} className="text-[#80b8e0]" />;
  return <UserRound size={size} className="text-[#90c0e0]" />;
}

interface TryalOverlayProps {
  state: {
    tryalTargetId: string;
    tryalChooserId: string;
    players: Map<string, PlayerState>;
    timer: number;
  };
  myId: string;
  onChoose: (targetId: string, cardIndex: number) => void;
  lastEvent: ServerEvent | null;
}

interface RevealState {
  cardIndex: number;
  cardType: TryalCardType;
}

export default function TryalOverlay({ state, myId, onChoose, lastEvent }: TryalOverlayProps) {
  const target = state.players.get(state.tryalTargetId);
  const [revealState, setRevealState] = useState<RevealState | null>(null);

  useEffect(() => {
    if (
      lastEvent?.type === "card_revealed" &&
      lastEvent.playerId === state.tryalTargetId
    ) {
      setRevealState({
        cardIndex: lastEvent.cardIndex,
        cardType: lastEvent.cardType as TryalCardType,
      });
      const timer = setTimeout(() => setRevealState(null), 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [lastEvent, state.tryalTargetId]);

  if (!target) return null;

  const canChoose = state.tryalChooserId === myId;
  const cardSlots = Array.from({
    length: Math.max(target.tryalCardCount, target.publicTryalCards.length, target.tryalCards.length),
  }, (_, i) => i);

  return (
    <div className="absolute inset-0 z-40 bg-black/80 flex flex-col items-center justify-center px-6">
      <h2 className="font-heading text-2xl text-salem-accent-gold mb-2">审判: {target.name}</h2>
      <p className="text-salem-text-ink text-sm mb-6">指控值已达门槛</p>
      <p className="text-sm text-salem-text-primary mb-4">选择一张审判卡翻开:</p>
      <div className="flex gap-3 flex-wrap justify-center">
        {cardSlots.map((i) => {
          const parsed = parseTryalCard(target.publicTryalCards[i]);
          const isRevealed = parsed?.faceUp ?? false;
          const hasType = parsed?.type != null;
          const isFlipping = revealState?.cardIndex === i;

          if (isFlipping) {
            return (
              <div key={i} className="perspective-[600px] w-14 h-20">
                <motion.div
                  className="relative w-full h-full"
                  style={{ transformStyle: "preserve-3d" }}
                  initial={{ rotateY: 0 }}
                  animate={{ rotateY: 180 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                >
                  <div
                    className="absolute inset-0 rounded-card border-2 border-salem-accent-gold/60 bg-salem-accent-black flex items-center justify-center"
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    <span className="text-salem-accent-gold text-xl font-bold">?</span>
                  </div>
                  <div
                    className={`absolute inset-0 rounded-card border-2 flex flex-col items-center justify-center gap-1 ${REVEAL_COLORS[revealState.cardType]}`}
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                  >
                    <TryalIcon type={revealState.cardType} />
                    <span className="text-[10px] font-bold text-salem-text-bright">
                      {TRYAL_LABELS[revealState.cardType]}
                    </span>
                  </div>
                </motion.div>
              </div>
            );
          }

          return (
            <button
              key={i}
              data-testid={`tryal-card-${i}`}
              disabled={isRevealed || !canChoose}
              onClick={() => onChoose(state.tryalTargetId, i)}
              className={`w-14 h-20 rounded-card flex items-center justify-center text-lg font-bold transition-all
                ${hasType && parsed?.type
                  ? `${TRYAL_CARD_CLASSES[parsed.type]} border-2 text-xs`
                  : isRevealed
                  ? "bg-salem-bg-secondary border border-salem-text-secondary/40 text-salem-text-secondary"
                  : "bg-salem-accent-black border-2 border-salem-accent-gold/60 text-salem-accent-gold hover:shadow-glow cursor-pointer"}`}
            >
              {hasType && parsed?.type ? TRYAL_LABELS[parsed.type] : isRevealed ? "已公开" : "?"}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {revealState && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 text-center"
          >
            <p className="text-lg font-heading text-salem-text-bright">
              翻开结果: <span className={revealState.cardType === "witch" ? "text-[#c090e0]" : "text-[#90c0e0]"}>
                {TRYAL_LABELS[revealState.cardType]}
              </span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4">
        <Timer seconds={state.timer} isPaused={false} />
      </div>
    </div>
  );
}
