import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SONGS } from "@/data/songs";
import { createBingoCard, type Cell } from "@/lib/bingo";
import { PrintableCard } from "@/components/bingo/PrintableCard";
import { PrintControls } from "@/components/bingo/PrintControls";

export const Route = createFileRoute("/print")({
  head: () => ({
    meta: [
      { title: "Print Cards — Worship Music Bingo" },
      { name: "description", content: "Generate and print uniquely numbered, randomized bingo cards on US Letter paper." },
      { property: "og:title", content: "Print Cards — Worship Music Bingo" },
      { property: "og:description", content: "Generate and print uniquely numbered, randomized bingo cards on US Letter paper." },
    ],
  }),
  component: PrintPage,
});

function PrintPage() {
  const [count, setCount] = useState(10);
  const [cards, setCards] = useState<Cell[][]>([]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <PrintControls
        count={count}
        setCount={setCount}
        hasCards={cards.length > 0}
        onGenerate={() => setCards(Array.from({ length: count }, () => createBingoCard(SONGS)))}
      />
      {cards.length > 0 && (
        <div className="print-stack mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c, i) => (
            <PrintableCard key={i} cells={c} number={i + 1} />
          ))}
        </div>
      )}
    </main>
  );
}
