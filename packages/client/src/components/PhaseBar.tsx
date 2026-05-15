import type { GamePhase } from "@salem/shared";

interface PhaseBarProps {
  phase: GamePhase;
}

const PHASE_LABELS: Record<GamePhase, string> = {
  lobby: "等待中",
  dealing: "发牌中",
  dawn: "黎明",
  day_turn: "白天",
  tryal: "审判",
  conspiracy: "阴谋",
  night_witch: "夜间",
  night_constable: "夜间",
  night_confess: "夜间-认罪",
  night_resolve: "夜间-结算",
  game_over: "游戏结束",
};

const PHASE_COLORS: Record<string, string> = {
  day: "text-salem-warning bg-salem-warning/10",
  night: "text-salem-accent-blue bg-salem-accent-blue/10",
  special: "text-salem-accent-red bg-salem-accent-red/10",
  neutral: "text-salem-text-secondary bg-salem-bg-secondary",
};

function getPhaseColorGroup(phase: GamePhase): string {
  if (phase === "day_turn" || phase === "dawn") return "day";
  if (phase.startsWith("night")) return "night";
  if (phase === "tryal" || phase === "conspiracy") return "special";
  return "neutral";
}

export default function PhaseBar({ phase }: PhaseBarProps) {
  const label = PHASE_LABELS[phase];
  const colorGroup = getPhaseColorGroup(phase);
  const colorClass = PHASE_COLORS[colorGroup] ?? PHASE_COLORS.neutral;

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${colorClass}`}>
      {label}
    </span>
  );
}
