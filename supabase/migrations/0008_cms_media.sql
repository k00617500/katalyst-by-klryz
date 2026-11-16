begin;

-- Media library: metadata for files in the "media" Storage bucket. The bucket holds the
-- binary; this table holds what the admin UI needs to browse/search/reuse an upload.
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes >= 0),
  width integer,
  height integer,
  alt_text text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.media enable row level security;

drop policy if exists "media_select_admin" on public.media;
create policy "media_select_admin"
  on public.media for select
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid()));

drop policy if exists "media_write_admin" on public.media;
create policy "media_write_admin"
  on public.media for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid()))
  with check (exists (select 1 from public.profiles where id = auth.uid()));

-- Public read access is via the Storage bucket itself (public bucket + CDN URL), not this
-- table, so published articles render images without needing an authenticated request.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = true,
      file_size_limit = 10485760,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

drop policy if exists "media_bucket_read_all" on storage.objects;
create policy "media_bucket_read_all"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'media');

drop policy if exists "media_bucket_write_admin" on storage.objects;
create policy "media_bucket_write_admin"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'media'
    and exists (select 1 from public.profiles where id = auth.uid())
  )
  with check (
    bucket_id = 'media'
    and exists (select 1 from public.profiles where id = auth.uid())
  );

commit;
