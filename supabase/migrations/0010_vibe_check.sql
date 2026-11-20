begin;

-- Vibe Check: anonymous, consolidated results from the Playground. Only the picked moods, their 1-10 ratings and the
-- qualitative review are stored - never a name, a photo or anything that identifies the visitor.
create table if not exists public.vibe_check_results (
  id uuid primary key default gen_random_uuid(),
  moods jsonb not null,
  review text not null check (review in (
    'Overwhelmingly positive', 'Positive', 'Mixed feelings', 'Leaning negative', 'Negative'
  )),
  score numeric(4, 3) not null check (score between -1 and 1),
  created_at timestamptz not null default now(),
  constraint vibe_check_moods_shape check (jsonb_typeof(moods) = 'array' and jsonb_array_length(moods) between 3 and 5)
);

create index if not exists vibe_check_results_created_idx on public.vibe_check_results (created_at desc);

alter table public.vibe_check_results enable row level security;

-- Visitors can submit a result but can never read rows back; the public KPI graphs use the summary function below.
drop policy if exists "vibe_check_results_insert_anon" on public.vibe_check_results;
create policy "vibe_check_results_insert_anon"
  on public.vibe_check_results for insert
  to anon, authenticated
  with check (true);

drop policy if exists "vibe_check_results_select_admin" on public.vibe_check_results;
create policy "vibe_check_results_select_admin"
  on public.vibe_check_results for select
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid()));

-- Aggregates only: totals, per-mood counts and average intensity, and the spread of overall reviews.
create or replace function public.vibe_check_summary()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'total', (select count(*) from public.vibe_check_results),
    'averageRating', coalesce((
      select round(avg((m ->> 'rating')::numeric), 2)
      from public.vibe_check_results r, jsonb_array_elements(r.moods) m
    ), 0),
    'averageScore', coalesce((select round(avg(score), 3) from public.vibe_check_results), 0),
    'reviews', coalesce((
      select jsonb_object_agg(review, n)
      from (select review, count(*) as n from public.vibe_check_results group by review) t
    ), '{}'::jsonb),
    'moods', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'tone', tone, 'count', cnt, 'average', avg_rating) order by cnt desc, label)
      from (
        select m ->> 'label' as label, m ->> 'tone' as tone, count(*) as cnt, round(avg((m ->> 'rating')::numeric), 2) as avg_rating
        from public.vibe_check_results r, jsonb_array_elements(r.moods) m
        group by 1, 2
      ) t
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.vibe_check_summary() from public;
grant execute on function public.vibe_check_summary() to anon, authenticated;

commit;
