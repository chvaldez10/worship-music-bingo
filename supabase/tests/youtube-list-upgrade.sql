-- Fixture before the list migration: verify a stored scalar survives the upgrade.
update public.songs set youtube_url = 'https://youtu.be/abcdefghijk?si=share' where id = 1;
do $$ begin
  if (select youtube_url from public.songs where id = 1) is distinct from 'https://youtu.be/abcdefghijk?si=share' then
    raise exception 'Single-link upgrade fixture was not created';
  end if;
end $$;
