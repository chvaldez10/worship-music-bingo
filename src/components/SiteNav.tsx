import { Link } from "@tanstack/react-router";

const links = [
  { to: "/play", label: "Play" },
  { to: "/caller", label: "Caller" },
  { to: "/print", label: "Print" },
] as const;

export function SiteNav() {
  return (
    <header className="no-print sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
        <Link to="/" className="font-display text-lg text-foreground sm:text-xl">
          Worship <span className="text-primary">Bingo</span>
        </Link>
        <div className="flex gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
