import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Worship Music Bingo" },
      { name: "description", content: "Music bingo for church and community events — play, call songs, and print cards." },
      { property: "og:title", content: "Worship Music Bingo" },
      { property: "og:description", content: "Music bingo for church and community events — play, call songs, and print cards." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="relative mx-auto flex min-h-[calc(100vh-60px)] max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="hero-glow" aria-hidden />
      <p className="mb-4 text-sm font-semibold tracking-[0.2em] text-primary uppercase">A night of songs & fellowship</p>
      <h1 className="font-display text-5xl leading-[1.05] text-foreground sm:text-7xl">
        Worship Music <em className="text-primary">Bingo</em>
      </h1>
      <p className="mt-6 max-w-xl text-lg text-muted-foreground">
        Listen for the songs you love, mark your card, and shout “Bingo!” when you complete a line.
      </p>
      <Link
        to="/play"
        className="mt-10 rounded-full bg-primary px-10 py-4 text-lg font-bold text-primary-foreground shadow-soft transition-transform hover:scale-[1.03]"
      >
        Play Bingo
      </Link>
      <div className="mt-4 flex gap-3">
        <Link to="/caller" className="rounded-full border-2 border-border bg-card px-6 py-2.5 font-semibold text-foreground hover:bg-secondary">
          Caller
        </Link>
        <Link to="/print" className="rounded-full border-2 border-border bg-card px-6 py-2.5 font-semibold text-foreground hover:bg-secondary">
          Print Cards
        </Link>
      </div>
    </main>
  );
}
