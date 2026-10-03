import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import axe from "axe-core";
import { GuessSongScoreboard } from "@/components/games/GuessSongScoreboard";
import {
  GUESS_SONG_STORAGE_KEY,
  guessSongSchema,
  initialGuessSongState,
} from "@/lib/guess-the-song";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("Guess the Song scoreboard", () => {
  it("waits for saved state, restores names and scores, and supports all 1–8 team counts", () => {
    expect(renderToString(<GuessSongScoreboard />)).toContain('aria-busy="true"');
    const first = render(<GuessSongScoreboard />);
    fireEvent.change(screen.getByLabelText("Team 1 name"), { target: { value: "Joyful Noise" } });
    fireEvent.click(screen.getByRole("button", { name: "Add 1 point to Joyful Noise" }));
    fireEvent.click(screen.getByRole("button", { name: "Add 1 point to Joyful Noise" }));
    fireEvent.click(screen.getByRole("button", { name: "Subtract 1 point from Joyful Noise" }));
    expect(screen.getByLabelText("Joyful Noise score")).toHaveTextContent("1");
    expect(screen.getByRole("button", { name: "Subtract 1 point from Team 2" })).toBeDisabled();
    for (let count = 1; count <= 8; count++) {
      fireEvent.change(screen.getByLabelText("Number of teams"), {
        target: { value: String(count) },
      });
      expect(screen.getAllByRole("textbox")).toHaveLength(count);
    }
    fireEvent.click(screen.getByRole("button", { name: "Add 1 point to Team 8" }));
    fireEvent.change(screen.getByLabelText("Number of teams"), { target: { value: "1" } });
    first.unmount();
    render(<GuessSongScoreboard />);
    expect(screen.getByLabelText("Number of teams")).toHaveValue("1");
    expect(screen.getByLabelText("Team 1 name")).toHaveValue("Joyful Noise");
    expect(screen.getByLabelText("Joyful Noise score")).toHaveTextContent("1");
    fireEvent.change(screen.getByLabelText("Number of teams"), { target: { value: "8" } });
    expect(screen.getByLabelText("Team 8 score")).toHaveTextContent("1");
  });

  it("confirms resets, keeps names, clears hidden scores, and leaves other games alone", async () => {
    const state = initialGuessSongState();
    state.teams[0]!.name = "Worship Warriors";
    state.teams[0]!.score = 3;
    state.teams[7]!.score = 10;
    localStorage.setItem(GUESS_SONG_STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem("another-game", "keep me");
    render(<GuessSongScoreboard />);
    fireEvent.click(screen.getByRole("button", { name: "Reset scores" }));
    const dialog = screen.getByRole("alertdialog", { name: "Reset all scores?" });
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(
      (await axe.run(dialog, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.getByLabelText("Worship Warriors score")).toHaveTextContent("3");
    fireEvent.click(screen.getByRole("button", { name: "Reset scores" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm reset" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    const saved = guessSongSchema.parse(JSON.parse(localStorage.getItem(GUESS_SONG_STORAGE_KEY)!));
    expect(saved.teams.every((team) => team.score === 0)).toBe(true);
    expect(saved.teams[0]!.name).toBe("Worship Warriors");
    expect(localStorage.getItem("another-game")).toBe("keep me");
  });

  it("reads the latest saved scores before updating and follows changes from another tab", () => {
    render(<GuessSongScoreboard />);
    const latest = initialGuessSongState();
    latest.teams[0]!.score = 4;
    localStorage.setItem(GUESS_SONG_STORAGE_KEY, JSON.stringify(latest));
    fireEvent.click(screen.getByRole("button", { name: "Add 1 point to Team 1" }));
    expect(screen.getByLabelText("Team 1 score")).toHaveTextContent("5");
    latest.teams[1]!.name = "Camp Choir";
    latest.teams[1]!.score = 7;
    localStorage.setItem(GUESS_SONG_STORAGE_KEY, JSON.stringify(latest));
    fireEvent(window, new StorageEvent("storage", { key: GUESS_SONG_STORAGE_KEY }));
    expect(screen.getByLabelText("Team 2 name")).toHaveValue("Camp Choir");
    expect(screen.getByLabelText("Camp Choir score")).toHaveTextContent("7");
    localStorage.removeItem(GUESS_SONG_STORAGE_KEY);
    fireEvent(window, new StorageEvent("storage", { key: null }));
    expect(screen.getByLabelText("Team 1 score")).toHaveTextContent("0");
  });

  it("preserves scores when saving fails and allows retrying", () => {
    render(<GuessSongScoreboard />);
    fireEvent.click(screen.getByRole("button", { name: "Add 1 point to Team 1" }));
    const saved = localStorage.getItem(GUESS_SONG_STORAGE_KEY);
    const failure = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    fireEvent.click(screen.getByRole("button", { name: "Add 1 point to Team 1" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Could not save");
    expect(screen.getByLabelText("Team 1 score")).toHaveTextContent("1");
    expect(localStorage.getItem(GUESS_SONG_STORAGE_KEY)).toBe(saved);
    failure.mockRestore();
    fireEvent.click(screen.getByRole("button", { name: "Add 1 point to Team 1" }));
    expect(screen.getByLabelText("Team 1 score")).toHaveTextContent("2");
  });

  it("does not overwrite invalid storage until the host explicitly starts fresh", () => {
    localStorage.setItem(GUESS_SONG_STORAGE_KEY, "broken");
    render(<GuessSongScoreboard />);
    expect(screen.getByRole("button", { name: "Add 1 point to Team 1" })).toBeDisabled();
    expect(localStorage.getItem(GUESS_SONG_STORAGE_KEY)).toBe("broken");
    fireEvent.click(screen.getByRole("button", { name: "Start fresh" }));
    fireEvent.click(screen.getByRole("button", { name: "Start fresh scoreboard" }));
    expect(screen.getByRole("button", { name: "Add 1 point to Team 1" })).toBeEnabled();
    expect(
      guessSongSchema.parse(JSON.parse(localStorage.getItem(GUESS_SONG_STORAGE_KEY)!)),
    ).toEqual(initialGuessSongState());
    expect(guessSongSchema.safeParse({ ...initialGuessSongState(), teamCount: 9 }).success).toBe(
      false,
    );
    expect(
      guessSongSchema.safeParse({
        ...initialGuessSongState(),
        teams: Array(8).fill({ id: 1, name: "Same", score: -1 }),
      }).success,
    ).toBe(false);
  });
});
