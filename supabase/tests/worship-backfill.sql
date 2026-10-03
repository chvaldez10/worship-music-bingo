begin;
create function public.test_assert(condition boolean, message text)
returns void language plpgsql as $$ begin
 if condition is distinct from true then raise exception 'Test failed: %', message; end if;
end $$;
select public.test_assert((select count(*) = 59 from public.songs where genre='Worship'), 'all canonical songs categorized');
update public.songs set genre=null where id=1;
update public.songs set genre='Gospel',tags=array['favorite'] where id=2;
update public.songs set title='Customized title',genre=null where id=4;
insert into public.songs(title) values ('Personal addition');
\ir ../migrations/20261003030000_backfill_worship_genre.sql
\ir ../migrations/20261003030000_backfill_worship_genre.sql
select public.test_assert((select genre='Worship' from public.songs where id=1), 'blank starter genre filled');
select public.test_assert((select genre='Gospel' and tags=array['favorite'] from public.songs where id=2), 'custom genre and tags preserved');
select public.test_assert((select genre is null from public.songs where id=4), 'renamed song not categorized');
select public.test_assert((select genre is null from public.songs where title='Personal addition'), 'new song not categorized');
rollback;
