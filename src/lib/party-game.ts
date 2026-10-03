import type { Prompt } from "@/data/game-prompts";

export const ROUND_DURATIONS = [30, 60, 90, 120] as const;
export type Team = { id: string; name: string; score: number };
export type Round = {
  prompt: Prompt;
  teamId: string;
  result: "correct" | "pass" | null;
  turn?: number;
};
export type PartyState = {
  turn?: { number: number; live: boolean };
  teams: Team[];
  activeTeam: number;
  current: Round | null;
  history: Round[];
  used: string[];
  category: string | null;
  timer: { duration: number; remainingMs: number; deadline: number | null };
};
export type PartyAction =
  | { type: "draw"; prompt: Prompt }
  | { type: "timed-mode"; enabled: boolean }
  | { type: "turn-start"; prompt: Prompt; now: number }
  | {
      type: "turn-result";
      result: "correct" | "pass";
      expectedId: string;
      next: Prompt | null;
      now: number;
    }
  | { type: "turn-end"; now: number }
  | { type: "result"; result: "correct" | "pass"; now?: number }
  | { type: "rename"; id: string; name: string }
  | { type: "add-team" }
  | { type: "restart" }
  | { type: "undo"; category?: string | null; now?: number }
  | { type: "restore"; state: PartyState }
  | { type: "category"; category: string }
  | { type: "duration"; seconds: number }
  | { type: "timer-start" | "timer-pause" | "timer-tick"; now: number }
  | { type: "timer-reset" };

export function initialPartyState(
  duration = 60,
  category: string | null = null,
  timed = false,
): PartyState {
  return {
    ...(timed ? { turn: { number: 0, live: false } } : {}),
    teams: [
      { id: "team-1", name: "Team 1", score: 0 },
      { id: "team-2", name: "Team 2", score: 0 },
    ],
    activeTeam: 0,
    current: null,
    history: [],
    used: [],
    category,
    timer: { duration, remainingMs: duration * 1000, deadline: null },
  };
}
const timeLeft = (state: PartyState, now: number) =>
  state.timer.deadline === null
    ? state.timer.remainingMs
    : Math.max(0, Math.min(state.timer.duration * 1000, state.timer.deadline - now));

/** Closing a timed turn consumes the unfinished prompt as a pass, never a point. */
function endTurn(state: PartyState, now: number): PartyState {
  if (!state.turn?.live) return state;
  const current =
    state.current?.result === null ? { ...state.current, result: "pass" as const } : state.current;
  return {
    ...state,
    current,
    history:
      state.current?.result === null && current ? [...state.history, current] : state.history,
    activeTeam: (state.activeTeam + 1) % state.teams.length,
    turn: { number: state.turn.number + 1, live: false },
    timer: { ...state.timer, remainingMs: timeLeft(state, now), deadline: null },
  };
}

export function partyReducer(state: PartyState, action: PartyAction): PartyState {
  const pending = state.current?.result === null;
  switch (action.type) {
    case "timed-mode": {
      if (state.used.length) return state;
      const base = { ...state };
      delete base.turn;
      return action.enabled ? { ...base, turn: { number: 0, live: false } } : base;
    }
    case "turn-start": {
      if (!state.turn || state.turn.live || state.used.includes(action.prompt.id)) return state;
      const team = state.teams[state.activeTeam];
      if (!team) return state;
      return {
        ...state,
        turn: { ...state.turn, live: true },
        current: { prompt: action.prompt, teamId: team.id, result: null, turn: state.turn.number },
        used: [...state.used, action.prompt.id],
        timer: {
          ...state.timer,
          remainingMs: state.timer.duration * 1000,
          deadline: action.now + state.timer.duration * 1000,
        },
      };
    }
    case "turn-result": {
      if (!state.turn?.live || !pending || state.current?.prompt.id !== action.expectedId)
        return state;
      if (timeLeft(state, action.now) <= 0) return endTurn(state, action.now);
      if (state.timer.deadline === null) return state; // scoring is paused with the timer
      if (action.next && state.used.includes(action.next.id)) return state;
      const round = { ...state.current!, result: action.result };
      const scored = {
        ...state,
        current: round,
        history: [...state.history, round],
        teams: state.teams.map((team) =>
          team.id === round.teamId && action.result === "correct"
            ? { ...team, score: team.score + 1 }
            : team,
        ),
        timer: { ...state.timer, remainingMs: timeLeft(state, action.now) },
      };
      if (!action.next) return endTurn(scored, action.now);
      return {
        ...scored,
        current: {
          prompt: action.next,
          teamId: round.teamId,
          result: null,
          turn: state.turn.number,
        },
        used: [...state.used, action.next.id],
      };
    }
    case "turn-end":
      return endTurn(state, action.now);
    case "draw": {
      if (state.turn || pending || state.used.includes(action.prompt.id)) return state;
      const team = state.teams[state.activeTeam];
      if (!team) return state;
      return {
        ...state,
        current: { prompt: action.prompt, teamId: team.id, result: null },
        used: [...state.used, action.prompt.id],
        timer: { ...state.timer, remainingMs: state.timer.duration * 1000, deadline: null },
      };
    }
    case "result": {
      if (state.turn || !state.current || !pending) return state;
      const round = { ...state.current, result: action.result };
      return {
        ...state,
        current: round,
        history: [...state.history, round],
        teams: state.teams.map((team) =>
          team.id === round.teamId && action.result === "correct"
            ? { ...team, score: team.score + 1 }
            : team,
        ),
        activeTeam: (state.activeTeam + 1) % state.teams.length,
        timer: {
          ...state.timer,
          remainingMs: timeLeft(state, action.now ?? Date.now()),
          deadline: null,
        },
      };
    }
    case "undo": {
      const last = state.history.at(-1);
      if (state.turn) {
        if (
          !state.turn.live ||
          !pending ||
          !last ||
          last.turn !== state.turn.number ||
          timeLeft(state, action.now ?? Date.now()) <= 0
        )
          return state;
        return {
          ...state,
          current: { ...last, result: null },
          history: state.history.slice(0, -1),
          used: state.used.filter((id) => id !== state.current!.prompt.id),
          teams: state.teams.map((team) =>
            team.id === last.teamId && last.result === "correct"
              ? { ...team, score: team.score - 1 }
              : team,
          ),
        };
      }
      if (pending || !last || state.current?.prompt.id !== last.prompt.id) return state;
      return {
        ...state,
        current: { ...last, result: null },
        category: action.category === undefined ? state.category : action.category,
        history: state.history.slice(0, -1),
        activeTeam: state.teams.findIndex((team) => team.id === last.teamId),
        teams: state.teams.map((team) =>
          team.id === last.teamId && last.result === "correct"
            ? { ...team, score: team.score - 1 }
            : team,
        ),
        timer: { ...state.timer, deadline: null },
      };
    }
    case "rename":
      return {
        ...state,
        teams: state.teams.map((team) =>
          team.id === action.id ? { ...team, name: action.name.slice(0, 40) } : team,
        ),
      };
    case "add-team":
      if (state.used.length || state.teams.length >= 6) return state;
      return {
        ...state,
        teams: [
          ...state.teams,
          {
            id: `team-${state.teams.length + 1}`,
            name: `Team ${state.teams.length + 1}`,
            score: 0,
          },
        ],
      };
    case "restart":
      return {
        ...initialPartyState(state.timer.duration, state.category, !!state.turn),
        teams: state.teams.map((team) => ({ ...team, score: 0 })),
      };
    case "restore":
      return action.state;
    case "category":
      return pending ? state : { ...state, category: action.category };
    case "duration":
      if (pending || !ROUND_DURATIONS.some((seconds) => seconds === action.seconds)) return state;
      return {
        ...state,
        timer: { duration: action.seconds, remainingMs: action.seconds * 1000, deadline: null },
      };
    case "timer-start":
      if (!pending || state.timer.deadline !== null || state.timer.remainingMs <= 0) return state;
      return {
        ...state,
        timer: { ...state.timer, deadline: action.now + state.timer.remainingMs },
      };
    case "timer-pause":
    case "timer-tick": {
      if (state.timer.deadline === null) return state;
      const remainingMs = timeLeft(state, action.now);
      if (state.turn?.live && remainingMs === 0) return endTurn(state, action.now);
      return {
        ...state,
        timer: {
          ...state.timer,
          remainingMs,
          deadline:
            remainingMs === 0 || action.type === "timer-pause" ? null : state.timer.deadline,
        },
      };
    }
    case "timer-reset":
      return pending && !state.turn
        ? {
            ...state,
            timer: { ...state.timer, remainingMs: state.timer.duration * 1000, deadline: null },
          }
        : state;
  }
}

/** Saved data is untrusted. Rebuild scores and prompt content from canonical data. */
export function restorePartyState(
  saved: unknown,
  prompts: readonly Prompt[],
  categoryIds: readonly string[],
  now: number,
): PartyState {
  const fail = (): never => {
    throw new Error("Saved game is invalid or its prompts have changed.");
  };
  if (!saved || typeof saved !== "object") return fail();
  const data = saved as Record<string, unknown>;
  if (data["version"] !== 1 || !data["state"] || typeof data["state"] !== "object") return fail();
  const s = data["state"] as Record<string, unknown>;
  if (!Array.isArray(s["teams"]) || s["teams"].length < 2 || s["teams"].length > 6) return fail();
  const teams: Team[] = s["teams"].map((value: unknown, i: number) => {
    if (!value || typeof value !== "object") return fail();
    const team = value as Record<string, unknown>;
    if (
      team["id"] !== `team-${i + 1}` ||
      typeof team["name"] !== "string" ||
      team["name"].length > 40
    )
      return fail();
    return { id: `team-${i + 1}`, name: team["name"], score: 0 };
  });
  let turn: PartyState["turn"];
  if (s["turn"] !== undefined) {
    if (!s["turn"] || typeof s["turn"] !== "object") return fail();
    const value = s["turn"] as Record<string, unknown>;
    if (
      typeof value["number"] !== "number" ||
      !Number.isInteger(value["number"]) ||
      value["number"] < 0 ||
      value["number"] > prompts.length ||
      typeof value["live"] !== "boolean"
    )
      return fail();
    turn = { number: value["number"], live: value["live"] };
  }
  const bank = new Map(prompts.map((prompt) => [prompt.id, prompt]));
  if (bank.size !== prompts.length) return fail();
  const readRound = (value: unknown): Round => {
    if (!value || typeof value !== "object") return fail();
    const r = value as Record<string, unknown>;
    const p = r["prompt"];
    if (!p || typeof p !== "object") return fail();
    const id = (p as Record<string, unknown>)["id"];
    const prompt = typeof id === "string" ? bank.get(id) : undefined;
    const teamId = r["teamId"];
    const result = r["result"];
    if (
      !prompt ||
      typeof teamId !== "string" ||
      !teams.some((team) => team.id === teamId) ||
      (result !== null && result !== "correct" && result !== "pass")
    )
      return fail();
    if (
      turn &&
      (typeof r["turn"] !== "number" ||
        !Number.isInteger(r["turn"]) ||
        r["turn"] < 0 ||
        r["turn"] > turn.number)
    )
      return fail();
    return { prompt, teamId, result, ...(turn ? { turn: r["turn"] as number } : {}) };
  };
  if (!Array.isArray(s["history"]) || s["history"].length > prompts.length) return fail();
  const history = s["history"].map(readRound);
  if (
    history.some(
      (round, i) =>
        round.result === null ||
        round.teamId !== teams[(turn ? round.turn! : i) % teams.length]?.id ||
        (turn &&
          (i === 0
            ? round.turn !== 0
            : round.turn !== history[i - 1]!.turn && round.turn !== history[i - 1]!.turn! + 1)),
    )
  )
    return fail();
  const current = s["current"] === null ? null : readRound(s["current"]);
  const used = history.map((round) => round.prompt.id);
  if (current?.result === null) {
    if (
      current.teamId !== teams[(turn ? turn.number : history.length) % teams.length]?.id ||
      (turn && (!turn.live || current.turn !== turn.number))
    )
      return fail();
    used.push(current.prompt.id);
  } else if (current) {
    const last = history.at(-1);
    if (!last || JSON.stringify(current) !== JSON.stringify(last)) return fail();
  } else if (history.length) return fail();
  if (turn) {
    if (turn.live && current?.result !== null) return fail();
    const lastNumber = history.at(-1)?.turn;
    if (
      turn.number > history.length ||
      (!turn.live && (turn.number === 0 ? history.length > 0 : lastNumber !== turn.number - 1)) ||
      (turn.live &&
        lastNumber !== undefined &&
        lastNumber !== turn.number &&
        lastNumber !== turn.number - 1)
    )
      return fail();
  }
  if (new Set(used).size !== used.length) return fail();
  for (const round of history) {
    if (round.result === "correct") teams.find((team) => team.id === round.teamId)!.score++;
  }
  const category = s["category"];
  if (
    (categoryIds.length && (typeof category !== "string" || !categoryIds.includes(category))) ||
    (!categoryIds.length && category !== null)
  )
    return fail();
  if (!s["timer"] || typeof s["timer"] !== "object") return fail();
  const t = s["timer"] as Record<string, unknown>;
  const duration = t["duration"],
    remainingMs = t["remainingMs"],
    deadline = t["deadline"];
  if (
    typeof duration !== "number" ||
    !ROUND_DURATIONS.some((n) => n === duration) ||
    typeof remainingMs !== "number" ||
    !Number.isFinite(remainingMs) ||
    remainingMs < 0 ||
    remainingMs > duration * 1000 ||
    (deadline !== null &&
      (typeof deadline !== "number" ||
        !Number.isFinite(deadline) ||
        deadline > now + duration * 1000))
  )
    return fail();
  const state: PartyState = {
    teams,
    history,
    current,
    used,
    ...(turn ? { turn } : {}),
    activeTeam: (turn ? turn.number : history.length) % teams.length,
    category: typeof category === "string" ? category : null,
    timer: {
      duration,
      remainingMs,
      deadline: current?.result === null && typeof deadline === "number" ? deadline : null,
    },
  };
  if (turn?.live && remainingMs === 0 && deadline === null) return endTurn(state, now);
  return partyReducer(state, { type: "timer-tick", now });
}
