-- Preserve each existing video link in an ordered list; songs without links use [].
alter table public.songs
  add column youtube_urls text[] not null default '{}';

update public.songs
set youtube_urls = array[youtube_url]
where youtube_url is not null;

create function public.valid_song_youtube_urls(urls text[])
returns boolean
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select coalesce(array_ndims(urls), 1) = 1
    and cardinality(urls) <= 20
    and not exists (
      select 1 from unnest(urls) as entries(url)
      where url is null
        or length(url) not between 1 and 2048
        or url !~ '^https://(youtu[.]be/[A-Za-z0-9_-]{11}([?#].*)?|((www|m|music)[.])?youtube[.]com/(watch[?]([^#]*&)?v=[A-Za-z0-9_-]{11}(&[^#]*)?(#.*)?|(shorts|live|embed)/[A-Za-z0-9_-]{11}/?([?#].*)?))$'
    );
$$;

alter table public.songs
  add constraint songs_youtube_urls_check
    check (public.valid_song_youtube_urls(youtube_urls)),
  drop column youtube_url;
