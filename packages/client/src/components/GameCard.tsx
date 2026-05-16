import { CARD_DEFINITIONS } from "@salem/shared";
import type { CardType, CardColor } from "@salem/shared";

interface GameCardProps {
  cardType: CardType;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  testId?: string;
  compact?: boolean;
}

const COLOR_BORDERS: Record<CardColor, string> = {
  red: "border-l-salem-accent-red",
  green: "border-l-salem-accent-green",
  blue: "border-l-salem-accent-blue",
  black: "border-l-salem-accent-black",
};

const COLOR_LABELS: Record<CardColor, string> = {
  red: "text-salem-accent-red",
  green: "text-salem-accent-green",
  blue: "text-[#5a9a7a]",
  black: "text-salem-text-secondary",
};

const COLOR_VALUE_BG: Record<CardColor, string> = {
  red: "bg-salem-accent-red/20 text-salem-accent-red",
  green: "bg-salem-accent-green/20 text-[#5a9a7a]",
  blue: "bg-salem-accent-blue/20 text-[#5a8aaa]",
  black: "bg-salem-accent-black/30 text-salem-text-secondary",
};

export default function GameCard({ cardType, selected, disabled, onSelect, testId, compact }: GameCardProps) {
  const def = CARD_DEFINITIONS[cardType];
  if (!def) return null;

  if (compact) {
    return (
      <button
        data-testid={testId}
        className={`shrink-0 w-[72px] h-[48px] rounded-md border border-salem-accent-gold/15 border-l-[3px] ${COLOR_BORDERS[def.color]}
          bg-gradient-to-b from-salem-bg-card-dark to-salem-bg-card-folded
          flex flex-col items-center justify-center px-1 text-center overflow-hidden
          transition-all duration-200
          ${selected ? "translate-y-[-4px] shadow-glow border-salem-accent-gold/40" : ""}
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-95"}`}
        onClick={disabled ? undefined : onSelect}
        disabled={disabled}
        aria-label={def.nameCn}
      >
        <span className="text-[11px] font-heading font-bold text-salem-text-bright leading-tight truncate w-full">
          {def.nameCn}
        </span>
        {def.accusationValue !== undefined && def.accusationValue > 0 && (
          <span className={`text-[9px] font-heading font-bold rounded-full px-1 ${COLOR_VALUE_BG[def.color]}`}>
            +{def.accusationValue}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      data-testid={testId}
      className={`shrink-0 w-[88px] h-[128px] rounded-card border border-salem-accent-gold/15 border-l-[3px] ${COLOR_BORDERS[def.color]}
        bg-gradient-to-b from-salem-bg-card-dark to-salem-bg-card-folded
        flex flex-col items-center justify-between px-2 py-2 text-center overflow-hidden
        transition-all duration-200 relative
        ${selected ? "translate-y-[-8px] shadow-glow border-salem-accent-gold/40" : ""}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-95"}`}
      onClick={disabled ? undefined : onSelect}
      disabled={disabled}
      aria-label={def.nameCn}
    >
      <span className={`text-[9px] uppercase tracking-wider ${COLOR_LABELS[def.color]} leading-tight`}>
        {def.nameEn}
      </span>

      <span className="text-sm font-heading font-bold text-salem-text-bright leading-tight">
        {def.nameCn}
      </span>

      <span className="text-[8px] text-salem-text-ink leading-tight line-clamp-2">
        {def.description}
      </span>

      {def.accusationValue !== undefined && def.accusationValue > 0 ? (
        <span className={`text-xs font-heading font-bold rounded-full px-1.5 py-0.5 ${COLOR_VALUE_BG[def.color]}`}>
          +{def.accusationValue}
        </span>
      ) : (
        <span className="h-4" />
      )}
    </button>
  );
}
