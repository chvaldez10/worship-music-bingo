import type { Song } from "@/data/songs";

/** Called song IDs in order; last one is "now playing". */
export function drawNext(songs: readonly Song[], called: readonly string[]): string | null {
  const remaining = songs.filter((s) => !called.includes(s.id));
  if (!remaining.length) return null;
  return remaining[Math.floor(Math.random() * remaining.length)]?.id ?? null;
}
