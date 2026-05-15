import { Mic, MicOff } from "lucide-react";

interface VoicePanelProps {
  micEnabled: boolean;
  connected: boolean;
  status: string;
  onToggleMic: () => void;
}

export default function VoicePanel({ micEnabled, connected, status, onToggleMic }: VoicePanelProps) {
  return (
    <div className="fixed bottom-24 right-4 z-30 flex flex-col items-end gap-1">
      <span
        data-testid="game-voice-connected"
        className="rounded-button bg-salem-bg-secondary/90 px-2 py-1 text-[10px] text-salem-text-secondary"
      >
        {connected ? "语音已连接" : status === "unconfigured" ? "语音未配置" : status === "connecting" ? "语音连接中" : "语音未连接"}
      </span>
      <button
        data-testid="game-mic-button"
        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-card transition-all
          ${micEnabled && connected
            ? "bg-salem-success/20 border border-salem-success/40"
            : "bg-salem-danger/20 border border-salem-danger/40"}
          disabled:cursor-not-allowed disabled:opacity-60`}
        onClick={onToggleMic}
        disabled={!connected}
        aria-label={connected ? (micEnabled ? "关闭麦克风" : "开启麦克风") : "语音不可用"}
      >
        {micEnabled && connected ? (
          <Mic size={20} className="text-salem-success" />
        ) : (
          <MicOff size={20} className="text-salem-danger" />
        )}
      </button>
    </div>
  );
}
