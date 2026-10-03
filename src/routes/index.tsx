import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Grid3X3,
  Drama,
  MicVocal,
  ArrowRight,
  UsersRound,
  Music2,
  MessageCircle,
} from "lucide-react";
import { GAMES } from "@/data/games";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Church Camp Games" },
      {
        name: "description",
        content:
          "Bring everyone together with Worship Bingo, Charades, Worship Singing Bee, Guess the Song, Complete the Phrase, and Who’s the Leader?",
      },
    ],
  }),
  component: Index,
});
const icons = {
  "complete-the-phrase": MessageCircle,
  "guess-the-song": Music2,
  bingo: Grid3X3,
  charades: Drama,
  "singing-bee": MicVocal,
  "whos-the-leader": UsersRound,
};

function Index() {
  return (
    <main className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
      <div className="hero-glow" aria-hidden />
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          Faith, friendship & a little friendly competition
        </p>
        <h1 className="mt-5 font-display text-5xl leading-tight sm:text-7xl">
          Church Camp <em className="text-primary">Games</em>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
          Bring your group together. Pick a game, gather your teams, and let the fun begin.
        </p>
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-2">
        {GAMES.map((game) => {
          const Icon = icons[game.id];
          return (
            <Link
              key={game.id}
              to={game.path}
              className="group flex flex-col rounded-3xl border border-border bg-card p-6 shadow-soft transition-transform hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-primary"
            >
              <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
                <Icon aria-hidden size={28} />
              </span>
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                {game.subtitle}
              </p>
              <h2 className="mt-2 font-display text-3xl">{game.title}</h2>
              <p className="mt-3 flex-1 text-muted-foreground">{game.description}</p>
              <p className="mt-5 text-xs font-semibold text-muted-foreground">{game.details}</p>
              <span className="mt-6 flex items-center gap-2 font-semibold text-primary">
                Open game <ArrowRight aria-hidden size={18} />
              </span>
            </Link>
          );
        })}
      </div>
      <div className="mx-auto mt-10 max-w-2xl rounded-2xl bg-secondary px-6 py-5 text-center">
        <h2 className="font-display text-xl">One shared worship song bank</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Bingo, Singing Bee, and worship-song charades use the same familiar songs. For 30–40
          campers, split into teams for the hosted games and give everyone a card for Bingo.
        </p>
      </div>
    </main>
  );
}
