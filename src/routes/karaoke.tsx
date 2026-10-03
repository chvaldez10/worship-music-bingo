import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Btn } from "@/components/ui-lite";
import { useKaraoke } from "@/hooks/use-karaoke";
import { PageLoading } from "@/components/PageLoading";
import {
  karaokeLibrarySchema,
  KaraokeConflictError,
  karaokeSongSchema,
  moveSong,
  nextId,
  tasteSummary,
  type KaraokeSong,
  type KaraokeLibrary,
} from "@/lib/karaoke";

export const Route = createFileRoute("/karaoke")({
  head: () => ({ meta: [{ title: "My Karaoke • Church Camp Games" }] }),
  component: KaraokePage,
});
const inputClass =
  "min-h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-sm";
function SongForm({
  song,
  onSave,
  onCancel,
}: {
  song: KaraokeSong;
  onSave: (song: KaraokeSong) => boolean;
  onCancel: () => void;
}) {
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const optionalNumber = (name: string) =>
      String(data.get(name)).trim() ? Number(data.get(name)) : null;
    const parsed = karaokeSongSchema.safeParse({
      id: song.id,
      title: data.get("title"),
      artist: data.get("artist"),
      genre: data.get("genre"),
      tags: [
        ...new Set(
          String(data.get("tags"))
            .split(",")
            .map((tag) => tag.trim().toLowerCase())
            .filter(Boolean),
        ),
      ],
      releaseYear: optionalNumber("year"),
      bpm: optionalNumber("bpm"),
      rating: song.rating,
    });
    if (!parsed.success) {
      setError("Check the song details. Use up to 20 tags and a BPM greater than 0 and up to 400.");
      return;
    }
    if (onSave(parsed.data)) onCancel();
  }
  return (
    <form onSubmit={submit} className="mt-4 rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-2xl">{song.title ? "Edit song" : "Add song"}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label>
          Title
          <input
            name="title"
            required
            maxLength={200}
            defaultValue={song.title}
            className={inputClass}
          />
        </label>
        <label>
          Artist
          <input name="artist" maxLength={200} defaultValue={song.artist} className={inputClass} />
        </label>
        <label>
          Genre
          <input
            name="genre"
            maxLength={80}
            defaultValue={song.genre}
            placeholder="e.g. Pop, Worship, Country"
            className={inputClass}
          />
        </label>
        <label>
          Tags
          <input
            name="tags"
            defaultValue={song.tags.join(", ")}
            placeholder="e.g. nostalgic, upbeat"
            className={inputClass}
          />
          <span className="text-xs text-muted-foreground">Separate tags with commas.</span>
        </label>
        <label>
          Release year
          <input
            name="year"
            type="number"
            min={1000}
            max={2100}
            step={1}
            defaultValue={song.releaseYear ?? ""}
            className={inputClass}
          />
        </label>
        <label>
          BPM
          <input
            name="bpm"
            type="number"
            min={0.01}
            max={400}
            step={0.01}
            defaultValue={song.bpm ?? ""}
            className={inputClass}
          />
        </label>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Only the title is required. Use the year and tempo of the version you sing; leave unknown
        details blank.
      </p>
      {error && (
        <p role="alert" className="mt-3 text-destructive">
          {error}
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <Btn type="submit">Save song</Btn>
        <Btn type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
      </div>
    </form>
  );
}
function KaraokePage() {
  const { library, ready, error, blocked, save, exportLibrary, setError } = useKaraoke();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<KaraokeSong | null>(null);
  const [creatingSong, setCreatingSong] = useState(false);
  const [deletingList, setDeletingList] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [listName, setListName] = useState("");
  const [pendingImport, setPendingImport] = useState<KaraokeLibrary | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [dimension, setDimension] = useState<"genre" | "decade" | "tempo" | "tag">("genre");
  const disabled = !ready || blocked;
  const currentList = library.setlists.find((list) => list.id === selected) ?? library.setlists[0];
  const query = search.trim().toLowerCase();
  const songs = library.songs.filter((song) =>
    [song.title, song.artist, song.genre, ...song.tags].join(" ").toLowerCase().includes(query),
  );
  const summary = tasteSummary(library.songs, dimension);
  const rated = library.songs.filter((song) => song.rating !== null).length;
  const newSong = () => {
    setCreatingSong(true);
    setEditing({
      id: nextId(library.songs),
      title: "",
      artist: "",
      genre: "",
      tags: [],
      releaseYear: null,
      bpm: null,
      rating: null,
    });
  };
  function saveSong(song: KaraokeSong) {
    return save((current) => {
      if (!creatingSong) {
        const existing = current.songs.find((item) => item.id === song.id);
        if (
          !existing ||
          JSON.stringify({ ...existing, rating: null }) !==
            JSON.stringify({ ...editing, rating: null })
        ) {
          throw new KaraokeConflictError(
            "This song changed in another tab. Cancel and reopen it before saving.",
          );
        }
      }
      return {
        ...current,
        songs: !creatingSong
          ? current.songs.map((item) =>
              item.id === song.id ? { ...song, rating: item.rating } : item,
            )
          : [...current.songs, { ...song, id: nextId(current.songs) }],
      };
    });
  }
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
  if (!ready) return <PageLoading message="Loading your song library…" />;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-4xl">My karaoke</h1>
      <p className="mt-3 text-muted-foreground">
        Build a setlist, rate songs, and discover the styles and tempos you enjoy.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Saved on this device, separate from camp games. Export a backup to keep or move your
        library. Cloud saving isn’t connected yet.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Btn disabled={disabled} onClick={newSong}>
          Add song
        </Btn>
        <Btn variant="outline" disabled={!ready} onClick={exportLibrary}>
          Export backup
        </Btn>
        <label className="rounded-full border-2 border-border px-4 py-2 text-sm font-semibold">
          Import backup
          <input
            aria-label="Import karaoke backup"
            type="file"
            accept=".json,application/json"
            disabled={!ready}
            className="mt-1 block min-h-11 max-w-60 text-xs"
            onChange={async (event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (!file) return;
              try {
                if (file.size > 10_000_000) throw new Error("too large");
                setPendingImport(karaokeLibrarySchema.parse(JSON.parse(await file.text())));
              } catch {
                setError("This file is not a valid karaoke backup. Your library is unchanged.");
              }
            }}
          />
        </label>
      </div>
      {pendingImport && (
        <div className="mt-4 rounded-xl border border-border bg-card p-4">
          <p>
            Replace this device’s library with {pendingImport.songs.length} songs and{" "}
            {pendingImport.setlists.length} setlists? Export your current library first if you want
            to keep it.
          </p>
          <div className="mt-3 flex gap-2">
            <Btn
              onClick={() => {
                if (save(() => pendingImport, true)) {
                  setPendingImport(null);
                  setEditing(null);
                  setSelected(null);
                  setNotice("Backup imported.");
                }
              }}
            >
              Replace library
            </Btn>
            <Btn variant="ghost" onClick={() => setPendingImport(null)}>
              Cancel import
            </Btn>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-4 text-destructive">
          {error}
        </p>
      )}
      <p role="status" className="mt-2 text-sm text-primary">
        {notice}
      </p>
      {editing && !disabled && (
        <SongForm
          key={editing.id}
          song={editing}
          onSave={saveSong}
          onCancel={() => setEditing(null)}
        />
      )}
      <section aria-labelledby="library-heading" className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="library-heading" className="font-display text-2xl">
            Song library{" "}
            <span className="text-base text-muted-foreground">({library.songs.length})</span>
          </h2>
          <label className="w-full sm:w-80">
            <span className="sr-only">Search songs</span>
            <input
              className={inputClass}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, artist, genre, or tag"
            />
          </label>
        </div>
        <p className="mt-3 text-xs text-muted-foreground sm:hidden">
          Swipe the song table sideways to see ratings and actions.
        </p>
        <div
          tabIndex={0}
          role="region"
          aria-label="Scrollable song library"
          className="mt-4 max-h-[32rem] overflow-auto rounded-xl border border-border"
        >
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Your songs, metadata, and personal ratings</caption>
            <thead className="sticky top-0 bg-secondary">
              <tr>
                {["Song", "Genre / tags", "Year", "BPM", "Your rating", "Actions"].map((label) => (
                  <th key={label} scope="col" className="p-3">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {songs.map((song) => (
                <tr key={song.id} className="border-t border-border">
                  <td className="min-w-48 p-3">
                    <strong>{song.title}</strong>
                    <p className="text-muted-foreground">{song.artist || "—"}</p>
                  </td>
                  <td className="min-w-32 p-3">
                    {song.genre || "—"}
                    <p className="text-xs text-muted-foreground">{song.tags.join(", ")}</p>
                  </td>
                  <td className="p-3">{song.releaseYear ?? "—"}</td>
                  <td className="p-3">{song.bpm ?? "—"}</td>
                  <td className="min-w-32 p-3">
                    <select
                      aria-label={`Rating for ${song.title}`}
                      className={inputClass}
                      disabled={disabled}
                      value={song.rating ?? ""}
                      onChange={(event) => {
                        const rating = event.target.value ? Number(event.target.value) : null;
                        save((current) => ({
                          ...current,
                          songs: current.songs.map((item) =>
                            item.id === song.id ? { ...item, rating } : item,
                          ),
                        }));
                      }}
                    >
                      <option value="">Unrated</option>
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <option key={rating} value={rating}>
                          {rating} / 5
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="min-w-64 p-3">
                    <div className="flex flex-wrap gap-1">
                      <Btn
                        disabled={disabled}
                        variant="ghost"
                        onClick={() => {
                          setCreatingSong(false);
                          setEditing(song);
                        }}
                      >
                        Edit
                      </Btn>
                      <Btn
                        disabled={disabled || !currentList}
                        variant="ghost"
                        onClick={() => {
                          if (currentList) {
                            if (changeList((ids) => [...ids, song.id]))
                              setNotice(`Added ${song.title} to ${currentList.name}.`);
                          }
                        }}
                      >
                        Add to setlist
                      </Btn>
                      <Btn
                        disabled={disabled}
                        variant="danger"
                        onClick={() => setDeleting(song.id)}
                      >
                        Delete
                      </Btn>
                    </div>
                    {deleting === song.id && (
                      <div className="mt-2">
                        <p>Delete this song and remove it from your setlists?</p>
                        <Btn
                          variant="danger"
                          onClick={() => {
                            if (
                              save((current) => ({
                                ...current,
                                songs: current.songs.filter((item) => item.id !== song.id),
                                setlists: current.setlists.map((list) => ({
                                  ...list,
                                  songIds: list.songIds.filter((id) => id !== song.id),
                                })),
                              }))
                            ) {
                              setDeleting(null);
                              if (editing?.id === song.id) setEditing(null);
                            }
                          }}
                        >
                          Confirm delete
                        </Btn>
                        <Btn variant="ghost" onClick={() => setDeleting(null)}>
                          Keep song
                        </Btn>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!songs.length && <p className="mt-4 text-muted-foreground">No songs match your search.</p>}
      </section>
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
            <ol className="mt-4 space-y-2">
              {currentList.songIds.map((id, index) => {
                const song = library.songs.find((item) => item.id === id)!;
                return (
                  <li
                    role="listitem"
                    key={`${id}-${index}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-secondary px-3 py-2"
                  >
                    <span className="min-w-0 [overflow-wrap:anywhere]">
                      {index + 1}. {song.title}
                    </span>
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
                Use “Add to setlist” in the song library to start.
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
