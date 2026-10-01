import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SONGS } from "@/data/songs";
import { createBingoCard, detectBingo, initialMarks, FREE_INDEX, type Cell } from "@/lib/bingo";
import { BingoCard } from "@/components/bingo/BingoCard";
import { PrintableCard } from "@/components/bingo/PrintableCard";
import { Btn } from "@/components/ui-lite";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Play — Worship Music Bingo" },
      { name: "description", content: "Your randomized worship music bingo card. Tap songs as you hear them." },
      { property: "og:title", content: "Play — Worship Music Bingo" },
      { property: "og:description", content: "Your randomized worship music bingo card. Tap songs as you hear them." },
    ],
  }),
  component: PlayPage,
});

function PlayPage() {
  const [cells, setCells] = useState<Cell[] | null>(null);
  const [marked, setMarked] = useState<boolean[]>(initialMarks);

  // Generate on the client only so each device gets its own shuffle.
  useEffect(() => setCells(createBingoCard(SONGS)), []);

  const lines = useMemo(() => detectBingo(marked), [marked]);
  const winning = useMemo(() => new Set(lines.flat()), [lines]);

  const toggle = (i: number) => {
    if (i === FREE_INDEX) return;
    setMarked((m) => m.map((v, j) => (j === i ? !v : v)));
  };
  const newCard = () => {
    setCells(createBingoCard(SONGS));
    setMarked(initialMarks());
  };

  return (
    <main className="mx-auto max-w-xl px-2 py-6 sm:px-4 sm:py-10">
      <div className="no-print">
        <div className="mb-4 flex min-h-12 items-center justify-center" aria-live="polite">
          {lines.length > 0 ? (
            <div className="bingo-banner rounded-full bg-primary px-6 py-2 font-display text-2xl text-primary-foreground shadow-soft">
              BINGO!{lines.length > 1 && <span className="ml-2 text-base">× {lines.length}</span>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Tap a song when you hear it.</p>
          )}
        </div>

        {cells ? (
          <BingoCard cells={cells} marked={marked} winning={winning} onToggle={toggle} />
        ) : (
          <div className="aspect-[5/5.4] w-full animate-pulse rounded-2xl bg-secondary" />
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Btn onClick={newCard}>New Card</Btn>
          <Btn variant="outline" onClick={() => setMarked(initialMarks())}>Reset Marks</Btn>
          <Btn variant="outline" onClick={() => window.print()}>Print Card</Btn>
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
