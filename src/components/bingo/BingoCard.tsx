import type { Cell } from "@/lib/bingo";
import { BingoSquare } from "./BingoSquare";

const LETTERS = ["B", "I", "N", "G", "O"];

type Props = {
  cells: Cell[];
  marked: boolean[];
  winning: Set<number>;
  onToggle: (i: number) => void;
};

export function BingoCard({ cells, marked, winning, onToggle }: Props) {
  return (
    <div className="bingo-board w-full overflow-hidden rounded-2xl border-2 border-board bg-board shadow-soft">
      <div className="grid grid-cols-5 gap-[2px] bg-board">
        {LETTERS.map((l) => (
          <div key={l} className="bg-board py-2 text-center font-display text-2xl text-board-foreground sm:text-4xl">
            {l}
          </div>
        ))}
        {cells.map((cell, i) => (
          <BingoSquare
            key={i}
            cell={cell}
            marked={marked[i]}
            inBingo={winning.has(i)}
            onToggle={() => onToggle(i)}
          />
        ))}
      </div>
    </div>
  );
}
