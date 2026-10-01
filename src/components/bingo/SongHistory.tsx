import type { Song } from "@/data/songs";

export function SongHistory({ songs }: { songs: { song: Song; n: number }[] }) {
  if (!songs.length) return <p className="text-sm text-muted-foreground">No songs called yet.</p>;
  return (
    <ol className="divide-y divide-border">
      {songs.map(({ song, n }) => (
        <li key={song.id} className="flex items-baseline gap-3 py-2">
          <span className="w-8 shrink-0 text-right font-display text-lg text-primary tabular-nums">{n}.</span>
          <span className="font-semibold text-foreground">{song.title}</span>
          {song.artist && <span className="truncate text-sm text-muted-foreground">— {song.artist}</span>}
        </li>
      ))}
    </ol>
  );
}
