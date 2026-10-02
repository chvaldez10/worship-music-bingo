import { Link, useRouterState } from "@tanstack/react-router";
import { GAMES } from "@/data/games";

const bingoLinks = [
  { to: "/play", label: "Play Bingo" },
  { to: "/caller", label: "Bingo Caller" },
  { to: "/print", label: "Print Cards" },
] as const;

export function SiteNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isBingo = ["/bingo", "/play", "/caller", "/print"].includes(pathname);
  return (
    <header className="no-print sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
      <nav
        aria-label="Games"
        className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3"
      >
        <Link to="/" className="font-display text-lg text-foreground sm:text-xl">
          Camp <span className="text-primary">Games</span>
        </Link>
        <div className="flex flex-wrap gap-1">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className="rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-secondary"
            activeProps={{ className: "bg-secondary text-foreground" }}
          >
            All games
          </Link>
          {GAMES.map((game) => (
            <Link
              key={game.id}
              to={game.path}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-secondary hover:text-foreground ${game.id === "bingo" && isBingo ? "bg-secondary text-foreground" : "text-muted-foreground"}`}
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {game.shortTitle}
            </Link>
          ))}
        </div>
      </nav>
      {isBingo && (
        <nav
          aria-label="Worship Bingo"
          className="mx-auto flex max-w-6xl flex-wrap gap-1 px-4 pb-3"
        >
          {bingoLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-secondary"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
