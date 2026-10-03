# Church Camp Games — Backend Setup

The backend runs on Lovable Cloud (managed Postgres + auth). This document
covers the data model, the frontend→database ID mapping, and how to grant
content-admin access.

## Tables

| Table                 | Purpose                                                                          | Who can read        | Who can write          |
| --------------------- | -------------------------------------------------------------------------------- | ------------------- | ---------------------- |
| `songs`               | Worship songs (title, optional artist)                                           | Everyone            | Content admins         |
| `charades_categories` | Charades categories (stable slug, label)                                         | Everyone            | Content admins         |
| `charades_prompts`    | Charades prompts (title, optional detail)                                        | Everyone            | Content admins         |
| `saved_games`         | Saved game sessions (`game_type`: bingo / charades / singing-bee, JSONB `state`) | Owner only          | Owner only             |
| `content_admins`      | Users allowed to manage content                                                  | Own membership only | Privileged access only |

- All IDs are auto-generated integers, except `content_admins.user_id` and
  `saved_games.owner_id`, which are UUIDs referencing auth users.
- Content and saved-game tables carry `created_at` / `updated_at`;
  `updated_at` is maintained automatically by a trigger.
- Deleting a category that still has prompts is blocked
  (`on delete restrict`). Delete or move the prompts first.
- `saved_games.state` is prepared for Cloud sessions. Current teams, scores,
  timers, and round history are saved in the host tab's session storage;
  Cloud session saving is not connected yet.
- Charades reads its worship-song category from `songs`. Bingo and Singing Bee
  share the bundled bank in `src/data/songs.ts`; database edits do not change
  those two games yet. Do not duplicate songs into `charades_prompts`.

## ID mapping (frontend data → database)

- Songs retain the numeric portion of their permanent frontend ID:
  `song-01` → `1`, `song-67` → `67`. IDs have gaps because retired songs
  are never reassigned. The current bank contains 59 songs, including hymns.
- Categories: `bible = 1`, `songs = 2`, `church = 3`. Their slugs stay stable.
- Bible prompts: `bible-N` → `N` (1–24).
- Church prompts: `church-N` → `24 + N` (25–44).
- Charades reads categories, prompts (including `detail`), and the shared songs
  from the database when the page opens. New categories appear automatically.
  Existing prompt IDs stay compatible with tab saves; new non-song prompts use
  `charades-N`. Song IDs keep the `song-NN` form. These remain frontend strings;
  database primary keys are integers.
- The Charades content list stays fixed during a visit so a content refresh cannot
  reset a live turn. Reload between games to load edits. If loading fails or takes
  more than eight seconds, it uses the last successful list cached on this device,
  or the bundled starter list, and displays which fallback it is using.
- Acting hints are shown below revealed Charades prompts and hidden along with
  the title. Scores and timers still use tab-local saves. Other games and personal
  karaoke retain their existing content and saving behavior.
- If a saved host game cannot be restored, its stored copy is preserved until
  the host starts a fresh prompt/team turn or confirms a restart. Merely opening
  the page or renaming a team does not overwrite the failed save.

## Repairing the incomplete initial setup

The first migration seeded an outdated 40-song bank and three categories;
its schema creation succeeded. It did not seed non-song Charades prompts.
The corrective migration is
`supabase/migrations/20261003010000_complete_camp_content.sql`.
Apply this **new file** through an authorized migration runner or the Lovable
Cloud SQL editor as one transaction. Do not rerun or rewrite the original
schema migrations against an existing database.

The repair inserts the current 59-song bank and 44 prompts. It retires only
obsolete starter rows whose titles and artists are unchanged, preserving
customized records. It also makes function/sequence permissions explicit,
limits membership checks to the calling user, and adds lookup indexes.
Cloud is not updated merely by committing or pulling these files.

`supabase/seed.sql` is for databases with the repaired schema. Repeated runs
preserve existing records and admin edits, and never move identity sequences
backwards. Consequently, it fills missing starter content; it is not a
command to overwrite all live content with the source files.

## Local database verification

Install PostgreSQL (`initdb`, `pg_ctl`, and `psql` on PATH), then run
`npm run test:db`. Run as a normal local user, not root. The command creates
and removes its own temporary database on a private Unix socket; it never
reads `.env`, connects to Cloud, or accepts an external database URL.
It applies all migrations, repeats seeds, and tests public reads, admin-only
content CRUD, owner-only saved-game CRUD, foreign keys and generated IDs.
The auth schema in `supabase/tests/bootstrap.sql` is a minimal test fixture,
not a substitute for testing deployed Supabase authentication.

## Local development redirects

Check the Cloud authentication settings before wiring up login. Keep the
production URLs and add `http://localhost:5173/**` and
`http://127.0.0.1:5173/**` as additional redirect URLs. These settings are not
proven by the migration files and still need verification in Cloud.

## Granting content-admin access

Memberships are never created through the app — there are no client write
policies on `content_admins`, and signups are never auto-promoted. To grant
a future authenticated user content-admin access:

1. Have the user sign up / sign in once so their account exists.
2. Open the Lovable Cloud dashboard → Database → `content_admins`.
3. Insert a row with the user's UUID (find it under Cloud → Users).

Equivalently, run this SQL in the Cloud SQL editor:

```sql
insert into public.content_admins (user_id)
values ('<user-uuid>')
on conflict (user_id) do nothing;
```

To revoke access, delete the row.

## Environment variables

See `.env.example` for the public connection variables
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
`VITE_SUPABASE_PROJECT_ID`). Secret keys are never stored in the repo.

## Personal karaoke and song metadata

`20261003020000_song_metadata_and_setlists.sql` is a separate new migration,
following the content repair. It has been tested locally; it must be applied
in Cloud before Cloud karaoke CRUD is implemented. Do not rerun the content
repair just to add these fields.

The public song catalog gains only `genre`, `tags`, `release_year`, and `bpm`.
Unknown genre/year/BPM stays null; tags defaults to an empty array. Year and
BPM refer to the recording/version represented by that song, not an assumed
original composition date or a live arrangement. The starter bank is explicitly categorized as Worship; year and BPM are not guessed. BPM supports two decimal places and values greater than 0
up to 400. Ratings are never placed on the publicly readable songs table.

Private tables:

- `song_ratings`: one 1–5 rating per owner/song; removing the row means unrated.
- `setlists`: owner and name, with generated integer IDs.
- `setlist_items`: song and zero-based position in a setlist. Repeats are allowed.
  Position is unique within a setlist, checked at transaction end so swaps
  can be atomic. Item access follows the owning setlist's RLS policy.

Deleting a setlist removes its items. Deleting a song used by a Cloud setlist
is blocked until references are removed. Song ratings cascade on song deletion.
Other users, including content admins, cannot access someone else's ratings
or setlists through the normal client.

The `/karaoke` page currently works **on the current device** using a separate,
validated local library initialized from the 59 starter songs. Personal edits,
ratings, and additional songs do not alter camp games or the live public catalog.
JSON export/import backs up the entire personal library; replacement requires
confirmation and invalid files are rejected. Cloud sync/auth is still pending;
local IDs must be mapped to Cloud-generated IDs when implementing import/sync,
rather than assuming newly added local IDs are free in the Cloud catalog.

Taste comparisons show average ratings and sample sizes by genre, tag, decade,
or tempo (under 80 / 80–119 / 120+ BPM). Only rated songs with relevant metadata
participate; multiple distinct tags place a song in multiple groups. These are
summaries of explicit ratings, not listening-history analytics.

## Worship genre backfill

After the metadata migration, apply
`20261003030000_backfill_worship_genre.sql` to categorize the 59 starter songs
as `Worship`. It fills only blank genres on matching starter IDs/titles,
preserving custom genres, renamed records, additional songs, and tags.
Repeated seeds apply the same rule. Existing local karaoke libraries receive
the same backfill on load, preserving ratings and setlists. No redundant
worship tag is added; hymn and mood tags can be curated later.
