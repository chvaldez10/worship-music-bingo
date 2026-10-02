import type { Song } from "@/data/songs";
import { validateSongs } from "@/data/songs";

/** Recover only known, unique IDs, preserving their original call order. */
export function restoreCalled(songs: readonly Song[], saved: unknown): string[] {
  const ids = new Set(songs.map((song) => song.id));
  return Array.isArray(saved)
    ? [...new Set(saved.filter((id): id is string => typeof id === "string" && ids.has(id)))]
    : [];
}

/** Called song IDs in order; last one is "now playing". */
export function drawNext(songs: readonly Song[], called: readonly string[]): string | null {
  validateSongs(songs);
  const remaining = songs.filter((s) => !called.includes(s.id));
  if (!remaining.length) return null;
  return remaining[Math.floor(Math.random() * remaining.length)]?.id ?? null;
}
