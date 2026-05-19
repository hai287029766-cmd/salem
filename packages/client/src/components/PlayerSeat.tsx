import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import {
  Anchor, Cat, ChevronDown, Cross, Flame, Heart, Layers,
  Lock, Scale, Scroll, Shield, Skull, UserRound,
} from "lucide-react";
import { CHARACTER_DEFINITIONS, ACCUSATION_THRESHOLD, GEORGE_BURROUGHS_THRESHOLD } from "@salem/shared";
import type { CharacterName, TryalCardType } from "@salem/shared";
import type { PlayerState } from "../hooks/useGameState";
import { parseTryalCard, TRYAL_LABELS } from "../utils/tryalCardParser";

interface PlayerSeatProps {
  player: PlayerState;
  isCurrentTurn: boolean;
  isSelf: boolean;
  isSpeaking: boolean;
  selectable: boolean;
  onSelect: () => void;
  expanded: boolean;
  onToggle: () => void;
  testId?: string;
}

function getEffectiveThreshold(player: PlayerState): number {
  const base = player.characterName === "george_burroughs"
    ? GEORGE_BURROUGHS_THRESHOLD
    : ACCUSATION_THRESHOLD;
  return player.hasPiety ? base * 2 : base;
}

export default function PlayerSeat({
  player,
  isCurrentTurn,
  isSelf,
  isSpeaking: _isSpeaking,
  selectable,
  onSelect,
  expanded,
  onToggle,
  testId,
}: PlayerSeatProps) {
  const isDead = !player.isAlive;
  const character = CHARACTER_DEFINITIONS.find(
    (item) => item.name === (player.characterName as CharacterName),
  );
  const characterLabel = character?.nameCn || player.characterName;
  const characterAbility =
    player.characterAbility || character?.ability || "";

  const cardClasses = [
    "relative rounded-card border overflow-hidden transition-all duration-300",
    isDead
      ? "border-salem-text-secondary/20 bg-salem-bg-card-dark/60 opacity-70 grayscale"
      : "bg-gradient-to-b from-salem-bg-card-dark to-salem-bg-card-folded",
    isCurrentTurn
      ? "border-salem-accent-gold/30 shadow-glow"
      : "border-salem-accent-gold/10",
    isSelf ? "border-salem-accent-gold/25 from-[#1e1814]" : "",
  ].join(" ");

  return (
    <section data-testid={testId} className={cardClasses}>
      {/* Gold top line for active turn */}
      {isCurrentTurn && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-salem-accent-gold/30 to-transparent" />
      )}

      {/* Turn pulse dot */}
      {isCurrentTurn && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-salem-accent-gold shadow-glow animate-turn-pulse z-10" />
      )}

      {/* Clickable overlay for target selection */}
      {selectable && (
        <button
          data-testid={testId ? `${testId}-select` : undefined}
          className="absolute inset-0 z-20 rounded-card cursor-pointer hover:bg-salem-accent-gold/5"
          onClick={onSelect}
          aria-label={`选择 ${player.name}`}
        />
      )}

      {/* Header (always visible) */}
      <div
        className="px-3.5 py-3 cursor-pointer"
        onClick={selectable ? undefined : onToggle}
        role="button"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3 min-h-[48px]">
          {/* Portrait */}
          <Portrait isDead={isDead} isSelf={isSelf} isCurrentTurn={isCurrentTurn} />

          {/* Name */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-start gap-1.5">
              <h3
                className="font-heading text-[15px] text-salem-text-bright leading-tight break-words [overflow-wrap:anywhere]"
                title={player.name}
              >
                {player.name}
              </h3>
              {isSelf && (
                <span className="shrink-0 text-salem-accent-gold text-xs font-heading">
                  我
                </span>
              )}
            </div>
            {characterLabel && (
              <p className="text-[11px] text-salem-text-ink italic truncate mt-0.5">
                {characterLabel}
              </p>
            )}
          </div>

          {/* Compact status badges */}
          <CompactStatusBadges player={player} />

          {/* Expand arrow */}
          <ChevronDown
            size={14}
            className={`text-salem-text-ink transition-transform duration-300 shrink-0 ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>

        <div className="mt-2 ml-14 flex items-center justify-between gap-2 overflow-hidden">
          <div className="min-w-0 flex-1 overflow-x-auto scrollbar-hide">
            <IdentityStrip player={player} isSelf={isSelf} />
          </div>
          <RopeKnotsCompact points={player.accusationPoints} max={getEffectiveThreshold(player)} />
        </div>
      </div>

      {/* Expanded body */}
      <div
        className={`transition-all duration-400 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${
          expanded ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-3.5 pb-3.5 space-y-3">
          {/* Character skill scroll */}
          {characterLabel && characterAbility && (
            <div className="flex items-start gap-2 rounded-card bg-salem-accent-rope/10 border border-salem-accent-gold/15 p-2.5">
              <Scroll size={16} className="text-salem-accent-gold shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-heading text-xs text-salem-accent-gold">
                  {characterLabel}
                </p>
                <p className="text-[11px] text-salem-text-ink leading-relaxed mt-0.5">
                  {characterAbility}
                </p>
              </div>
            </div>
          )}

          {/* Identity envelopes (detailed) */}
          <EnvelopeRow player={player} isSelf={isSelf} testId={testId ? `${testId}-tryal` : undefined} />

          {/* Rope accusation bar (detailed) */}
          <RopeBarDetail points={player.accusationPoints} max={getEffectiveThreshold(player)} />

          {/* Stats row */}
          <div className="flex gap-2.5">
            <StatPill
              icon={<Layers size={14} />}
              value={player.handCardCount}
              label="手牌"
              testId={testId ? `${testId}-hand-count` : undefined}
            />
            <StatPill
              icon={<Scale size={14} />}
              value={player.accusationPoints}
              label="指控"
            />
          </div>

          {/* Public status badges */}
          <StatusBadges player={player} />
        </div>
      </div>
    </section>
  );
}

function Portrait({
  isDead,
  isSelf,
  isCurrentTurn,
}: {
  isDead: boolean;
  isSelf: boolean;
  isCurrentTurn: boolean;
}) {
  const borderClass = isCurrentTurn
    ? "border-salem-accent-gold shadow-glow"
    : "border-salem-accent-gold/20";

  return (
    <div
      className={`portrait-noise relative w-11 h-11 rounded-full flex items-center justify-center shrink-0
        bg-gradient-to-br from-[#2a2018] to-[#1a1410] border-2 overflow-hidden ${borderClass}`}
    >
      {isDead ? (
        <Skull size={22} className="text-salem-text-secondary relative z-[1]" />
      ) : (
        <UserRound
          size={22}
          className={`relative z-[1] ${
            isSelf ? "text-salem-accent-gold" : "text-salem-text-primary"
          }`}
          style={{ filter: "sepia(0.6) contrast(1.2) brightness(0.9)" }}
        />
      )}
    </div>
  );
}

function IdentityStrip({ player, isSelf }: { player: PlayerState; isSelf: boolean }) {
  const count = Math.max(
    player.tryalCardCount,
    player.tryalCards.length,
    player.publicTryalCards.length,
  );
  if (count <= 0) return null;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: count }, (_, i) => {
        const ownCard = parseTryalCard(player.tryalCards[i]);
        const publicCard = parseTryalCard(player.publicTryalCards[i]);
        const visibleCard = isSelf ? ownCard : publicCard;
        const cardType = visibleCard?.type ?? null;

        let envClass = "wax-envelope-sealed";
        if (cardType) {
          envClass =
            cardType === "witch"
              ? "wax-envelope-witch"
              : cardType === "constable"
              ? "wax-envelope-constable"
              : "wax-envelope-villager";
        }

        return (
          <div
            key={i}
            className={`w-5 h-[26px] rounded-[3px] flex items-center justify-center shrink-0 ${envClass}`}
          >
            {cardType ? (
              <EnvelopeIcon type={cardType} size={12} />
            ) : (
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-salem-accent-wax-bright to-salem-accent-wax shadow-wax" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function RopeKnotsCompact({ points, max }: { points: number; max: number }) {
  const danger = points >= max - 2;
  return (
    <div className={`flex items-center gap-0.5 ${danger ? "danger" : ""}`}>
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className={`rope-knot ${i < points ? "tied" : ""}`}
        />
      ))}
      <Anchor
        size={14}
        className={`ml-0.5 transition-all ${
          danger
            ? "text-salem-accent-rope-knot gallows-swing opacity-100"
            : "text-salem-text-ink opacity-20"
        }`}
      />
    </div>
  );
}

function EnvelopeRow({
  player,
  isSelf,
  testId,
}: {
  player: PlayerState;
  isSelf: boolean;
  testId?: string;
}) {
  const count = Math.max(
    player.tryalCardCount,
    player.tryalCards.length,
    player.publicTryalCards.length,
  );
  if (count <= 0) return null;

  return (
    <div data-testid={testId}>
      <p className="text-[10px] text-salem-text-ink uppercase tracking-widest mb-2 flex items-center gap-1.5">
        <Flame size={10} />
        身份牌
      </p>
      <div className="flex gap-2 justify-center">
        {Array.from({ length: count }, (_, i) => {
          const ownCard = parseTryalCard(player.tryalCards[i]);
          const publicCard = parseTryalCard(player.publicTryalCards[i]);
          const visibleCard = isSelf ? ownCard : publicCard;
          const revealed = visibleCard?.faceUp ?? false;
          const cardType = visibleCard?.type ?? null;

          let envClass = "wax-envelope-sealed";
          if (cardType) {
            envClass =
              cardType === "witch"
                ? "wax-envelope-witch"
                : cardType === "constable"
                ? "wax-envelope-constable"
                : "wax-envelope-villager";
          }

          return (
            <div
              key={i}
              data-testid={testId ? `${testId}-card-${i}` : undefined}
              className={`w-12 h-16 rounded-md flex flex-col items-center justify-center transition-all ${envClass} ${
                revealed ? "animate-reveal" : ""
              }`}
              title={cardType ? TRYAL_LABELS[cardType] : revealed ? "已公开" : "已密封"}
            >
              {cardType ? (
                <>
                  <EnvelopeIcon type={cardType} size={20} />
                  <span className="text-[10px] mt-0.5 tracking-wide">
                    {TRYAL_LABELS[cardType]}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-salem-accent-wax-bright to-salem-accent-wax shadow-wax" />
                  <span className="text-[10px] text-salem-text-ink opacity-60 mt-1">
                    {i + 1}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EnvelopeIcon({ type, size = 14 }: { type?: TryalCardType; size?: number }) {
  if (type === "witch") {
    return <Flame size={size} className="text-[#c090e0]" />;
  }
  if (type === "constable") {
    return <Shield size={size} className="text-[#80b8e0]" />;
  }
  return <UserRound size={size} className="text-[#90c0e0]" />;
}

function RopeBarDetail({ points, max }: { points: number; max: number }) {
  const danger = points >= max - 2;
  return (
    <div>
      <p className="text-[10px] text-salem-text-ink uppercase tracking-widest mb-2 flex items-center gap-1.5">
        <Flame size={10} />
        审判之火 {points}/{max}
      </p>
      <div className={`flex items-center gap-[3px] h-8 rounded-md bg-black/30 px-2 ${danger ? "danger" : ""}`}>
        {Array.from({ length: max }, (_, i) => (
          <div key={i} className={`rope-segment ${i < points ? "tied" : ""}`} />
        ))}
        <Anchor
          size={18}
          className={`ml-1 transition-all ${
            danger
              ? "text-salem-accent-rope-knot gallows-swing-large opacity-100"
              : "text-salem-text-ink opacity-15"
          }`}
        />
      </div>
    </div>
  );
}

function StatPill({
  icon,
  value,
  label,
  testId,
}: {
  icon: ReactNode;
  value: number;
  label: string;
  testId?: string;
}) {
  return (
    <div className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-black/25 rounded-card border border-salem-accent-gold/10">
      <span className="opacity-70">{icon}</span>
      <span data-testid={testId} className="font-heading text-lg text-salem-accent-gold">
        {value}
      </span>
      <span className="text-[10px] text-salem-text-ink">{label}</span>
    </div>
  );
}

const STATUS_BADGE_DEFS: {
  key: keyof PlayerState;
  label: string;
  desc: string;
  icon: ReactNode;
  iconCompact: ReactNode;
  colorClass: string;
}[] = [
  { key: "hasBlackCat", label: "黑猫", desc: "黑猫持有者先手行动", icon: <Cat size={12} />, iconCompact: <Cat size={11} />, colorClass: "text-[#c090e0] bg-[#5a3060]/25 border-[#c090e0]/30" },
  { key: "hasAsylum", label: "庇护", desc: "免受夜间击杀", icon: <Shield size={12} />, iconCompact: <Shield size={11} />, colorClass: "text-[#80b8e0] bg-[#3a5060]/25 border-[#80b8e0]/30" },
  { key: "hasPiety", label: "虔诚", desc: "需要14点指控才能触发审判", icon: <Cross size={12} />, iconCompact: <Cross size={11} />, colorClass: "text-salem-accent-gold bg-salem-accent-gold/10 border-salem-accent-gold/30" },
  { key: "hasMatchmaker", label: "红线", desc: "与另一名玩家命运绑定", icon: <Heart size={12} />, iconCompact: <Heart size={11} />, colorClass: "text-salem-accent-red bg-salem-accent-red/10 border-salem-accent-red/30" },
  { key: "hasStocks", label: "枷锁", desc: "跳过下一个回合", icon: <Lock size={12} />, iconCompact: <Lock size={11} />, colorClass: "text-salem-text-secondary bg-salem-text-secondary/10 border-salem-text-secondary/30" },
];

function CompactStatusBadges({ player }: { player: PlayerState }) {
  const [tooltip, setTooltip] = useState<string | null>(null);

  useEffect(() => {
    if (!tooltip) return;
    const timer = setTimeout(() => setTooltip(null), 3000);
    return () => clearTimeout(timer);
  }, [tooltip]);

  const active = STATUS_BADGE_DEFS.filter((b) => player[b.key]);
  if (active.length === 0) return null;

  return (
    <div className="relative flex items-center gap-0.5">
      {active.map((b) => (
        <button
          key={b.label}
          className={`w-5 h-5 rounded-full flex items-center justify-center border ${b.colorClass} transition-all`}
          onClick={(e) => { e.stopPropagation(); setTooltip(tooltip === b.label ? null : b.label); }}
          aria-label={b.desc}
        >
          {b.iconCompact}
        </button>
      ))}
      {tooltip && (
        <div className="absolute top-full left-0 mt-1 z-30 whitespace-nowrap rounded-md bg-salem-bg-dark border border-salem-accent-gold/20 px-2.5 py-1.5 text-[11px] text-salem-text-primary shadow-lg">
          {active.find((b) => b.label === tooltip)?.desc}
        </div>
      )}
    </div>
  );
}

function StatusBadges({ player }: { player: PlayerState }) {
  const [tooltip, setTooltip] = useState<string | null>(null);

  useEffect(() => {
    if (!tooltip) return;
    const timer = setTimeout(() => setTooltip(null), 3000);
    return () => clearTimeout(timer);
  }, [tooltip]);

  const active = STATUS_BADGE_DEFS.filter((b) => player[b.key]);
  if (active.length === 0) return null;

  return (
    <div className="relative flex flex-wrap gap-1.5">
      {active.map((b) => (
        <button
          key={b.label}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] ${b.colorClass} transition-all`}
          onClick={(e) => { e.stopPropagation(); setTooltip(tooltip === b.label ? null : b.label); }}
        >
          {b.icon}
          {b.label}
        </button>
      ))}
      {tooltip && (
        <div className="absolute top-full left-0 mt-1 z-30 whitespace-nowrap rounded-md bg-salem-bg-dark border border-salem-accent-gold/20 px-2.5 py-1.5 text-[11px] text-salem-text-primary shadow-lg">
          {active.find((b) => b.label === tooltip)?.desc}
        </div>
      )}
    </div>
  );
}
