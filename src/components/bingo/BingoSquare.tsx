import type { Cell } from "@/lib/bingo";
import { cn } from "@/lib/utils";

type Props = {
  cell: Cell;
  marked?: boolean;
  inBingo?: boolean;
  onToggle?: () => void;
  printable?: boolean;
};

function sizeFor(title: string) {
  const n = title.length;
  if (n > 26) return "text-[0.55rem] sm:text-xs";
  if (n > 16) return "text-[0.62rem] sm:text-sm";
  return "text-[0.7rem] sm:text-base";
}

export function BingoSquare({ cell, marked, inBingo, onToggle, printable }: Props) {
  const isFree = cell.kind === "free";
  const label = isFree ? "FREE" : cell.song.title;

  if (printable) {
    return (
      <div className="bingo-print-cell">
        {isFree ? <span className="bingo-print-free">FREE</span> : <span>{label}</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isFree}
      aria-pressed={marked}
      aria-label={label}
      className={cn(
        "bingo-cell relative flex min-h-20 w-full sm:aspect-square items-center justify-center min-w-0 overflow-hidden p-1 text-center font-semibold break-words hyphens-auto transition-all sm:p-2",
        isFree
          ? "bg-primary text-primary-foreground font-display text-base sm:text-2xl"
          : sizeFor(label),
        !isFree && !marked && "bg-card text-card-foreground hover:bg-secondary",
        !isFree && marked && "bg-mark text-mark-foreground",
        inBingo && "bingo-win",
        "leading-tight",
      )}
    >
      {marked && !isFree && <span className="bingo-dot" aria-hidden />}
      <span className="relative z-10 min-w-0 [overflow-wrap:anywhere]">{label}</span>
    </button>
  );
}
