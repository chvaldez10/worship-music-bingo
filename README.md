# Worship Music Bingo

A client-side worship music bingo game built with React, TypeScript, Tailwind CSS, and TanStack Start. The existing TanStack shell handles routing and rendering; game state requires no backend services.

## Run locally

Use Node.js 22.12+ and Bun with the committed lockfile:

```sh
bun install --frozen-lockfile
bun run dev
```

Open the local URL shown in the terminal. With npm, use `npm install` and `npm run dev`. If npm 10 fails during peer dependency resolution, use `npm install --legacy-peer-deps`.

## Pages

- `/play`: tap songs to mark or unmark them. FREE stays marked. Completed rows, columns, and diagonals are highlighted. Reset marks, generate a new card, or print the current card.
- `/caller`: draw songs without repeats, undo the last call, and restart with confirmation. Progress is saved in this browser when local storage is available.
- `/print`: generate 1, 5, 10, 20, 25, or 50 unique cards, or enter a whole number from 1 to 500. Every card has 24 songs and a centered FREE square. Choose 1, 2, or 4 cards per printed page without changing the generated combinations.

## Print or save a PDF

Generate cards and choose **Print / Save as PDF**, or use **Print Card** on the player page. In the browser print dialog, choose a printer or **Save as PDF**. The print layout uses US Letter, 0.4-inch margins, and your selected 1, 2, or 4 cards per page. Player cards print one per page. Use 100% scale and turn browser headers and footers off for the cleanest output.

## Customize songs

Edit `src/data/songs.ts`, the shared source for all three pages. The included list has 49 songs. Each song needs a non-empty, unique ID and a title; artist is optional. Matching titles with different IDs are allowed. Cards require at least 24 songs, and invalid song data produces a visible message.

Player cards and print batches are temporary. Caller progress is stored only on this device; there is no multiplayer synchronization.

## Checks

```sh
bun run test
bun run lint
bunx tsc --noEmit
bun run build
```

Equivalent npm commands are `npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run build`.

## Lovable

This project is connected to [Lovable](https://lovable.dev/projects/411af47c-69df-4586-b643-c90730a3f717). Preserve published Git history. Changes pushed to the connected branch sync back to the Lovable editor.
