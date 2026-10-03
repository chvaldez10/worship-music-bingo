begin;
create function public.test_assert(condition boolean, message text)
returns void language plpgsql as $$ begin
 if condition is distinct from true then raise exception 'Test failed: %', message; end if;
end $$;
insert into auth.users(id) values
 ('00000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-000000000002');
insert into public.content_admins values ('00000000-0000-0000-0000-000000000001');
select public.test_assert((select count(*) = 59 from public.songs where genre='Worship' and tags='{}' and release_year is null and bpm is null), 'known worship genre with other metadata unknown');
set local role anon;
do $$ begin
 begin
  perform * from public.song_ratings;
  raise exception 'Anonymous rating access succeeded';
 exception when insufficient_privilege then null; end;
 begin
  perform * from public.setlists;
  raise exception 'Anonymous setlist access succeeded';
 exception when insufficient_privilege then null; end;
 begin
  perform * from public.setlist_items;
  raise exception 'Anonymous item access succeeded';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
update public.songs set genre='Worship', tags=array['reflective'], release_year=2019, bpm=63.5 where id=1;
select public.test_assert((select bpm=63.5 from public.songs where id=1), 'fractional BPM supported');
do $$ begin
 begin
  update public.songs set bpm=0 where id=1;
  raise exception 'Invalid BPM accepted';
 exception when check_violation then null; end;
 begin
  update public.songs set release_year=0 where id=1;
  raise exception 'Invalid year accepted';
 exception when check_violation then null; end;
end $$;
insert into public.song_ratings(song_id,rating) values (1,5);
insert into public.setlists(name) values ('My karaoke night');
insert into public.setlist_items(setlist_id,song_id,position)
 select id,1,0 from public.setlists;
insert into public.setlist_items(setlist_id,song_id,position)
 select id,2,1 from public.setlists;
-- Same song may be repeated, but each slot must have a unique position.
insert into public.setlist_items(setlist_id,song_id,position)
 select id,1,2 from public.setlists;
select public.test_assert((select count(*)=3 from public.setlist_items), 'ordered entries including repeats');
update public.setlist_items set position=case when position=0 then 1 when position=1 then 0 else position end;
set constraints all immediate;
select public.test_assert((select song_id=2 from public.setlist_items where position=0), 'positions can swap atomically');
do $$ begin
 begin
  insert into public.song_ratings(song_id,rating) values (2,6);
  raise exception 'Invalid rating accepted';
 exception when check_violation then null; end;
 begin
  insert into public.song_ratings(song_id,rating) values (1,4);
  raise exception 'Duplicate personal rating accepted';
 exception when unique_violation then null; end;
 begin
  delete from public.songs where id=1;
  raise exception 'Song in setlist deleted';
 exception when foreign_key_violation then null; end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select public.test_assert((select count(*)=0 from public.song_ratings), 'other owner ratings hidden');
select public.test_assert((select count(*)=0 from public.setlists), 'other owner setlists hidden');
select public.test_assert((select count(*)=0 from public.setlist_items), 'other owner entries hidden');
update public.song_ratings set rating=1;
delete from public.setlist_items;
delete from public.setlists;
insert into public.song_ratings(song_id,rating) values (1,2);
insert into public.setlists(name) values ('Other owner');
do $$ begin
 begin
  insert into public.setlist_items(setlist_id,song_id,position) values (1,1,3);
  raise exception 'Cross-owner setlist insert succeeded';
 exception when insufficient_privilege then null; end;
 begin
  update public.setlists set owner_id='00000000-0000-0000-0000-000000000001';
  raise exception 'Ownership transfer succeeded';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select public.test_assert((select rating=5 from public.song_ratings), 'other owner cannot change rating');
select public.test_assert((select count(*)=3 from public.setlist_items), 'other owner cannot delete entries');
do $$ begin
 begin
  update public.setlist_items set setlist_id=2;
  raise exception 'Moving entries to another owner succeeded';
 exception when insufficient_privilege then null; end;
end $$;
update public.song_ratings set rating=4;
select public.test_assert((select rating=4 from public.song_ratings), 'owner updates rating');
delete from public.song_ratings;
delete from public.setlists;
select public.test_assert((select count(*)=0 from public.setlist_items), 'deleting setlist cascades entries');
reset role;
rollback;
