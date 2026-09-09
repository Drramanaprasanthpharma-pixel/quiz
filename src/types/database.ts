export type QuizStatus = "draft" | "published";

export type SessionStatus =
  | "lobby"
  | "question_active"
  | "question_ended"
  | "leaderboard"
  | "ended";

export interface Admin {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

export interface Quiz {
  id: string;
  admin_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  status: QuizStatus;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  image_url: string | null;
  time_limit_seconds: number;
  points: number;
  order_index: number;
  created_at: string;
}

export interface Answer {
  id: string;
  question_id: string;
  answer_text: string;
  is_correct: boolean;
  order_index: number;
}

export interface QuizSession {
  id: string;
  quiz_id: string;
  admin_id: string;
  session_pin: string;
  status: SessionStatus;
  current_question_index: number;
  current_question_id: string | null;
  question_started_at: string | null;
  question_ends_at: string | null;
  created_at: string;
  ended_at: string | null;
}

export interface Participant {
  id: string;
  session_id: string;
  nickname: string;
  participant_token: string;
  score: number;
  is_active: boolean;
  joined_at: string;
}

export interface ParticipantAnswer {
  id: string;
  session_id: string;
  question_id: string;
  participant_id: string;
  answer_id: string | null;
  response_time_ms: number;
  is_correct: boolean;
  points_awarded: number;
  submitted_at: string;
}

export interface LeaderboardEntry {
  id: string;
  session_id: string;
  question_id: string | null;
  participant_id: string;
  rank: number;
  score_after: number;
  created_at: string;
}

/** Question shape combined with its answer options, as authored in the builder. */
export interface QuestionWithAnswers extends Question {
  answers: Answer[];
}

/** Quiz combined with its ordered questions, as used in the quiz builder. */
export interface QuizWithQuestions extends Quiz {
  questions: QuestionWithAnswers[];
}

/** Shape returned to participants — never includes is_correct. */
export interface PublicAnswerOption {
  id: string;
  answer_text: string;
  order_index: number;
}

export interface PublicQuestion {
  id: string;
  question_text: string;
  image_url: string | null;
  time_limit_seconds: number;
  points: number;
  order_index: number;
  answers: PublicAnswerOption[];
}
