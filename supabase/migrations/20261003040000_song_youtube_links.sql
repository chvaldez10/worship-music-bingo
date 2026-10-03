-- One optional video link per song; unknown links remain NULL.
alter table public.songs
  add column youtube_url text
  constraint songs_youtube_url_check check (
    youtube_url is null or (
      length(youtube_url) between 1 and 2048
      and youtube_url ~ '^https://(youtu[.]be/[A-Za-z0-9_-]{11}([?#].*)?|((www|m|music)[.])?youtube[.]com/(watch[?]([^#]*&)?v=[A-Za-z0-9_-]{11}(&[^#]*)?(#.*)?|(shorts|live|embed)/[A-Za-z0-9_-]{11}/?([?#].*)?))$'
    )
  );
