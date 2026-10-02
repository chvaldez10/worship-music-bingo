import type { Prompt } from "@/data/game-prompts";

export type Team = { id: string; name: string; score: number };
export type Round = { prompt: Prompt; teamId: string; result: "correct" | "pass" | null };
export type PartyState = {
  teams: Team[];
  activeTeam: number;
  current: Round | null;
  history: Round[];
  used: string[];
};
export type PartyAction =
  | { type: "draw"; prompt: Prompt }
  | { type: "result"; result: "correct" | "pass" }
  | { type: "rename"; id: string; name: string }
  | { type: "add-team" }
  | { type: "restart" };

export function initialPartyState(): PartyState {
  return {
    teams: [
      { id: "team-1", name: "Team 1", score: 0 },
      { id: "team-2", name: "Team 2", score: 0 },
    ],
    activeTeam: 0,
    current: null,
    history: [],
    used: [],
  };
}

export function partyReducer(state: PartyState, action: PartyAction): PartyState {
  switch (action.type) {
    case "draw": {
      if (state.current?.result === null || state.used.includes(action.prompt.id)) return state;
      const team = state.teams[state.activeTeam];
      if (!team) return state;
      return {
        ...state,
        current: { prompt: action.prompt, teamId: team.id, result: null },
        used: [...state.used, action.prompt.id],
      };
    }
    case "result": {
      if (!state.current || state.current.result !== null) return state;
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
      };
    }
    case "rename":
      return {
        ...state,
        teams: state.teams.map((team) =>
          team.id === action.id ? { ...team, name: action.name } : team,
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
      return { ...initialPartyState(), teams: state.teams.map((team) => ({ ...team, score: 0 })) };
  }
}
