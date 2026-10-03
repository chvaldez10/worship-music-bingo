-- Idempotent seed for Church Camp Games content.
-- Safe to run repeatedly; uses ON CONFLICT upserts and resets identity
-- sequences so auto-generated IDs continue above the seeded IDs.
--
-- ID mapping from the frontend data files:
--   src/data/songs.ts  "song-01".."song-40"  ->  songs.id 1..40
--   charades categories keep their permanent slugs: bible=1, songs=2, church=3
--
-- NOTE: src/data/game-prompts.ts is not present in this repository yet, so
-- non-song charades prompts are not seeded here. Add them in a follow-up
-- seed once that data file exists. Singing Bee and the "songs" charades
-- category intentionally share the songs table — do not duplicate songs
-- into charades_prompts.

insert into public.songs (id, title, artist) values
  (1, 'Goodness of God', 'Bethel Music / Jenn Johnson'),
  (2, 'Holy Forever', 'Chris Tomlin'),
  (3, 'Gratitude', 'Brandon Lake'),
  (4, 'Great Are You Lord', 'All Sons & Daughters'),
  (5, 'Build My Life', 'Pat Barrett'),
  (6, 'Trust in God', 'Elevation Worship'),
  (7, 'Firm Foundation (He Won''t)', 'Cody Carnes'),
  (8, 'Living Hope', 'Phil Wickham'),
  (9, 'King of Kings', 'Hillsong Worship'),
  (10, 'Who Else', 'Gateway Worship'),
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
  (22, 'House of the Lord', 'Phil Wickham'),
  (23, 'Same God', 'Elevation Worship'),
  (24, 'Graves Into Gardens', 'Elevation Worship'),
  (25, 'Egypt', 'Bethel Music / Cory Asbury'),
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
  (40, 'Amazing Grace (My Chains Are Gone)', 'Chris Tomlin')
on conflict (id) do update
  set title = excluded.title,
      artist = excluded.artist;

select setval(pg_get_serial_sequence('public.songs', 'id'), 40, true);

insert into public.charades_categories (id, slug, label) values
  (1, 'bible', 'Bible'),
  (2, 'songs', 'Songs'),
  (3, 'church', 'Church')
on conflict (id) do update
  set slug = excluded.slug,
      label = excluded.label;

select setval(pg_get_serial_sequence('public.charades_categories', 'id'), 3, true);
