"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ImagePlus,
  Loader2,
  GripVertical,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { quizSchema, type QuestionFormValues } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { ErrorBanner } from "@/components/ui";
import type { QuizWithQuestions } from "@/types/database";

interface QuizBuilderProps {
  initialQuiz?: QuizWithQuestions;
}

function blankQuestion(): QuestionFormValues {
  return {
    question_text: "",
    image_url: "",
    time_limit_seconds: 20,
    points: 1000,
    answers: [
      { answer_text: "", is_correct: true },
      { answer_text: "", is_correct: false },
    ],
  };
}

export function QuizBuilder({ initialQuiz }: QuizBuilderProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialQuiz?.title ?? "");
  const [description, setDescription] = useState(initialQuiz?.description ?? "");
  const [questions, setQuestions] = useState<QuestionFormValues[]>(
    initialQuiz?.questions.map((q) => ({
      id: q.id,
      question_text: q.question_text,
      image_url: q.image_url ?? "",
      time_limit_seconds: q.time_limit_seconds,
      points: q.points,
      answers: q.answers
        .sort((a, b) => a.order_index - b.order_index)
        .map((a) => ({ id: a.id, answer_text: a.answer_text, is_correct: a.is_correct })),
    })) ?? [blankQuestion()]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState<"draft" | "published" | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const active = questions[activeIndex];

  function updateActive(patch: Partial<QuestionFormValues>) {
    setQuestions((prev) => prev.map((q, i) => (i === activeIndex ? { ...q, ...patch } : q)));
  }

  function updateAnswer(answerIndex: number, patch: Partial<QuestionFormValues["answers"][number]>) {
    if (!active) return;
    const nextAnswers = active.answers.map((a, i) => {
      if (i !== answerIndex) return patch.is_correct ? { ...a, is_correct: false } : a;
      return { ...a, ...patch };
    });
    updateActive({ answers: nextAnswers });
  }

  function addAnswer() {
    if (!active || active.answers.length >= 6) return;
    updateActive({ answers: [...active.answers, { answer_text: "", is_correct: false }] });
  }

  function removeAnswer(i: number) {
    if (!active || active.answers.length <= 2) return;
    updateActive({ answers: active.answers.filter((_, idx) => idx !== i) });
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, blankQuestion()]);
    setActiveIndex(questions.length);
  }

  function removeQuestion(i: number) {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, idx) => idx !== i));
    setActiveIndex((prev) => Math.max(0, prev >= i ? prev - 1 : prev));
  }

  function moveQuestion(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= questions.length) return;
    setQuestions((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
    setActiveIndex(j);
  }

  async function handleImageUpload(file: File) {
    setUploadingImage(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("question-images").upload(path, file);
      if (uploadError) {
        setErrors([`Image upload failed: ${uploadError.message}. Create a public "question-images" bucket in Supabase Storage.`]);
        return;
      }
      const { data } = supabase.storage.from("question-images").getPublicUrl(path);
      updateActive({ image_url: data.publicUrl });
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSave(status: "draft" | "published") {
    const parsed = quizSchema.safeParse({ title, description, status, questions });
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((i) => i.message));
      return;
    }
    setErrors([]);
    setSaving(status);

    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setErrors(["You've been signed out. Please log in again."]);
      setSaving(null);
      return;
    }

    try {
      let quizId = initialQuiz?.id;
      if (quizId) {
        const { error: updateError } = await supabase
          .from("quizzes")
          .update({ title, description: description || null, status, updated_at: new Date().toISOString() })
          .eq("id", quizId);
        if (updateError) throw updateError;
      } else {
        const { data: newQuiz, error: insertError } = await supabase
          .from("quizzes")
          .insert({ admin_id: userData.user.id, title, description: description || null, status })
          .select()
          .single();
        if (insertError || !newQuiz) throw insertError;
        quizId = newQuiz.id;
      }

      // Simplest correct approach for an MVP: replace all questions/answers
      // on every save. Cascades handle cleanup of old answers.
      await supabase.from("questions").delete().eq("quiz_id", quizId);

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]!;
        const { data: newQuestion, error: qError } = await supabase
          .from("questions")
          .insert({
            quiz_id: quizId,
            question_text: q.question_text,
            image_url: q.image_url || null,
            time_limit_seconds: q.time_limit_seconds,
            points: q.points,
            order_index: i,
          })
          .select()
          .single();
        if (qError || !newQuestion) throw qError;

        const { error: aError } = await supabase.from("answers").insert(
          q.answers.map((a, idx) => ({
            question_id: newQuestion.id,
            answer_text: a.answer_text,
            is_correct: a.is_correct,
            order_index: idx,
          }))
        );
        if (aError) throw aError;
      }

      router.push("/admin/quizzes");
      router.refresh();
    } catch (e: any) {
      setErrors([e.message ?? "Something went wrong while saving"]);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      {/* Question rail */}
      <div className="order-2 lg:order-1">
        <div className="mb-3 flex flex-col gap-3 rounded-panel border border-ink/10 bg-white p-4">
          <label className="text-xs font-semibold uppercase tracking-wide text-ink600">Quiz title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled quiz"
            className="rounded-panel border border-ink/10 bg-paper px-3 py-2 text-sm font-medium"
          />
          <label className="text-xs font-semibold uppercase tracking-wide text-ink600">Description</label>
          <textarea
            value={description ?? ""}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Optional"
            className="rounded-panel border border-ink/10 bg-paper px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-2">
          {questions.map((q, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-2 rounded-panel border px-3 py-2.5 text-left text-sm transition",
                i === activeIndex ? "border-signal bg-signal/10" : "border-ink/10 bg-white hover:bg-paper-dim"
              )}
            >
              <GripVertical className="h-4 w-4 shrink-0 text-ink/30" />
              <button onClick={() => setActiveIndex(i)} className="flex-1 truncate text-left font-medium text-ink">
                {i + 1}. {q.question_text || "Untitled question"}
              </button>
              <button onClick={() => moveQuestion(i, -1)} disabled={i === 0} className="text-ink/40 hover:text-ink disabled:opacity-30">
                <ChevronUp className="h-4 w-4" />
              </button>
              <button onClick={() => moveQuestion(i, 1)} disabled={i === questions.length - 1} className="text-ink/40 hover:text-ink disabled:opacity-30">
                <ChevronDown className="h-4 w-4" />
              </button>
              <button onClick={() => removeQuestion(i)} disabled={questions.length <= 1} className="text-coral/60 hover:text-coral disabled:opacity-30">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={addQuestion}
            className="flex items-center justify-center gap-2 rounded-panel border border-dashed border-ink/20 py-2.5 text-sm font-medium text-ink600 hover:bg-paper-dim"
          >
            <Plus className="h-4 w-4" /> Add question
          </button>
        </div>
      </div>

      {/* Question editor */}
      <div className="order-1 rounded-panel border border-ink/10 bg-white p-6 lg:order-2">
        {errors.length > 0 && (
          <div className="mb-4 flex flex-col gap-2">
            {errors.map((err, i) => (
              <ErrorBanner key={i} message={err} />
            ))}
          </div>
        )}

        {active && (
          <div className="flex flex-col gap-5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink600">
                Question {activeIndex + 1}
              </label>
              <textarea
                value={active.question_text}
                onChange={(e) => updateActive({ question_text: e.target.value })}
                rows={2}
                placeholder="What do you want to ask?"
                className="w-full rounded-panel border border-ink/10 bg-paper px-4 py-3 font-display text-lg font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink600">
                  Time limit (s)
                </label>
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={active.time_limit_seconds}
                  onChange={(e) => updateActive({ time_limit_seconds: Number(e.target.value) })}
                  className="w-full rounded-panel border border-ink/10 bg-paper px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink600">
                  Points
                </label>
                <input
                  type="number"
                  min={0}
                  max={5000}
                  step={100}
                  value={active.points}
                  onChange={(e) => updateActive({ points: Number(e.target.value) })}
                  className="w-full rounded-panel border border-ink/10 bg-paper px-3 py-2 text-sm"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink600">
                  Image
                </label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-panel border border-dashed border-ink/20 px-3 py-2 text-sm text-ink600 hover:bg-paper-dim">
                  {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  {active.image_url ? "Replace" : "Upload"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                  />
                </label>
              </div>
            </div>

            {active.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={active.image_url} alt="" className="h-40 w-full rounded-panel object-cover" />
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wide text-ink600">
                  Answers — select the correct one
                </label>
                {active.answers.length < 6 && (
                  <button onClick={addAnswer} className="flex items-center gap-1 text-xs font-semibold text-signal-dark hover:underline">
                    <Plus className="h-3.5 w-3.5" /> Add option
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {active.answers.map((a, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateAnswer(i, { is_correct: true })}
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 text-xs font-bold transition",
                        a.is_correct ? "border-mint bg-mint text-white" : "border-ink/20 text-ink/40 hover:border-ink/40"
                      )}
                      aria-label={a.is_correct ? "Correct answer" : "Mark as correct"}
                    >
                      {String.fromCharCode(65 + i)}
                    </button>
                    <input
                      value={a.answer_text}
                      onChange={(e) => updateAnswer(i, { answer_text: e.target.value })}
                      placeholder={`Option ${i + 1}`}
                      className="flex-1 rounded-panel border border-ink/10 bg-paper px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => removeAnswer(i)}
                      disabled={active.answers.length <= 2}
                      className="text-coral/60 hover:text-coral disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-end gap-3 border-t border-ink/10 pt-5">
          <button
            onClick={() => handleSave("draft")}
            disabled={saving !== null}
            className="rounded-full border border-ink/15 px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-paper-dim disabled:opacity-50"
          >
            {saving === "draft" ? "Saving…" : "Save as draft"}
          </button>
          <button
            onClick={() => handleSave("published")}
            disabled={saving !== null}
            className="rounded-full bg-signal px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-signal-light disabled:opacity-50"
          >
            {saving === "published" ? "Publishing…" : "Publish quiz"}
          </button>
        </div>
      </div>
    </div>
  );
}
