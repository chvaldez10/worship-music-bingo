import type { Song } from "@/data/songs";
import { validateSongs } from "@/data/songs";

export const FREE_INDEX = 12;
export type Cell = { kind: "song"; song: Song } | { kind: "free" };

/** Fisher-Yates shuffle; returns a new array. */
export function shuffleSongs<T>(items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

/** 25 cells: 24 unique random songs with FREE at index 12. */
export function createBingoCard(songs: readonly Song[]): Cell[] {
  validateSongs(songs);
  if (songs.length < 24)
    throw new Error(
      "At least 24 songs are needed to make a card. Add songs to the master song list.",
    );
  const picked = shuffleSongs(songs).slice(0, 24);
  const cells: Cell[] = picked.map((song) => ({ kind: "song", song }));
  cells.splice(FREE_INDEX, 0, { kind: "free" });
  return cells;
}

export const MAX_PRINT_CARDS = 500;

export function cardSignature(cells: readonly Cell[]): string {
  return JSON.stringify(cells.map((cell) => (cell.kind === "free" ? null : cell.song.id)));
}

/** Generate an entire batch or fail clearly, never return a partial batch. */
export function createBingoBatch(songs: readonly Song[], count: number): Cell[][] {
  if (!Number.isInteger(count) || count < 1 || count > MAX_PRINT_CARDS) {
    throw new Error(`Enter a whole number from 1 to ${MAX_PRINT_CARDS} cards.`);
  }
  const cards: Cell[][] = [];
  const signatures = new Set<string>();
  for (let attempts = 0; cards.length < count && attempts < count * 100; attempts++) {
    const card = createBingoCard(songs);
    const signature = cardSignature(card);
    if (!signatures.has(signature)) {
      signatures.add(signature);
      cards.push(card);
    }
  }
  if (cards.length !== count)
    throw new Error("Could not generate enough unique cards. Try generating the batch again.");
  return cards;
}

export const LINES: number[][] = (() => {
  const l: number[][] = [];
  for (let r = 0; r < 5; r++) l.push([0, 1, 2, 3, 4].map((c) => r * 5 + c));
  for (let c = 0; c < 5; c++) l.push([0, 1, 2, 3, 4].map((r) => r * 5 + c));
  l.push([0, 6, 12, 18, 24], [4, 8, 12, 16, 20]);
  return l;
})();

/** Returns every completed line (arrays of cell indices). */
export function detectBingo(marked: readonly boolean[]): number[][] {
  return LINES.filter((line) => line.every((i) => marked[i]));
}

export function initialMarks(): boolean[] {
  return Array.from({ length: 25 }, (_, i) => i === FREE_INDEX);
}
