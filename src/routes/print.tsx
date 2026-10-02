import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SONGS } from "@/data/songs";
import { createBingoBatch, type Cell } from "@/lib/bingo";
import { PrintableCard } from "@/components/bingo/PrintableCard";
import { PrintControls, type CardsPerPage } from "@/components/bingo/PrintControls";

export const Route = createFileRoute("/print")({
  head: () => ({
    meta: [
      { title: "Print Cards — Worship Music Bingo" },
      {
        name: "description",
        content:
          "Generate uniquely numbered, randomized bingo cards — print 1, 2, or 4 per US Letter page.",
      },
      { property: "og:title", content: "Print Cards — Worship Music Bingo" },
      {
        property: "og:description",
        content:
          "Generate uniquely numbered, randomized bingo cards — print 1, 2, or 4 per US Letter page.",
      },
    ],
  }),
  component: PrintPage,
});

function PrintPage() {
  const [count, setCount] = useState("10");
  const [perPage, setPerPage] = useState<CardsPerPage>(1);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<Cell[][]>([]);

  const sheets = Array.from({ length: Math.ceil(cards.length / perPage) }, (_, i) =>
    cards.slice(i * perPage, (i + 1) * perPage),
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <PrintControls
        count={count}
        setCount={setCount}
        perPage={perPage}
        setPerPage={setPerPage}
        error={error}
        hasCards={cards.length > 0}
        onGenerate={() => {
          try {
            setCards(createBingoBatch(SONGS, Number(count)));
            setError(null);
          } catch (error) {
            setError(
              error instanceof Error
                ? error.message
                : "Could not generate cards. Please try again.",
            );
          }
        }}
      />
      {cards.length > 0 && (
        <div className="print-batch mt-8">
          <p role="status" className="no-print mb-4 text-sm text-muted-foreground">
            {cards.length} unique cards · {sheets.length} printed{" "}
            {sheets.length === 1 ? "page" : "pages"} · {perPage} per page
          </p>
          <div className="print-stack grid gap-8">
            {sheets.map((sheet, pageIndex) => (
              <div key={pageIndex} className={`print-sheet print-layout-${perPage}`}>
                {sheet.map((cells, cardIndex) => (
                  <PrintableCard
                    key={cardIndex}
                    cells={cells}
                    number={pageIndex * perPage + cardIndex + 1}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
