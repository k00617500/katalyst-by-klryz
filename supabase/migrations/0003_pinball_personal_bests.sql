begin;

-- Keep past runs intact. Serialize the short backfill with incoming score inserts.
lock table public.pinball_scores in share row exclusive mode;

create table if not exists public.pinball_personal_bests (
  username text not null check (btrim(username) <> ''),
  username_key text generated always as (lower(btrim(username))) stored primary key,
  score integer not null check (score between 0 and 100000),
  played_at timestamptz not null
);

create index if not exists pinball_personal_bests_rank_idx
  on public.pinball_personal_bests (score desc, played_at, username_key);
create index if not exists pinball_personal_bests_recent_idx
  on public.pinball_personal_bests (played_at desc, username_key);

alter table public.pinball_personal_bests enable row level security;
revoke all on public.pinball_personal_bests from anon, authenticated;
grant select on public.pinball_personal_bests to anon, authenticated;
drop policy if exists pinball_bests_read on public.pinball_personal_bests;
create policy pinball_bests_read on public.pinball_personal_bests
  for select to anon, authenticated using (true);

alter table public.pinball_scores drop constraint if exists pinball_scores_maximum;
alter table public.pinball_scores add constraint pinball_scores_maximum
  check (score <= 100000) not valid;

insert into public.pinball_personal_bests as best (username, score, played_at)
select distinct on (lower(btrim(username))) btrim(username), least(score, 100000), played_at
from public.pinball_scores
where btrim(username) <> ''
order by lower(btrim(username)), least(score, 100000) desc, played_at, id
on conflict (username_key) do update
  set score = excluded.score, played_at = excluded.played_at
  where excluded.score > best.score;

create or replace function public.update_pinball_personal_best()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if btrim(new.username) = '' then
    return new;
  end if;
  insert into public.pinball_personal_bests as best (username, score, played_at)
  values (btrim(new.username), new.score, least(new.played_at, now()))
  on conflict (username_key) do update
    set score = excluded.score, played_at = excluded.played_at
    where excluded.score > best.score;
  return new;
end;
$$;

revoke all on function public.update_pinball_personal_best() from public, anon, authenticated;
drop trigger if exists pinball_scores_update_best on public.pinball_scores;
create trigger pinball_scores_update_best
  after insert on public.pinball_scores
  for each row execute function public.update_pinball_personal_best();

do $$
begin
  if exists (select from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pinball_personal_bests'
    )
  then
    alter publication supabase_realtime add table public.pinball_personal_bests;
  end if;
end;
$$;

commit;
