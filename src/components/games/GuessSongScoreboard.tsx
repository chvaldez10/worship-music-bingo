import { useState } from "react";
import { Music2, Minus, Plus } from "lucide-react";
import { Btn, Select } from "@/components/ui-lite";
import { PageLoading } from "@/components/PageLoading";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useGuessSong } from "@/hooks/use-guess-song";
import { initialGuessSongState, MAX_GUESS_SONG_SCORE } from "@/lib/guess-the-song";

export function GuessSongScoreboard() {
  const { state, ready, blocked, error, save } = useGuessSong();
  const [resetting, setResetting] = useState(false);
  if (!ready) return <PageLoading message="Loading your scoreboard…" />;
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
        <Music2 size={18} aria-hidden="true" /> Listen & guess
      </p>
      <h1 className="mt-3 font-display text-4xl sm:text-5xl">Guess the Song</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Play a song on YouTube, pause it, and let the teams guess the title. Award one point for
        each correct answer.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Names and scores are saved automatically on this device.
      </p>
      {error && (
        <p role="alert" className="mt-5 rounded-xl bg-destructive/10 p-4 text-destructive">
          {error}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-border bg-card p-5">
        <label className="w-full min-w-0 sm:w-56">
          <span className="text-sm font-semibold">Number of teams</span>
          <Select
            disabled={blocked}
            value={state.teamCount}
            onChange={(event) =>
              save((current) => ({ ...current, teamCount: Number(event.target.value) }))
            }
          >
            {Array.from({ length: 8 }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {index + 1} {index === 0 ? "team" : "teams"}
              </option>
            ))}
          </Select>
        </label>
        <Dialog open={resetting} onOpenChange={setResetting}>
          <DialogTrigger asChild>
            <Btn variant="outline">{blocked ? "Start fresh" : "Reset scores"}</Btn>
          </DialogTrigger>
          <DialogContent
            role="alertdialog"
            overlayClassName="bg-foreground/20 backdrop-blur-sm"
            className="max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-3xl bg-card sm:rounded-3xl [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center"
          >
            <DialogHeader className="pr-10 text-left">
              <DialogTitle className="font-display text-2xl">
                {blocked ? "Start a fresh scoreboard?" : "Reset all scores?"}
              </DialogTitle>
              <DialogDescription>
                {blocked
                  ? "Replace this game’s saved names and scores with a fresh scoreboard."
                  : "Set every team’s score to zero, including any hidden teams. Team names will stay."}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <DialogClose asChild>
                <Btn variant="ghost">Cancel</Btn>
              </DialogClose>
              <Btn
                variant="danger"
                onClick={() => {
                  if (
                    save(
                      (current) =>
                        blocked
                          ? initialGuessSongState()
                          : {
                              ...current,
                              teams: current.teams.map((team) => ({ ...team, score: 0 })),
                            },
                      blocked,
                    )
                  )
                    setResetting(false);
                }}
              >
                {blocked ? "Start fresh scoreboard" : "Confirm reset"}
              </Btn>
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </DialogContent>
        </Dialog>
        <p className="basis-full text-sm text-muted-foreground">
          Changing the number of teams keeps each team’s name and score.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {state.teams.slice(0, state.teamCount).map((team) => {
          const name = team.name.trim() || `Team ${team.id}`;
          return (
            <section
              key={team.id}
              aria-labelledby={`guess-team-${team.id}`}
              className="min-w-0 rounded-3xl border border-border bg-card p-5 shadow-soft"
            >
              <h2 id={`guess-team-${team.id}`} className="sr-only">
                {name}
              </h2>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Team {team.id} name
                </span>
                <input
                  value={team.name}
                  maxLength={40}
                  disabled={blocked}
                  className="mt-2 min-h-12 w-full min-w-0 rounded-xl border border-border bg-background px-3 py-3 text-base font-semibold"
                  onChange={(event) =>
                    save((current) => ({
                      ...current,
                      teams: current.teams.map((item) =>
                        item.id === team.id ? { ...item, name: event.target.value } : item,
                      ),
                    }))
                  }
                />
              </label>
              <div className="my-6 text-center">
                <output
                  aria-label={`${name} score`}
                  className="block font-display text-6xl tabular-nums"
                >
                  {team.score}
                </output>
                <p className="mt-1 text-sm text-muted-foreground">
                  {team.score === 1 ? "point" : "points"}
                </p>
              </div>
              <div className="flex gap-2">
                <Btn
                  variant="outline"
                  className="min-h-12 shrink-0 px-4"
                  disabled={blocked || team.score === 0}
                  aria-label={`Subtract 1 point from ${name}`}
                  onClick={() =>
                    save((current) => ({
                      ...current,
                      teams: current.teams.map((item) =>
                        item.id === team.id
                          ? { ...item, score: Math.max(0, item.score - 1) }
                          : item,
                      ),
                    }))
                  }
                >
                  <Minus size={20} aria-hidden="true" />
                </Btn>
                <Btn
                  className="min-h-12 min-w-0 flex-1 px-3"
                  disabled={blocked || team.score === MAX_GUESS_SONG_SCORE}
                  aria-label={`Add 1 point to ${name}`}
                  onClick={() =>
                    save((current) => ({
                      ...current,
                      teams: current.teams.map((item) =>
                        item.id === team.id
                          ? { ...item, score: Math.min(MAX_GUESS_SONG_SCORE, item.score + 1) }
                          : item,
                      ),
                    }))
                  }
                >
                  <Plus size={20} aria-hidden="true" /> 1 point
                </Btn>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
