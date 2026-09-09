import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { QuizBuilder } from "@/components/admin/QuizBuilder";
import type { QuizWithQuestions } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function EditQuizPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: quiz } = await supabase.from("quizzes").select("*").eq("id", params.id).maybeSingle();
  if (!quiz) notFound();

  const { data: questions } = await supabase
    .from("questions")
    .select("*, answers(*)")
    .eq("quiz_id", params.id)
    .order("order_index");

  const quizWithQuestions: QuizWithQuestions = {
    ...quiz,
    questions: questions ?? [],
  };

  return (
    <div>
      <PageHeader title={`Edit "${quiz.title}"`} description="Changes save when you pick draft or publish below." />
      <QuizBuilder initialQuiz={quizWithQuestions} />
    </div>
  );
}
