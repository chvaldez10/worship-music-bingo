import seed from "../../supabase/seed.sql?raw";
import { describe, expect, it } from "vitest";
import { SONGS, validateSongs } from "@/data/songs";
import { charadesPrompts } from "@/data/game-prompts";

const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
describe("Database starter content", () => {
  it("matches every song and keeps each permanent numeric ID", () => {
    validateSongs(SONGS);
    for (const song of SONGS) {
      const id = Number(song.id.replace("song-", ""));
      expect(Number.isSafeInteger(id) && id > 0).toBe(true);
      expect(seed).toContain(
        `(${id}, ${quote(song.title)}, ${song.artist ? quote(song.artist) : "null"})`,
      );
    }
    const rows = seed
      .split("insert into public.songs (id, title, artist) values\n")[1]!
      .split("on conflict")[0]!;
    expect(rows.trim().split("\n")).toHaveLength(SONGS.length);
  });
  it("maps Bible and church prompts to separate integer ranges without duplicating songs", () => {
    for (const [category, categoryId, offset] of [
      ["bible", 1, 0],
      ["church", 3, 24],
    ] as const) {
      for (const [i, prompt] of charadesPrompts(category).entries()) {
        expect(seed).toContain(`(${offset + i + 1}, ${categoryId}, ${quote(prompt.title)}, null)`);
      }
    }
    const rows = seed
      .split("insert into public.charades_prompts (id, category_id, title, detail) values\n")[1]!
      .split("on conflict")[0]!;
    expect(rows.trim().split("\n")).toHaveLength(44);
  });
});
