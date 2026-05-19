import { useState } from "react";
import { motion } from "framer-motion";
import type { TryalCardType } from "@salem/shared";
import { Flame, Shield, UserRound } from "lucide-react";

interface TryalCardProps {
  type: TryalCardType;
  faceUp: boolean;
  onFlip?: () => void;
  disabled?: boolean;
}

const TYPE_LABELS: Record<TryalCardType, string> = {
  witch: "女巫",
  not_witch: "镇民",
  constable: "警长",
};

const TYPE_COLORS: Record<TryalCardType, string> = {
  witch: "text-[#c090e0] border-salem-witch-mark bg-salem-witch-mark/20",
  not_witch: "text-[#90c0e0] border-salem-villager-mark bg-salem-villager-mark/20",
  constable: "text-[#80b8e0] border-salem-constable bg-salem-constable/20",
};

function TryalIcon({ type }: { type: TryalCardType }) {
  if (type === "witch") return <Flame size={18} />;
  if (type === "constable") return <Shield size={18} />;
  return <UserRound size={18} />;
}

export default function TryalCard({ type, faceUp, onFlip, disabled }: TryalCardProps) {
  const [isFlipping, setIsFlipping] = useState(false);
  const [revealed, setRevealed] = useState(faceUp);

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
        <button
          className="absolute inset-0 rounded-card border-2 border-salem-accent-gold/60 bg-salem-accent-black flex items-center justify-center backface-hidden"
          style={{ backfaceVisibility: "hidden" }}
          onClick={handleFlip}
          disabled={disabled || revealed}
        >
          <span className="text-salem-accent-gold text-xl font-bold">?</span>
        </button>

        <div
          className={`absolute inset-0 rounded-card border-2 overflow-hidden flex flex-col items-center justify-center gap-1
            ${TYPE_COLORS[type]} backface-hidden`}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <TryalIcon type={type} />
          <span className="text-[9px] font-bold text-center px-1">
            {TYPE_LABELS[type]}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
