-- ============================================================================
-- Buzzr — database schema
-- Run this once in the Supabase SQL editor (or via `supabase db push`).
-- Safe to re-run: guarded with IF NOT EXISTS / CREATE OR REPLACE where possible.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
do $$ begin
  create type quiz_status as enum ('draft', 'published');
exception when duplicate_object then null; end $$;

do $$ begin
  create type session_status as enum
    ('lobby', 'question_active', 'question_ended', 'leaderboard', 'ended');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- TABLES
-- ----------------------------------------------------------------------------

-- One row per admin, mirrors auth.users. Created automatically on sign-up.
create table if not exists admins (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists quizzes (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references admins (id) on delete cascade,
  title text not null,
  description text,
  cover_image_url text,
  status quiz_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists quizzes_admin_id_idx on quizzes (admin_id);

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes (id) on delete cascade,
  question_text text not null,
  image_url text,
  time_limit_seconds int not null default 20 check (time_limit_seconds between 5 and 300),
  points int not null default 1000 check (points >= 0),
  order_index int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists questions_quiz_id_idx on questions (quiz_id, order_index);

create table if not exists answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions (id) on delete cascade,
  answer_text text not null,
  is_correct boolean not null default false,
  order_index int not null default 0
);
create index if not exists answers_question_id_idx on answers (question_id);

create table if not exists quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes (id) on delete cascade,
  admin_id uuid not null references admins (id) on delete cascade,
  session_pin text not null unique,
  status session_status not null default 'lobby',
  current_question_index int not null default -1,
  current_question_id uuid references questions (id),
  question_started_at timestamptz,
  question_ends_at timestamptz,
  is_paused boolean not null default false,
  paused_at timestamptz,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists quiz_sessions_pin_idx on quiz_sessions (session_pin);
create index if not exists quiz_sessions_admin_idx on quiz_sessions (admin_id);

-- Only one non-ended session per quiz PIN at a time is enforced at the app layer
-- (session_pin itself is globally unique for the life of the row).

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references quiz_sessions (id) on delete cascade,
  nickname text not null check (char_length(trim(nickname)) between 1 and 24),
  participant_token uuid not null default gen_random_uuid(),
  score int not null default 0,
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  unique (session_id, nickname)
);
create index if not exists participants_session_idx on participants (session_id);

create table if not exists participant_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references quiz_sessions (id) on delete cascade,
  question_id uuid not null references questions (id) on delete cascade,
  participant_id uuid not null references participants (id) on delete cascade,
  answer_id uuid references answers (id),
  response_time_ms int not null,
  is_correct boolean not null default false,
  points_awarded int not null default 0,
  submitted_at timestamptz not null default now(),
  unique (participant_id, question_id)
);
create index if not exists participant_answers_session_idx on participant_answers (session_id, question_id);

-- Per-question standings snapshot, written by the scoring function so the
-- admin and participants can show "how the leaderboard looked after Q3"
-- without recomputing from participant_answers every time.
create table if not exists leaderboards (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references quiz_sessions (id) on delete cascade,
  question_id uuid references questions (id),
  participant_id uuid not null references participants (id) on delete cascade,
  rank int not null,
  score_after int not null,
  created_at timestamptz not null default now()
);
create index if not exists leaderboards_session_idx on leaderboards (session_id, question_id);

-- ----------------------------------------------------------------------------
-- admins row auto-provisioning on signup
-- ----------------------------------------------------------------------------
create or replace function handle_new_admin()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.admins (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'display_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_admin();

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
alter table admins enable row level security;
alter table quizzes enable row level security;
alter table questions enable row level security;
alter table answers enable row level security;
alter table quiz_sessions enable row level security;
alter table participants enable row level security;
alter table participant_answers enable row level security;
alter table leaderboards enable row level security;

-- admins: an admin can only read/update their own row
drop policy if exists "admins read own" on admins;
create policy "admins read own" on admins for select using (id = auth.uid());
drop policy if exists "admins update own" on admins;
create policy "admins update own" on admins for update using (id = auth.uid());

-- quizzes: full CRUD restricted to the owning admin
drop policy if exists "quizzes owner all" on quizzes;
create policy "quizzes owner all" on quizzes for all
  using (admin_id = auth.uid()) with check (admin_id = auth.uid());

-- questions/answers: owner access via parent quiz
drop policy if exists "questions owner all" on questions;
create policy "questions owner all" on questions for all
  using (exists (select 1 from quizzes q where q.id = questions.quiz_id and q.admin_id = auth.uid()))
  with check (exists (select 1 from quizzes q where q.id = questions.quiz_id and q.admin_id = auth.uid()));

drop policy if exists "answers owner all" on answers;
create policy "answers owner all" on answers for all
  using (exists (
    select 1 from questions qs join quizzes q on q.id = qs.quiz_id
    where qs.id = answers.question_id and q.admin_id = auth.uid()
  ))
  with check (exists (
    select 1 from questions qs join quizzes q on q.id = qs.quiz_id
    where qs.id = answers.question_id and q.admin_id = auth.uid()
  ));

-- Public (anon) participants need read access to a *live* question's prompt
-- and options, but must never see is_correct. We expose that via a view.
drop policy if exists "questions public read live" on questions;
create policy "questions public read live" on questions for select
  using (
    exists (
      select 1 from quiz_sessions s
      where s.current_question_id = questions.id
        and s.status in ('question_active', 'question_ended', 'leaderboard')
    )
  );

drop policy if exists "answers public read live" on answers;
create policy "answers public read live" on answers for select
  using (
    exists (
      select 1 from quiz_sessions s
      where s.current_question_id = answers.question_id
        and s.status in ('question_active', 'question_ended', 'leaderboard')
    )
  );

-- quiz_sessions: owner has full control; anyone can read a session by PIN
-- (needed for the public join screen and realtime subscriptions).
drop policy if exists "sessions owner all" on quiz_sessions;
create policy "sessions owner all" on quiz_sessions for all
  using (admin_id = auth.uid()) with check (admin_id = auth.uid());

drop policy if exists "sessions public read" on quiz_sessions;
create policy "sessions public read" on quiz_sessions for select using (true);

-- participants: publicly readable within a session (for the live roster /
-- leaderboard); inserts only via the join_session() RPC below.
drop policy if exists "participants public read" on participants;
create policy "participants public read" on participants for select using (true);

drop policy if exists "participants owner manage" on participants;
create policy "participants owner manage" on participants for update using (
  exists (select 1 from quiz_sessions s where s.id = participants.session_id and s.admin_id = auth.uid())
);

-- participant_answers: readable for leaderboard aggregation; writes only via
-- the submit_answer() RPC (security definer) below — no direct insert policy.
drop policy if exists "participant_answers public read" on participant_answers;
create policy "participant_answers public read" on participant_answers for select using (true);

drop policy if exists "leaderboards public read" on leaderboards;
create policy "leaderboards public read" on leaderboards for select using (true);

-- ----------------------------------------------------------------------------
-- RPC: join_session — the only way a participant row gets created.
-- Validates the PIN maps to a joinable (lobby) session and prevents
-- duplicate nicknames. Returns the new participant id + secret token.
-- ----------------------------------------------------------------------------
create or replace function join_session(p_pin text, p_nickname text)
returns table (participant_id uuid, participant_token uuid, session_id uuid)
language plpgsql
security definer set search_path = public
as $$
declare
  v_session quiz_sessions%rowtype;
  v_clean_nick text := trim(p_nickname);
  v_new_id uuid;
  v_new_token uuid;
begin
  if char_length(v_clean_nick) < 1 or char_length(v_clean_nick) > 24 then
    raise exception 'Nickname must be 1-24 characters' using errcode = '22023';
  end if;

  select * into v_session from quiz_sessions where session_pin = upper(p_pin);
  if not found then
    raise exception 'No active session with that PIN' using errcode = 'P0002';
  end if;
  if v_session.status <> 'lobby' then
    raise exception 'This game has already started' using errcode = '55000';
  end if;

  insert into participants (session_id, nickname)
  values (v_session.id, v_clean_nick)
  returning id, participant_token into v_new_id, v_new_token;

  return query select v_new_id, v_new_token, v_session.id;
exception
  when unique_violation then
    raise exception 'That nickname is already taken in this game' using errcode = '23505';
end;
$$;
grant execute on function join_session(text, text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- RPC: submit_answer — the only way a participant_answers row gets created.
-- All scoring happens server-side: elapsed time is computed from
-- quiz_sessions.question_started_at (a trusted server timestamp), never
-- from a client-supplied value, so a participant cannot fabricate speed.
-- ----------------------------------------------------------------------------
create or replace function submit_answer(
  p_participant_id uuid,
  p_participant_token uuid,
  p_question_id uuid,
  p_answer_id uuid
)
returns table (is_correct boolean, points_awarded int, new_score int)
language plpgsql
security definer set search_path = public
as $$
declare
  v_session quiz_sessions%rowtype;
  v_question questions%rowtype;
  v_correct boolean := false;
  v_elapsed_ms int;
  v_points int := 0;
  v_ratio double precision;
begin
  select s.* into v_session
  from participants p join quiz_sessions s on s.id = p.session_id
  where p.id = p_participant_id and p.participant_token = p_participant_token;

  if not found then
    raise exception 'Not authorized for this participant' using errcode = '28000';
  end if;

  if v_session.status <> 'question_active' or v_session.current_question_id <> p_question_id then
    raise exception 'This question is no longer accepting answers' using errcode = '55000';
  end if;
  if v_session.is_paused then
    raise exception 'This question is paused' using errcode = '55000';
  end if;

  select * into v_question from questions where id = p_question_id;

  v_elapsed_ms := greatest(0, extract(epoch from (now() - v_session.question_started_at)) * 1000)::int;

  if now() > (v_session.question_ends_at + interval '1.5 seconds') then
    raise exception 'Time is up for this question' using errcode = '55000';
  end if;

  if p_answer_id is not null then
    select a.is_correct into v_correct from answers a
      where a.id = p_answer_id and a.question_id = p_question_id;
  end if;

  if v_correct then
    -- Kahoot-style speed bonus: full points at t=0, floor of 50% of the
    -- question's point value if answered right at the buzzer.
    v_ratio := 1.0 - least(1.0, v_elapsed_ms::double precision / (v_question.time_limit_seconds * 1000.0)) * 0.5;
    v_points := round(v_question.points * v_ratio);
  end if;

  insert into participant_answers
    (session_id, question_id, participant_id, answer_id, response_time_ms, is_correct, points_awarded)
  values
    (v_session.id, p_question_id, p_participant_id, p_answer_id, v_elapsed_ms, v_correct, v_points);

  update participants set score = score + v_points where id = p_participant_id
    returning score into new_score;

  return query select v_correct, v_points, new_score;
end;
$$;
grant execute on function submit_answer(uuid, uuid, uuid, uuid) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- RPC: snapshot_leaderboard — called by the admin client after a question
-- ends, to freeze standings for that question into the leaderboards table.
-- ----------------------------------------------------------------------------
create or replace function snapshot_leaderboard(p_session_id uuid, p_question_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from quiz_sessions where id = p_session_id and admin_id = auth.uid()
  ) then
    raise exception 'Not authorized for this session' using errcode = '28000';
  end if;

  insert into leaderboards (session_id, question_id, participant_id, rank, score_after)
  select p_session_id, p_question_id, id,
         rank() over (order by score desc, joined_at asc),
         score
  from participants
  where session_id = p_session_id;
end;
$$;
grant execute on function snapshot_leaderboard(uuid, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Realtime: make sure these tables broadcast changes.
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table quiz_sessions;
alter publication supabase_realtime add table participants;
alter publication supabase_realtime add table participant_answers;
alter publication supabase_realtime add table leaderboards;
