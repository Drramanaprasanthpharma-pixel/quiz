"use client";

import { Check, X } from "lucide-react";
import { cn, colorClassForIndex, shapeForIndex } from "@/lib/utils";

interface AnswerTileProps {
  index: number;
  text: string;
  disabled?: boolean;
  selected?: boolean;
  /** Only set once results are revealed. */
  reveal?: "correct" | "incorrect" | "neutral" | null;
  onClick?: () => void;
}

export function AnswerTile({ index, text, disabled, selected, reveal, onClick }: AnswerTileProps) {
  const shape = shapeForIndex(index);
  const shapeClass = shape === "triangle" || shape === "diamond" || shape === "hexagon" ? `shape-${shape}` : "rounded-tile";

  const revealClass =
    reveal === "correct"
      ? "ring-4 ring-white ring-offset-4 ring-offset-ink"
      : reveal === "incorrect"
        ? "opacity-40"
        : "";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "relative flex min-h-[88px] items-center justify-center gap-3 px-5 py-4 text-center font-display text-lg font-semibold shadow-lg transition-transform active:scale-[0.98] disabled:active:scale-100",
        shapeClass,
        colorClassForIndex(index),
        selected && !reveal && "ring-4 ring-white",
        revealClass,
        disabled && !selected && "opacity-70"
      )}
    >
      <span>{text}</span>
      {reveal === "correct" && <Check className="h-6 w-6 shrink-0" aria-label="Correct" />}
      {reveal === "incorrect" && selected && <X className="h-6 w-6 shrink-0" aria-label="Incorrect" />}
    </button>
  );
}
