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

describe("Production session invariants", () => {
  it("runs every prompt across six teams without repeats or double scoring", () => {
    let state = initialPartyState();
    for (let i = 0; i < 4; i++) state = partyReducer(state, { type: "add-team" });
    const bank = singingBeePrompts();
    bank.forEach((prompt, i) => {
      state = partyReducer(state, { type: "draw", prompt });
      state = partyReducer(state, { type: "result", result: "correct", now: i });
      expect(partyReducer(state, { type: "result", result: "correct" })).toBe(state);
    });
    expect(state.history).toHaveLength(bank.length);
    expect(new Set(state.used).size).toBe(bank.length);
    expect(state.teams.reduce((sum, team) => sum + team.score, 0)).toBe(bank.length);
    expect(state.activeTeam).toBe(bank.length % 6);
  });
  it("undoes a scored result without consuming another prompt or changing the wrong team", () => {
    let state = partyReducer(initialPartyState(), { type: "draw", prompt });
    state = partyReducer(state, { type: "result", result: "correct" });
    state = partyReducer(state, { type: "undo" });
    expect(state.teams[0]?.score).toBe(0);
    expect(state.activeTeam).toBe(0);
    expect(state.history).toEqual([]);
    expect(state.used).toEqual([prompt.id]);
    expect(state.current?.result).toBeNull();
    state = partyReducer(state, { type: "result", result: "pass" });
    expect(state.teams[0]?.score).toBe(0);
    expect(state.history).toHaveLength(1);
  });
  it("does not grant time by repeatedly pausing a running timer", () => {
    let state = partyReducer(initialPartyState(), { type: "draw", prompt });
    for (let i = 0; i < 100; i++) {
      state = partyReducer(state, { type: "timer-start", now: i * 100 });
      state = partyReducer(state, { type: "timer-pause", now: i * 100 + 75 });
    }
    expect(state.timer.remainingMs).toBe(52500);
  });
  it("uses real elapsed time when a background tab wakes, and blocks invalid timer actions", () => {
    let state = initialPartyState(30);
    expect(partyReducer(state, { type: "timer-start", now: 0 })).toBe(state);
    expect(partyReducer(state, { type: "duration", seconds: -1 })).toBe(state);
    state = partyReducer(state, { type: "draw", prompt });
    expect(partyReducer(state, { type: "category", category: "church" })).toBe(state);
    state = partyReducer(state, { type: "timer-start", now: 1000 });
    state = partyReducer(state, { type: "timer-tick", now: 50000 });
    expect(state.timer.remainingMs).toBe(0);
    expect(state.timer.deadline).toBeNull();
    expect(partyReducer(state, { type: "timer-start", now: 50000 })).toBe(state);
  });
});
