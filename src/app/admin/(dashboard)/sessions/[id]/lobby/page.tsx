"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Users, Play } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { buildJoinUrl } from "@/lib/utils";
import { QRCodeCard } from "@/components/QRCodeCard";
import { LoadingScreen, ErrorBanner } from "@/components/ui";
import type { Participant, Quiz, QuizSession } from "@/types/database";

export default function GameLobbyPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = params.id;

  const [session, setSession] = useState<QuizSession | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function load() {
      const { data: sessionRow } = await supabase.from("quiz_sessions").select("*").eq("id", sessionId).maybeSingle();
      if (!active || !sessionRow) return;
      setSession(sessionRow);

      if (sessionRow.status !== "lobby") {
        router.replace(`/admin/sessions/${sessionId}/live`);
        return;
      }

      const { data: quizRow } = await supabase.from("quizzes").select("*").eq("id", sessionRow.quiz_id).maybeSingle();
      if (active) setQuiz(quizRow ?? null);

      const { data: participantRows } = await supabase
        .from("participants")
        .select("*")
        .eq("session_id", sessionId)
        .order("joined_at");
      if (active) setParticipants(participantRows ?? []);
    }
    load();

    const channel = supabase
      .channel(`lobby:${sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "participants", filter: `session_id=eq.${sessionId}` },
        (payload) => setParticipants((prev) => [...prev, payload.new as Participant])
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "quiz_sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          const updated = payload.new as QuizSession;
          setSession(updated);
          if (updated.status !== "lobby") {
            router.replace(`/admin/sessions/${sessionId}/live`);
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [sessionId, router]);

  async function handleStart() {
    setStarting(true);
    setError(null);
    const supabase = createClient();

    const { data: firstQuestion } = await supabase
      .from("questions")
      .select("id")
      .eq("quiz_id", session?.quiz_id)
      .order("order_index")
      .limit(1)
      .maybeSingle();

    if (!firstQuestion) {
      setError("This quiz has no questions to play.");
      setStarting(false);
      return;
    }

    const { data: fullQuestion } = await supabase
      .from("questions")
      .select("time_limit_seconds")
      .eq("id", firstQuestion.id)
      .single();

    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + (fullQuestion?.time_limit_seconds ?? 20) * 1000);

    const { error: updateError } = await supabase
      .from("quiz_sessions")
      .update({
        status: "question_active",
        current_question_index: 0,
        current_question_id: firstQuestion.id,
        question_started_at: startedAt.toISOString(),
        question_ends_at: endsAt.toISOString(),
        is_paused: false,
        paused_at: null,
      })
      .eq("id", sessionId);

    setStarting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.push(`/admin/sessions/${sessionId}/live`);
  }

  if (!session || !quiz) return <LoadingScreen label="Setting up the lobby…" />;

  const joinUrl = buildJoinUrl(session.session_pin);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <p className="text-sm font-medium text-ink600">Game Lobby</p>
        <h1 className="font-display text-2xl font-semibold text-ink">{quiz.title}</h1>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <QRCodeCard joinUrl={joinUrl} pin={session.session_pin} />

        <div className="rounded-panel border border-ink/10 bg-white p-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-ink">
              <Users className="h-5 w-5" />
              <span className="font-display text-lg font-semibold">
                {participants.length} joined
              </span>
            </div>
            <button
              onClick={handleStart}
              disabled={starting || participants.length === 0}
              title={participants.length === 0 ? "Wait for at least one player to join" : undefined}
              className="flex items-center gap-2 rounded-full bg-signal px-6 py-3 font-semibold text-white transition hover:bg-signal-light disabled:opacity-40"
            >
              <Play className="h-4 w-4" />
              {starting ? "Starting…" : "Start game"}
            </button>
          </div>

          {participants.length === 0 ? (
            <p className="py-12 text-center text-sm text-ink600">
              Waiting for players to scan the QR code or enter PIN {session.session_pin}…
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {participants.map((p) => (
                <span
                  key={p.id}
                  className="animate-rise-in rounded-full bg-signal/10 px-3 py-1.5 text-sm font-medium text-signal-dark"
                >
                  {p.nickname}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
