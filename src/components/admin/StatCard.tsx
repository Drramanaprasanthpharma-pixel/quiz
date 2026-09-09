import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "signal",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "signal" | "mint" | "gold" | "coral";
}) {
  const accentClasses: Record<string, string> = {
    signal: "border-l-signal text-signal-dark bg-signal/10",
    mint: "border-l-mint text-mint-dark bg-mint/10",
    gold: "border-l-gold text-gold-dark bg-gold/10",
    coral: "border-l-coral text-coral-dark bg-coral/10",
  };

  return (
    <div className={`flex items-center gap-4 rounded-panel border border-ink/10 border-l-4 bg-white p-5 ${accentClasses[accent].split(" ")[0]}`}>
      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-panel ${accentClasses[accent]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="font-display text-2xl font-bold text-ink">{value}</p>
        <p className="text-sm text-ink600">{label}</p>
      </div>
    </div>
  );
}
