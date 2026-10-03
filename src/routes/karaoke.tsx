import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Btn } from "@/components/ui-lite";
import { useKaraoke } from "@/hooks/use-karaoke";
import { PageLoading } from "@/components/PageLoading";
import { LibraryBackups } from "@/components/songs/LibraryBackups";
import { YouTubeLinks } from "@/components/songs/YouTubeLinks";
import { KaraokeConflictError, moveSong, nextId, tasteSummary } from "@/lib/karaoke";

export const Route = createFileRoute("/karaoke")({
  head: () => ({ meta: [{ title: "My Karaoke • Church Camp Games" }] }),
  component: KaraokePage,
});
const inputClass =
  "min-h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-sm";
function KaraokePage() {
  const { library, ready, error, blocked, save, exportLibrary, setError } = useKaraoke();
  const [deletingList, setDeletingList] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [listName, setListName] = useState("");
  const [notice, setNotice] = useState("");
  const [dimension, setDimension] = useState<"genre" | "decade" | "tempo" | "tag">("genre");
  const disabled = !ready || blocked;
  const currentList = library.setlists.find((list) => list.id === selected) ?? library.setlists[0];
  const summary = tasteSummary(library.songs, dimension);
  const rated = library.songs.filter((song) => song.rating !== null).length;
  function changeList(update: (ids: number[]) => number[]) {
    if (!currentList) return false;
    return save((current) => {
      const existing = current.setlists.find((list) => list.id === currentList.id);
      if (!existing || JSON.stringify(existing.songIds) !== JSON.stringify(currentList.songIds)) {
        throw new KaraokeConflictError(
          "This setlist changed in another tab. Refresh before changing its order.",
        );
      }
      return {
        ...current,
        setlists: current.setlists.map((list) =>
          list.id === currentList.id ? { ...list, songIds: update(list.songIds) } : list,
        ),
      };
    });
  }

  if (!ready) return <PageLoading message="Loading your setlists…" />;
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-4xl">My karaoke</h1>
      <p className="mt-3 text-muted-foreground">
        Build a setlist and discover the styles and tempos you enjoy.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Saved on this device, separate from camp games. Export a backup to keep or move your
        library. Cloud saving isn’t connected yet.
      </p>
      <a
        href="/songs"
        className="mt-4 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
      >
        Manage songs & YouTube links →
      </a>
      <LibraryBackups
        ready={ready}
        save={save}
        exportLibrary={exportLibrary}
        setError={setError}
        onImported={() => {
          setSelected(null);
          setDeletingList(null);
        }}
      />
      {error && (
        <p role="alert" className="mt-4 text-destructive">
          {error}
        </p>
      )}
      <p role="status" className="mt-2 text-sm text-primary">
        {notice}
      </p>
      <section
        aria-labelledby="setlist-heading"
        className="mt-10 rounded-2xl border border-border bg-card p-5"
      >
        <h2 id="setlist-heading" className="font-display text-2xl">
          Setlists
        </h2>
        <form
          className="mt-4 flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const name = listName.trim();
            if (!name) return;
            let id = 0;
            if (
              save((current) => {
                id = nextId(current.setlists);
                return { ...current, setlists: [...current.setlists, { id, name, songIds: [] }] };
              })
            ) {
              setSelected(id);
              setListName("");
            }
          }}
        >
          <label className="min-w-0 grow">
            <span className="sr-only">New setlist name</span>
            <input
              required
              maxLength={120}
              className={inputClass}
              value={listName}
              onChange={(event) => setListName(event.target.value)}
              placeholder="e.g. Friday karaoke"
            />
          </label>
          <Btn type="submit" disabled={disabled}>
            Create setlist
          </Btn>
        </form>
        {currentList ? (
          <>
            <label className="mt-4 block">
              Choose setlist
              <select
                className={inputClass}
                value={currentList.id}
                onChange={(event) => setSelected(Number(event.target.value))}
              >
                {library.setlists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </select>
            </label>
            <form
              className="mt-4 flex flex-wrap items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const id = Number(new FormData(event.currentTarget).get("songId"));
                if (!library.songs.some((song) => song.id === id)) return;
                if (changeList((ids) => [...ids, id])) setNotice("Song added to your setlist.");
              }}
            >
              <label className="min-w-0 grow">
                Add a song
                <select
                  name="songId"
                  required
                  className={inputClass}
                  disabled={disabled || !library.songs.length}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Choose a song
                  </option>
                  {library.songs.map((song) => (
                    <option key={song.id} value={song.id}>
                      {song.title}
                      {song.artist ? ` — ${song.artist}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <Btn type="submit" disabled={disabled || !library.songs.length}>
                Add to setlist
              </Btn>
            </form>
            <ol className="mt-4 space-y-2">
              {currentList.songIds.map((id, index) => {
                const song = library.songs.find((item) => item.id === id)!;
                return (
                  <li
                    role="listitem"
                    key={`${id}-${index}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-secondary px-3 py-2"
                  >
                    <div className="min-w-0 [overflow-wrap:anywhere]">
                      <span>
                        {index + 1}. {song.title}
                      </span>
                      {song.youtubeUrls.length > 0 && (
                        <div>
                          <YouTubeLinks urls={song.youtubeUrls} title={song.title} />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Btn
                        variant="ghost"
                        disabled={disabled || index === 0}
                        aria-label={`Move ${song.title} at position ${index + 1} up`}
                        onClick={() => changeList((ids) => moveSong(ids, index, -1))}
                      >
                        ↑
                      </Btn>
                      <Btn
                        variant="ghost"
                        disabled={disabled || index === currentList.songIds.length - 1}
                        aria-label={`Move ${song.title} at position ${index + 1} down`}
                        onClick={() => changeList((ids) => moveSong(ids, index, 1))}
                      >
                        ↓
                      </Btn>
                      <Btn
                        variant="ghost"
                        disabled={disabled}
                        aria-label={`Remove ${song.title} at position ${index + 1}`}
                        onClick={() => changeList((ids) => ids.filter((_, i) => i !== index))}
                      >
                        Remove
                      </Btn>
                    </div>
                  </li>
                );
              })}
            </ol>
            {!currentList.songIds.length && (
              <p className="mt-4 text-muted-foreground">
                Choose a song above, then select “Add to setlist” to start.
              </p>
            )}
            <form
              key={currentList.id}
              className="mt-4 flex flex-wrap gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const name = String(new FormData(event.currentTarget).get("name")).trim();
                if (name)
                  save((current) => ({
                    ...current,
                    setlists: current.setlists.map((list) =>
                      list.id === currentList.id ? { ...list, name } : list,
                    ),
                  }));
              }}
            >
              <label className="min-w-0 grow">
                <span className="sr-only">Setlist name</span>
                <input
                  name="name"
                  required
                  maxLength={120}
                  className={inputClass}
                  defaultValue={currentList.name}
                />
              </label>
              <Btn disabled={disabled} type="submit" variant="outline">
                Rename setlist
              </Btn>
            </form>
            <Btn
              variant="danger"
              className="mt-4"
              disabled={disabled}
              onClick={() => setDeletingList(currentList.id)}
            >
              Delete setlist
            </Btn>
            {deletingList === currentList.id && (
              <div className="mt-3">
                <p>Delete this setlist? Your songs and ratings will stay in your library.</p>
                <Btn
                  variant="danger"
                  onClick={() => {
                    if (
                      save((current) => ({
                        ...current,
                        setlists: current.setlists.filter((list) => list.id !== currentList.id),
                      }))
                    )
                      setDeletingList(null);
                  }}
                >
                  Confirm delete setlist
                </Btn>
                <Btn variant="ghost" onClick={() => setDeletingList(null)}>
                  Keep setlist
                </Btn>
              </div>
            )}
          </>
        ) : (
          <p className="mt-4 text-muted-foreground">
            Create your first setlist, then add songs from the library.
          </p>
        )}
      </section>
      <section
        aria-labelledby="taste-heading"
        className="mt-10 rounded-2xl border border-border bg-card p-5"
      >
        <h2 id="taste-heading" className="font-display text-2xl">
          What do I like?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {rated} rated songs. Averages use only rated songs with the selected detail filled in.
          Check the sample size before drawing conclusions.
        </p>
        <label className="mt-4 block max-w-xs">
          Compare by
          <select
            className={inputClass}
            value={dimension}
            onChange={(event) => setDimension(event.target.value as typeof dimension)}
          >
            <option value="genre">Genre</option>
            <option value="tag">Tags</option>
            <option value="decade">Decade</option>
            <option value="tempo">Tempo</option>
          </select>
        </label>
        {summary.length ? (
          <table className="mt-4 w-full text-left text-sm">
            <caption className="sr-only">Average ratings by {dimension}</caption>
            <thead>
              <tr>
                <th scope="col" className="py-2">
                  Group
                </th>
                <th scope="col">Average rating</th>
                <th scope="col">Rated songs</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((group) => (
                <tr key={group.label} className="border-t border-border">
                  <td className="py-2 capitalize [overflow-wrap:anywhere]">{group.label}</td>
                  <td>{group.average.toFixed(1)} / 5</td>
                  <td>{group.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-4 text-muted-foreground">
            Add ratings and{" "}
            {dimension === "tempo"
              ? "BPM"
              : dimension === "decade"
                ? "release years"
                : dimension === "tag"
                  ? "tags"
                  : "genres"}{" "}
            to see a comparison.
          </p>
        )}
      </section>
    </main>
  );
}
