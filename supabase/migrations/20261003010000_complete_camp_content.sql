-- Repair the incomplete initial setup without rewriting applied migrations.
-- Function grants are explicit; do not depend on project default privileges.
create or replace function public.is_content_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select _user_id = auth.uid() and exists (
    select 1 from public.content_admins where user_id = _user_id
  )
$$;
revoke all on function public.is_content_admin(uuid) from public, anon;
grant execute on function public.is_content_admin(uuid) to authenticated, service_role;
revoke all on public.content_admins from anon, authenticated;
grant select on public.content_admins to authenticated;
grant usage, select on sequence public.songs_id_seq, public.charades_categories_id_seq,
  public.charades_prompts_id_seq, public.saved_games_id_seq to authenticated, service_role;

create index if not exists saved_games_owner_id_idx on public.saved_games(owner_id);
create index if not exists charades_prompts_category_id_idx on public.charades_prompts(category_id);

-- Retire only unchanged obsolete starter rows; preserve any admin edits.
delete from public.songs where (id, title, artist) in (
  (3, 'Gratitude', 'Brandon Lake'),
  (6, 'Trust in God', 'Elevation Worship'),
  (10, 'Who Else', 'Gateway Worship'),
  (22, 'House of the Lord', 'Phil Wickham'),
  (23, 'Same God', 'Elevation Worship'),
  (24, 'Graves Into Gardens', 'Elevation Worship'),
  (25, 'Egypt', 'Bethel Music / Cory Asbury'),
  (46, 'Jireh', 'Elevation Worship / Maverick City Music')
);

-- Correct initial placeholder labels only when they have not been customized.
update public.charades_categories set label = case slug
  when 'bible' then 'Bible events' when 'songs' then 'Worship songs'
  when 'church' then 'Church activities' end
where (slug, label) in (('bible', 'Bible'), ('songs', 'Songs'), ('church', 'Church'));

-- Canonical starter content. Re-running preserves content edited by admins.
-- Songs keep the numeric portion of song-NN; retired IDs are never reassigned.
-- Categories: bible=1, songs=2, church=3.
-- Prompts: bible-N -> N (1..24); church-N -> 24+N (25..44).
-- Run the entire file as one transaction. No song prompts are duplicated.

insert into public.songs (id, title, artist) values
  (1, 'Goodness of God', 'Bethel Music / Jenn Johnson'),
  (2, 'Holy Forever', 'Chris Tomlin'),
  (50, 'Revelation Song', 'Kari Jobe'),
  (4, 'Great Are You Lord', 'All Sons & Daughters'),
  (5, 'Build My Life', 'Pat Barrett'),
  (51, 'The Heart of Worship', 'Matt Redman'),
  (7, 'Firm Foundation (He Won''t)', 'Cody Carnes'),
  (8, 'Living Hope', 'Phil Wickham'),
  (9, 'King of Kings', 'Hillsong Worship'),
  (52, 'Lord I Lift Your Name on High', 'Rick Founds'),
  (11, 'What a Beautiful Name', 'Hillsong Worship'),
  (12, 'Way Maker', 'Sinach'),
  (13, 'How Great Is Our God', 'Chris Tomlin'),
  (14, '10,000 Reasons (Bless the Lord)', 'Matt Redman'),
  (15, 'Oceans (Where Feet May Fail)', 'Hillsong UNITED'),
  (16, 'This Is Amazing Grace', 'Phil Wickham'),
  (17, 'Cornerstone', 'Hillsong Worship'),
  (18, 'Lord I Need You', 'Matt Maher'),
  (19, 'Reckless Love', 'Cory Asbury'),
  (20, 'Battle Belongs', 'Phil Wickham'),
  (21, 'Raise a Hallelujah', 'Bethel Music'),
  (53, 'Trading My Sorrows', 'Darrell Evans'),
  (54, 'In Christ Alone', 'Keith Getty / Stuart Townend'),
  (55, 'You Are My All in All', 'Dennis Jernigan'),
  (56, 'As the Deer', 'Martin Nystrom'),
  (26, 'Praise', 'Elevation Worship'),
  (27, 'The Blessing', 'Kari Jobe / Elevation Worship'),
  (28, 'Here I Am to Worship', 'Tim Hughes'),
  (29, 'How He Loves', 'David Crowder Band'),
  (30, 'Mighty to Save', 'Hillsong Worship'),
  (31, 'Forever', 'Chris Tomlin'),
  (32, 'Blessed Be Your Name', 'Matt Redman'),
  (33, 'Our God', 'Chris Tomlin'),
  (34, 'God of Wonders', 'Third Day'),
  (35, 'Open the Eyes of My Heart', 'Paul Baloche'),
  (36, 'Shout to the Lord', 'Darlene Zschech'),
  (37, 'Above All', 'Michael W. Smith'),
  (38, 'Indescribable', 'Chris Tomlin'),
  (39, 'Hosanna', 'Hillsong UNITED'),
  (40, 'Amazing Grace (My Chains Are Gone)', 'Chris Tomlin'),
  (41, 'Glorious Day', 'Passion / Kristian Stanfill'),
  (42, 'Good Good Father', 'Chris Tomlin'),
  (43, 'Christ Is Enough', 'Hillsong Worship'),
  (44, 'The Stand', 'Hillsong UNITED'),
  (45, 'Every Praise', 'Hezekiah Walker'),
  (57, 'Days of Elijah', 'Robin Mark'),
  (47, 'Promises', 'Maverick City Music'),
  (48, 'See a Victory', 'Elevation Worship'),
  (49, 'I Speak Jesus', 'Charity Gayle'),
  (58, 'How Great Thou Art', null),
  (59, 'Great Is Thy Faithfulness', null),
  (60, 'Blessed Assurance', null),
  (61, 'It Is Well with My Soul', null),
  (62, 'Holy, Holy, Holy', null),
  (63, 'To God Be the Glory', null),
  (64, 'What a Friend We Have in Jesus', null),
  (65, 'The Old Rugged Cross', null),
  (66, 'Because He Lives', null),
  (67, 'I Surrender All', null)
on conflict (id) do nothing;

insert into public.charades_categories (id, slug, label) values
  (1, 'bible', 'Bible events'),
  (2, 'songs', 'Worship songs'),
  (3, 'church', 'Church activities')
on conflict (id) do nothing;

insert into public.charades_prompts (id, category_id, title, detail) values
  (1, 1, 'Noah building the ark', null),
  (2, 1, 'David facing Goliath', null),
  (3, 1, 'Moses parting the Red Sea', null),
  (4, 1, 'Daniel in the lions'' den', null),
  (5, 1, 'Jonah and the great fish', null),
  (6, 1, 'Jesus feeding the five thousand', null),
  (7, 1, 'Jesus walking on water', null),
  (8, 1, 'The birth of Jesus', null),
  (9, 1, 'The good Samaritan helping a traveler', null),
  (10, 1, 'The prodigal son returning home', null),
  (11, 1, 'Zacchaeus climbing a tree', null),
  (12, 1, 'Joshua and the walls of Jericho', null),
  (13, 1, 'Jesus calming the storm', null),
  (14, 1, 'The disciples casting their nets', null),
  (15, 1, 'Jesus washing the disciples'' feet', null),
  (16, 1, 'The wise men following the star', null),
  (17, 1, 'Moses and the burning bush', null),
  (18, 1, 'Adam and Eve in the garden', null),
  (19, 1, 'Joseph interpreting dreams', null),
  (20, 1, 'Jesus turning water into wine', null),
  (21, 1, 'The lost sheep being found', null),
  (22, 1, 'Peter being freed from prison', null),
  (23, 1, 'The resurrection of Jesus', null),
  (24, 1, 'Ruth gathering grain', null),
  (25, 3, 'Leading worship', null),
  (26, 3, 'Playing the drums', null),
  (27, 3, 'Singing in the choir', null),
  (28, 3, 'Reading the Bible', null),
  (29, 3, 'Teaching Sunday school', null),
  (30, 3, 'Welcoming visitors', null),
  (31, 3, 'Setting up chairs', null),
  (32, 3, 'Passing the offering basket', null),
  (33, 3, 'Praying together', null),
  (34, 3, 'Going to church camp', null),
  (35, 3, 'Serving at a food pantry', null),
  (36, 3, 'Preparing a church potluck', null),
  (37, 3, 'Being baptized', null),
  (38, 3, 'Decorating for Christmas', null),
  (39, 3, 'Running the sound board', null),
  (40, 3, 'Leading a small group', null),
  (41, 3, 'Cleaning the church', null),
  (42, 3, 'Handing out bulletins', null),
  (43, 3, 'Practicing a worship song', null),
  (44, 3, 'Playing a camp game', null)
on conflict (id) do nothing;

-- Never move the sequence backwards, including after deleted records.
select setval(pg_get_serial_sequence('public.songs', 'id'),
  greatest((select coalesce(max(id), 1) from public.songs),
           (select last_value from public.songs_id_seq)), true);

-- Never move the sequence backwards, including after deleted records.
select setval(pg_get_serial_sequence('public.charades_categories', 'id'),
  greatest((select coalesce(max(id), 1) from public.charades_categories),
           (select last_value from public.charades_categories_id_seq)), true);

-- Never move the sequence backwards, including after deleted records.
select setval(pg_get_serial_sequence('public.charades_prompts', 'id'),
  greatest((select coalesce(max(id), 1) from public.charades_prompts),
           (select last_value from public.charades_prompts_id_seq)), true);

-- Never move the sequence backwards, including after deleted records.
select setval(pg_get_serial_sequence('public.saved_games', 'id'),
  greatest((select coalesce(max(id), 1) from public.saved_games),
           (select last_value from public.saved_games_id_seq)), true);
