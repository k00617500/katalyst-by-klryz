begin;

-- Custom analytics events for the admin dashboard. Vercel Web Analytics has no
-- historical query API on the Hobby plan, so page views / interactions the dashboard
-- needs to query are recorded here via a first-party /api/track endpoint. post_views
-- (0007) remains the source of truth for per-article view counts.
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  path text,
  referrer text,
  device_category text check (device_category in ('desktop', 'mobile', 'tablet', null)),
  session_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_name_idx on public.analytics_events (event_name, created_at desc);
create index if not exists analytics_events_session_idx on public.analytics_events (session_id, created_at);
create index if not exists analytics_events_created_idx on public.analytics_events (created_at desc);

alter table public.analytics_events enable row level security;

-- Anonymous visitors may record events (that's the point of client-side tracking) but
-- can never read them back - only the admin can query analytics.
drop policy if exists "analytics_events_insert_anon" on public.analytics_events;
create policy "analytics_events_insert_anon"
  on public.analytics_events for insert
  to anon, authenticated
  with check (
    event_name in (
      'page_view', 'project_view', 'project_demo_click', 'project_source_click',
      'article_view', 'article_share', 'resume_download', 'contact_click',
      'email_click', 'social_link_click', 'navigation_click'
    )
  );

drop policy if exists "analytics_events_select_admin" on public.analytics_events;
create policy "analytics_events_select_admin"
  on public.analytics_events for select
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid()));

commit;
