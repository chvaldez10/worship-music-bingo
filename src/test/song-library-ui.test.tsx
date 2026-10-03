import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import axe from "axe-core";
import { SongLibraryPage } from "@/components/songs/SongLibraryPage";
import { KARAOKE_STORAGE_KEY, starterLibrary } from "@/lib/karaoke";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

function firstSongRow() {
  return screen.getByText("Goodness of God", { selector: "strong" }).closest("tr")!;
}

describe("Song library dialogs", () => {
  it("opens an accessible editor, cancels with Escape, and returns focus without changing the song", async () => {
    const library = starterLibrary();
    localStorage.setItem(KARAOKE_STORAGE_KEY, JSON.stringify(library));
    const saved = localStorage.getItem(KARAOKE_STORAGE_KEY);
    render(<SongLibraryPage />);
    const edit = within(firstSongRow()).getByRole("button", { name: "Edit" });
    fireEvent.click(edit);
    const dialog = screen.getByRole("dialog", { name: "Edit song" });
    await waitFor(() => expect(within(dialog).getByLabelText("Title")).toHaveFocus());
    fireEvent.change(within(dialog).getByLabelText("Title"), {
      target: { value: "Unsaved title" },
    });
    const results = await axe.run(dialog, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(edit).toHaveFocus();
    expect(localStorage.getItem(KARAOKE_STORAGE_KEY)).toBe(saved);
  });

  it("focuses Keep song in the delete confirmation and leaves songs intact on cancellation", async () => {
    render(<SongLibraryPage />);
    const remove = within(firstSongRow()).getByRole("button", { name: "Delete" });
    fireEvent.click(remove);
    const dialog = screen.getByRole("alertdialog", { name: "Delete Goodness of God?" });
    expect(within(dialog).getByRole("button", { name: "Keep song" })).toHaveFocus();
    const results = await axe.run(dialog, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
    fireEvent.click(within(dialog).getByRole("button", { name: "Keep song" }));
    await waitFor(() => expect(remove).toHaveFocus());
    expect(screen.getByText("Goodness of God", { selector: "strong" })).toBeInTheDocument();
    expect(localStorage.getItem(KARAOKE_STORAGE_KEY)).toBeNull();
  });

  it("keeps a failed deletion open and exposes its storage error inside the dialog", () => {
    render(<SongLibraryPage />);
    fireEvent.click(within(firstSongRow()).getByRole("button", { name: "Delete" }));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Quota exceeded");
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    const dialog = screen.getByRole("alertdialog", { name: "Delete Goodness of God?" });
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Could not save");
    expect(localStorage.getItem(KARAOKE_STORAGE_KEY)).toBeNull();
  });

  it("searches across the collection and clears an empty result without losing songs", () => {
    render(<SongLibraryPage />);
    fireEvent.change(screen.getByLabelText("Search songs"), {
      target: { value: "unknown song 123" },
    });
    expect(screen.getByText("No songs found")).toBeInTheDocument();
    expect(screen.getByText("0 of 59 songs")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search songs"), { target: { value: "" } });
    expect(screen.getByText("59 songs")).toBeInTheDocument();
    expect(screen.getByText("Goodness of God", { selector: "strong" })).toBeInTheDocument();
  });
});
