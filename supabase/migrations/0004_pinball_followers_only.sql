begin;

alter table public.followers add column if not exists pinball_reset_at timestamptz;
create index if not exists pinball_scores_device_idx on public.pinball_scores (device_id);

create or replace function public.require_pinball_follower()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  member public.followers%rowtype;
begin
  select * into member from public.followers
    where device_id = new.device_id for share;
  if not found or not member.is_following
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
revoke all on function public.require_pinball_follower() from public, anon, authenticated;
create or replace trigger pinball_scores_require_follower
  before insert on public.pinball_scores for each row execute function public.require_pinball_follower();

create or replace view public.pinball_follower_bests with (security_invoker = true) as
select distinct on (lower(btrim(f.username)))
  s.device_id, f.username, least(s.score, 100000) as score, s.played_at
from public.pinball_scores s
join public.followers f on f.device_id = s.device_id and f.is_following
where s.score > 0 and btrim(f.username) <> ''
  and lower(btrim(s.username)) = lower(btrim(f.username))
  and (f.pinball_reset_at is null or s.played_at > f.pinball_reset_at)
order by lower(btrim(f.username)), least(s.score, 100000) desc, s.played_at, s.id;
grant select on public.pinball_follower_bests to anon, authenticated;

create or replace function public.reset_pinball_on_unfollow()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if old.is_following and not new.is_following then
    if current_setting('app.pinball_confirm_unfollow', true) is distinct from 'yes'
      and exists (select 1 from public.pinball_scores where device_id = old.device_id) then
      raise exception 'Pinball score reset requires confirmation' using errcode = '42501';
    end if;
    new.pinball_reset_at := clock_timestamp();
    update public.pinball_scores set score = 0 where device_id = old.device_id and score <> 0;
    -- Older deployments may also have the materialized personal-best table.
    if to_regclass('public.pinball_personal_bests') is not null then
      update public.pinball_personal_bests best
      set score = coalesce(replacement.score, 0), played_at = coalesce(replacement.played_at, new.pinball_reset_at)
      from (
        select affected.key, current_best.score, current_best.played_at
        from (
          select lower(btrim(old.username)) as key
          union select lower(btrim(username)) from public.pinball_scores where device_id = old.device_id
        ) affected
        left join lateral (
          select score, played_at from public.pinball_follower_bests
          where lower(btrim(username)) = affected.key and device_id <> old.device_id
        ) current_best on true
      ) replacement
      where best.username_key = replacement.key;
    end if;
  else
    new.pinball_reset_at := old.pinball_reset_at;
  end if;
  return new;
end;
$$;
revoke all on function public.reset_pinball_on_unfollow() from public, anon, authenticated;
create or replace trigger followers_reset_pinball
  before update on public.followers for each row execute function public.reset_pinball_on_unfollow();

create or replace function public.unfollow_pinball_player(p_device_id text, p_confirm_reset boolean)
returns text language plpgsql security invoker set search_path = ''
as $$
begin
  perform 1 from public.followers where device_id = p_device_id and is_following for update;
  if not found then return 'unfollowed'; end if;
  if not p_confirm_reset and exists (select 1 from public.pinball_scores where device_id = p_device_id) then
    return 'confirmation_required';
  end if;
  if p_confirm_reset then
    perform set_config('app.pinball_confirm_unfollow', 'yes', true);
  end if;
  update public.followers set is_following = false where device_id = p_device_id and is_following;
  return 'unfollowed';
end;
$$;
revoke all on function public.unfollow_pinball_player(text, boolean) from public;
grant execute on function public.unfollow_pinball_player(text, boolean) to anon, authenticated;

commit;
