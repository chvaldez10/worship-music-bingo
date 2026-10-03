# Church Camp Games — Backend Setup

The backend runs on Lovable Cloud (managed Postgres + auth). This document
covers the data model, the frontend→database ID mapping, and how to grant
content-admin access.

## Tables

| Table | Purpose | Who can read | Who can write |
| --- | --- | --- | --- |
| `songs` | Worship songs (title, optional artist) | Everyone | Content admins |
| `charades_categories` | Charades categories (stable slug, label) | Everyone | Content admins |
| `charades_prompts` | Charades prompts (title, optional detail) | Everyone | Content admins |
| `saved_games` | Saved game sessions (`game_type`: bingo / charades / singing-bee, JSONB `state`) | Owner only | Owner only |
| `content_admins` | Users allowed to manage content | Own membership only | Privileged access only |

- All IDs are auto-generated integers, except `content_admins.user_id` and
  `saved_games.owner_id`, which are UUIDs referencing auth users.
- Content and saved-game tables carry `created_at` / `updated_at`;
  `updated_at` is maintained automatically by a trigger.
- Deleting a category that still has prompts is blocked
  (`on delete restrict`). Delete or move the prompts first.
- Teams, scores, timers, and round history live in `saved_games.state` —
  no separate tables yet.
- Singing Bee and the "songs" Charades category share the `songs` table.
  Do not duplicate songs into `charades_prompts`.

## ID mapping (frontend data → database)

- `src/data/songs.ts`: the numeric portion of each string ID is preserved —
  `song-01` → `songs.id = 1`, …, `song-40` → `songs.id = 40`.
- Charades categories keep permanent integer IDs and slugs:
  `bible = 1`, `songs = 2`, `church = 3`.
- `src/data/game-prompts.ts` is not present in this repository yet, so
  non-song charades prompts are not seeded. When that file lands, seed its
  prompts with explicit integer IDs in a follow-up migration/seed and reset
  the identity sequence above the highest seeded ID.

## Seeding

- The initial migration already seeded songs 1–40 and categories 1–3.
- `supabase/seed.sql` contains the same idempotent seed for fresh
  environments. It is safe to run repeatedly (upserts + sequence resets).

## Local development redirects

Sign-in redirects for `http://localhost:5173` and `http://127.0.0.1:5173`
are allowed in addition to the production URLs, so the external frontend
refactor can run against this backend from a local dev server.

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
