import { Pause, Play, Clock, TimerOff, SkipForward } from "lucide-react";

interface CoordinatorBarProps {
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onExtend: (seconds: number) => void;
  onEndTimer: () => void;
  onSkipPhase: () => void;
}

export default function CoordinatorBar({
  isPaused,
  onPause,
  onResume,
  onExtend,
  onEndTimer,
  onSkipPhase,
}: CoordinatorBarProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b-2 border-salem-accent-gold/40 bg-salem-bg-secondary/90 overflow-x-auto">
      {isPaused ? (
        <button data-testid="coordinator-resume" className="btn-coord bg-salem-success/20 text-salem-success" onClick={onResume}>
          <Play size={16} />
          <span>继续</span>
        </button>
      ) : (
        <button data-testid="coordinator-pause" className="btn-coord" onClick={onPause}>
          <Pause size={16} />
          <span>暂停</span>
        </button>
      )}

      <button data-testid="coordinator-extend-30" className="btn-coord" onClick={() => onExtend(30)}>
        <Clock size={16} />
        <span>+30s</span>
      </button>

      <button data-testid="coordinator-extend-60" className="btn-coord" onClick={() => onExtend(60)}>
        <Clock size={16} />
        <span>+60s</span>
      </button>

      <button data-testid="coordinator-end-timer" className="btn-coord" onClick={onEndTimer}>
        <TimerOff size={16} />
        <span>结束</span>
      </button>

      <button data-testid="coordinator-skip-phase" className="btn-coord" onClick={onSkipPhase}>
        <SkipForward size={16} />
        <span>跳过</span>
      </button>
    </div>
  );
}
