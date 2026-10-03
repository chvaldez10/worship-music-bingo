-- ONLY on an isolated database. Verify reruns preserve edits and ID high-water marks.
begin;
update public.songs set title = 'Admin-customized title' where id = 1;
select setval('public.songs_id_seq', 10000, true);
select setval('public.charades_categories_id_seq', 10000, true);
select setval('public.charades_prompts_id_seq', 10000, true);
select setval('public.saved_games_id_seq', 10000, true);
\ir ../seed.sql
\ir ../seed.sql
do $$ begin
  if (select title from public.songs where id = 1) <> 'Admin-customized title' then
    raise exception 'Seed overwrote admin content';
  end if;
  if (select count(*) from public.songs) <> 59 or (select count(*) from public.charades_prompts) <> 44 then
    raise exception 'Repeated seed changed content counts';
  end if;
  if nextval('public.songs_id_seq') <> 10001
    or nextval('public.charades_categories_id_seq') <> 10001
    or nextval('public.charades_prompts_id_seq') <> 10001
    or nextval('public.saved_games_id_seq') <> 10001 then
    raise exception 'Seed moved an ID sequence backwards';
  end if;
end $$;
rollback;
