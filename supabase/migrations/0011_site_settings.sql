begin;

-- Small key/value store for site-wide switches an admin can flip (e.g. Christmas mode).
-- RLS is on with no policies: only the server (service role) reads and writes it.
create table if not exists public.site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

commit;
