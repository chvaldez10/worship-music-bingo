import {
  cleanup,
  fireEvent,
  render,
  renderHook,
  act,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ComponentType } from "react";
import {
  karaokeLibrarySchema,
  karaokeSongSchema,
  KARAOKE_STORAGE_KEY,
  moveSong,
  starterLibrary,
  backfillWorshipGenre,
  tasteSummary,
} from "@/lib/karaoke";
import { useKaraoke } from "@/hooks/use-karaoke";
import { Route } from "@/routes/karaoke";
import { SongLibraryPage } from "@/components/songs/SongLibraryPage";

const KaraokePage = Route.options.component as ComponentType;
const Page = SongLibraryPage;
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("Karaoke dataset", () => {
  it("keeps unknown metadata blank and uses integer song IDs", () => {
    const library = starterLibrary();
    expect(library.songs).toHaveLength(59);
    expect(
      library.songs.every(
        (song) =>
          Number.isInteger(song.id) &&
          song.bpm === null &&
          song.releaseYear === null &&
          song.rating === null,
      ),
    ).toBe(true);
  });
  it("rejects invalid ratings, BPM, duplicate IDs and orphaned setlists", () => {
    const song = starterLibrary().songs[0]!;
    for (const change of [
      { rating: 0 },
      { rating: 6 },
      { bpm: 0 },
      { bpm: 401 },
      { releaseYear: 0 },
    ]) {
      expect(karaokeSongSchema.safeParse({ ...song, ...change }).success).toBe(false);
    }
    expect(
      karaokeLibrarySchema.safeParse({ version: 1, songs: [song, song], setlists: [] }).success,
    ).toBe(false);
    expect(
      karaokeLibrarySchema.safeParse({
        version: 1,
        songs: [song],
        setlists: [{ id: 1, name: "Broken", songIds: [999] }],
      }).success,
    ).toBe(false);
  });
  it("averages only known, rated metadata and reports independent group sample sizes", () => {
    const song = starterLibrary().songs[0]!;
    const songs = [
      {
        ...song,
        id: 1,
        genre: "Pop",
        tags: ["Upbeat", "upbeat"],
        bpm: 79.5,
        releaseYear: 1999,
        rating: 5,
      },
      { ...song, id: 2, genre: "pop", tags: ["upbeat"], bpm: 80, releaseYear: 2000, rating: 3 },
      { ...song, id: 3, genre: "Pop", bpm: 120, rating: null },
      { ...song, id: 4, genre: "", bpm: 120, rating: 2 },
    ];
    expect(tasteSummary(songs, "genre")).toEqual([{ label: "pop", count: 2, average: 4 }]);
    expect(tasteSummary(songs, "tag")).toEqual([{ label: "upbeat", count: 2, average: 4 }]);
    expect(tasteSummary(songs, "tempo").map((group) => group.label)).toEqual([
      "Under 80 BPM",
      "80–119 BPM",
      "120+ BPM",
    ]);
    expect(tasteSummary(songs, "decade").map((group) => group.label)).toEqual(["1990s", "2000s"]);
  });
  it("reorders repeated songs safely at boundaries", () => {
    expect(moveSong([1, 2, 1], 1, -1)).toEqual([2, 1, 1]);
    expect(moveSong([1, 2], 0, -1)).toEqual([1, 2]);
  });
});

describe("Local karaoke persistence", () => {
  it("restores changes and preserves storage when saving fails", () => {
    const { result } = renderHook(useKaraoke);
    act(() => {
      result.current.save((library) => ({
        ...library,
        setlists: [{ id: 1, name: "My night", songIds: [1] }],
      }));
    });
    const saved = localStorage.getItem(KARAOKE_STORAGE_KEY);
    const failing = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    act(() => {
      expect(result.current.save((library) => ({ ...library, setlists: [] }))).toBe(false);
    });
    expect(result.current.library.setlists[0]?.name).toBe("My night");
    expect(localStorage.getItem(KARAOKE_STORAGE_KEY)).toBe(saved);
    failing.mockRestore();
    const restored = renderHook(useKaraoke);
    expect(restored.result.current.library.setlists[0]?.songIds).toEqual([1]);
  });
  it("does not overwrite a corrupt saved library", () => {
    localStorage.setItem(KARAOKE_STORAGE_KEY, "broken data");
    const { result } = renderHook(useKaraoke);
    expect(result.current.blocked).toBe(true);
    act(() => {
      expect(result.current.save(() => starterLibrary())).toBe(false);
    });
    expect(localStorage.getItem(KARAOKE_STORAGE_KEY)).toBe("broken data");
  });
});

describe("Personal karaoke page", () => {
  it("adds metadata, rates a song, builds and reorders a setlist, and persists it", () => {
    const first = render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: "Add song" }));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "My Song" } });
    fireEvent.change(screen.getByLabelText("Genre"), { target: { value: "Pop" } });
    fireEvent.change(screen.getByLabelText("BPM"), { target: { value: "120" } });
    fireEvent.change(screen.getByLabelText("Release year"), { target: { value: "1999" } });
    fireEvent.change(screen.getByLabelText("YouTube links"), {
      target: { value: "https://youtu.be/abcdefghijk\nhttps://youtu.be/lmnopqrstuv" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save song" }));
    fireEvent.change(screen.getByLabelText("Rating for My Song"), { target: { value: "5" } });
    first.unmount();
    const setlists = render(<KaraokePage />);
    expect(screen.queryByRole("heading", { name: /Song library/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("New setlist name"), { target: { value: "Friday" } });
    fireEvent.click(screen.getByRole("button", { name: "Create setlist" }));
    for (const id of [68, 1]) {
      fireEvent.change(screen.getByLabelText("Add a song"), { target: { value: String(id) } });
      fireEvent.click(screen.getByRole("button", { name: "Add to setlist" }));
    }
    fireEvent.click(screen.getByLabelText("Move Goodness of God at position 2 up"));
    expect(screen.getByText("1. Goodness of God")).toBeInTheDocument();
    expect(screen.getByText("2. My Song")).toBeInTheDocument();
    const videos = screen.getAllByRole("link", { name: /Open My Song on YouTube/ });
    expect(videos.map((link) => link.getAttribute("href"))).toEqual([
      "https://youtu.be/abcdefghijk",
      "https://youtu.be/lmnopqrstuv",
    ]);
    expect(screen.getByText("5.0 / 5")).toBeInTheDocument();
    const library = karaokeLibrarySchema.parse(
      JSON.parse(localStorage.getItem(KARAOKE_STORAGE_KEY)!),
    );
    expect(library.setlists[0]?.songIds).toEqual([1, 68]);
    expect(library.songs.find((song) => song.id === 68)?.rating).toBe(5);
    setlists.unmount();
    render(<Page />);
    const row = screen.getByText("My Song", { selector: "strong" }).closest("tr")!;
    fireEvent.click(within(row).getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    expect(screen.queryByLabelText("Rating for My Song")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(KARAOKE_STORAGE_KEY)!).setlists[0].songIds).toEqual([1]);
  });
});

describe("Karaoke backups and accessibility", () => {
  it("reviews an import before replacing existing songs and ratings", async () => {
    render(<Page />);
    const library = starterLibrary();
    library.songs = [{ ...library.songs[0]!, rating: 5 }];
    const file = { size: 500, text: async () => JSON.stringify(library) };
    fireEvent.change(screen.getByLabelText("Import karaoke backup"), { target: { files: [file] } });
    expect(
      await screen.findByText(/Replace this device’s library with 1 songs/),
    ).toBeInTheDocument();
    expect(localStorage.getItem(KARAOKE_STORAGE_KEY)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Replace library" }));
    expect(screen.getByLabelText("Rating for Goodness of God")).toHaveValue("5");
    expect(screen.queryByLabelText("Rating for Holy Forever")).not.toBeInTheDocument();
  });
  it("rejects invalid imports without losing saved data", async () => {
    localStorage.setItem(KARAOKE_STORAGE_KEY, JSON.stringify(starterLibrary()));
    const saved = localStorage.getItem(KARAOKE_STORAGE_KEY);
    render(<Page />);
    fireEvent.change(screen.getByLabelText("Import karaoke backup"), {
      target: { files: [{ size: 50, text: async () => '{"version":1}' }] },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("not a valid karaoke backup");
    expect(localStorage.getItem(KARAOKE_STORAGE_KEY)).toBe(saved);
  });
  it("has labeled controls and accessible table structure", async () => {
    const { default: axe } = await import("axe-core");
    const { container } = render(<Page />);
    const report = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(report.violations.map((violation) => violation.id)).toEqual([]);
  });
});

describe("Camp focus and safe editing", () => {
  it("keeps personal song edits separate from the camp bank", async () => {
    const { SONGS } = await import("@/data/songs");
    const before = JSON.stringify(SONGS);
    const personal = starterLibrary();
    personal.songs[0]!.title = "Personal arrangement";
    personal.songs[0]!.tags.push("personal");
    personal.songs[0]!.rating = 5;
    expect(JSON.stringify(SONGS)).toBe(before);
  });
  it("does not overwrite a song changed in another tab while its editor is open", () => {
    render(<Page />);
    const row = screen.getByText("Goodness of God", { selector: "strong" }).closest("tr")!;
    fireEvent.click(within(row).getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "My stale edit" } });
    const newer = starterLibrary();
    newer.songs[0]!.title = "Newer edit from another tab";
    localStorage.setItem(KARAOKE_STORAGE_KEY, JSON.stringify(newer));
    fireEvent.click(screen.getByRole("button", { name: "Save song" }));
    expect(screen.getByRole("alert")).toHaveTextContent("changed in another tab");
    expect(JSON.parse(localStorage.getItem(KARAOKE_STORAGE_KEY)!).songs[0].title).toBe(
      "Newer edit from another tab",
    );
    expect(screen.getByLabelText("Title")).toHaveValue("My stale edit");
  });
  it("respects a library cleared in another tab instead of restoring deleted setlists", () => {
    const library = starterLibrary();
    library.setlists = [{ id: 1, name: "Old list", songIds: [1] }];
    localStorage.setItem(KARAOKE_STORAGE_KEY, JSON.stringify(library));
    const { result } = renderHook(useKaraoke);
    localStorage.removeItem(KARAOKE_STORAGE_KEY);
    act(() => {
      result.current.save((current) => current);
    });
    expect(result.current.library.setlists).toEqual([]);
  });
});

describe("Worship genre backfill", () => {
  it("fills matching blank starter genres while preserving personal edits and ratings", () => {
    const library = starterLibrary();
    library.songs[0]!.genre = "";
    library.songs[0]!.rating = 5;
    library.songs[1]!.genre = "Gospel";
    library.songs[2]!.title = "Personal title";
    library.songs[2]!.genre = "";
    library.songs.push({ ...library.songs[0]!, id: 1000, genre: "" });
    library.setlists = [{ id: 1, name: "Practice", songIds: [1] }];
    const updated = backfillWorshipGenre(library);
    expect(updated.songs[0]!.genre).toBe("Worship");
    expect(updated.songs[0]!.rating).toBe(5);
    expect(updated.songs[1]!.genre).toBe("Gospel");
    expect(updated.songs[2]!.genre).toBe("");
    expect(updated.songs.at(-1)!.genre).toBe("");
    expect(updated.setlists).toEqual(library.setlists);
    expect(backfillWorshipGenre(updated)).toBe(updated);
  });
  it("persists the backfill when loading an existing local library", () => {
    const library = starterLibrary();
    library.songs.forEach((song) => {
      song.genre = "";
    });
    localStorage.setItem(KARAOKE_STORAGE_KEY, JSON.stringify(library));
    const { result } = renderHook(useKaraoke);
    expect(result.current.library.songs.every((song) => song.genre === "Worship")).toBe(true);
    expect(JSON.parse(localStorage.getItem(KARAOKE_STORAGE_KEY)!).songs[0].genre).toBe("Worship");
  });
});
