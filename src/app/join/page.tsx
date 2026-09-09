"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinEntryPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = pin.trim().toUpperCase().replace(/\s+/g, "");
    if (!clean) return;
    router.push(`/join/${clean}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink px-6 text-paper">
      <div className="w-full max-w-sm">
        <p className="text-center font-display text-2xl font-semibold">Enter game PIN</p>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <input
            autoFocus
            inputMode="text"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="482913"
            maxLength={6}
            className="rounded-tile bg-white/10 px-5 py-4 text-center font-display text-3xl font-bold tracking-[0.3em] text-paper placeholder:text-paper/30 focus:bg-white/15"
          />
          <button
            type="submit"
            disabled={!pin.trim()}
            className="rounded-full bg-signal px-6 py-4 text-lg font-semibold text-white transition hover:bg-signal-light disabled:opacity-40"
          >
            Enter
          </button>
        </form>
      </div>
    </main>
  );
}
