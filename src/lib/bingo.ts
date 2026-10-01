import type { Song } from "@/data/songs";

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
  if (songs.length < 24) throw new Error("Need at least 24 songs");
  const picked = shuffleSongs(songs).slice(0, 24);
  const cells: Cell[] = picked.map((song) => ({ kind: "song", song }));
  cells.splice(FREE_INDEX, 0, { kind: "free" });
  return cells;
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
