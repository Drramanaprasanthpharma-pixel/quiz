"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getStoredParticipant } from "@/lib/utils";
import { AnswerTile } from "@/components/AnswerTile";
import type { PublicQuestion, QuizSession } from "@/types/database";

type Me = { participantId: string; participantToken: string } | null;

export default function PlayPage() {
  const { sessionId } = useParams<{ sessionId: string }>();

  const [session, setSession] = useState<QuizSession | null>(null);
  const [question, setQuestion] = useState<PublicQuestion | null>(null);
  const [me, setMe] = useState<Me>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The PIN is stored per browser when the player joined; read it from the URL here.
  useEffect(() => {
    const pin = new URLSearchParams(window.location.search).get("pin") ?? "";
    setMe(getStoredParticipant(pin));
  }, []);

  // Load the session and subscribe to live status changes.
  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase
      .from("quiz_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data) setSession(data);
      });

    const channel = supabase
      .channel(`play:${sessionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "quiz_sessions", filter: `id=eq.${sessionId}` },
        (payload) => setSession(payload.new as QuizSession)
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Fetch the current question whenever the host advances.
  useEffect(() => {
    if (!session?.current_question_id || session.status === "lobby") {
      setQuestion(null);
      return;
    }
    const supabase = createClient();
    setChosen(null);
    setResult(null);
    setError(null);

    supabase
      .from("questions")
      // Explicit columns: is_correct is never selected for players.
      .select(
        "id, quiz_id, question_text, image_url, time_limit_seconds, points, order_index, answers(id, answer_text, order_index)"
      )
      .eq("id", session.current_question_id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setError("Couldn't load the question. Try refreshing.");
        else setQuestion(data as unknown as PublicQuestion);
      });
  }, [session?.current_question_id, session?.status]);

  async function submit(answerId: string) {
    if (!me || !question || chosen) return;
    setChosen(answerId);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("submit_answer", {
      p_participant_id: me.participantId,
      p_participant_token: me.participantToken,
      p_question_id: question.id,
      p_answer_id: answerId,
    });
    if (error) {
      setError(error.message);
      setChosen(null);
      return;
    }
    const row = data?.[0];
    setResult(row?.is_correct ? `Correct! +${row.points_awarded}` : "Not this time");
  }

  if (!session) return <Centered>Connecting…</Centered>;
  if (session.status === "lobby") return <Centered>You&apos;re in! Waiting for the host to start…</Centered>;
  if (!question) return <Centered>Get ready…</Centered>;

  const answers = [...(question.answers ?? [])].sort((a, b) => a.order_index - b.order_index);

  return (
    <main className="flex min-h-screen flex-col gap-6 bg-paper px-5 py-8 text-ink">
      <h1 className="text-balance text-center font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
        {question.question_text}
      </h1>

      {error && <p className="text-center text-base font-semibold text-coral">{error}</p>}
      {result && <p className="text-center text-xl font-bold text-ink">{result}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {answers.map((a, i) => (
          <AnswerTile
            key={a.id}
            index={i}
            text={a.answer_text}
            selected={chosen === a.id}
            disabled={session.status !== "question_active" || !!chosen || session.is_paused}
            onClick={() => submit(a.id)}
          />
        ))}
      </div>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 text-center text-xl font-semibold text-ink">
      {children}
    </main>
  );
}
