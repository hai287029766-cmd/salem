interface TimerProps {
  seconds: number;
  isPaused: boolean;
}

export default function Timer({ seconds, isPaused }: TimerProps) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const display = `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const isUrgent = seconds > 0 && seconds <= 10;

  return (
    <span
      className={`font-mono text-sm font-bold tabular-nums
        ${isUrgent ? "text-salem-danger animate-tick" : "text-salem-text-primary"}
        ${isPaused ? "opacity-50" : ""}`}
    >
      {display}
      {isPaused && (
        <span className="ml-1 text-xs text-salem-text-secondary font-normal">
          暂停
        </span>
      )}
    </span>
  );
}
