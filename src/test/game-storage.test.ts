import { describe, expect, it } from "vitest";
import { initialPartyState, partyReducer, restorePartyState } from "@/lib/party-game";
import { createBingoCard, initialMarks, restoreBingoCard } from "@/lib/bingo";
import { SONGS } from "@/data/songs";

const bank = [
  { id: "one", title: "Canonical title" },
  { id: "two", title: "Other" },
];
function savedGame() {
  let state = partyReducer(initialPartyState(30), { type: "draw", prompt: bank[0]! });
  state = partyReducer(state, { type: "result", result: "correct", now: 0 });
  state = partyReducer(state, { type: "draw", prompt: bank[1]! });
  state = partyReducer(state, { type: "timer-start", now: 0 });
  return { version: 1, state };
}

describe("Untrusted host storage", () => {
  it("restores a pending round, scores, turn and elapsed time using canonical prompts", () => {
    const saved = savedGame();
    saved.state.teams[0]!.score = 999;
    saved.state.history[0]!.prompt = { id: "one", title: "Tampered title" };
    const restored = restorePartyState(saved, bank, [], 10000);
    expect(restored.teams[0]?.score).toBe(1);
    expect(restored.current?.teamId).toBe("team-2");
    expect(restored.history[0]?.prompt.title).toBe("Canonical title");
    expect(restored.used).toEqual(["one", "two"]);
    expect(restored.timer.remainingMs).toBe(20000);
  });
  it("restores a timer that expired while away", () => {
    expect(restorePartyState(savedGame(), bank, [], 60000).timer).toEqual({
      duration: 30,
      remainingMs: 0,
      deadline: null,
    });
  });
  it.each([null, {}, [], { version: 100 }, { version: 1, state: {} }])(
    "rejects malformed session %j",
    (value) => {
      expect(() => restorePartyState(value, bank, [], 0)).toThrow("invalid");
    },
  );
  it("rejects stale prompts, repeat rounds, invalid categories, and tampered turn ownership", () => {
    expect(() => restorePartyState(savedGame(), [], [], 0)).toThrow();
    const repeated = savedGame();
    repeated.state.current!.prompt = bank[0]!;
    expect(() => restorePartyState(repeated, bank, [], 0)).toThrow();
    const category = savedGame();
    category.state.category = "missing";
    expect(() => restorePartyState(category, bank, ["bible"], 0)).toThrow();
    const turn = savedGame();
    turn.state.current!.teamId = "team-1";
    expect(() => restorePartyState(turn, bank, [], 0)).toThrow();
  });
  it("rejects invalid timers and disallows non-finite saved numbers", () => {
    const saved = savedGame();
    saved.state.timer.remainingMs = Infinity;
    expect(() => restorePartyState(saved, bank, [], 0)).toThrow();
    saved.state.timer.remainingMs = 30000;
    saved.state.timer.deadline = 1000000;
    expect(() => restorePartyState(saved, bank, [], 0)).toThrow();
  });
});

describe("Untrusted player storage", () => {
  const card = createBingoCard(SONGS);
  const valid = () => ({
    version: 1,
    ids: card.map((cell) => (cell.kind === "free" ? null : cell.song.id)),
    marked: initialMarks(),
  });
  it("restores the identical card and marks, forcing FREE to stay marked", () => {
    const saved = valid();
    saved.marked[0] = true;
    saved.marked[12] = false;
    const restored = restoreBingoCard(saved, SONGS);
    expect(restored.cells).toEqual(card);
    expect(restored.marked[0]).toBe(true);
    expect(restored.marked[12]).toBe(true);
  });
  it("rejects missing songs, duplicate IDs, misplaced FREE and invalid marks", () => {
    const stale = valid();
    stale.ids[0] = "missing";
    expect(() => restoreBingoCard(stale, SONGS)).toThrow();
    const duplicate = valid();
    duplicate.ids[1] = duplicate.ids[0]!;
    expect(() => restoreBingoCard(duplicate, SONGS)).toThrow();
    const free = valid();
    free.ids[12] = free.ids[0]!;
    expect(() => restoreBingoCard(free, SONGS)).toThrow();
    const marked = valid();
    marked.marked.pop();
    expect(() => restoreBingoCard(marked, SONGS)).toThrow();
  });
});
