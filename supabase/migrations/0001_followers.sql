-- Followers feature: lets site visitors "follow" the site without logging in.
-- A device is identified by a random id the client generates once and keeps in
-- localStorage, so the same browser/device is recognized across reloads.

create table if not exists public.followers (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  username text not null,
  is_following boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists followers_is_following_idx on public.followers (is_following, created_at);

alter table public.followers enable row level security;

-- Public, no-login feature: anyone with the site's anon key can read the list/count,
-- register a follow, or flip their own row's is_following flag.
drop policy if exists "followers_select_all" on public.followers;
create policy "followers_select_all"
  on public.followers for select
  to anon, authenticated
  using (true);

drop policy if exists "followers_insert_anon" on public.followers;
create policy "followers_insert_anon"
  on public.followers for insert
  to anon, authenticated
  with check (true);

drop policy if exists "followers_update_anon" on public.followers;
create policy "followers_update_anon"
  on public.followers for update
  to anon, authenticated
  using (true)
  with check (true);

create or replace function public.set_followers_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists followers_set_updated_at on public.followers;
create trigger followers_set_updated_at
  before update on public.followers
  for each row
  execute function public.set_followers_updated_at();
