import { z } from "zod";

export const GUESS_SONG_STORAGE_KEY = "camp-guess-the-song-v1";
export const MAX_GUESS_SONG_SCORE = 9999;
export const guessSongSchema = z.object({
  version: z.literal(1),
  teamCount: z.number().int().min(1).max(8),
  teams: z
    .array(
      z.object({
        id: z.number().int().min(1).max(8),
        name: z.string().max(40),
        score: z.number().int().min(0).max(MAX_GUESS_SONG_SCORE),
      }),
    )
    .length(8)
    .refine((teams) => teams.every((team, index) => team.id === index + 1)),
});
export type GuessSongState = z.infer<typeof guessSongSchema>;

export function initialGuessSongState(): GuessSongState {
  return {
    version: 1,
    teamCount: 2,
    // Keep inactive teams so adjusting the count never discards their scores.
    teams: Array.from({ length: 8 }, (_, index) => ({
      id: index + 1,
      name: `Team ${index + 1}`,
      score: 0,
    })),
  };
}
