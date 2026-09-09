import { z } from "zod";

export const answerSchema = z.object({
  id: z.string().optional(),
  answer_text: z.string().trim().min(1, "Answer text is required").max(200),
  is_correct: z.boolean(),
});

export const questionSchema = z
  .object({
    id: z.string().optional(),
    question_text: z.string().trim().min(1, "Question text is required").max(300),
    image_url: z.string().url().nullable().optional().or(z.literal("")),
    time_limit_seconds: z.number().int().min(5).max(300),
    points: z.number().int().min(0).max(5000),
    answers: z.array(answerSchema).min(2, "Add at least 2 answers").max(6, "6 answers max"),
  })
  .refine((q) => q.answers.some((a) => a.is_correct), {
    message: "Mark one answer as correct",
    path: ["answers"],
  });

export const quizSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z.string().trim().max(500).nullable().optional().or(z.literal("")),
  status: z.enum(["draft", "published"]),
  questions: z.array(questionSchema).min(1, "Add at least one question"),
});

export const nicknameSchema = z
  .string()
  .trim()
  .min(1, "Enter a nickname")
  .max(24, "24 characters max")
  .regex(/^[^<>]*$/, "No angle brackets, please");

export type QuizFormValues = z.infer<typeof quizSchema>;
export type QuestionFormValues = z.infer<typeof questionSchema>;
export type AnswerFormValues = z.infer<typeof answerSchema>;
