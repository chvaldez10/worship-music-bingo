import type { Song } from "@/data/songs";

export function SongHistory({ songs }: { songs: { song: Song; n: number }[] }) {
  if (!songs.length)
    return (
      <p className="text-sm text-muted-foreground">
        No previously called songs. The latest song appears under Now playing.
      </p>
    );
  return (
    <ol reversed className="divide-y divide-border">
      {songs.map(({ song, n }) => (
        <li key={song.id} value={n} className="flex items-baseline gap-3 py-2">
          <span className="w-8 shrink-0 text-right font-display text-lg text-primary tabular-nums">
            {n}.
          </span>
          <div className="min-w-0 break-words">
            <p className="font-semibold text-foreground">{song.title}</p>
            {song.artist && <p className="text-sm text-muted-foreground">{song.artist}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
