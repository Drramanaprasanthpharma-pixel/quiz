/**
 * Mirrors the scoring formula inside supabase/schema.sql (submit_answer()).
 * This copy exists only so the UI can show a live "points if you answer
 * now" indicator — the database always recomputes and is the only value
 * that's ever persisted or trusted.
 */
export function estimatePoints(basePoints: number, elapsedMs: number, timeLimitSeconds: number): number {
  const ratio = 1 - Math.min(1, elapsedMs / (timeLimitSeconds * 1000)) * 0.5;
  return Math.round(basePoints * ratio);
}

export interface AccuracyStats {
  correct: number;
  total: number;
  averageResponseMs: number;
}

export function computeAccuracyStats(
  answers: { is_correct: boolean; response_time_ms: number }[]
): AccuracyStats {
  const total = answers.length;
  const correct = answers.filter((a) => a.is_correct).length;
  const averageResponseMs =
    total === 0 ? 0 : answers.reduce((sum, a) => sum + a.response_time_ms, 0) / total;
  return { correct, total, averageResponseMs };
}
