begin;

-- Once a follower has answered "How should I address you?" (a color, or an explicit skip),
-- the choice is final — this flag is what the API checks before it will write name_tag again.
alter table public.followers add column if not exists name_tag_set boolean not null default false;

-- Backfill: a non-null name_tag is proof a choice was already made. A null name_tag could mean
-- either "skipped" or "never asked" (pre-dates this feature), so it's left unlocked rather than
-- guessing — those followers get one more chance to set it.
update public.followers set name_tag_set = true where name_tag is not null and not name_tag_set;

commit;
