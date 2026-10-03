import { useEffect, useMemo, useState } from "react";
import { SONGS, validateSongs } from "@/data/songs";
import { drawNext, restoreCalled } from "@/lib/caller";
import { Btn } from "@/components/ui-lite";
import { SongHistory } from "./SongHistory";
import { LoadingState } from "@/components/PageLoading";

const KEY = "wmb-caller-v1";
const byId = new Map(SONGS.map((s) => [s.id, s]));

export function CallerDashboard() {
  const [called, setCalled] = useState<string[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showRemaining, setShowRemaining] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "[]");
      setCalled(restoreCalled(SONGS, saved));
    } catch {
      setStorageError("Saved game could not be loaded. You can still play in this tab.");
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem(KEY, JSON.stringify(called));
      } catch {
        setStorageError(
          "Game progress cannot be saved on this browser. Keep this tab open while playing.",
        );
      }
    }
  }, [called, loaded]);

  const songError = useMemo(() => {
    try {
      validateSongs(SONGS);
      return SONGS.length ? null : "Add songs to the master song list before starting the caller.";
    } catch (error) {
      return error instanceof Error ? error.message : "The master song list is invalid.";
    }
  }, []);

  const current = called.length ? (byId.get(called[called.length - 1] ?? "") ?? null) : null;
  const history = useMemo(
    () =>
      called
        .slice(0, -1)
        .map((id, i) => ({ song: byId.get(id)!, n: i + 1 }))
        .reverse(),
    [called],
  );
  const remaining = SONGS.filter((s) => !called.includes(s.id));
  const done = remaining.length === 0;
  const pct = SONGS.length ? (called.length / SONGS.length) * 100 : 0;

  const draw = () => {
    setCalled((previous) => {
      const id = drawNext(SONGS, previous);
      return id ? [...previous, id] : previous;
    });
  };
  const restart = () => {
    if (window.confirm("Restart the game? This clears all called songs.")) setCalled([]);
  };

  if (songError)
    return (
      <p role="alert" className="text-destructive">
        {songError}
      </p>
    );

  if (!loaded) return <LoadingState message="Getting your caller ready…" />;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="min-w-0 space-y-6">
        {storageError && (
          <p role="status" className="text-muted-foreground">
            {storageError}
          </p>
        )}
        <section
          aria-live="polite"
          aria-atomic="true"
          className="now-playing relative overflow-hidden rounded-3xl p-8 text-center shadow-soft sm:p-12"
        >
          <p className="text-sm font-bold tracking-[0.25em] uppercase opacity-80">
            {current ? `Now playing · #${called.length}` : "Ready to start"}
          </p>
          <h1
            key={current?.id}
            className="now-title mt-4 font-display text-4xl leading-tight sm:text-6xl"
          >
            {current ? current.title : "Draw the first song"}
          </h1>
          {current?.artist && (
            <p className="mt-3 text-lg opacity-85 sm:text-xl">{current.artist}</p>
          )}
          {done && (
            <p className="mt-6 inline-block rounded-full bg-background/20 px-4 py-1.5 font-semibold">
              All songs have been called.
            </p>
          )}
        </section>

        <div className="flex flex-wrap gap-3">
          <Btn
            onClick={draw}
            disabled={!loaded || done}
            className="flex-1 basis-full py-4 text-lg sm:basis-48"
          >
            Draw Next Song
          </Btn>
          <Btn
            variant="outline"
            onClick={() => setCalled((c) => c.slice(0, -1))}
            disabled={!loaded || !called.length}
          >
            Undo Last Song
          </Btn>
          <Btn variant="danger" onClick={restart} disabled={!loaded || !called.length}>
            Restart Game
          </Btn>
        </div>

        <section className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-baseline justify-between">
            <span className="font-display text-2xl text-foreground tabular-nums">
              {called.length} / {SONGS.length}
            </span>
            <span className="text-sm text-muted-foreground">songs called</span>
          </div>
          <div
            role="progressbar"
            aria-label="Songs called"
            aria-valuemin={0}
            aria-valuemax={SONGS.length}
            aria-valuenow={called.length}
            className="mt-3 h-3 overflow-hidden rounded-full bg-secondary"
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <button
            onClick={() => setShowRemaining((v) => !v)}
            className="mt-4 min-h-11 text-sm font-semibold text-primary hover:underline"
          >
            {showRemaining ? "Hide" : "Show"} remaining songs ({remaining.length})
          </button>
          {showRemaining && (
            <ul className="mt-3 grid gap-x-4 gap-y-1 text-sm text-muted-foreground sm:grid-cols-2">
              {remaining.map((s) => (
                <li key={s.id}>{s.title}</li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-3xl border border-border bg-card p-5 lg:max-h-[calc(100vh-120px)] lg:overflow-auto">
        <h2 className="mb-2 font-display text-2xl text-foreground">Previously called</h2>
        <SongHistory songs={history} />
      </section>
    </div>
  );
}
