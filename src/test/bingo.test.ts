import { afterEach, describe, expect, it, vi } from "vitest";
import { SONGS } from "@/data/songs";
import {
  cardSignature,
  createBingoBatch,
  createBingoCard,
  detectBingo,
  FREE_INDEX,
  initialMarks,
  LINES,
} from "@/lib/bingo";
import { drawNext, restoreCalled } from "@/lib/caller";

afterEach(() => vi.restoreAllMocks());

describe("Card generation", () => {
  it.each([24, 40])("builds a valid board from %i songs", (count) => {
    const card = createBingoCard(SONGS.slice(0, count));
    expect(card).toHaveLength(25);
    expect(card[FREE_INDEX]).toEqual({ kind: "free" });
    const ids = card.flatMap((cell) => (cell.kind === "song" ? [cell.song.id] : []));
    expect(new Set(ids).size).toBe(24);
  });
  it("rejects insufficient songs and duplicate IDs", () => {
    expect(() => createBingoCard(SONGS.slice(0, 23))).toThrow("At least 24");
    expect(() => createBingoCard([...SONGS, SONGS[0]!])).toThrow("Duplicate song ID");
  });
  it("accepts identical titles with distinct IDs", () => {
    const songs = SONGS.slice(0, 24).map((song) => ({ ...song, title: "Same title" }));
    expect(createBingoCard(songs)).toHaveLength(25);
  });
  it.each([1, 5, 10, 20, 25, 50, 500])("generates %i unique cards", (count) => {
    const cards = createBingoBatch(SONGS, count);
    expect(new Set(cards.map(cardSignature)).size).toBe(count);
  });
  it("varies placement even with exactly 24 songs", () => {
    expect(new Set(createBingoBatch(SONGS.slice(0, 24), 50).map(cardSignature)).size).toBe(50);
  });
  it.each([0, -1, 1.5, NaN, Infinity, 501])("rejects invalid count %s", (count) => {
    expect(() => createBingoBatch(SONGS, count)).toThrow("whole number");
  });
  it("retries collisions and stops when randomness cannot produce unique cards", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(() => createBingoBatch(SONGS, 2)).toThrow("unique cards");
  });
  it("does not confuse IDs containing signature separators", () => {
    expect(cardSignature([{ kind: "song", song: { id: "a|b", title: "A" } }])).not.toBe(
      cardSignature([
        { kind: "song", song: { id: "a", title: "A" } },
        { kind: "song", song: { id: "b", title: "B" } },
      ]),
    );
  });
});

describe("Bingo detection", () => {
  it.each(LINES.map((line, i) => [i, line] as const))("detects line %i", (_, line) => {
    const marked = initialMarks();
    line.forEach((index) => {
      marked[index] = true;
    });
    expect(detectBingo(marked)).toContainEqual(line);
  });
  it("supports all lines and unmarking", () => {
    const marked = Array<boolean>(25).fill(true);
    expect(detectBingo(marked)).toHaveLength(12);
    marked[0] = false;
    expect(detectBingo(marked)).toHaveLength(9);
    expect(detectBingo(initialMarks())).toEqual([]);
  });
});

describe("Caller", () => {
  it("draws every song once, completes, and allows undo of the final song", () => {
    const called: string[] = [];
    for (let i = 0; i < SONGS.length; i++) called.push(drawNext(SONGS, called)!);
    expect(new Set(called).size).toBe(SONGS.length);
    expect(drawNext(SONGS, called)).toBeNull();
    const last = called.pop();
    expect(drawNext(SONGS, called)).toBe(last);
    expect(drawNext(SONGS, [])).not.toBeNull();
  });
  it("sanitizes persisted history", () => {
    expect(restoreCalled(SONGS, ["song-02", "missing", "song-02", null, "song-01"])).toEqual([
      "song-02",
      "song-01",
    ]);
    expect(restoreCalled(SONGS, {})).toEqual([]);
  });
});
