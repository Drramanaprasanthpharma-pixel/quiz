"use client";

import { useEffect, useState } from "react";

interface CountdownRingProps {
  /** ISO timestamp for when the question's timer should hit zero (server-trusted). */
  endsAt: string;
  totalSeconds: number;
  paused?: boolean;
  /** Frozen remaining ms to display while paused. */
  pausedRemainingMs?: number;
  onExpire?: () => void;
  size?: number;
}

export function CountdownRing({
  endsAt,
  totalSeconds,
  paused = false,
  pausedRemainingMs,
  onExpire,
  size = 96,
}: CountdownRingProps) {
  const [remainingMs, setRemainingMs] = useState(() => computeRemaining(endsAt));

  useEffect(() => {
    if (paused) return;
    let expired = false;
    const interval = setInterval(() => {
      const remaining = computeRemaining(endsAt);
      setRemainingMs(remaining);
      if (remaining <= 0 && !expired) {
        expired = true;
        onExpire?.();
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt, paused]);

  const displayMs = paused ? (pausedRemainingMs ?? remainingMs) : remainingMs;
  const totalMs = totalSeconds * 1000;
  const fraction = Math.max(0, Math.min(1, displayMs / totalMs));
  const seconds = Math.ceil(displayMs / 1000);
  const radius = size / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const isUrgent = !paused && seconds <= 3 && seconds > 0;

  return (
    <div
      className={`relative shrink-0 ${isUrgent ? "animate-count-tick" : ""}`}
      style={{ width: size, height: size }}
      role="timer"
      aria-live="off"
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.15)" strokeWidth={6} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={paused ? "#8B7CF6" : isUrgent ? "#FF5D5D" : "#FFC93C"}
          strokeWidth={6}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          style={{ transition: "stroke-dashoffset 0.1s linear" }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-display text-xl font-bold text-paper">
        {Math.max(0, seconds)}
      </span>
    </div>
  );
}

function computeRemaining(endsAt: string): number {
  return new Date(endsAt).getTime() - Date.now();
}
