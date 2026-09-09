# Buzzr

A Kahoot-style real-time quiz platform: Next.js (App Router) + TypeScript + Tailwind + Supabase (Auth, Postgres, Realtime).

## Status

**Working:** project scaffold, full DB schema with RLS + server-side scoring RPCs (`supabase/schema.sql`), admin auth (login/signup), admin dashboard, quiz builder (create/edit/publish, timers, points, images, reordering), My Quizzes (duplicate/delete/host), Live Sessions list, participant join flow (`/join`, `/join/[code]`), Game Lobby with QR code + live roster via Realtime.

**Not yet built:** the admin live-question-control screen, the participant play screen (question/answer/leaderboard), final results + CSV export, and the settings page. The DB schema and RPCs already support all of this (`quiz_sessions.status`, `submit_answer`, `snapshot_leaderboard`) — those screens just need to be wired up the same way the lobby page is.

## Setup

1. `npm install`
2. Create a Supabase project. In the SQL editor, run `supabase/schema.sql`.
3. In Storage, create a **public** bucket named `question-images` (used for question image uploads).
4. Copy `.env.example` to `.env.local` and fill in your Supabase URL/anon key and site URL.
5. `npm run dev`

## Notes

- Participants never create accounts — `join_session()` issues a per-browser token stored in `localStorage`, checked against on every `submit_answer()` call.
- All scoring is computed inside the database from `question_started_at`/`question_ends_at`, never from client-reported timing.
- Pause/resume is modeled with `is_paused` / `paused_at` on `quiz_sessions`, shifting `question_started_at`/`question_ends_at` on resume so no one loses points to the pause.
