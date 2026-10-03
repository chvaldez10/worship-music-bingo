import { useEffect, useState } from "react";
import {
  ALL_PHRASE_PROMPTS,
  PHRASE_PROMPTS,
  phraseKey,
  phrasePool,
} from "@/data/complete-the-phrase";
import { Btn, Select } from "@/components/ui-lite";
import { PromptCard } from "./PromptCard";

import { freshPhraseState, PHRASE_TIMER_OPTIONS, usePhraseGame } from "@/hooks/use-phrase-game";
import { PageLoading } from "@/components/PageLoading";

export function CompletePhraseGame() {
  const { state, loaded, blocked, notice, save } = usePhraseGame();
  const { results, currentId } = state;
  const [revealed, setRevealed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const msLeft =
    state.deadline === null
      ? state.remainingMs
      : Math.max(0, Math.min(state.timerSeconds * 1000, state.deadline - now));
  const secondsLeft = Math.ceil(msLeft / 1000);
  const running = state.deadline !== null && msLeft > 0;
  useEffect(() => {
    if (!loaded || state.deadline === null) return;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      if (time >= state.deadline!) window.clearInterval(interval);
    };
    const interval = window.setInterval(tick, 100);
    tick();
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [loaded, state.deadline]);
  const resetTimer = { remainingMs: state.timerSeconds * 1000, deadline: null };
  const current = PHRASE_PROMPTS.find((prompt) => prompt.id === currentId);
  const available = phrasePool();
  const played = new Set(
    results.map((result) =>
      phraseKey(ALL_PHRASE_PROMPTS.find((prompt) => prompt.id === result.id)!),
    ),
  );
  const remaining = available.filter(
    (prompt) =>
      !played.has(phraseKey(prompt)) && (!current || phraseKey(prompt) !== phraseKey(current)),
  );
  const bankSize = phrasePool().length;
  const correct = results.filter((result) => result.correct).length;
  const draw = () => {
    const next = remaining[Math.floor(Math.random() * remaining.length)];
    save({ ...state, ...resetTimer, currentId: next?.id ?? null });
    setRevealed(false);
  };
  const finish = (wasCorrect: boolean) => {
    if (!current) return;
    const next = remaining[Math.floor(Math.random() * remaining.length)];
    save({
      ...state,
      ...resetTimer,
      results: [...results, { id: current.id, correct: wasCorrect }],
      currentId: next?.id ?? null,
    });
    setRevealed(false);
  };
  if (!loaded) return <PageLoading message="Getting your game ready…" />;
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <p className="text-sm font-semibold uppercase tracking-widest text-primary">
        Host a camp game
      </p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">Complete the Phrase</h1>
      <p className="mt-3 text-muted-foreground">
        Read the first half. The next person in line immediately finishes it. Four syllables in
        every complete phrase!
      </p>
      {notice && (
        <p role="alert" className="mt-4 rounded-xl bg-secondary p-4 text-sm">
          {notice}
        </p>
      )}
      <section
        aria-label="Host controls"
        className="mt-6 rounded-3xl border border-border bg-card p-5 sm:p-8"
      >
        <p className="text-sm text-muted-foreground">
          {remaining.length} unused prompts available{current ? " after this one" : ""}. {bankSize}{" "}
          in the full bank — enough for {Math.floor(bankSize / 10)} complete trips through a
          10-person line.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="text-sm font-semibold">
            Time per prompt
            <Select
              value={state.timerSeconds}
              disabled={blocked || running}
              onChange={(event) => {
                const duration = Number(event.target.value) as typeof state.timerSeconds;
                save({
                  ...state,
                  timerSeconds: duration,
                  remainingMs: duration * 1000,
                  deadline: null,
                });
              }}
            >
              {PHRASE_TIMER_OPTIONS.map((duration) => (
                <option key={duration} value={duration}>
                  {duration} seconds
                </option>
              ))}
            </Select>
          </label>
          <div className="rounded-xl bg-secondary px-5 py-3 text-center">
            <span className="block text-xs font-semibold uppercase text-muted-foreground">
              Time remaining
            </span>
            <span
              role="timer"
              aria-label="Time remaining"
              className="font-display text-3xl tabular-nums"
            >
              {secondsLeft}s
            </span>
          </div>
        </div>
        {current && (
          <div className="mt-4 flex flex-wrap gap-3">
            <Btn
              disabled={
                blocked ||
                (!running && msLeft === 0) ||
                (!revealed && state.deadline === null && msLeft === state.timerSeconds * 1000)
              }
              onClick={() => {
                const time = Date.now();
                if (running)
                  save({
                    ...state,
                    remainingMs: Math.max(0, state.deadline! - time),
                    deadline: null,
                  });
                else {
                  setNow(time);
                  save({ ...state, deadline: time + state.remainingMs });
                  setRevealed(false);
                }
              }}
            >
              {running
                ? "Pause timer"
                : msLeft < state.timerSeconds * 1000
                  ? "Resume timer"
                  : "Start timer"}
            </Btn>
            <Btn
              variant="outline"
              disabled={blocked}
              onClick={() => save({ ...state, ...resetTimer })}
            >
              Reset timer
            </Btn>
          </div>
        )}
        {current && secondsLeft === 0 && (
          <p role="alert" className="mt-3 font-semibold text-primary">
            Time’s up! Record the result when ready. Your progress is kept.
          </p>
        )}
        <PromptCard
          titleLabel="Host reads"
          title={current?.first}
          detail={current?.second}
          detailLabel="Player completes"
          revealed={revealed}
          onToggle={() => setRevealed((value) => !value)}
          emptyTitle={remaining.length ? "Ready for the next person?" : "All prompts complete!"}
          emptyDetail={
            remaining.length
              ? "Draw a prompt, then privately reveal it to the host."
              : "Restart to play again."
          }
          hiddenDetail="Host only: keep this card out of the players’ sight."
          revealLabel="Show host card"
          hideLabel="Hide host card"
        />
        {current && revealed && (
          <div className="mt-3 rounded-xl border border-border p-3 text-sm">
            <p className="font-semibold">Read only “{current.first}” aloud.</p>
            {current.note && (
              <p className="mt-2 text-muted-foreground">Host note: {current.note}</p>
            )}
          </div>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          {current ? (
            <>
              <Btn
                disabled={
                  blocked ||
                  (!revealed && state.deadline === null && msLeft === state.timerSeconds * 1000)
                }
                onClick={() => finish(true)}
              >
                Correct · Next person
              </Btn>
              <Btn
                variant="outline"
                disabled={
                  blocked ||
                  (!revealed && state.deadline === null && msLeft === state.timerSeconds * 1000)
                }
                onClick={() => finish(false)}
              >
                Pass / Miss · Next person
              </Btn>
              <Btn
                variant="ghost"
                onClick={() => {
                  save({ ...state, ...resetTimer, currentId: null });
                  setRevealed(false);
                }}
              >
                Cancel this prompt
              </Btn>
            </>
          ) : (
            <Btn disabled={blocked || !remaining.length} onClick={draw}>
              Draw prompt
            </Btn>
          )}
        </div>
        <p role="status" className="mt-5 text-sm">
          {results.length} played · {correct} correct · {results.length - correct} passed / missed
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Btn
            variant="outline"
            disabled={blocked || !results.length}
            onClick={() => {
              const last = results.at(-1)!;
              save({
                ...state,
                ...resetTimer,
                results: results.slice(0, -1),
                currentId: last.id,
              });
              setRevealed(false);
            }}
          >
            Undo last result
          </Btn>
          <Btn
            variant="ghost"
            disabled={!blocked && !results.length && !current}
            onClick={() => {
              if (
                window.confirm(
                  "Restart Complete the Phrase? This clears the results and allows prompts to repeat.",
                )
              ) {
                save(
                  { ...freshPhraseState(), timerSeconds: state.timerSeconds, ...resetTimer },
                  true,
                );
                setRevealed(false);
              }
            }}
          >
            Restart game
          </Btn>
        </div>
      </section>
      <section className="mt-6 rounded-3xl border border-border bg-card p-5 sm:p-8">
        <h2 className="font-display text-2xl">How to play</h2>
        <ol className="mt-3 list-decimal space-y-3 pl-5 text-muted-foreground">
          <li>Line up your players. Prompts are mixed from the full Christian phrase bank.</li>
          <li>
            Keep the screen facing the host. Reveal the card and read only the first half aloud.
          </li>
          <li>
            Choose 5, 10, 15, or 20 seconds. After reading the first half, start the timer; this
            hides the card. The player finishes the phrase before time runs out.
          </li>
          <li>
            Accept natural equivalents and other valid Christian completions. The example answer is
            not always the only correct answer. Use four-syllable completions; private host notes
            flag common alternatives.
          </li>
          <li>
            Mark Correct or Pass / Miss to draw another hidden card. The player moves to the back of
            the line. Prompts do not repeat until you restart.
          </li>
        </ol>
        <p className="mt-4 text-sm text-muted-foreground">
          Progress is saved on this device. Use one host tab during the game. Refreshing keeps your
          progress and hides the card again. The prompt bank works without a database connection.
        </p>
      </section>
    </main>
  );
}
