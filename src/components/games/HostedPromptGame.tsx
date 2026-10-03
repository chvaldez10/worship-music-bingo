import { useRef, useState } from "react";
import type { Prompt } from "@/data/game-prompts";
import { ROUND_DURATIONS } from "@/lib/party-game";
import { usePartyGame, type PromptCategory } from "@/hooks/use-party-game";
import { Btn, Select } from "@/components/ui-lite";

type Props = {
  gameId: string;
  title: string;
  description: string;
  instructions: string[];
  prompts: Prompt[];
  defaultSeconds: number;
  categories?: PromptCategory[];
  timedTurns?: boolean;
  teamTurnInstructions?: string[];
};

export function HostedPromptGame({
  gameId,
  title,
  description,
  instructions,
  prompts,
  defaultSeconds,
  categories,
  timedTurns = false,
  teamTurnInstructions,
}: Props) {
  const { state, dispatch, loaded, storageError } = usePartyGame(
    gameId,
    prompts,
    categories,
    defaultSeconds,
    timedTurns,
  );
  const lastResultAt = useRef(-Infinity);
  const [revealed, setRevealed] = useState(false);
  const { duration, deadline } = state.timer;
  const seconds = Math.ceil(state.timer.remainingMs / 1000);
  const available = categories?.find((group) => group.id === state.category)?.prompts ?? prompts;
  const timed = !!state.turn;
  const canUndo = timed
    ? !!state.turn?.live && state.history.at(-1)?.turn === state.turn.number && seconds > 0
    : !state.current || state.current.result !== null;
  const coolingDown = timed && Date.now() - lastResultAt.current < 300;
  const pending = state.current?.result === null;
  const remaining = available.filter((prompt) => !state.used.includes(prompt.id));
  const active = state.teams[state.activeTeam];
  const roundTeam = state.teams.find((team) => team.id === state.current?.teamId);
  const nameFor = (id: string) =>
    state.teams.find((team) => team.id === id)?.name.trim() || "Unnamed team";

  const resetTimer = () => dispatch({ type: "timer-reset" });
  const draw = () => {
    if (!loaded || pending || !remaining.length) return;
    const prompt = remaining[Math.floor(Math.random() * remaining.length)];
    if (!prompt) return;
    dispatch(timed ? { type: "turn-start", prompt, now: Date.now() } : { type: "draw", prompt });
    setRevealed(timed);
  };
  const finish = (result: "correct" | "pass") => {
    if (timed && state.current) {
      const now = Date.now();
      if (now - lastResultAt.current < 300) return;
      lastResultAt.current = now;
      dispatch({
        type: "turn-result",
        result,
        expectedId: state.current.prompt.id,
        next: remaining[Math.floor(Math.random() * remaining.length)] ?? null,
        now: Date.now(),
      });
    } else dispatch({ type: "result", result, now: Date.now() });
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
      {storageError && (
        <p role="status" className="mb-4 rounded-xl bg-secondary p-4 text-sm">
          {storageError}
        </p>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-3xl border border-border bg-card p-5 sm:p-8">
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {timedTurns && (
                <label className="min-w-0 text-sm font-semibold sm:col-span-2">
                  Play style
                  <Select
                    aria-label="Charades play style"
                    value={timed ? "team-turn" : "single-prompt"}
                    disabled={!loaded || !!state.used.length}
                    onChange={(event) => {
                      dispatch({ type: "timed-mode", enabled: event.target.value === "team-turn" });
                      setRevealed(false);
                    }}
                  >
                    <option value="team-turn">Timed team turn</option>
                    <option value="single-prompt">One prompt per turn</option>
                  </Select>
                </label>
              )}
              {categories && (
                <label className="min-w-0 text-sm font-semibold">
                  Category
                  <Select
                    aria-label="Charades category"
                    value={state.category ?? ""}
                    disabled={!loaded || pending}
                    onChange={(e) => {
                      dispatch({ type: "category", category: e.target.value });
                      setRevealed(false);
                    }}
                  >
                    {categories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </Select>
                </label>
              )}
              <label
                className={`min-w-0 text-sm font-semibold ${categories ? "" : "sm:col-span-2"}`}
              >
                {timed ? "Team turn timer" : "Round timer"}
                <Select
                  aria-label={timed ? "Team turn timer" : "Round timer"}
                  value={duration}
                  disabled={!loaded || pending}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    dispatch({ type: "duration", seconds: value });
                  }}
                >
                  {ROUND_DURATIONS.map((value) => (
                    <option key={value} value={value}>
                      {value} seconds
                    </option>
                  ))}
                </Select>
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
                      Let only the actor or host see the prompt.
                    </p>
                  </>
                )
              ) : (
                <>
                  <h2 className="font-display text-3xl">Ready to play?</h2>
                  <p className="mt-2 text-muted-foreground">
                    {timed
                      ? "Choose an actor, then start the team turn."
                      : "Draw your first prompt to begin."}
                  </p>
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
              {(!timed || state.turn?.live) && (
                <Btn
                  variant="outline"
                  disabled={!loaded || !pending || seconds === 0}
                  onClick={() => {
                    if (deadline !== null) {
                      dispatch({ type: "timer-pause", now: Date.now() });
                    } else {
                      if (!timed) setRevealed(false);
                      dispatch({ type: "timer-start", now: Date.now() });
                    }
                  }}
                >
                  {deadline !== null ? "Pause timer" : timed ? "Resume timer" : "Start timer"}
                </Btn>
              )}
              {!timed && (
                <Btn variant="ghost" disabled={!loaded || !pending} onClick={resetTimer}>
                  Reset timer
                </Btn>
              )}
              {timed && state.turn?.live && (
                <Btn
                  variant="ghost"
                  disabled={!loaded || !state.turn?.live}
                  onClick={() => dispatch({ type: "turn-end", now: Date.now() })}
                >
                  End team turn
                </Btn>
              )}
            </div>
            {!timed && pending && seconds === 0 && (
              <p role="status" className="mt-3 font-semibold text-destructive">
                Time's up! Record the result to continue.
              </p>
            )}
            {timed && state.turn && !state.turn.live && state.turn.number > 0 && (
              <p role="status" className="mt-4 font-semibold text-primary">
                {seconds === 0 ? "Time’s up! " : "Turn complete. "}
                {nameFor(state.history.at(-1)!.teamId)} scored{" "}
                {
                  state.history.filter(
                    (round) => round.turn === state.turn!.number - 1 && round.result === "correct",
                  ).length
                }{" "}
                this turn. Pick an actor for the next team.
              </p>
            )}
            {timed && state.turn?.live && (
              <p className="mt-3 text-sm font-semibold text-primary">
                One actor for this whole turn ·{" "}
                {
                  state.history.filter(
                    (round) => round.turn === state.turn!.number && round.result === "correct",
                  ).length
                }{" "}
                correct so far. Keep this screen out of your team’s view.
              </p>
            )}
            {!timed && state.current?.result && (
              <p role="status" className="mt-4 font-semibold text-primary">
                {state.current.result === "correct"
                  ? `Correct! +1 point for ${nameFor(state.current.teamId)}.`
                  : "Round passed. No points awarded."}
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-2">
              <Btn disabled={!loaded || pending || !remaining.length} onClick={draw}>
                {timed ? "Start team turn" : "Draw next prompt"}
              </Btn>
              <Btn
                disabled={
                  !loaded ||
                  !pending ||
                  (timed && (deadline === null || seconds === 0 || coolingDown))
                }
                onClick={() => finish("correct")}
              >
                Correct · +1 point
              </Btn>
              <Btn
                variant="outline"
                disabled={
                  !loaded ||
                  !pending ||
                  (timed && (deadline === null || seconds === 0 || coolingDown))
                }
                onClick={() => finish("pass")}
              >
                {timed ? "Pass · next prompt" : "Pass / Miss"}
              </Btn>
              <Btn
                variant="ghost"
                disabled={!loaded || !canUndo || !state.history.length}
                onClick={() => {
                  const group = categories?.find((category) =>
                    category.prompts.some((prompt) => prompt.id === state.current?.prompt.id),
                  );
                  dispatch({ type: "undo", category: group?.id ?? null, now: Date.now() });
                  setRevealed(timed);
                }}
              >
                Undo last result
              </Btn>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {remaining.length} of {available.length} prompts remaining{" "}
              {categories ? "in this category" : "in the song bank"}. Draws do not repeat until
              restart.
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
              {(timed && teamTurnInstructions ? teamTurnInstructions : instructions).map(
                (instruction) => (
                  <li key={instruction}>{instruction}</li>
                ),
              )}
            </ol>
            <p className="mt-4 text-sm text-muted-foreground">
              Use one host tab. Scores and rounds are saved in this tab, including after a refresh
              or a visit to another game.
            </p>
          </section>
        </div>
        <div className="min-w-0 space-y-6">
          <section className="rounded-3xl border border-border bg-card p-5">
            <h2 className="font-display text-2xl">Teams & scores</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {timed
                ? "Split into 2–6 teams. One actor stays up for the entire timed turn; teams rotate when it ends."
                : "Split the group into 2–6 teams. Turns rotate after each result."}
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
                      disabled={!loaded}
                      maxLength={40}
                      value={team.name}
                      onChange={(e) =>
                        dispatch({ type: "rename", id: team.id, name: e.target.value })
                      }
                      className="w-full min-w-0 rounded-lg border border-border bg-card px-3 py-2 font-semibold"
                    />
                  </label>
                  <output
                    aria-label={`${team.name.trim() || "Unnamed team"} score`}
                    className="font-display text-3xl tabular-nums"
                  >
                    {team.score}
                  </output>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Btn
                variant="outline"
                disabled={!loaded || !!state.used.length || state.teams.length >= 6}
                onClick={() => dispatch({ type: "add-team" })}
              >
                Add team
              </Btn>
              <Btn
                variant="danger"
                disabled={!loaded}
                onClick={() => {
                  if (
                    window.confirm("Restart this game? This clears all scores and used prompts.")
                  ) {
                    dispatch({ type: "restart" });
                    setRevealed(false);
                  }
                }}
              >
                Restart game
              </Btn>
            </div>
          </section>
          <section className="rounded-3xl border border-border bg-card p-5">
            <h2 className="font-display text-2xl">{timed ? "Prompt history" : "Round history"}</h2>
            {!state.history.length ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {timed
                  ? "Completed prompts will appear here."
                  : "Completed rounds will appear here."}
              </p>
            ) : (
              <ol reversed className="mt-3 max-h-96 overflow-auto divide-y divide-border">
                {[...state.history].reverse().map((round, i) => (
                  <li key={round.prompt.id} value={state.history.length - i} className="py-3">
                    <p className="font-semibold break-words">
                      {state.history.length - i}. {round.prompt.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {nameFor(round.teamId)}
                      {timed ? ` · Turn ${(round.turn ?? 0) + 1}` : ""} ·{" "}
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
