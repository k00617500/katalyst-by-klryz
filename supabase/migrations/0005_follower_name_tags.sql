begin;

-- The optional setting stores a palette key for a public tag.
alter table public.followers add column if not exists name_tag text
  check (name_tag in ('rose', 'blue', 'spectrum'));

-- A fresh follow after a reset must never revive an older queued score.
create or replace function public.require_pinball_follower()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  member public.followers%rowtype;
begin
  select * into member from public.followers
    where device_id = new.device_id for share;
  if not found or not member.is_following
    or new.played_at < member.created_at
    or (member.pinball_reset_at is not null and new.played_at <= member.pinball_reset_at) then
    raise exception 'An active follower is required to submit a pinball score' using errcode = '42501';
  end if;
  if new.score > 100000 then
    raise exception 'Pinball score exceeds the table limit' using errcode = '23514';
  end if;
  new.username := member.username;
  return new;
end;
$$;

commit;
