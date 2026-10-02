import { useEffect, useReducer, useState } from "react";
import type { Prompt } from "@/data/game-prompts";
import { initialPartyState, partyReducer } from "@/lib/party-game";
import { Btn } from "@/components/ui-lite";

type Props = {
  title: string;
  description: string;
  instructions: string[];
  prompts: Prompt[];
  defaultSeconds: number;
  category?: string;
  categories?: { id: string; label: string }[];
  onCategoryChange?: (id: string) => void;
};

export function HostedPromptGame({
  title,
  description,
  instructions,
  prompts,
  defaultSeconds,
  category,
  categories,
  onCategoryChange,
}: Props) {
  const [state, dispatch] = useReducer(partyReducer, undefined, initialPartyState);
  const [revealed, setRevealed] = useState(false);
  const [duration, setDuration] = useState(defaultSeconds);
  const [seconds, setSeconds] = useState(defaultSeconds);
  const [deadline, setDeadline] = useState<number | null>(null);
  const pending = state.current?.result === null;
  const remaining = prompts.filter((prompt) => !state.used.includes(prompt.id));
  const active = state.teams[state.activeTeam];
  const roundTeam = state.teams.find((team) => team.id === state.current?.teamId);
  const nameFor = (id: string) =>
    state.teams.find((team) => team.id === id)?.name.trim() || "Unnamed team";

  useEffect(() => {
    if (deadline === null) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSeconds(left);
      if (left === 0) setDeadline(null);
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [deadline]);

  const resetTimer = () => {
    setDeadline(null);
    setSeconds(duration);
  };
  const draw = () => {
    if (pending || !remaining.length) return;
    const prompt = remaining[Math.floor(Math.random() * remaining.length)];
    if (!prompt) return;
    dispatch({ type: "draw", prompt });
    setRevealed(false);
    resetTimer();
  };
  const finish = (result: "correct" | "pass") => {
    dispatch({ type: "result", result });
    setDeadline(null);
    setRevealed(true);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">
          Host a camp game
        </p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{description}</p>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-3xl border border-border bg-card p-5 sm:p-8">
            <div className="mb-5 flex flex-wrap gap-4">
              {categories && (
                <label className="flex-1 text-sm font-semibold">
                  Category
                  <select
                    aria-label="Charades category"
                    value={category}
                    disabled={pending}
                    onChange={(e) => {
                      onCategoryChange?.(e.target.value);
                      setRevealed(false);
                    }}
                    className="mt-2 block w-full rounded-xl border border-border bg-background p-3 disabled:opacity-50"
                  >
                    {categories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="text-sm font-semibold">
                Round timer
                <select
                  aria-label="Round timer"
                  value={duration}
                  disabled={pending}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setDuration(value);
                    setSeconds(value);
                  }}
                  className="mt-2 block rounded-xl border border-border bg-background p-3 disabled:opacity-50"
                >
                  {[30, 60, 90, 120].map((value) => (
                    <option key={value} value={value}>
                      {value} seconds
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="text-sm font-semibold text-primary">
              {pending
                ? `${roundTeam?.name.trim() || "Unnamed team"}'s turn`
                : `Up next: ${active?.name.trim() || "Unnamed team"}`}
            </p>
            <div className="mt-4 flex min-h-48 flex-col items-center justify-center rounded-2xl bg-secondary p-6 text-center">
              {state.current ? (
                revealed ? (
                  <>
                    <h2 className="font-display text-3xl break-words sm:text-4xl">
                      {state.current.prompt.title}
                    </h2>
                    {state.current.prompt.detail && (
                      <p className="mt-3 text-muted-foreground">{state.current.prompt.detail}</p>
                    )}
                  </>
                ) : (
                  <>
                    <h2 className="font-display text-3xl">Prompt hidden</h2>
                    <p className="mt-2 text-muted-foreground">
                      Let only the actor or host see the prompt before the round.
                    </p>
                  </>
                )
              ) : (
                <>
                  <h2 className="font-display text-3xl">Ready to play?</h2>
                  <p className="mt-2 text-muted-foreground">Draw your first prompt to begin.</p>
                </>
              )}
            </div>
            {state.current && (
              <Btn
                variant="outline"
                className="mt-4"
                onClick={() => setRevealed((value) => !value)}
              >
                {revealed ? "Hide prompt" : "Reveal prompt"}
              </Btn>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span
                role="timer"
                aria-label="Time remaining"
                className={`font-display text-4xl tabular-nums ${seconds === 0 ? "text-destructive" : "text-foreground"}`}
              >
                {seconds}s
              </span>
              <Btn
                variant="outline"
                disabled={!pending || seconds === 0}
                onClick={() => {
                  if (deadline !== null) {
                    setSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
                    setDeadline(null);
                  } else {
                    setRevealed(false);
                    setDeadline(Date.now() + seconds * 1000);
                  }
                }}
              >
                {deadline !== null ? "Pause timer" : "Start timer"}
              </Btn>
              <Btn variant="ghost" disabled={!pending} onClick={resetTimer}>
                Reset timer
              </Btn>
            </div>
            {pending && seconds === 0 && (
              <p role="status" className="mt-3 font-semibold text-destructive">
                Time's up! Record the result to continue.
              </p>
            )}
            {state.current?.result && (
              <p role="status" className="mt-4 font-semibold text-primary">
                {state.current.result === "correct"
                  ? `Correct! +1 point for ${nameFor(state.current.teamId)}.`
                  : "Round passed. No points awarded."}
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-2">
              <Btn disabled={pending || !remaining.length} onClick={draw}>
                Draw next prompt
              </Btn>
              <Btn disabled={!pending} onClick={() => finish("correct")}>
                Correct · +1 point
              </Btn>
              <Btn variant="outline" disabled={!pending} onClick={() => finish("pass")}>
                Pass / Miss
              </Btn>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {remaining.length} of {prompts.length} prompts remaining in this category. Draws do
              not repeat until restart.
            </p>
            {!remaining.length && !pending && (
              <p role="status" className="mt-3 font-semibold">
                All prompts used.{" "}
                {categories
                  ? "Choose another category or restart to play again."
                  : "Restart to play again."}
              </p>
            )}
          </section>
          <section className="rounded-3xl border border-border bg-card p-5">
            <h2 className="font-display text-2xl">How to play</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted-foreground">
              {instructions.map((instruction) => (
                <li key={instruction}>{instruction}</li>
              ))}
            </ol>
            <p className="mt-4 text-sm text-muted-foreground">
              Use one host device. Scores stay on this page until you restart, refresh, or leave the
              game.
            </p>
          </section>
        </div>
        <div className="min-w-0 space-y-6">
          <section className="rounded-3xl border border-border bg-card p-5">
            <h2 className="font-display text-2xl">Teams & scores</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Split the group into 2–6 teams. Turns rotate after each result.
            </p>
            <div className="mt-4 space-y-3">
              {state.teams.map((team, i) => (
                <div
                  key={team.id}
                  className={`flex items-center gap-3 rounded-xl p-3 ${i === state.activeTeam ? "bg-secondary" : "bg-background"}`}
                >
                  <label className="min-w-0 flex-1">
                    <span className="sr-only">Team {i + 1} name</span>
                    <input
                      maxLength={40}
                      value={team.name}
                      onChange={(e) =>
                        dispatch({ type: "rename", id: team.id, name: e.target.value })
                      }
                      className="w-full min-w-0 rounded-lg border border-border bg-card px-3 py-2 font-semibold"
                    />
                  </label>
                  <span
                    aria-label={`${team.name || "Unnamed team"} score`}
                    className="font-display text-3xl tabular-nums"
                  >
                    {team.score}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Btn
                variant="outline"
                disabled={!!state.used.length || state.teams.length >= 6}
                onClick={() => dispatch({ type: "add-team" })}
              >
                Add team
              </Btn>
              <Btn
                variant="danger"
                onClick={() => {
                  if (
                    window.confirm("Restart this game? This clears all scores and used prompts.")
                  ) {
                    dispatch({ type: "restart" });
                    resetTimer();
                    setRevealed(false);
                  }
                }}
              >
                Restart game
              </Btn>
            </div>
          </section>
          <section className="rounded-3xl border border-border bg-card p-5">
            <h2 className="font-display text-2xl">Round history</h2>
            {!state.history.length ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Completed rounds will appear here.
              </p>
            ) : (
              <ol reversed className="mt-3 max-h-96 overflow-auto divide-y divide-border">
                {[...state.history].reverse().map((round, i) => (
                  <li key={round.prompt.id} value={state.history.length - i} className="py-3">
                    <p className="font-semibold break-words">
                      {state.history.length - i}. {round.prompt.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {nameFor(round.teamId)} ·{" "}
                      {round.result === "correct" ? "+1 point" : "Pass / Miss"}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
