import { useState, useCallback } from "react";
import { Check, Moon, ScrollText, Shield, Skull, Users } from "lucide-react";
import type { GamePhase } from "@salem/shared";
import type { TryalCardType } from "@salem/shared";
import type { PlayerState, RoleInfo, WitchVoteState, NightResolveResult } from "../hooks/useGameState";
import { parseTryalCard } from "../utils/tryalCardParser";
import Timer from "./Timer";

interface NightOverlayProps {
  phase: GamePhase;
  roleInfo: RoleInfo | null;
  players: PlayerState[];
  myId: string;
  timer: number;
  onWitchVote: (targetId: string) => void;
  onWitchConfirm: () => void;
  onWitchKill: (targetId: string) => void;
  witchVoteState: WitchVoteState | null;
  onConstableProtect: (targetId: string) => void;
  onConfess: (cardIndex: number) => void;
  onDeclineConfess: () => void;
  onShowConfess: () => void;
  showConfess: boolean;
  nightResolveResult: NightResolveResult | null;
  round: number;
  constableLastProtected?: string;
}

const TRYAL_LABELS: Record<TryalCardType, string> = {
  witch: "女巫",
  not_witch: "镇民",
  constable: "警长",
};

const TRYAL_STYLES: Record<TryalCardType, string> = {
  witch: "border-salem-witch bg-salem-witch/30 text-salem-text-primary",
  not_witch: "border-salem-townfolk bg-salem-townfolk/30 text-salem-text-primary",
  constable: "border-salem-constable bg-salem-constable/30 text-salem-text-primary",
};

export default function NightOverlay({
  phase,
  roleInfo,
  players,
  myId,
  timer,
  onWitchVote,
  onWitchConfirm,
  onWitchKill,
  witchVoteState,
  onConstableProtect,
  onConfess,
  onDeclineConfess,
  onShowConfess,
  showConfess,
  nightResolveResult,
  round,
  constableLastProtected,
}: NightOverlayProps) {
  const isWitch = roleInfo?.isWitch ?? false;
  const isConstable = roleInfo?.isConstable ?? false;

  if (phase === "night_witch" && isWitch) {
    return (
      <WitchView
        players={players}
        myId={myId}
        timer={timer}
        roleInfo={roleInfo}
        witchVoteState={witchVoteState}
        onVote={onWitchVote}
        onConfirm={onWitchConfirm}
        onKill={onWitchKill}
      />
    );
  }

  // Constable view during constable phase
  if (phase === "night_constable" && isConstable) {
    return (
      <ConstableView
        players={players}
        myId={myId}
        timer={timer}
        onProtect={onConstableProtect}
        lastProtectedName={constableLastProtected}
      />
    );
  }

  // Confess phase - all players can confess
  if (phase === "night_confess") {
    return (
      <ConfessView
        key={round}
        timer={timer}
        showConfess={showConfess}
        onShowConfess={onShowConfess}
        onConfess={onConfess}
        onDeclineConfess={onDeclineConfess}
        myPlayer={players.find((p) => p.id === myId)}
      />
    );
  }

  // Night resolve with outcome display
  if (phase === "night_resolve" && nightResolveResult) {
    return (
      <NightResolveView result={nightResolveResult} timer={timer} />
    );
  }

  const nightMessage = phase === "night_constable"
    ? "警长正在选择保护对象..."
    : phase === "night_resolve"
      ? "命运正在揭晓..."
      : "女巫正在密谋...";

  // Default night view (non-witch, non-constable)
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center"
      style={{
        background: "linear-gradient(180deg, #0a0e1a 0%, #1a1a2e 40%, #0d1117 100%)",
      }}
    >
      {/* Moon */}
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 opacity-60 mb-8 shadow-[0_0_40px_rgba(200,200,200,0.2)]" />

      {/* Fog effect */}
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 80%, rgba(255,255,255,0.1) 0%, transparent 60%)",
        }}
      />

      <p className="font-heading text-xl text-salem-text-primary/80 mb-2">
        {nightMessage}
      </p>
      <Timer seconds={timer} isPaused={false} />
    </div>
  );
}

function WitchView({
  players,
  myId,
  timer,
  roleInfo,
  witchVoteState,
  onVote,
  onConfirm,
  onKill,
}: {
  players: PlayerState[];
  myId: string;
  timer: number;
  roleInfo: RoleInfo | null;
  witchVoteState: WitchVoteState | null;
  onVote: (targetId: string) => void;
  onConfirm: () => void;
  onKill: (targetId: string) => void;
}) {
  const [localSelected, setLocalSelected] = useState<string | null>(null);
  const targets = players.filter((p) => p.isAlive && p.id !== myId);
  const witchPartners = roleInfo?.witchPartners ?? [];
  const witchPlayerIds = witchVoteState?.witchPlayerIds ?? [];

  const myVote = witchVoteState?.votes[myId] ?? localSelected;
  const isConfirmed = witchVoteState?.confirmed.includes(myId) ?? false;

  const handleSelect = useCallback((targetId: string) => {
    if (isConfirmed) return;
    setLocalSelected(targetId);
    onVote(targetId);
  }, [isConfirmed, onVote]);

  const handleConfirmClick = useCallback(() => {
    if (myVote && !isConfirmed) {
      onConfirm();
    }
  }, [myVote, isConfirmed, onConfirm]);

  const handleLegacyKill = useCallback(() => {
    if (myVote && !isConfirmed) {
      onKill(myVote);
    }
  }, [myVote, isConfirmed, onKill]);

  const partnerNames = witchPartners
    .filter((id) => id !== myId)
    .map((id) => players.find((p) => p.id === id)?.name)
    .filter(Boolean);

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-salem-witch/95 px-4 py-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-heading text-lg text-salem-accent-gold">
          夜间 - 女巫行动
        </h2>
        <Timer seconds={timer} isPaused={false} />
      </div>

      {partnerNames.length > 0 && (
        <div className="flex items-center gap-2 mb-3 px-2.5 py-1.5 rounded-card bg-[#5a3060]/30 border border-[#c090e0]/25">
          <Users size={14} className="text-[#c090e0] shrink-0" />
          <span className="text-[12px] text-[#c090e0]">
            队友: {partnerNames.join(", ")}
          </span>
        </div>
      )}

      <p className="text-sm text-salem-text-primary mb-3">选择今晚的击杀目标:</p>

      <div className="grid grid-cols-2 gap-3 flex-1 overflow-y-auto">
        {targets.map((p) => {
          const voteCount = witchVoteState?.voteCounts[p.id] ?? 0;
          const isMyChoice = myVote === p.id;
          const isWitchTeammate = witchPlayerIds.includes(p.id) || witchPartners.includes(p.id);

          return (
            <button
              key={p.id}
              data-testid={`night-witch-target-${p.seatIndex}`}
              className={`relative px-3 py-3 rounded-card text-sm text-left transition-all
                ${isMyChoice
                  ? "bg-salem-accent-red/30 border-2 border-salem-accent-red"
                  : "bg-salem-bg-secondary/40 border border-salem-text-secondary/30"}
                ${isConfirmed ? "opacity-60" : ""}`}
              onClick={() => handleSelect(p.id)}
              disabled={isConfirmed}
            >
              <div className="flex items-center gap-1.5">
                {isWitchTeammate && (
                  <Skull size={12} className="text-[#c090e0] shrink-0" />
                )}
                <span className={isWitchTeammate ? "text-[#c090e0]" : ""}>
                  {p.name}
                </span>
              </div>
              {voteCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-salem-accent-red/80 text-[11px] font-heading font-bold text-white">
                  {voteCount}
                </span>
              )}
              {isConfirmed && isMyChoice && (
                <div className="absolute inset-0 flex items-center justify-center rounded-card bg-salem-accent-red/10">
                  <Check size={24} className="text-salem-accent-red drop-shadow-md" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {witchPlayerIds.length > 1 && witchVoteState && (
        <div className="mt-3 flex flex-wrap gap-2">
          {witchPlayerIds.map((wId) => {
            const wName = players.find((p) => p.id === wId)?.name ?? wId;
            const wConfirmed = witchVoteState.confirmed.includes(wId);
            const wVoted = wId in witchVoteState.votes;
            return (
              <span key={wId} className={`inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5 border
                ${wConfirmed
                  ? "border-salem-accent-green/40 bg-salem-accent-green/15 text-salem-accent-green"
                  : wVoted
                    ? "border-salem-accent-gold/30 bg-salem-accent-gold/10 text-salem-accent-gold"
                    : "border-salem-text-secondary/30 text-salem-text-secondary"}`}>
                {wConfirmed && <Check size={10} />}
                {wId === myId ? "我" : wName}
              </span>
            );
          })}
        </div>
      )}

      <div className="mt-3 space-y-2">
        {!isConfirmed && (
          <p className="text-[11px] text-salem-accent-red/80 text-center">
            确认后无法更改选择
          </p>
        )}
        <button
          className="btn-danger w-full"
          disabled={!myVote || isConfirmed}
          onClick={witchPlayerIds.length > 1 ? handleConfirmClick : handleLegacyKill}
        >
          {isConfirmed ? "已确认 - 等待队友" : "确认击杀"}
        </button>
      </div>
    </div>
  );
}

function ConstableView({
  players,
  myId,
  timer,
  onProtect,
  lastProtectedName,
}: {
  players: PlayerState[];
  myId: string;
  timer: number;
  onProtect: (targetId: string) => void;
  lastProtectedName?: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const targets = players.filter((p) => p.isAlive && p.id !== myId);

  const handleConfirm = useCallback(() => {
    if (selected) {
      onProtect(selected);
    }
  }, [selected, onProtect]);

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-salem-constable/95 px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-lg text-salem-accent-gold">
          夜间 - 警长行动
        </h2>
        <Timer seconds={timer} isPaused={false} />
      </div>

      <p className="text-sm text-salem-text-primary mb-1">选择保护对象:</p>
      <p className="text-xs text-salem-text-secondary mb-2">(不能保护自己)</p>
      {lastProtectedName && (
        <p className="text-xs text-[#80b8e0] mb-3">上轮保护: {lastProtectedName}</p>
      )}

      <div className="grid grid-cols-2 gap-3 flex-1 overflow-y-auto">
        {targets.map((p) => (
          <button
            key={p.id}
            data-testid={`night-constable-target-${p.seatIndex}`}
            className={`px-3 py-3 rounded-card text-sm text-left transition-all
              ${selected === p.id
                ? "bg-salem-accent-blue/30 border-2 border-salem-accent-blue"
                : "bg-salem-bg-secondary/40 border border-salem-text-secondary/30"}`}
            onClick={() => setSelected(p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>

      <button
        className="btn-primary w-full mt-4"
        disabled={!selected}
        onClick={handleConfirm}
      >
        确认保护
      </button>
    </div>
  );
}

function ConfessView({
  timer,
  showConfess,
  onShowConfess,
  onConfess,
  onDeclineConfess,
  myPlayer,
}: {
  timer: number;
  showConfess: boolean;
  onShowConfess: () => void;
  onConfess: (cardIndex: number) => void;
  onDeclineConfess: () => void;
  myPlayer: PlayerState | undefined;
}) {
  const [declined, setDeclined] = useState(false);

  if (!myPlayer) return null;

  const cardCount = Math.max(myPlayer.tryalCardCount, myPlayer.tryalCards.length);
  const cards = Array.from({ length: cardCount }, (_, index) => {
    const parsed = parseTryalCard(myPlayer.tryalCards[index]);
    return {
      index,
      type: parsed?.type ?? null,
      faceUp: parsed?.faceUp ?? false,
    };
  });
  const availableCards = cards.filter((card) => !card.faceUp);

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col items-center justify-center px-6"
      style={{
        background: "linear-gradient(180deg, #0a0e1a 0%, #1a1a2e 40%, #0d1117 100%)",
      }}
    >
      <ScrollText size={40} className="text-salem-accent-gold/60 mb-6" />
      <p className="font-heading text-lg text-salem-text-primary/80 mb-2">
        认罪窗口
      </p>
      <p className="text-sm text-salem-text-secondary text-center mb-4">
        翻开一张身份牌换取本轮免死
      </p>
      <Timer seconds={timer} isPaused={false} />

      {declined ? (
        <p className="mt-6 text-sm text-salem-text-secondary">已选择不认罪，等待其他玩家...</p>
      ) : !showConfess ? (
        <div className="mt-6 flex gap-3">
          <button
            data-testid="night-confess-open"
            className="btn-danger"
            onClick={onShowConfess}
          >
            我要认罪
          </button>
          <button
            data-testid="night-confess-decline"
            className="btn-primary"
            onClick={() => { setDeclined(true); onDeclineConfess(); }}
          >
            不认罪
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-salem-text-primary text-center">
            选择翻开哪张身份牌:
          </p>
          <div className="flex gap-3 justify-center">
            {cards.map((card) => (
              <button
                key={card.index}
                data-testid={`night-confess-tryal-card-${card.index}`}
                className={`flex h-24 w-16 flex-col items-center justify-center rounded-card border-2 px-1 text-center text-xs font-bold transition-all
                  ${card.type ? TRYAL_STYLES[card.type] : "border-salem-accent-gold/60 bg-salem-accent-black text-salem-accent-gold"}
                  ${card.faceUp ? "opacity-50 cursor-not-allowed" : "hover:shadow-glow"}`}
                onClick={() => onConfess(card.index)}
                disabled={card.faceUp}
              >
                <span>{card.type ? TRYAL_LABELS[card.type] : "未知"}</span>
                <span className="mt-1 text-[10px] font-normal text-salem-text-secondary">
                  {card.faceUp ? "已公开" : "可认罪"}
                </span>
              </button>
            ))}
          </div>
          {availableCards.length === 0 && (
            <p className="text-center text-xs text-salem-text-secondary">没有可翻开的身份牌</p>
          )}
        </div>
      )}
    </div>
  );
}

function NightResolveView({
  result,
  timer,
}: {
  result: NightResolveResult;
  timer: number;
}) {
  const getOutcome = () => {
    if (result.noTarget) {
      return { icon: <Moon size={44} className="text-gray-300" />, lines: ["今晚风平浪静", "无人成为目标"], color: "text-salem-text-primary/80" };
    }
    if (result.killed) {
      const lines = [`${result.killed.name} 被女巫杀害`];
      if (result.matchmakerKilled) {
        lines.push(`${result.matchmakerKilled.name} 因红线效果一同死亡`);
      }
      return { icon: <Skull size={44} className="text-salem-accent-red" />, lines, color: "text-salem-accent-red" };
    }
    if (result.protected) {
      return { icon: <Shield size={44} className="text-[#80b8e0]" />, lines: [`${result.protected} 受到了保护`, "警长的庇佑拯救了一条性命"], color: "text-[#80b8e0]" };
    }
    if (result.confessed) {
      return { icon: <ScrollText size={44} className="text-salem-accent-gold" />, lines: [`${result.confessed} 选择了认罪`, "以身份牌换取今夜平安"], color: "text-salem-accent-gold" };
    }
    if (result.asylum) {
      return { icon: <Shield size={44} className="text-[#80b8e0]" />, lines: [`${result.asylum} 受到庇护的保护`, "庇护卡的力量化解了危机"], color: "text-[#80b8e0]" };
    }
    return { icon: <Moon size={44} className="text-gray-300" />, lines: ["命运正在揭晓..."], color: "text-salem-text-primary/80" };
  };

  const outcome = getOutcome();

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col items-center justify-center px-6"
      style={{
        background: result.killed
          ? "linear-gradient(180deg, #1a0a0a 0%, #2e1a1a 40%, #170d0d 100%)"
          : "linear-gradient(180deg, #0a0e1a 0%, #1a1a2e 40%, #0d1117 100%)",
      }}
    >
      <div className="mb-6">{outcome.icon}</div>
      {outcome.lines.map((line, i) => (
        <p key={i} className={`font-heading ${i === 0 ? "text-xl" : "text-sm"} ${i === 0 ? outcome.color : "text-salem-text-secondary"} ${i > 0 ? "mt-1" : "mb-2"} text-center`}>
          {line}
        </p>
      ))}
      <div className="mt-4">
        <Timer seconds={timer} isPaused={false} />
      </div>
    </div>
  );
}
