import { useState, type ReactNode } from "react";
import { Cat, Cross, Hand, Heart, Info, Shield, Skull, UserRound, Volume2 } from "lucide-react";
import { CHARACTER_DEFINITIONS } from "@salem/shared";
import type { CharacterName, TryalCardType } from "@salem/shared";
import type { PlayerState } from "../hooks/useGameState";

interface PlayerSeatProps {
  player: PlayerState;
  isCurrentTurn: boolean;
  isSelf: boolean;
  isSpeaking: boolean;
  selectable: boolean;
  onSelect: () => void;
  testId?: string;
}

const ACCUSATION_MAX = 7;

interface ParsedTryalCard {
  type: TryalCardType;
  faceUp: boolean;
}

const TRYAL_LABELS: Record<TryalCardType, string> = {
  witch: "女巫",
  not_witch: "镇民",
  constable: "警长",
};

const TRYAL_SHORT_LABELS: Record<TryalCardType, string> = {
  witch: "巫",
  not_witch: "民",
  constable: "警",
};

const TRYAL_CLASSES: Record<TryalCardType, string> = {
  witch: "border-salem-witch bg-salem-witch/45 text-salem-text-primary",
  not_witch: "border-salem-townfolk bg-salem-townfolk/45 text-salem-text-primary",
  constable: "border-salem-constable bg-salem-constable/45 text-salem-text-primary",
};

function parseTryalCard(value: string | undefined): ParsedTryalCard | null {
  if (!value) return null;
  if (value === "witch" || value === "not_witch" || value === "constable") {
    return { type: value, faceUp: true };
  }

  try {
    const parsed = JSON.parse(value) as Partial<ParsedTryalCard>;
    if (parsed.type === "witch" || parsed.type === "not_witch" || parsed.type === "constable") {
      return {
        type: parsed.type,
        faceUp: parsed.faceUp ?? true,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export default function PlayerSeat({
  player,
  isCurrentTurn,
  isSelf,
  isSpeaking,
  selectable,
  onSelect,
  testId,
}: PlayerSeatProps) {
  const [showAbility, setShowAbility] = useState(false);
  const isDead = !player.isAlive;
  const character = CHARACTER_DEFINITIONS.find((item) => item.name === (player.characterName as CharacterName));
  const characterLabel = character?.nameCn || player.characterName;
  const characterAbility = player.characterAbility || character?.ability || "暂无角色能力说明";
  const accusationRatio = Math.min(player.accusationPoints / ACCUSATION_MAX, 1);

  const cardFrame = [
    "relative min-h-[172px] rounded-card border p-3 text-left shadow-card transition-all",
    isDead ? "border-salem-text-secondary/25 bg-salem-bg-secondary/45 opacity-70 grayscale" : "bg-salem-bg-secondary/90",
    isCurrentTurn ? "border-salem-accent-gold shadow-glow" : "border-salem-accent-gold/20",
    isSelf ? "ring-1 ring-salem-accent-gold/60" : "",
    selectable ? "cursor-pointer hover:border-salem-accent-gold hover:bg-salem-bg-secondary" : "",
  ].join(" ");

  return (
    <section data-testid={testId} className={cardFrame}>
      <button
        data-testid={testId ? `${testId}-select` : undefined}
        className="absolute inset-0 rounded-card"
        onClick={selectable ? onSelect : undefined}
        disabled={!selectable}
        aria-label={`选择${player.name}`}
      />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-heading text-lg leading-tight text-salem-text-primary">
              {player.name}
            </h3>
            {isSelf && <StatusPill tone="gold">我</StatusPill>}
            {isCurrentTurn && <StatusPill tone="gold">当前回合</StatusPill>}
            {isDead && <StatusPill tone="muted">已死亡</StatusPill>}
            {isSpeaking && (
              <span className="inline-flex items-center gap-1 rounded-full border border-salem-success/40 bg-salem-success/10 px-2 py-0.5 text-xs text-salem-success">
                <Volume2 size={12} />
                发言
              </span>
            )}
          </div>

          <button
            type="button"
            data-testid={testId ? `${testId}-character` : undefined}
            className="mt-2 inline-flex max-w-full items-center gap-1 rounded-button border border-salem-accent-gold/30 bg-salem-bg-primary/60 px-2 py-1 text-xs text-salem-accent-gold"
            onClick={() => setShowAbility((prev) => !prev)}
            onMouseEnter={() => setShowAbility(true)}
            onMouseLeave={() => setShowAbility(false)}
            aria-label={`查看${characterLabel}能力`}
          >
            <Info size={13} />
            <span className="truncate">{characterLabel}</span>
          </button>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-salem-accent-gold/35 bg-salem-bg-primary/70">
          {isDead ? (
            <Skull size={24} className="text-salem-text-secondary" />
          ) : (
            <UserRound size={24} className={isSelf ? "text-salem-accent-gold" : "text-salem-text-primary"} />
          )}
        </div>
      </div>

      <div className="relative z-10 mt-3 grid grid-cols-3 gap-2">
        <Metric label="手牌" value={`${player.handCardCount}`} icon={<Hand size={13} />} testId={testId ? `${testId}-hand-count` : undefined} />
        <Metric label="身份" value={`${player.tryalCardFaceUp}/${player.tryalCardCount}`} />
        <Metric label="指控" value={`${player.accusationPoints}/${ACCUSATION_MAX}`} />
      </div>

      <div className="relative z-10 mt-3">
        <div className="mb-1 flex items-center justify-between text-[11px] text-salem-text-secondary">
          <span>指控进度</span>
          <span>{player.accusationPoints}/{ACCUSATION_MAX}</span>
        </div>
        <div className="h-2 rounded-full bg-salem-bg-primary">
          <div
            className="h-full rounded-full bg-salem-accent-red transition-all"
            style={{ width: `${accusationRatio * 100}%` }}
          />
        </div>
      </div>

      <IdentityCardRow player={player} isSelf={isSelf} testId={testId ? `${testId}-tryal` : undefined} />
      <StatusRow player={player} />

      {showAbility && characterLabel && (
        <div
          data-testid={testId ? `${testId}-character-ability` : undefined}
          className="absolute left-3 right-3 top-[4.4rem] z-30 rounded-card border border-salem-accent-gold/40 bg-salem-bg-primary p-3 text-left shadow-card"
        >
          <p className="font-heading text-sm text-salem-accent-gold">{characterLabel}</p>
          <p className="mt-1 text-xs leading-relaxed text-salem-text-primary">{characterAbility}</p>
        </div>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  icon,
  testId,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  testId?: string;
}) {
  return (
    <div className="rounded-card border border-salem-text-secondary/15 bg-salem-bg-primary/45 px-2 py-2">
      <p className="flex items-center gap-1 text-[11px] text-salem-text-secondary">
        {icon}
        {label}
      </p>
      <p data-testid={testId} className="mt-1 font-heading text-base text-salem-text-primary">
        {value}
      </p>
    </div>
  );
}

function StatusPill({ tone, children }: { tone: "gold" | "muted"; children: ReactNode }) {
  const className =
    tone === "gold"
      ? "border-salem-accent-gold/40 bg-salem-accent-gold/15 text-salem-accent-gold"
      : "border-salem-text-secondary/30 bg-salem-bg-primary/60 text-salem-text-secondary";

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] leading-none ${className}`}>
      {children}
    </span>
  );
}

function StatusRow({ player }: { player: PlayerState }) {
  type StatusItem = { label: string; icon: ReactNode };
  const statuses: StatusItem[] = [];
  if (player.hasBlackCat) statuses.push({ label: "黑猫", icon: <Cat size={13} /> });
  if (player.hasAsylum) statuses.push({ label: "庇护", icon: <Shield size={13} /> });
  if (player.hasPiety) statuses.push({ label: "虔诚", icon: <Cross size={13} /> });
  if (player.hasMatchmaker) statuses.push({ label: "红线", icon: <Heart size={13} /> });
  if (player.hasStocks) statuses.push({ label: "枷锁", icon: <Skull size={13} /> });

  if (statuses.length === 0) {
    return <p className="relative z-10 mt-3 text-xs text-salem-text-secondary">暂无公开状态</p>;
  }

  return (
    <div className="relative z-10 mt-3 flex flex-wrap gap-1.5">
      {statuses.map((status) => (
        <span
          key={status.label}
          className="inline-flex items-center gap-1 rounded-full border border-salem-accent-gold/25 bg-salem-bg-primary/55 px-2 py-1 text-xs text-salem-text-primary"
        >
          {status.icon}
          {status.label}
        </span>
      ))}
    </div>
  );
}

function IdentityCardRow({
  player,
  isSelf,
  testId,
}: {
  player: PlayerState;
  isSelf: boolean;
  testId?: string;
}) {
  const count = Math.max(player.tryalCardCount, player.tryalCards.length, player.publicTryalCards.length);
  if (count <= 0) return null;

  return (
    <div data-testid={testId} className="relative z-10 mt-3 flex flex-wrap gap-1.5">
      {Array.from({ length: count }, (_, index) => {
        const ownCard = parseTryalCard(player.tryalCards[index]);
        const publicCard = parseTryalCard(player.publicTryalCards[index]);
        const visibleCard = isSelf ? ownCard : publicCard;
        const isFallbackRevealed = !visibleCard && !isSelf && index < player.tryalCardFaceUp;
        const faceUp = isSelf ? Boolean(ownCard) : Boolean(visibleCard) || isFallbackRevealed;

        return (
          <span
            key={index}
            data-testid={testId ? `${testId}-card-${index}` : undefined}
            className={`flex h-11 min-w-8 flex-col items-center justify-center rounded-[6px] border px-1 text-center text-[10px] font-bold leading-tight
              ${visibleCard ? TRYAL_CLASSES[visibleCard.type] : faceUp ? "border-salem-accent-gold/50 bg-salem-bg-card/15 text-salem-accent-gold" : "border-salem-accent-gold/35 bg-salem-accent-black/80 text-salem-accent-gold"}`}
            title={visibleCard ? TRYAL_LABELS[visibleCard.type] : faceUp ? "已公开身份" : "未公开身份"}
          >
            <span>{visibleCard ? TRYAL_SHORT_LABELS[visibleCard.type] : faceUp ? "开" : "?"}</span>
            <span className="mt-0.5 text-[8px] font-normal text-salem-text-secondary">
              {index + 1}
            </span>
          </span>
        );
      })}
    </div>
  );
}
