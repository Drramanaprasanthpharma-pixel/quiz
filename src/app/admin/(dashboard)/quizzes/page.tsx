"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListVideo, PlusCircle, Copy, Trash2, Play, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { generateSessionPin } from "@/lib/utils";
import { PageHeader, EmptyState, LoadingScreen, Badge, ErrorBanner } from "@/components/ui";
import type { Quiz } from "@/types/database";

export default function QuizzesListPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("quizzes")
      .select("*")
      .order("updated_at", { ascending: false });
    if (fetchError) setError(fetchError.message);
    setQuizzes(data ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDuplicate(quiz: Quiz) {
    setBusyId(quiz.id);
    const supabase = createClient();
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: newQuiz, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          admin_id: userData.user.id,
          title: `${quiz.title} (copy)`,
          description: quiz.description,
          status: "draft",
        })
        .select()
        .single();
      if (quizError || !newQuiz) throw quizError;

      const { data: questions } = await supabase
        .from("questions")
        .select("*, answers(*)")
        .eq("quiz_id", quiz.id)
        .order("order_index");

      for (const q of questions ?? []) {
        const { answers, id, quiz_id, created_at, ...qRest } = q as any;
        const { data: newQuestion } = await supabase
          .from("questions")
          .insert({ ...qRest, quiz_id: newQuiz.id })
          .select()
          .single();
        if (newQuestion && answers?.length) {
          await supabase.from("answers").insert(
            answers.map((a: any) => ({
              question_id: newQuestion.id,
              answer_text: a.answer_text,
              is_correct: a.is_correct,
              order_index: a.order_index,
            }))
          );
        }
      }
      await load();
    } catch (e: any) {
      setError(e.message ?? "Couldn't duplicate that quiz");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(quiz: Quiz) {
    if (!confirm(`Delete "${quiz.title}"? This can't be undone.`)) return;
    setBusyId(quiz.id);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("quizzes").delete().eq("id", quiz.id);
    if (deleteError) setError(deleteError.message);
    else setQuizzes((prev) => prev?.filter((q) => q.id !== quiz.id) ?? null);
    setBusyId(null);
  }

  async function handleStartSession(quiz: Quiz) {
    setBusyId(quiz.id);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    let pin = generateSessionPin();
    let attempt = 0;
    let created = null;
    let lastError = null;
    while (attempt < 5 && !created) {
      const { data, error: sessionError } = await supabase
        .from("quiz_sessions")
        .insert({ quiz_id: quiz.id, admin_id: userData.user.id, session_pin: pin, status: "lobby" })
        .select()
        .single();
      if (data) created = data;
      else {
        lastError = sessionError;
        pin = generateSessionPin();
        attempt++;
      }
    }
    setBusyId(null);
    if (!created) {
      setError(lastError?.message ?? "Couldn't start a session");
      return;
    }
    router.push(`/admin/sessions/${created.id}/lobby`);
  }

  if (quizzes === null) return <LoadingScreen label="Loading your quizzes…" />;

  return (
    <div>
      <PageHeader
        title="My Quizzes"
        description="Create, edit, and launch live sessions from your quiz library."
        action={
          <Link
            href="/admin/quizzes/new"
            className="flex items-center gap-2 rounded-full bg-signal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-signal-light"
          >
            <PlusCircle className="h-4 w-4" />
            Create quiz
          </Link>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      {quizzes.length === 0 ? (
        <EmptyState
          icon={ListVideo}
          title="No quizzes yet"
          body="Build your first quiz — add questions, set timers, and publish when ready."
          action={
            <Link href="/admin/quizzes/new" className="text-sm font-semibold text-signal-dark hover:underline">
              Create a quiz →
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="flex flex-col rounded-panel border border-ink/10 bg-white p-5">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="font-display font-semibold text-ink">{quiz.title}</h3>
                <Badge tone={quiz.status === "published" ? "success" : "neutral"}>
                  {quiz.status === "published" ? "Published" : "Draft"}
                </Badge>
              </div>
              <p className="mb-4 line-clamp-2 flex-1 text-sm text-ink600">
                {quiz.description || "No description yet."}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/admin/quizzes/${quiz.id}/edit`}
                  className="flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-paper-dim"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Link>
                <button
                  disabled={busyId === quiz.id}
                  onClick={() => handleDuplicate(quiz)}
                  className="flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-paper-dim disabled:opacity-40"
                >
                  <Copy className="h-3.5 w-3.5" /> Duplicate
                </button>
                <button
                  disabled={busyId === quiz.id}
                  onClick={() => handleDelete(quiz)}
                  className="flex items-center gap-1.5 rounded-full border border-coral/30 px-3 py-1.5 text-xs font-medium text-coral-dark transition hover:bg-coral/10 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
                <button
                  disabled={busyId === quiz.id || quiz.status !== "published"}
                  onClick={() => handleStartSession(quiz)}
                  title={quiz.status !== "published" ? "Publish this quiz to host it" : "Start a live session"}
                  className="ml-auto flex items-center gap-1.5 rounded-full bg-signal px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-signal-light disabled:opacity-40"
                >
                  <Play className="h-3.5 w-3.5" /> Host
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
