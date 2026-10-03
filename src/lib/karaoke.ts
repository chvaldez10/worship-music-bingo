import { z } from "zod";
import { SONGS } from "@/data/songs";

const integerId = z.number().int().positive().max(2147483647);

export class KaraokeConflictError extends Error {}

export const karaokeSongSchema = z.object({
  id: integerId,
  title: z.string().trim().min(1).max(200),
  artist: z.string().trim().max(200).default(""),
  genre: z.string().trim().max(80).default(""),
  tags: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  releaseYear: z.number().int().min(1000).max(2100).nullable().default(null),
  bpm: z.number().positive().max(400).nullable().default(null),
  rating: z.number().int().min(1).max(5).nullable().default(null),
});
const setlistSchema = z.object({
  id: integerId,
  name: z.string().trim().min(1).max(120),
  songIds: z.array(integerId).max(500),
});
export const karaokeLibrarySchema = z
  .object({
    version: z.literal(1),
    songs: z.array(karaokeSongSchema).max(10000),
    setlists: z.array(setlistSchema).max(500),
  })
  .superRefine((library, context) => {
    const songIds = new Set(library.songs.map((song) => song.id));
    if (
      songIds.size !== library.songs.length ||
      new Set(library.setlists.map((list) => list.id)).size !== library.setlists.length
    ) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Duplicate IDs in library." });
    }
    if (library.setlists.some((list) => list.songIds.some((id) => !songIds.has(id)))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A setlist references a missing song.",
      });
    }
  });
export type KaraokeSong = z.infer<typeof karaokeSongSchema>;
export type KaraokeLibrary = z.infer<typeof karaokeLibrarySchema>;
export const KARAOKE_STORAGE_KEY = "personal-karaoke-v1";
export function starterLibrary(): KaraokeLibrary {
  return {
    version: 1,
    songs: SONGS.map((song) =>
      karaokeSongSchema.parse({
        ...song,
        id: Number(song.id.replace("song-", "")),
      }),
    ),
    setlists: [],
  };
}
/** Fill missing genres only for records that still match the original camp songs. */
export function backfillWorshipGenre(library: KaraokeLibrary): KaraokeLibrary {
  const originals = new Map(
    SONGS.map((song) => [Number(song.id.replace("song-", "")), song.title]),
  );
  let changed = false;
  const songs = library.songs.map((song) => {
    if (!song.genre.trim() && originals.get(song.id) === song.title) {
      changed = true;
      return { ...song, genre: "Worship" };
    }
    return song;
  });
  return changed ? { ...library, songs } : library;
}
export function nextId(items: readonly { id: number }[]): number {
  return Math.max(0, ...items.map((item) => item.id)) + 1;
}
export function moveSong(ids: readonly number[], index: number, direction: -1 | 1): number[] {
  const copy = [...ids];
  const target = index + direction;
  if (index < 0 || index >= copy.length || target < 0 || target >= copy.length) return copy;
  [copy[index], copy[target]] = [copy[target]!, copy[index]!];
  return copy;
}
export function tasteSummary(
  songs: readonly KaraokeSong[],
  dimension: "genre" | "decade" | "tempo" | "tag",
) {
  const groups = new Map<string, { total: number; count: number }>();
  for (const song of songs) {
    if (song.rating === null) continue;
    let labels: string[] = [];
    if (dimension === "genre" && song.genre) labels = [song.genre.toLocaleLowerCase()];
    if (dimension === "tag") labels = [...new Set(song.tags.map((tag) => tag.toLocaleLowerCase()))];
    if (dimension === "decade" && song.releaseYear !== null)
      labels = [`${Math.floor(song.releaseYear / 10) * 10}s`];
    if (dimension === "tempo" && song.bpm !== null)
      labels = [song.bpm < 80 ? "Under 80 BPM" : song.bpm < 120 ? "80–119 BPM" : "120+ BPM"];
    for (const label of labels) {
      const group = groups.get(label) ?? { total: 0, count: 0 };
      groups.set(label, { total: group.total + song.rating, count: group.count + 1 });
    }
  }
  return [...groups]
    .map(([label, { total, count }]) => ({ label, count, average: total / count }))
    .sort((a, b) => b.average - a.average || b.count - a.count || a.label.localeCompare(b.label));
}
