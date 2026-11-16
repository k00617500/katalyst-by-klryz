begin;

-- CMS core: posts, categories, tags, author profiles, and a lightweight view counter.
-- Mirrors the style of earlier migrations (snake_case, RLS everywhere, triggers for updated_at).

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  role text not null default 'admin' check (role in ('admin')),
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

drop policy if exists "categories_select_all" on public.categories;
create policy "categories_select_all"
  on public.categories for select
  to anon, authenticated
  using (true);

drop policy if exists "categories_write_admin" on public.categories;
create policy "categories_write_admin"
  on public.categories for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid()))
  with check (exists (select 1 from public.profiles where id = auth.uid()));

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

alter table public.tags enable row level security;

drop policy if exists "tags_select_all" on public.tags;
create policy "tags_select_all"
  on public.tags for select
  to anon, authenticated
  using (true);

drop policy if exists "tags_write_admin" on public.tags;
create policy "tags_write_admin"
  on public.tags for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid()))
  with check (exists (select 1 from public.profiles where id = auth.uid()));

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  cover_image text,
  cover_image_alt text,
  author_id uuid references public.profiles (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published', 'unpublished')),
  published_at timestamptz,
  scheduled_at timestamptz,
  seo_title text,
  seo_description text,
  social_image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_status_published_idx on public.posts (status, published_at desc);
create index if not exists posts_category_idx on public.posts (category_id);
create index if not exists posts_scheduled_idx on public.posts (scheduled_at) where status = 'scheduled';

alter table public.posts enable row level security;

drop policy if exists "posts_select_published" on public.posts;
create policy "posts_select_published"
  on public.posts for select
  to anon
  using (status = 'published' and published_at <= now());

drop policy if exists "posts_select_admin" on public.posts;
create policy "posts_select_admin"
  on public.posts for select
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid()));

drop policy if exists "posts_write_admin" on public.posts;
create policy "posts_write_admin"
  on public.posts for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid()))
  with check (exists (select 1 from public.profiles where id = auth.uid()));

create or replace function public.set_posts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
  before update on public.posts
  for each row
  execute function public.set_posts_updated_at();

create table if not exists public.post_tags (
  post_id uuid not null references public.posts (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (post_id, tag_id)
);

alter table public.post_tags enable row level security;

drop policy if exists "post_tags_select_all" on public.post_tags;
create policy "post_tags_select_all"
  on public.post_tags for select
  to anon, authenticated
  using (true);

drop policy if exists "post_tags_write_admin" on public.post_tags;
create policy "post_tags_write_admin"
  on public.post_tags for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid()))
  with check (exists (select 1 from public.profiles where id = auth.uid()));

-- Raw view events (one row per page load of a published article). Aggregated on read
-- rather than kept as a running counter, so historical date-range queries stay accurate.
create table if not exists public.post_views (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create index if not exists post_views_post_idx on public.post_views (post_id, viewed_at desc);

alter table public.post_views enable row level security;

drop policy if exists "post_views_insert_anon" on public.post_views;
create policy "post_views_insert_anon"
  on public.post_views for insert
  to anon, authenticated
  with check (true);

drop policy if exists "post_views_select_admin" on public.post_views;
create policy "post_views_select_admin"
  on public.post_views for select
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid()));

-- Publishes any post whose schedule has arrived. Called on a schedule (see
-- supabase/functions or an external cron hitting /api/admin/scheduled-publishing).
create or replace function public.publish_scheduled_posts()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.posts
  set status = 'published', published_at = coalesce(published_at, scheduled_at, now())
  where status = 'scheduled' and scheduled_at <= now();
end;
$$;

revoke all on function public.publish_scheduled_posts() from public, anon, authenticated;
grant execute on function public.publish_scheduled_posts() to service_role;

commit;
