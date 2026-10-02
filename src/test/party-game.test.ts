import { describe, expect, it } from "vitest";
import { initialPartyState, partyReducer } from "@/lib/party-game";
import { charadesPrompts, singingBeePrompts } from "@/data/game-prompts";
import { SONGS } from "@/data/songs";

const prompt = { id: "p1", title: "Noah building the ark" };
describe("Hosted game rounds", () => {
  it("allows one score per round and rotates teams after correct or missed guesses", () => {
    let state = partyReducer(initialPartyState(), { type: "draw", prompt });
    expect(partyReducer(state, { type: "draw", prompt: { id: "p2", title: "Other" } })).toBe(state);
    state = partyReducer(state, { type: "result", result: "correct" });
    expect(state.teams[0]?.score).toBe(1);
    expect(state.activeTeam).toBe(1);
    expect(partyReducer(state, { type: "result", result: "correct" })).toBe(state);
    expect(partyReducer(state, { type: "draw", prompt })).toBe(state);
    state = partyReducer(state, { type: "draw", prompt: { id: "p2", title: "Other" } });
    state = partyReducer(state, { type: "result", result: "pass" });
    expect(state.teams[1]?.score).toBe(0);
    expect(state.activeTeam).toBe(0);
    expect(state.history).toHaveLength(2);
  });
  it("keeps team names but clears scores, prompts and history on restart", () => {
    let state = partyReducer(initialPartyState(), { type: "rename", id: "team-1", name: "Faith" });
    state = partyReducer(state, { type: "draw", prompt });
    state = partyReducer(state, { type: "result", result: "correct" });
    state = partyReducer(state, { type: "restart" });
    expect(state.teams[0]).toEqual({ id: "team-1", name: "Faith", score: 0 });
    expect(state.current).toBeNull();
    expect(state.history).toEqual([]);
    expect(state.used).toEqual([]);
    expect(state.activeTeam).toBe(0);
  });
  it("supports up to six teams and locks additions after play starts", () => {
    let state = initialPartyState();
    for (let i = 0; i < 8; i++) state = partyReducer(state, { type: "add-team" });
    expect(state.teams).toHaveLength(6);
    state = partyReducer(state, { type: "draw", prompt });
    expect(partyReducer(state, { type: "add-team" })).toBe(state);
  });
  it("uses the shared bank for both singing bee and song charades", () => {
    expect(singingBeePrompts().map(({ id, title }) => ({ id, title }))).toEqual(
      SONGS.map(({ id, title }) => ({ id, title })),
    );
    expect(charadesPrompts("songs").map(({ id }) => id)).toEqual(SONGS.map(({ id }) => id));
    const all = [
      ...charadesPrompts("bible"),
      ...charadesPrompts("church"),
      ...charadesPrompts("songs"),
    ];
    expect(new Set(all.map(({ id }) => id)).size).toBe(all.length);
  });
});
