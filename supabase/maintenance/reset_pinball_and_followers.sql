-- One-time reset. Run deliberately after applying the follower migrations.
begin;

truncate table public.pinball_scores, public.followers;

do $$
begin
  if to_regclass('public.pinball_personal_bests') is not null then
    truncate table public.pinball_personal_bests;
  end if;
end;
$$;

commit;
