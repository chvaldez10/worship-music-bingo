import { useRef, useState, type FormEvent, type MouseEvent } from "react";
import { Btn, Select } from "@/components/ui-lite";
import { Library, Search, Plus, Pencil, Trash2, ArrowRight, Music2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PageLoading } from "@/components/PageLoading";
import { useKaraoke } from "@/hooks/use-karaoke";
import { KaraokeConflictError, karaokeSongSchema, nextId, type KaraokeSong } from "@/lib/karaoke";
import { LibraryBackups } from "./LibraryBackups";
import { YouTubeLinks } from "./YouTubeLinks";
const inputClass =
  "mt-2 min-h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-base font-normal outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/15";
function SongForm({
  song,
  onSave,
  onCancel,
  externalError,
}: {
  song: KaraokeSong;
  onSave: (song: KaraokeSong) => boolean;
  onCancel: () => void;
  externalError: string;
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
      youtubeUrls: String(data.get("youtubeUrls"))
        .split(/\r?\n/)
        .map((url) => url.trim())
        .filter(Boolean),
      rating: song.rating,
    });
    if (!parsed.success) {
      setError(
        parsed.error.issues.find((issue) => issue.path[0] === "youtubeUrls")?.message ??
          "Check the song details. Use up to 20 tags and a BPM greater than 0 and up to 400.",
      );
      return;
    }
    if (onSave(parsed.data)) onCancel();
  }
  return (
    <form onSubmit={submit}>
      <DialogHeader className="text-left pr-10">
        <DialogTitle className="font-display text-3xl font-normal">
          {song.title ? "Edit song" : "Add song"}
        </DialogTitle>
        <DialogDescription className="pt-1">
          Only the title is required. Add the details you know.
        </DialogDescription>
      </DialogHeader>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <label className="col-span-2 text-sm font-semibold sm:col-span-1">
          Title
          <input
            name="title"
            required
            maxLength={200}
            defaultValue={song.title}
            className={inputClass}
          />
        </label>
        <label className="col-span-2 text-sm font-semibold sm:col-span-1">
          Artist
          <input name="artist" maxLength={200} defaultValue={song.artist} className={inputClass} />
        </label>
        <label className="col-span-2 text-sm font-semibold sm:col-span-1">
          Genre
          <input
            name="genre"
            maxLength={80}
            defaultValue={song.genre}
            placeholder="e.g. Pop, Worship, Country"
            className={inputClass}
          />
        </label>
        <label className="col-span-2 text-sm font-semibold sm:col-span-1">
          Tags
          <input
            name="tags"
            aria-label="Tags"
            aria-describedby="song-tags-help"
            defaultValue={song.tags.join(", ")}
            placeholder="e.g. nostalgic, upbeat"
            className={inputClass}
          />
          <span
            id="song-tags-help"
            className="mt-1 block text-xs font-normal text-muted-foreground"
          >
            Separate tags with commas.
          </span>
        </label>
        <label className="text-sm font-semibold">
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
        <label className="text-sm font-semibold">
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
        <label className="col-span-2 text-sm font-semibold">
          YouTube links
          <textarea
            name="youtubeUrls"
            aria-label="YouTube links"
            aria-describedby="youtube-link-help"
            rows={3}
            maxLength={41000}
            defaultValue={song.youtubeUrls.join("\n")}
            placeholder="https://www.youtube.com/watch?v=…"
            className={inputClass}
          />
          <span
            id="youtube-link-help"
            className="mt-1 block text-xs font-normal text-muted-foreground"
          >
            Optional. One video link per line, up to 20. Add the versions you want to sing.
          </span>
        </label>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Use the year and tempo of the version you sing.
      </p>
      {(error || externalError) && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error || externalError}
        </p>
      )}
      <div className="sticky -bottom-5 mt-6 flex justify-end gap-2 border-t border-border bg-card py-4">
        <Btn type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
        <Btn type="submit">Save song</Btn>
      </div>
    </form>
  );
}

export function SongLibraryPage() {
  const { library, ready, error, blocked, save, exportLibrary, setError } = useKaraoke();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<KaraokeSong | null>(null);
  const [creatingSong, setCreatingSong] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const keepSong = useRef<HTMLButtonElement | null>(null);
  const disabled = !ready || blocked;
  const query = search.trim().toLowerCase();
  const songs = library.songs.filter((song) =>
    [song.title, song.artist, song.genre, ...song.tags].join(" ").toLowerCase().includes(query),
  );
  const newSong = (event: MouseEvent<HTMLButtonElement>) => {
    opener.current = event.currentTarget;
    setCreatingSong(true);
    setEditing({
      id: nextId(library.songs),
      title: "",
      artist: "",
      genre: "",
      tags: [],
      releaseYear: null,
      bpm: null,
      youtubeUrls: [],
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

  const deletingSong = library.songs.find((song) => song.id === deleting);
  const dialogClass =
    "max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-3xl border-border bg-card p-5 sm:rounded-3xl sm:p-7 [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center";
  if (!ready) return <PageLoading message="Loading your song library…" />;
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <Library size={16} aria-hidden="true" /> Your music
          </p>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl">Song library</h1>
          <p className="mt-3 text-muted-foreground">
            Your favorites, familiar classics, and the versions you love to sing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/karaoke"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold hover:bg-secondary"
          >
            My setlists <ArrowRight size={16} aria-hidden="true" />
          </a>
          <Btn disabled={disabled} onClick={newSong}>
            <Plus size={18} aria-hidden="true" /> Add song
          </Btn>
        </div>
      </header>
      {error && !editing && !deletingSong && (
        <p role="alert" className="mt-5 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      )}
      <section
        aria-labelledby="library-heading"
        className="mt-8 overflow-hidden rounded-3xl border border-border bg-card shadow-soft"
      >
        <h2 id="library-heading" className="sr-only">
          Your song collection
        </h2>
        <div className="border-b border-border px-4 py-4 sm:px-6">
          <label className="relative block">
            <span className="sr-only">Search songs</span>
            <Search
              aria-hidden="true"
              size={20}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              className="min-h-12 w-full min-w-0 rounded-xl border border-border bg-background py-3 pr-4 pl-12 text-base outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/15"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, artist, genre, or tag"
            />
          </label>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4">
            <p className="py-2 text-sm text-muted-foreground">
              {query
                ? `${songs.length} of ${library.songs.length} songs`
                : `${library.songs.length} songs`}
            </p>
            <LibraryBackups
              className="flex flex-wrap items-center gap-1"
              ready={ready}
              save={save}
              exportLibrary={exportLibrary}
              setError={setError}
              onImported={() => {
                setEditing(null);
                setDeleting(null);
              }}
            />
          </div>
        </div>
        <div className="lg:max-h-[65vh] lg:overflow-y-auto">
          <table role="table" className="block w-full text-left text-sm lg:table">
            <caption className="sr-only">Your songs, metadata, and personal ratings</caption>
            <thead className="sr-only bg-background lg:not-sr-only lg:sticky lg:top-0 lg:z-10 lg:table-header-group">
              <tr>
                {["Song", "Details", "Your rating", ""].map((label, index) => (
                  <th
                    scope="col"
                    key={index}
                    className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {label || <span className="sr-only">Actions</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody role="rowgroup" className="block divide-y divide-border lg:table-row-group">
              {songs.map((song) => (
                <tr
                  role="row"
                  key={song.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-3 p-5 transition-colors hover:bg-background/60 lg:table-row lg:p-0"
                >
                  <td role="cell" className="col-span-2 min-w-0 lg:w-[38%] lg:px-6 lg:py-4">
                    <strong
                      id={`song-title-${song.id}`}
                      className="block text-base font-semibold [overflow-wrap:anywhere]"
                    >
                      {song.title}
                    </strong>
                    {song.artist && (
                      <p className="mt-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                        {song.artist}
                      </p>
                    )}
                    {song.youtubeUrls.length > 0 && (
                      <div className="mt-2">
                        <YouTubeLinks urls={song.youtubeUrls} title={song.title} />
                      </div>
                    )}
                  </td>
                  <td role="cell" className="col-span-2 min-w-0 lg:w-[25%] lg:px-6 lg:py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {song.genre && (
                        <span className="max-w-full rounded-full bg-secondary px-2.5 py-1 text-xs font-medium [overflow-wrap:anywhere]">
                          {song.genre}
                        </span>
                      )}
                      {song.tags.map((tag, index) => (
                        <span
                          key={`${tag}-${index}`}
                          className="max-w-full rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground [overflow-wrap:anywhere]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    {(song.releaseYear !== null || song.bpm !== null) && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {[song.releaseYear, song.bpm === null ? null : `${song.bpm} BPM`]
                          .filter((value) => value !== null)
                          .join(" · ")}
                      </p>
                    )}
                    {!song.genre &&
                      !song.tags.length &&
                      song.releaseYear === null &&
                      song.bpm === null && (
                        <span className="text-xs text-muted-foreground">No details yet</span>
                      )}
                  </td>
                  <td role="cell" className="min-w-0 lg:px-6 lg:py-4">
                    <div className="min-w-0 max-w-36 [&>span]:mt-0">
                      <Select
                        aria-label={`Rating for ${song.title}`}
                        className="min-h-11 rounded-xl bg-card py-2 pl-3 pr-12 text-base lg:text-sm"
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
                      </Select>
                    </div>
                  </td>
                  <td role="cell" className="min-w-0 lg:px-4 lg:py-4">
                    <div className="flex justify-end gap-1">
                      <Btn
                        aria-describedby={`song-title-${song.id}`}
                        disabled={disabled}
                        variant="ghost"
                        className="rounded-xl px-2 sm:px-3"
                        onClick={(event) => {
                          opener.current = event.currentTarget;
                          setCreatingSong(false);
                          setEditing(song);
                        }}
                      >
                        <Pencil size={16} aria-hidden="true" /> Edit
                      </Btn>
                      <Btn
                        aria-label="Delete"
                        aria-describedby={`song-title-${song.id}`}
                        disabled={disabled}
                        variant="ghost"
                        className="rounded-xl px-3 hover:bg-destructive/10 hover:text-destructive"
                        onClick={(event) => {
                          opener.current = event.currentTarget;
                          setDeleting(song.id);
                        }}
                      >
                        <Trash2 size={17} aria-hidden="true" />
                      </Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!songs.length && (
            <div className="px-6 py-14 text-center">
              <Music2 aria-hidden="true" size={32} className="mx-auto text-muted-foreground" />
              <p className="mt-3 font-display text-2xl">
                {library.songs.length ? "No songs found" : "Your collection starts here"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {library.songs.length
                  ? "Try another title, artist, genre, or tag."
                  : "Add your first song to get started."}
              </p>
            </div>
          )}
        </div>
      </section>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Saved on this device. Export a backup to keep or move your library. Personal edits do not
        change the camp games.
      </p>
      <Dialog
        open={!!editing && !disabled}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent
          overlayClassName="bg-foreground/20 backdrop-blur-sm"
          className={dialogClass}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            opener.current?.focus();
          }}
        >
          {editing && (
            <SongForm
              key={editing.id}
              song={editing}
              externalError={error}
              onSave={saveSong}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!deletingSong}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <DialogContent
          role="alertdialog"
          overlayClassName="bg-foreground/20 backdrop-blur-sm"
          className={dialogClass}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            keepSong.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            opener.current?.focus();
          }}
        >
          <DialogHeader className="pr-10 text-left">
            <DialogTitle className="font-display text-2xl font-normal">
              Delete {deletingSong?.title}?
            </DialogTitle>
            <DialogDescription>
              This removes the song from your library and your setlists.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              ref={keepSong}
              className="min-h-11 rounded-full px-5 text-sm font-semibold hover:bg-secondary"
              onClick={() => setDeleting(null)}
            >
              Keep song
            </button>
            <Btn
              variant="danger"
              onClick={() => {
                if (!deletingSong) return;
                if (
                  save((current) => ({
                    ...current,
                    songs: current.songs.filter((item) => item.id !== deletingSong.id),
                    setlists: current.setlists.map((list) => ({
                      ...list,
                      songIds: list.songIds.filter((id) => id !== deletingSong.id),
                    })),
                  }))
                )
                  setDeleting(null);
              }}
            >
              Confirm delete
            </Btn>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
