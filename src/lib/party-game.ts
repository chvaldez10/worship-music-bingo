import type { Prompt } from "@/data/game-prompts";

export const ROUND_DURATIONS = [30, 60, 90, 120] as const;
export type Team = { id: string; name: string; score: number };
export type Round = { prompt: Prompt; teamId: string; result: "correct" | "pass" | null };
export type PartyState = {
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
  | { type: "result"; result: "correct" | "pass"; now?: number }
  | { type: "rename"; id: string; name: string }
  | { type: "add-team" }
  | { type: "restart" }
  | { type: "undo"; category?: string | null }
  | { type: "restore"; state: PartyState }
  | { type: "category"; category: string }
  | { type: "duration"; seconds: number }
  | { type: "timer-start" | "timer-pause" | "timer-tick"; now: number }
  | { type: "timer-reset" };

export function initialPartyState(duration = 60, category: string | null = null): PartyState {
  return {
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

export function partyReducer(state: PartyState, action: PartyAction): PartyState {
  const pending = state.current?.result === null;
  switch (action.type) {
    case "draw": {
      if (pending || state.used.includes(action.prompt.id)) return state;
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
      if (!state.current || !pending) return state;
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
        ...initialPartyState(state.timer.duration, state.category),
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
      return pending
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
    return { prompt, teamId, result };
  };
  if (!Array.isArray(s["history"]) || s["history"].length > prompts.length) return fail();
  const history = s["history"].map(readRound);
  if (
    history.some(
      (round, i) => round.result === null || round.teamId !== teams[i % teams.length]?.id,
    )
  )
    return fail();
  const current = s["current"] === null ? null : readRound(s["current"]);
  const used = history.map((round) => round.prompt.id);
  if (current?.result === null) {
    if (current.teamId !== teams[history.length % teams.length]?.id) return fail();
    used.push(current.prompt.id);
  } else if (current) {
    const last = history.at(-1);
    if (!last || JSON.stringify(current) !== JSON.stringify(last)) return fail();
  } else if (history.length) return fail();
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
    activeTeam: history.length % teams.length,
    category: typeof category === "string" ? category : null,
    timer: {
      duration,
      remainingMs,
      deadline: current?.result === null && typeof deadline === "number" ? deadline : null,
    },
  };
  return partyReducer(state, { type: "timer-tick", now });
}
