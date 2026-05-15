import { PauseCircle } from "lucide-react";

interface PauseOverlayProps {
  coordinatorName: string;
  isCoordinator: boolean;
  onResume: () => void;
}

export default function PauseOverlay({ coordinatorName, isCoordinator, onResume }: PauseOverlayProps) {
  return (
    <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center px-6">
      <PauseCircle size={48} className="text-salem-accent-gold mb-4" />
      <h2 className="font-heading text-2xl text-salem-accent-gold mb-2">
        游戏已暂停
      </h2>
      <p className="text-salem-text-secondary text-sm mb-6">
        协调员: {coordinatorName}
      </p>
      {isCoordinator && (
        <button className="btn-primary" onClick={onResume}>
          继续游戏
        </button>
      )}
      {!isCoordinator && (
        <p className="text-salem-text-secondary text-sm">等待协调员继续...</p>
      )}
    </div>
  );
}
