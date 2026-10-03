import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SONGS } from "@/data/songs";
import {
  createBingoCard,
  restoreBingoCard,
  detectBingo,
  initialMarks,
  FREE_INDEX,
  type Cell,
} from "@/lib/bingo";
import { BingoCard } from "@/components/bingo/BingoCard";
import { PrintableCard } from "@/components/bingo/PrintableCard";
import { Btn } from "@/components/ui-lite";
import { PageLoading } from "@/components/PageLoading";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Play — Worship Music Bingo" },
      {
        name: "description",
        content: "Your randomized worship music bingo card. Tap songs as you hear them.",
      },
      { property: "og:title", content: "Play — Worship Music Bingo" },
      {
        property: "og:description",
        content: "Your randomized worship music bingo card. Tap songs as you hear them.",
      },
    ],
  }),
  component: PlayPage,
});

function PlayPage() {
  const [cells, setCells] = useState<Cell[] | null>(null);
  const [marked, setMarked] = useState<boolean[]>(initialMarks);

  const [storageError, setStorageError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Read only after hydration; each player tab keeps its own card and marks.
  useEffect(() => {
    try {
      let restored: ReturnType<typeof restoreBingoCard> | null = null;
      try {
        const saved = sessionStorage.getItem("camp-bingo-player-v1");
        if (saved) restored = restoreBingoCard(JSON.parse(saved), SONGS);
      } catch {
        setStorageError("The saved card could not be restored. A new card is ready.");
      }
      setCells(restored?.cells ?? createBingoCard(SONGS));
      setMarked(restored?.marked ?? initialMarks());
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not generate a card.");
    }
  }, []);
  useEffect(() => {
    if (!cells) return;
    try {
      sessionStorage.setItem(
        "camp-bingo-player-v1",
        JSON.stringify({
          version: 1,
          ids: cells.map((cell) => (cell.kind === "free" ? null : cell.song.id)),
          marked,
        }),
      );
    } catch {
      setStorageError("This browser cannot save your card. Keep this page open while playing.");
    }
  }, [cells, marked]);

  const lines = useMemo(() => detectBingo(marked), [marked]);
  const winning = useMemo(() => new Set(lines.flat()), [lines]);

  const toggle = (i: number) => {
    if (i === FREE_INDEX) return;
    setMarked((m) => m.map((v, j) => (j === i ? !v : v)));
  };
  const newCard = () => {
    try {
      setCells(createBingoCard(SONGS));
      setMarked(initialMarks());
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not generate a card.");
    }
  };

  if (!cells && !error) return <PageLoading message="Getting your bingo card ready…" />;

  return (
    <main className="mx-auto max-w-xl px-2 py-6 sm:px-4 sm:py-10">
      <div className="no-print">
        {storageError && (
          <p role="status" className="mb-4 text-center text-sm text-muted-foreground">
            {storageError}
          </p>
        )}
        <div className="mb-4 flex min-h-12 items-center justify-center" aria-live="polite">
          {lines.length > 0 ? (
            <div className="bingo-banner rounded-full bg-primary px-6 py-2 font-display text-2xl text-primary-foreground shadow-soft">
              BINGO!{lines.length > 1 && <span className="ml-2 text-base">× {lines.length}</span>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Tap a song when you hear it.</p>
          )}
        </div>

        {error && (
          <p role="alert" className="mb-4 text-center text-destructive">
            {error}
          </p>
        )}
        {cells && <BingoCard cells={cells} marked={marked} winning={winning} onToggle={toggle} />}

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Btn onClick={newCard}>New Card</Btn>
          <Btn variant="outline" disabled={!cells} onClick={() => setMarked(initialMarks())}>
            Reset Marks
          </Btn>
          <Btn variant="outline" disabled={!cells} onClick={() => window.print()}>
            Print Card
          </Btn>
        </div>
      </div>
      {cells && (
        <div className="print-only">
          <PrintableCard cells={cells} number={1} />
        </div>
      )}
    </main>
  );
}
