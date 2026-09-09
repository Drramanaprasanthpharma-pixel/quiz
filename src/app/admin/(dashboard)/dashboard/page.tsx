import Link from "next/link";
import { ListVideo, CheckCircle2, Radio, Users, PlusCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/admin/StatCard";
import { PageHeader } from "@/components/ui";
import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ count: totalQuizzes }, { count: publishedQuizzes }, sessionsRes, { data: recentQuizzes }] =
    await Promise.all([
      supabase.from("quizzes").select("id", { count: "exact", head: true }).eq("admin_id", user.id),
      supabase
        .from("quizzes")
        .select("id", { count: "exact", head: true })
        .eq("admin_id", user.id)
        .eq("status", "published"),
      supabase.from("quiz_sessions").select("id, status").eq("admin_id", user.id),
      supabase
        .from("quizzes")
        .select("id, title, status, updated_at")
        .eq("admin_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(5),
    ]);

  const sessions = sessionsRes.data ?? [];
  const activeSessions = sessions.filter((s) => s.status !== "ended").length;

  let totalParticipants = 0;
  if (sessions.length > 0) {
    const { count } = await supabase
      .from("participants")
      .select("id", { count: "exact", head: true })
      .in(
        "session_id",
        sessions.map((s) => s.id)
      );
    totalParticipants = count ?? 0;
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="An overview of your quizzes and live activity."
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total quizzes" value={totalQuizzes ?? 0} icon={ListVideo} accent="signal" />
        <StatCard label="Published quizzes" value={publishedQuizzes ?? 0} icon={CheckCircle2} accent="mint" />
        <StatCard label="Active sessions" value={activeSessions} icon={Radio} accent="coral" />
        <StatCard label="Total participants" value={totalParticipants} icon={Users} accent="gold" />
      </div>

      <div className="mt-10">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">Recently updated</h2>
        {recentQuizzes && recentQuizzes.length > 0 ? (
          <div className="overflow-hidden rounded-panel border border-ink/10 bg-white">
            {recentQuizzes.map((q, i) => (
              <Link
                key={q.id}
                href={`/admin/quizzes/${q.id}/edit`}
                className={`flex items-center justify-between px-5 py-4 text-sm hover:bg-paper-dim ${i > 0 ? "border-t border-ink/10" : ""}`}
              >
                <span className="font-medium text-ink">{q.title}</span>
                <span className={`text-xs font-medium ${q.status === "published" ? "text-mint-dark" : "text-ink600"}`}>
                  {q.status === "published" ? "Published" : "Draft"}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ListVideo}
            title="No quizzes yet"
            body="Create your first quiz to start hosting live games."
            action={
              <Link href="/admin/quizzes/new" className="text-sm font-semibold text-signal-dark hover:underline">
                Create a quiz →
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}
