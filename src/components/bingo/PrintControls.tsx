import { Btn } from "@/components/ui-lite";
import { cn } from "@/lib/utils";

const PRESETS = [1, 5, 10, 20, 25, 50];

type Props = {
  count: number;
  setCount: (n: number) => void;
  onGenerate: () => void;
  hasCards: boolean;
};

export function PrintControls({ count, setCount, onGenerate, hasCards }: Props) {
  return (
    <div className="no-print rounded-3xl border border-border bg-card p-6 shadow-soft">
      <h1 className="font-display text-3xl text-foreground">Print bingo cards</h1>
      <p className="mt-1 text-muted-foreground">Each card is randomized and numbered — one per US Letter page.</p>
      <label className="mt-6 block text-sm font-semibold text-foreground">Number of cards</label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setCount(p)}
            className={cn(
              "h-10 min-w-12 rounded-full border-2 px-3 text-sm font-semibold transition-colors",
              count === p ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary",
            )}
          >
            {p}
          </button>
        ))}
        <input
          type="number"
          min={1}
          max={500}
          value={count}
          onChange={(e) => setCount(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
          className="h-10 w-24 rounded-full border-2 border-border bg-background px-4 text-sm font-semibold"
          aria-label="Custom number of cards"
        />
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Btn onClick={onGenerate}>Generate Cards</Btn>
        <Btn variant="outline" disabled={!hasCards} onClick={() => window.print()}>Print / Save as PDF</Btn>
      </div>
    </div>
  );
}
