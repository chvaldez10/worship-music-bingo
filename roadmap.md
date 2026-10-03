# Roadmap

- [x] Print: separate card count from per-page layout (1/2/4)
- [ ] Verify print fix (build + PDF layout)
- [ ] Enable Lovable Cloud backend per uploaded spec:
  - [ ] Enable Cloud
  - [ ] Tables: songs, charades_categories, charades_prompts, saved_games, content_admins (int IDs, UUID auth refs, created_at/updated_at)
  - [ ] RLS: public read content; content_admins write; saved_games owner-only; content_admins read-own only
  - [ ] Idempotent seed from src/data/songs.ts (song-58 → 58) and src/data/game-prompts.ts (slugs bible/songs/church); IDs continue above seeds
  - [ ] Generate client, TS types, versioned migrations, seed files, .env.example (public vars only)
  - [ ] Auth redirects for localhost:5173 and 127.0.0.1:5173 (keep production URLs)
  - [ ] Document string→int ID mapping and how to grant content-admin access
  - [ ] Sync setup files to connected GitHub repo
  - [ ] Do NOT touch UI/gameplay/realtime/frontend ID types
