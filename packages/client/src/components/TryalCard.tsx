import { useState } from "react";
import { motion } from "framer-motion";
import type { TryalCardType } from "@salem/shared";
import { TRYAL_CARD_IMAGE_SOURCES } from "../assets/cardAssets";

interface TryalCardProps {
  type: TryalCardType;
  faceUp: boolean;
  onFlip?: () => void;
  disabled?: boolean;
}

const TYPE_LABELS: Record<TryalCardType, string> = {
  witch: "女巫",
  not_witch: "非女巫",
  constable: "警长",
};

const TYPE_COLORS: Record<TryalCardType, string> = {
  witch: "text-salem-witch bg-salem-witch/20",
  not_witch: "text-salem-townfolk bg-salem-townfolk/20",
  constable: "text-salem-constable bg-salem-constable/20",
};

export default function TryalCard({ type, faceUp, onFlip, disabled }: TryalCardProps) {
  const [isFlipping, setIsFlipping] = useState(false);
  const [revealed, setRevealed] = useState(faceUp);
  const imageSrc = TRYAL_CARD_IMAGE_SOURCES[type];

  const handleFlip = () => {
    if (disabled || revealed || isFlipping) return;
    setIsFlipping(true);
    setTimeout(() => {
      setRevealed(true);
      setIsFlipping(false);
    }, 400);
    onFlip?.();
  };

  return (
    <div className="perspective-[600px] w-14 h-20">
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: revealed ? 180 : 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      >
        {/* Back face */}
        <button
          className="absolute inset-0 rounded-card border-2 border-salem-accent-gold/60 bg-salem-accent-black flex items-center justify-center backface-hidden"
          style={{ backfaceVisibility: "hidden" }}
          onClick={handleFlip}
          disabled={disabled || revealed}
        >
          <span className="text-salem-accent-gold text-xl font-bold">?</span>
        </button>

        {/* Front face */}
        <div
          className={`absolute inset-0 rounded-card border-2 overflow-hidden flex items-center justify-center
            ${TYPE_COLORS[type]} backface-hidden`}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={TYPE_LABELS[type]}
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <span className="text-xs font-bold text-center px-1">
              {TYPE_LABELS[type]}
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
}
