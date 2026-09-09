"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { nicknameSchema } from "@/lib/validation";
import { storeParticipant } from "@/lib/utils";
import type { QuizSession, Quiz } from "@/types/database";

type LoadState = "loading" | "ready" | "not-found" | "already-started";

export default function JoinWithCodePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const pin = (params.code ?? "").toUpperCase();

  const [state, setState] = useState<LoadState>("loading");
  const [session, setSession] = useState<QuizSession | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      const { data: sessionRow } = await supabase
        .from("quiz_sessions")
        .select("*")
        .eq("session_pin", pin)
        .maybeSingle();

      if (cancelled) return;

      if (!sessionRow) {
        setState("not-found");
        return;
      }
      if (sessionRow.status !== "lobby") {
        setState("already-started");
        return;
      }

      const { data: quizRow } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", sessionRow.quiz_id)
        .maybeSingle();

      setSession(sessionRow);
      setQuiz(quizRow ?? null);
      setState("ready");
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [pin]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = nicknameSchema.safeParse(nickname);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a nickname");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("join_session", {
      p_pin: pin,
      p_nickname: parsed.data,
    });
    setSubmitting(false);

    if (rpcError || !data || data.length === 0) {
      setError(rpcError?.message ?? "Couldn't join that game");
      return;
    }

    const row = data[0];
    storeParticipant(pin, {
      participantId: row.participant_id,
      participantToken: row.participant_token,
      sessionId: row.session_id,
      nickname: parsed.data,
    });
    router.push(`/play/${row.session_id}?pin=${pin}`);
  }

  if (state === "loading") {
    return <CenteredMessage title="Looking for that game…" />;
  }
  if (state === "not-found") {
    return (
      <CenteredMessage
        title="We can't find that game"
        body={`No live session is using PIN ${pin}. Double-check the code with your host.`}
        action={{ label: "Try another PIN", href: "/join" }}
      />
    );
  }
  if (state === "already-started") {
    return (
      <CenteredMessage
        title="This game already started"
        body="Ask your host for a new PIN, or wait for the next round."
        action={{ label: "Try another PIN", href: "/join" }}
      />
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink px-6 text-paper">
      <div className="w-full max-w-sm">
        <p className="text-center text-sm uppercase tracking-wide text-paper/50">
          PIN {pin}
        </p>
        <h1 className="mt-1 text-center font-display text-2xl font-semibold">
          {quiz?.title ?? "Join game"}
        </h1>
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <input
            autoFocus
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Your nickname"
            maxLength={24}
            className="rounded-tile bg-white/10 px-5 py-4 text-center text-xl font-semibold text-paper placeholder:text-paper/40 focus:bg-white/15"
          />
          {error && <p className="text-center text-sm text-coral">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !nickname.trim()}
            className="rounded-full bg-signal px-6 py-4 text-lg font-semibold text-white transition hover:bg-signal-light disabled:opacity-40"
          >
            {submitting ? "Joining…" : "Join game"}
          </button>
        </form>
      </div>
    </main>
  );
}

function CenteredMessage({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: { label: string; href: string };
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink px-6 text-center text-paper">
      <h1 className="font-display text-2xl font-semibold">{title}</h1>
      {body && <p className="mt-3 max-w-sm text-paper/60">{body}</p>}
      {action && (
        <a
          href={action.href}
          className="mt-6 rounded-full bg-signal px-6 py-3 font-semibold text-white transition hover:bg-signal-light"
        >
          {action.label}
        </a>
      )}
    </main>
  );
}
