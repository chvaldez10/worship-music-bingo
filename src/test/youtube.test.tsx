import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { isYouTubeVideoUrl } from "@/lib/youtube";
import {
  karaokeLibrarySchema,
  karaokeSongSchema,
  KARAOKE_STORAGE_KEY,
  starterLibrary,
} from "@/lib/karaoke";
import { SongLibraryPage } from "@/components/songs/SongLibraryPage";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("YouTube song links", () => {
  it.each([
    "https://www.youtube.com/watch?v=abcdefghijk",
    "https://youtube.com/watch?list=playlist&v=abcdefghijk&t=30",
    "https://youtu.be/abcdefghijk?si=share",
    "https://m.youtube.com/watch?v=abcdefghijk",
    "https://music.youtube.com/watch?v=abcdefghijk",
    "https://www.youtube.com/shorts/abcdefghijk",
    "https://www.youtube.com/live/abcdefghijk/",
    "https://www.youtube.com/embed/abcdefghijk",
  ])("accepts a video URL: %s", (url) => expect(isYouTubeVideoUrl(url)).toBe(true));

  it.each([
    "javascript:alert(1)",
    "https://example.com/watch?v=abcdefghijk",
    "http://youtu.be/abcdefghijk",
    "https://youtube.com.evil.example/watch?v=abcdefghijk",
    "https://youtube.com@evil.example/watch?v=abcdefghijk",
    "https://user:password@youtube.com/watch?v=abcdefghijk",
    "https://youtube.com:444/watch?v=abcdefghijk",
    "https://youtube.com/watch?v=short",
    "https://www.youtube.com/@channel",
    "not a URL",
  ])("rejects an invalid or unsafe link: %s", (url) => expect(isYouTubeVideoUrl(url)).toBe(false));

  it("restores old backups with blank links without losing ratings or setlists", () => {
    const old = starterLibrary();
    old.songs[0]!.rating = 5;
    old.setlists = [{ id: 1, name: "Friday", songIds: [1] }];
    const raw = JSON.stringify(old, (key, value) => (key === "youtubeUrls" ? undefined : value));
    const restored = karaokeLibrarySchema.parse(JSON.parse(raw));
    expect(restored.songs.every((song) => song.youtubeUrls.length === 0)).toBe(true);
    expect(restored.songs[0]!.rating).toBe(5);
    expect(restored.setlists).toEqual(old.setlists);
  });

  it("converts the previous single-link backup format to the list format", () => {
    const old = starterLibrary();
    old.songs[0]!.rating = 5;
    old.setlists = [{ id: 1, name: "Friday", songIds: [1] }];
    const legacy = {
      ...old,
      songs: old.songs.map(({ youtubeUrls: _links, ...song }) => ({
        ...song,
        youtubeUrl: song.id === 1 ? "https://youtu.be/abcdefghijk" : "",
      })),
    };
    const restored = karaokeLibrarySchema.parse(legacy);
    expect(restored.songs[0]!.youtubeUrls).toEqual(["https://youtu.be/abcdefghijk"]);
    expect(restored.songs[0]!.rating).toBe(5);
    expect(restored.setlists).toEqual(old.setlists);
    expect(JSON.stringify(restored)).not.toContain('"youtubeUrl":');
    expect(karaokeLibrarySchema.parse(JSON.parse(JSON.stringify(restored)))).toEqual(restored);
  });

  it("keeps list order, removes duplicate links, and rejects malformed lists", () => {
    const song = starterLibrary().songs[0]!;
    const urls = ["https://youtu.be/abcdefghijk", "https://youtu.be/lmnopqrstuv"];
    expect(
      karaokeSongSchema.parse({ ...song, youtubeUrls: [...urls, urls[0]] }).youtubeUrls,
    ).toEqual(urls);
    expect(
      karaokeSongSchema.parse({ ...song, youtubeUrl: urls[0], youtubeUrls: [] }).youtubeUrls,
    ).toEqual([]);
    for (const youtubeUrls of [
      null,
      urls[0],
      [null],
      [""],
      [urls[0], "https://example.com"],
      Array(21).fill(urls[0]),
    ]) {
      expect(karaokeSongSchema.safeParse({ ...song, youtubeUrls }).success).toBe(false);
    }
  });

  it("saves, restores, edits and removes multiple links while rejecting other sites", () => {
    const first = render(<SongLibraryPage />);
    const edit = () => {
      const row = screen.getByText("Goodness of God", { selector: "strong" }).closest("tr")!;
      fireEvent.click(within(row).getByRole("button", { name: "Edit" }));
    };
    edit();
    fireEvent.change(screen.getByLabelText("YouTube links"), {
      target: { value: "https://example.com/" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save song" }));
    expect(screen.getByRole("alert")).toHaveTextContent("HTTPS YouTube video link");
    expect(localStorage.getItem(KARAOKE_STORAGE_KEY)).toBeNull();
    fireEvent.change(screen.getByLabelText("YouTube links"), {
      target: {
        value: "https://youtu.be/abcdefghijk\nhttps://www.youtube.com/watch?v=lmnopqrstuv",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save song" }));
    first.unmount();
    render(<SongLibraryPage />);
    const links = screen.getAllByRole("link", { name: /Open Goodness of God on YouTube/ });
    expect(links).toHaveLength(2);
    expect(links[1]).toHaveAttribute("href", "https://www.youtube.com/watch?v=lmnopqrstuv");
    const link = links[0]!;
    expect(link).toHaveAttribute("href", "https://youtu.be/abcdefghijk");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    edit();
    expect(screen.getByLabelText("YouTube links")).toHaveValue(
      "https://youtu.be/abcdefghijk\nhttps://www.youtube.com/watch?v=lmnopqrstuv",
    );
    fireEvent.change(screen.getByLabelText("YouTube links"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save song" }));
    expect(
      screen.queryByRole("link", { name: /Open Goodness of God on YouTube/ }),
    ).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(KARAOKE_STORAGE_KEY)!).songs[0].youtubeUrls).toEqual([]);
  });
});
