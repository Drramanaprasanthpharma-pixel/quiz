import { cn } from "@/lib/utils";

export interface LeaderboardRow {
  participantId: string;
  nickname: string;
  score: number;
  delta?: number;
}

export function LeaderboardList({
  rows,
  highlightId,
}: {
  rows: LeaderboardRow[];
  highlightId?: string;
}) {
  const sorted = [...rows].sort((a, b) => b.score - a.score);

  if (sorted.length === 0) {
    return <p className="py-8 text-center text-paper/50">No scores yet.</p>;
  }

  return (
    <ol className="flex flex-col gap-2">
      {sorted.map((row, i) => (
        <li
          key={row.participantId}
          className={cn(
            "flex animate-rise-in items-center gap-4 rounded-panel px-4 py-3",
            row.participantId === highlightId ? "bg-signal/30 ring-2 ring-signal" : "bg-white/5"
          )}
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <span className="w-6 shrink-0 text-center font-display text-sm font-bold text-paper/50">
            {i + 1}
          </span>
          <span className="flex-1 truncate font-medium text-paper">{row.nickname}</span>
          {typeof row.delta === "number" && row.delta > 0 && (
            <span className="text-xs font-semibold text-mint">+{row.delta}</span>
          )}
          <span className="font-display font-bold text-paper">{row.score}</span>
        </li>
      ))}
    </ol>
  );
}
