import { Btn } from "@/components/ui-lite";
import { MAX_PRINT_CARDS } from "@/lib/bingo";
import { cn } from "@/lib/utils";

const COUNT_PRESETS = [1, 5, 10, 20, 25, 50];
export type CardsPerPage = 1 | 2 | 4;
const LAYOUTS: CardsPerPage[] = [1, 2, 4];

type Props = {
  count: string;
  setCount: (n: string) => void;
  perPage: CardsPerPage;
  setPerPage: (n: CardsPerPage) => void;
  error: string | null;
  onGenerate: () => void;
  hasCards: boolean;
};

export function PrintControls({
  count,
  setCount,
  perPage,
  setPerPage,
  error,
  onGenerate,
  hasCards,
}: Props) {
  return (
    <div className="no-print rounded-3xl border border-border bg-card p-6 shadow-soft">
      <h1 className="font-display text-3xl text-foreground">Print bingo cards</h1>
      <p className="mt-1 text-muted-foreground">
        Each card is uniquely randomized and numbered. Choose how many cards to make. Choose 1, 2,
        or 4 cards per US Letter page.
      </p>

      <label htmlFor="card-count" className="mt-6 block text-sm font-semibold text-foreground">
        Number of unique cards
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {COUNT_PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setCount(String(p))}
            aria-pressed={count === String(p)}
            className={cn(
              "h-12 min-w-12 rounded-full border-2 px-3 text-sm font-semibold transition-colors",
              count === String(p)
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-secondary",
            )}
          >
            {p}
          </button>
        ))}
        <input
          type="number"
          min={1}
          max={MAX_PRINT_CARDS}
          id="card-count"
          step={1}
          aria-invalid={!!error}
          aria-describedby={error ? "print-error" : undefined}
          value={count}
          onChange={(e) => setCount(e.target.value)}
          className="h-12 w-24 rounded-full border-2 border-border bg-background px-4 text-sm font-semibold"
          aria-label="Custom number of cards"
        />
      </div>

      <fieldset className="mt-6">
        <legend className="text-sm font-semibold text-foreground">Cards per printed page</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {LAYOUTS.map((layout) => (
            <button
              key={layout}
              type="button"
              aria-pressed={perPage === layout}
              onClick={() => setPerPage(layout)}
              className={cn(
                "h-12 rounded-full border-2 px-4 text-sm font-semibold transition-colors",
                perPage === layout
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-secondary",
              )}
            >
              {layout} per page
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Changing the layout keeps your generated cards. Generate Cards makes a fresh randomized
          batch.
        </p>
      </fieldset>

      {error && (
        <p id="print-error" role="alert" className="mt-4 text-destructive">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <Btn onClick={onGenerate}>Generate Cards</Btn>
        <Btn variant="outline" disabled={!hasCards} onClick={() => window.print()}>
          Print / Save as PDF
        </Btn>
      </div>
    </div>
  );
}
