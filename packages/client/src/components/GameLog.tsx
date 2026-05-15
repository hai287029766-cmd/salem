import { useEffect, useRef } from "react";

interface GameLogProps {
  entries: string[];
}

export default function GameLog({ entries }: GameLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]);

  if (entries.length === 0) return null;

  return (
    <div data-testid="game-log" className="border-t border-salem-text-secondary/20 bg-salem-bg-secondary/40">
      <div
        ref={scrollRef}
        className="h-20 overflow-y-auto px-3 py-2 space-y-0.5 scrollbar-hide"
      >
        {entries.map((entry, i) => (
          <p key={i} className="text-xs text-salem-text-secondary leading-relaxed">
            <span className="text-salem-text-secondary/60 mr-1">&gt;</span>
            {entry}
          </p>
        ))}
      </div>
    </div>
  );
}
