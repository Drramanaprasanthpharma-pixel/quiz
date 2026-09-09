"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader, EmptyState, LoadingScreen, Badge } from "@/components/ui";
import type { QuizSession } from "@/types/database";

interface SessionRow extends QuizSession {
  quizzes: { title: string } | null;
  participant_count?: number;
}

export default function LiveSessionsPage() {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("quiz_sessions")
        .select("*, quizzes(title)")
        .order("created_at", { ascending: false });

      const rows = (data ?? []) as SessionRow[];
      const withCounts = await Promise.all(
        rows.map(async (s) => {
          const { count } = await supabase
            .from("participants")
            .select("id", { count: "exact", head: true })
            .eq("session_id", s.id);
          return { ...s, participant_count: count ?? 0 };
        })
      );
      setSessions(withCounts);
    }
    load();
  }, []);

  if (sessions === null) return <LoadingScreen label="Loading sessions…" />;

  function linkFor(s: SessionRow) {
    if (s.status === "lobby") return `/admin/sessions/${s.id}/lobby`;
    if (s.status === "ended") return `/admin/sessions/${s.id}/results`;
    return `/admin/sessions/${s.id}/live`;
  }

  return (
    <div>
      <PageHeader title="Live Sessions" description="Every game you've hosted, past and present." />

      {sessions.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="No sessions yet"
          body="Start a live session from any published quiz to see it here."
          action={
            <Link href="/admin/quizzes" className="text-sm font-semibold text-signal-dark hover:underline">
              Go to My Quizzes →
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-panel border border-ink/10 bg-white">
          {sessions.map((s, i) => (
            <Link
              key={s.id}
              href={linkFor(s)}
              className={`flex flex-wrap items-center justify-between gap-2 px-5 py-4 hover:bg-paper-dim ${i > 0 ? "border-t border-ink/10" : ""}`}
            >
              <div>
                <p className="font-medium text-ink">{s.quizzes?.title ?? "Untitled quiz"}</p>
                <p className="text-xs text-ink600">
                  PIN {s.session_pin} · {s.participant_count} player{s.participant_count === 1 ? "" : "s"}
                </p>
              </div>
              <StatusBadge status={s.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: QuizSession["status"] }) {
  if (status === "lobby") return <Badge tone="warning">In lobby</Badge>;
  if (status === "ended") return <Badge tone="neutral">Ended</Badge>;
  return <Badge tone="live">Live</Badge>;
}
