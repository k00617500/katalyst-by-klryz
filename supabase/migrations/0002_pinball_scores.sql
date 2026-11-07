-- Pinball leaderboard / live scoreboard. Keyed by the same device_id used by the followers
-- feature, so "You're Playing As <username>" matches whoever is already following.

create table if not exists public.pinball_scores (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  username text not null,
  score integer not null check (score >= 0),
  level_reached smallint not null default 1,
  balls_used smallint not null default 3,
  played_at timestamptz not null default now()
);

create index if not exists pinball_scores_score_idx on public.pinball_scores (score desc);
create index if not exists pinball_scores_played_at_idx on public.pinball_scores (played_at desc);

alter table public.pinball_scores enable row level security;

drop policy if exists "pinball_scores_select_all" on public.pinball_scores;
create policy "pinball_scores_select_all"
  on public.pinball_scores for select
  to anon, authenticated
  using (true);

drop policy if exists "pinball_scores_insert_anon" on public.pinball_scores;
create policy "pinball_scores_insert_anon"
  on public.pinball_scores for insert
  to anon, authenticated
  with check (score >= 0);
