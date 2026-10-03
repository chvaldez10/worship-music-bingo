-- Run ONLY on an isolated local database after migrations and seed.sql.
-- Auth fixtures below assume the local test's minimal auth.users/auth.uid stub.
begin;
create function public.test_assert(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is distinct from true then raise exception 'Test failed: %', message; end if;
end $$;
select public.test_assert((select count(*) = 59 from public.songs), '59 canonical songs');
select public.test_assert((select count(*) = 44 from public.charades_prompts), '44 non-song prompts');
select public.test_assert((select count(*) = 3 from public.charades_categories), '3 categories');
select public.test_assert(not exists(select 1 from public.charades_prompts where category_id = 2), 'songs are shared');
select public.test_assert((select title = 'I Surrender All' from public.songs where id = 67), 'hymns present');
insert into auth.users(id) values
 ('00000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-000000000002');
insert into public.content_admins values ('00000000-0000-0000-0000-000000000001');

set local role anon;
select public.test_assert((select count(*) = 59 from public.songs), 'public can read songs');
select public.test_assert((select count(*) = 44 from public.charades_prompts), 'public can read prompts');
do $$ begin
  begin
    insert into public.songs(title) values ('Forbidden anonymous insert');
    raise exception 'Anonymous insert unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
  begin
    perform * from public.saved_games;
    raise exception 'Anonymous game access unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select public.test_assert(not public.is_content_admin(auth.uid()), 'ordinary user is not an admin');
select public.test_assert(not public.is_content_admin('00000000-0000-0000-0000-000000000001'), 'cannot probe another admin membership');
do $$ begin
  begin
    insert into public.content_admins values (auth.uid());
    raise exception 'Self promotion unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.songs(title) values ('Forbidden user insert');
    raise exception 'Non-admin insert unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
end $$;
insert into public.saved_games(owner_id, game_type, state)
 values (auth.uid(), 'charades', '{"round":1}');
update public.saved_games set name='Owner edited game' where owner_id=auth.uid();
select public.test_assert((select count(*)=1 from public.saved_games where name='Owner edited game'), 'owner can create, read and update game');
do $$ begin
  begin
    update public.saved_games set owner_id='00000000-0000-0000-0000-000000000001';
    raise exception 'Ownership transfer unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select public.test_assert(public.is_content_admin(auth.uid()), 'admin membership check works');
select public.test_assert((select count(*)=0 from public.saved_games), 'admin cannot read another owner game');
update public.saved_games set name='Unauthorized update';
delete from public.saved_games;
insert into public.songs(title) values ('Admin test song');
select public.test_assert((select id>67 from public.songs where title='Admin test song'), 'automatic song IDs exceed seeds');
update public.songs set title='Admin edited song' where title='Admin test song';
select public.test_assert((select count(*)=1 from public.songs where title='Admin edited song'), 'admin update works');
delete from public.songs where title='Admin edited song';
insert into public.charades_categories(slug,label) values ('test-category','Test category');
insert into public.charades_prompts(category_id,title)
 select id,'Admin test prompt' from public.charades_categories where slug='test-category';
select public.test_assert((select id>44 from public.charades_prompts where title='Admin test prompt'), 'automatic prompt IDs exceed seeds');
do $$ begin
  begin
    delete from public.charades_categories where slug='test-category';
    raise exception 'Category with prompts deletion unexpectedly succeeded';
  exception when foreign_key_violation then null; end;
end $$;
update public.charades_prompts set title='Admin edited prompt' where title='Admin test prompt';
select public.test_assert((select count(*)=1 from public.charades_prompts where title='Admin edited prompt'), 'admin prompt update works');
delete from public.charades_prompts where title='Admin edited prompt';
delete from public.charades_categories where slug='test-category';
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select public.test_assert((select count(*)=1 from public.saved_games where name='Owner edited game'), 'other owner could not edit or delete');
delete from public.saved_games where owner_id=auth.uid();
select public.test_assert((select count(*)=0 from public.saved_games), 'owner can delete game');
reset role;
rollback;
