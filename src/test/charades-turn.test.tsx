import { cleanup, fireEvent, render, screen, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HostedPromptGame } from "@/components/games/HostedPromptGame";
import { initialPartyState, partyReducer, restorePartyState } from "@/lib/party-game";

const bank = [
  { id: "a", title: "First act" },
  { id: "b", title: "Second act" },
  { id: "c", title: "Third act" },
];
const start = () =>
  partyReducer(initialPartyState(30, null, true), { type: "turn-start", prompt: bank[0]!, now: 0 });
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Timed Charades team turns", () => {
  it("keeps one team and one deadline across correct guesses and passes", () => {
    let state = start();
    state = partyReducer(state, {
      type: "turn-result",
      result: "correct",
      expectedId: "a",
      next: bank[1]!,
      now: 5000,
    });
    expect(state.activeTeam).toBe(0);
    expect(state.teams[0]!.score).toBe(1);
    expect(state.timer.deadline).toBe(30000);
    state = partyReducer(state, {
      type: "turn-result",
      result: "pass",
      expectedId: "b",
      next: bank[2]!,
      now: 10000,
    });
    expect(state.activeTeam).toBe(0);
    expect(state.timer.remainingMs).toBe(20000);
    expect(state.current?.prompt.id).toBe("c");
    expect(state.history.map((round) => round.teamId)).toEqual(["team-1", "team-1"]);
    expect(
      partyReducer(state, {
        type: "turn-result",
        result: "correct",
        expectedId: "b",
        next: null,
        now: 10000,
      }),
    ).toBe(state);
  });
  it("rejects late points even before the timer tick, ends once, and rotates teams", () => {
    const expired = partyReducer(start(), {
      type: "turn-result",
      result: "correct",
      expectedId: "a",
      next: bank[1]!,
      now: 30000,
    });
    expect(expired.teams[0]!.score).toBe(0);
    expect(expired.current?.result).toBe("pass");
    expect(expired.turn).toEqual({ number: 1, live: false });
    expect(expired.activeTeam).toBe(1);
    expect(expired.used).toEqual(["a"]);
    expect(partyReducer(expired, { type: "timer-tick", now: 31000 })).toBe(expired);
    const next = partyReducer(expired, { type: "turn-start", prompt: bank[1]!, now: 40000 });
    expect(next.current?.teamId).toBe("team-2");
    expect(next.timer.deadline).toBe(70000);
  });
  it("pauses scoring, resumes without extra time, and cannot reset a timed turn", () => {
    let state = partyReducer(start(), { type: "timer-pause", now: 5000 });
    expect(
      partyReducer(state, {
        type: "turn-result",
        result: "correct",
        expectedId: "a",
        next: bank[1]!,
        now: 8000,
      }),
    ).toBe(state);
    expect(partyReducer(state, { type: "timer-reset" })).toBe(state);
    state = partyReducer(state, { type: "timer-start", now: 10000 });
    expect(state.timer.deadline).toBe(35000);
  });
  it("undoes the previous guess without changing the deadline or consuming the next prompt", () => {
    let state = partyReducer(start(), {
      type: "turn-result",
      result: "correct",
      expectedId: "a",
      next: bank[1]!,
      now: 5000,
    });
    state = partyReducer(state, { type: "undo", now: 6000 });
    expect(state.teams[0]!.score).toBe(0);
    expect(state.current?.prompt.id).toBe("a");
    expect(state.used).toEqual(["a"]);
    expect(state.history).toEqual([]);
    expect(state.timer.deadline).toBe(30000);
  });
  it("closes a turn when the category is exhausted and preserves the final point", () => {
    const state = partyReducer(start(), {
      type: "turn-result",
      result: "correct",
      expectedId: "a",
      next: null,
      now: 1000,
    });
    expect(state.activeTeam).toBe(1);
    expect(state.teams[0]!.score).toBe(1);
    expect(state.history).toHaveLength(1);
    expect(state.turn?.live).toBe(false);
  });
  it("restores multiple guesses by one team and expires the turn while away", () => {
    let state = partyReducer(start(), {
      type: "turn-result",
      result: "correct",
      expectedId: "a",
      next: bank[1]!,
      now: 5000,
    });
    state = partyReducer(state, {
      type: "turn-result",
      result: "correct",
      expectedId: "b",
      next: bank[2]!,
      now: 6000,
    });
    state.teams[0]!.score = 999;
    const saved = { version: 1, state };
    const resumed = restorePartyState(saved, bank, [], 10000);
    expect(resumed.teams[0]!.score).toBe(2);
    expect(resumed.activeTeam).toBe(0);
    expect(resumed.timer.remainingMs).toBe(20000);
    const expired = restorePartyState(saved, bank, [], 50000);
    expect(expired.activeTeam).toBe(1);
    expect(expired.teams[0]!.score).toBe(2);
    expect(expired.history.at(-1)?.result).toBe("pass");
    expect(restorePartyState({ version: 1, state: expired }, bank, [], 60000)).toEqual(expired);
    const broken = structuredClone(saved);
    broken.state.history[1]!.turn = 1;
    expect(() => restorePartyState(broken, bank, [], 10000)).toThrow();
  });
  it("keeps classic saves compatible and prevents changing modes in the middle of play", () => {
    const classic = partyReducer(initialPartyState(), { type: "draw", prompt: bank[0]! });
    expect(restorePartyState({ version: 1, state: classic }, bank, [], 0).turn).toBeUndefined();
    expect(partyReducer(start(), { type: "timed-mode", enabled: false })).toEqual(start());
  });
});

describe("Timed Charades host controls", () => {
  it("advances prompts automatically while one actor's team keeps playing until expiry", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    vi.spyOn(Math, "random").mockReturnValue(0);
    render(
      <HostedPromptGame
        gameId="timed-qa"
        title="Charades"
        description="Timed acting"
        instructions={[]}
        prompts={bank}
        defaultSeconds={30}
        timedTurns
      />,
    );
    fireEvent.click(screen.getByText("Start team turn"));
    expect(screen.getByText("First act", { selector: "h2" })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(5000));
    fireEvent.click(screen.getByText("Correct · +1 point"));
    expect(screen.getByText("Second act", { selector: "h2" })).toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveTextContent("25s");
    expect(screen.getByText("Team 1's turn")).toBeInTheDocument();
    expect(screen.getByLabelText("Team 1 score")).toHaveTextContent("1");
    expect(screen.getByText("Correct · +1 point")).toBeDisabled();
    act(() => vi.advanceTimersByTime(500));
    fireEvent.click(screen.getByText("Pass · next prompt"));
    expect(screen.getByText("Third act", { selector: "h2" })).toBeInTheDocument();
    fireEvent.click(screen.getByText("Pause timer"));
    expect(screen.getByText("Correct · +1 point")).toBeDisabled();
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByRole("timer")).toHaveTextContent("25s");
    fireEvent.click(screen.getByText("Resume timer"));
    act(() => vi.advanceTimersByTime(25000));
    expect(screen.getByText("Up next: Team 2")).toBeInTheDocument();
    expect(screen.getByText(/scored 1 this turn/)).toBeInTheDocument();
    expect(screen.getByText("Correct · +1 point")).toBeDisabled();
    expect(screen.queryByText("Reset timer")).not.toBeInTheDocument();
  });
});
