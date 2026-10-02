import type { Cell } from "@/lib/bingo";
import { BingoSquare } from "./BingoSquare";

export function PrintableCard({ cells, number }: { cells: Cell[]; number: number }) {
  return (
    <section className="print-card">
      <header className="print-card-header">
        <h2>Worship Music Bingo</h2>
        <p>Card #{String(number).padStart(3, "0")}</p>
      </header>
      <div className="print-grid">
        {["B", "I", "N", "G", "O"].map((l) => (
          <div key={l} className="bingo-print-letter">
            {l}
          </div>
        ))}
        {cells.map((c, i) => (
          <BingoSquare key={i} cell={c} printable />
        ))}
      </div>
    </section>
  );
}
