import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface PodiumEntry {
  nickname: string;
  score: number;
}

export function Podium({ entries }: { entries: PodiumEntry[] }) {
  const [first, second, third] = entries;
  const order = [second, first, third];
  const heights = ["h-28", "h-40", "h-20"];
  const colors = ["bg-signal-light", "bg-gold text-ink", "bg-coral"];

  return (
    <div className="flex items-end justify-center gap-3">
      {order.map((entry, i) =>
        entry ? (
          <div key={entry.nickname} className="flex w-28 flex-col items-center">
            {i === 1 && <Trophy className="mb-2 h-7 w-7 text-gold" />}
            <p className="mb-2 max-w-full truncate font-display text-sm font-semibold text-paper">
              {entry.nickname}
            </p>
            <div
              className={cn(
                "flex w-full flex-col items-center justify-start rounded-t-panel pt-2 font-display font-bold text-white",
                heights[i],
                colors[i]
              )}
            >
              <span className="text-xs opacity-80">#{i === 1 ? 1 : i === 0 ? 2 : 3}</span>
              <span>{entry.score}</span>
            </div>
          </div>
        ) : (
          <div key={i} className="w-28" />
        )
      )}
    </div>
  );
}
