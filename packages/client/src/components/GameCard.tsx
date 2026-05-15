import { CARD_DEFINITIONS } from "@salem/shared";
import type { CardType, CardColor } from "@salem/shared";
import { CARD_IMAGE_SOURCES } from "../assets/cardAssets";

interface GameCardProps {
  cardType: CardType;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  testId?: string;
}

const COLOR_BORDERS: Record<CardColor, string> = {
  red: "border-salem-accent-red",
  green: "border-salem-accent-green",
  blue: "border-salem-accent-blue",
  black: "border-salem-accent-black",
};

const COLOR_BGS: Record<CardColor, string> = {
  red: "bg-salem-accent-red/10",
  green: "bg-salem-accent-green/10",
  blue: "bg-salem-accent-blue/10",
  black: "bg-salem-accent-black/10",
};

export default function GameCard({ cardType, selected, disabled, onSelect, testId }: GameCardProps) {
  const def = CARD_DEFINITIONS[cardType];
  if (!def) return null;

  const borderColor = COLOR_BORDERS[def.color];
  const bgColor = COLOR_BGS[def.color];
  const imageSrc = CARD_IMAGE_SOURCES[cardType];

  return (
    <button
      data-testid={testId}
      className={`group shrink-0 w-[92px] h-[132px] rounded-card border-2 transition-all duration-200 overflow-hidden relative
        ${borderColor}
        ${selected ? "translate-y-[-8px] shadow-glow" : ""}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-95"}`}
      onClick={disabled ? undefined : onSelect}
      disabled={disabled}
      aria-label={def.nameCn}
    >
      {imageSrc ? (
        <>
          <img
            src={imageSrc}
            alt={def.nameCn}
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-1.5 pb-1.5 pt-6 opacity-0 transition-opacity group-focus-visible:opacity-100 group-hover:opacity-100">
            <span className="block text-[10px] font-bold leading-tight text-salem-text-primary">
              {def.nameCn}
            </span>
          </div>
        </>
      ) : (
        <div className={`h-full px-2 py-2 flex flex-col items-center justify-between ${bgColor}`}>
          <span className="text-[10px] uppercase tracking-wide text-salem-text-secondary">
            {def.nameEn}
          </span>
          <span className="text-sm font-bold text-salem-text-primary leading-tight">
            {def.nameCn}
          </span>
          <span className="text-[9px] text-salem-text-secondary leading-tight text-center line-clamp-3">
            {def.description}
          </span>
          {def.accusationValue !== undefined ? (
            <span className="text-sm text-salem-accent-red font-bold">
              +{def.accusationValue}
            </span>
          ) : (
            <span className="h-4" />
          )}
        </div>
      )}
    </button>
  );
}
