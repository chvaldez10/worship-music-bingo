begin;
do $$ begin
  if (select count(*) from public.songs) <> 59
    or (select count(*) from public.songs where youtube_urls = '{}') <> 58
    or (select youtube_urls from public.songs where id = 1) is distinct from array['https://youtu.be/abcdefghijk?si=share'] then
    raise exception 'List migration did not preserve songs and the existing video link';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'songs' and column_name = 'youtube_url') then
    raise exception 'Obsolete scalar link column still exists';
  end if;
end $$;

update public.songs set youtube_urls = array[
  'https://youtu.be/abcdefghijk?si=share',
  'https://www.youtube.com/watch?list=playlist&v=lmnopqrstuv&t=30',
  'https://music.youtube.com/watch?v=abcdefghijk',
  'https://www.youtube.com/shorts/abcdefghijk'
] where id = 1;
do $$ begin
  if (select youtube_urls[2] from public.songs where id = 1) <> 'https://www.youtube.com/watch?list=playlist&v=lmnopqrstuv&t=30' then
    raise exception 'Video list order was not retained';
  end if;
end $$;

do $$ declare link text; begin
  foreach link in array array[
    'javascript:alert(1)', 'https://youtube.com.evil.example/watch?v=abcdefghijk',
    'https://user:password@youtube.com/watch?v=abcdefghijk', 'https://www.youtube.com/watch?v=short', '', null
  ] loop
    begin
      update public.songs set youtube_urls = array['https://youtu.be/abcdefghijk', link] where id = 1;
      raise exception 'Invalid YouTube list entry accepted: %', link;
    exception when check_violation then null;
    end;
  end loop;
  begin
    update public.songs set youtube_urls = array_fill('https://youtu.be/abcdefghijk'::text, array[21]) where id = 1;
    raise exception 'Oversized video list accepted';
  exception when check_violation then null;
  end;
  begin
    update public.songs set youtube_urls = array[['https://youtu.be/abcdefghijk']] where id = 1;
    raise exception 'Multidimensional video list accepted';
  exception when check_violation then null;
  end;
  begin
    update public.songs set youtube_urls = null where id = 1;
    raise exception 'NULL video list accepted';
  exception when not_null_violation then null;
  end;
end $$;
update public.songs set youtube_urls = '{}' where id = 1;
insert into public.songs (title) values ('Song without links');
do $$ begin
  if (select youtube_urls from public.songs where title = 'Song without links') is distinct from '{}'::text[] then
    raise exception 'New songs do not default to an empty video list';
  end if;
end $$;
rollback;
