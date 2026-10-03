import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CompletePhraseGame } from "@/components/games/CompletePhraseGame";
import {
  ALL_PHRASE_PROMPTS,
  PHRASE_CATEGORIES,
  PHRASE_PROMPTS,
  phrasePool,
} from "@/data/complete-the-phrase";
import { freshPhraseState, PHRASE_STORAGE_KEY } from "@/hooks/use-phrase-game";

const button = (name: string) => screen.getByRole("button", { name });
async function mount() {
  const view = render(<CompletePhraseGame />);
  await screen.findByRole("button", { name: "Draw prompt" });
  return view;
}
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("Complete the Phrase", () => {
  it("provides a sizeable bank of explicit Christian pairs across all eight requested categories", () => {
    expect(PHRASE_CATEGORIES.map((group) => group.label)).toEqual([
      "Worship Songs",
      "Hymns",
      "Bible Books",
      "Bible Characters",
      "Bible Stories / Events",
      "Bible Places",
      "Church Words",
      "Christian Phrases",
    ]);
    expect(PHRASE_PROMPTS.length).toBeGreaterThanOrEqual(150);
    expect(new Set(PHRASE_PROMPTS.map((prompt) => prompt.id)).size).toBe(PHRASE_PROMPTS.length);
    for (const category of PHRASE_CATEGORIES) {
      expect(
        PHRASE_PROMPTS.filter((prompt) => prompt.category === category.id).length,
      ).toBeGreaterThanOrEqual(1);
    }
    expect(PHRASE_PROMPTS.every((prompt) => prompt.first.trim() && prompt.second.trim())).toBe(
      true,
    );
    expect(PHRASE_PROMPTS.find((prompt) => prompt.first === "First")?.note).toMatch(
      /First Chronicles/,
    );
  });
  it("has exactly 200 distinct prompts and excludes the entries retired by the familiarity audit", () => {
    expect(phrasePool()).toHaveLength(200);
    const titles = phrasePool().map((prompt) => `${prompt.first} ${prompt.second}`);
    expect(titles).toContain("Great Are You Lord");
    expect(titles).toContain("Because He Lives");
    expect(titles).toContain("New Testament");
    expect(titles).toContain("Hidden Treasure");
    expect(titles).not.toContain("Samson’s Haircut");
    expect(titles).not.toContain("Church Usher Team");
    expect(titles).not.toContain("Jesus Is Here");
  });
  it("preserves results for newly retired entries instead of rejecting the saved game", async () => {
    const retiredId = "four-stories-samson-s-haircut";
    localStorage.setItem(
      PHRASE_STORAGE_KEY,
      JSON.stringify({
        ...freshPhraseState(),
        currentId: retiredId,
        results: [{ id: "four-church-mission-partner", correct: true }],
      }),
    );
    await mount();
    expect(screen.getByRole("status")).toHaveTextContent("1 played · 1 correct");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.click(button("Draw prompt"));
    expect(JSON.parse(localStorage.getItem(PHRASE_STORAGE_KEY)!).results).toEqual([
      { id: "four-church-mission-partner", correct: true },
    ]);
  });
  it("draws only four-syllable pairs and retires familiar titles with other lengths", () => {
    expect(
      phrasePool().every(
        (prompt) => prompt.syllables && prompt.syllables[0] + prompt.syllables[1] === 4,
      ),
    ).toBe(true);
    for (const [first, second] of [
      ["Way", "Maker"],
      ["Living", "Hope"],
      ["Holy Holy", "Holy"],
      ["Mary", "Magdalene"],
    ]) {
      expect(
        phrasePool().some((prompt) => prompt.first === first && prompt.second === second),
      ).toBe(false);
    }
    expect(
      phrasePool().find((prompt) => prompt.first === "Holy" && prompt.second === "Spirit")
        ?.syllables,
    ).toEqual([2, 2]);
    expect(phrasePool().find((prompt) => prompt.first === "Amazing")?.syllables).toEqual([3, 1]);
  });
  it("provides every requested duration and expiry retains the prompt until the host records a result", async () => {
    await mount();
    const select = screen.getByRole("combobox", { name: "Time per prompt" });
    expect([...select.querySelectorAll("option")].map((option) => option.value)).toEqual([
      "5",
      "10",
      "15",
      "20",
    ]);
    fireEvent.change(select, { target: { value: "10" } });
    fireEvent.click(button("Draw prompt"));
    fireEvent.click(button("Show host card"));
    vi.useFakeTimers();
    const before = JSON.parse(localStorage.getItem(PHRASE_STORAGE_KEY)!);
    fireEvent.click(button("Start timer"));
    expect(button("Show host card")).toHaveAttribute("aria-expanded", "false");
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByRole("timer")).toHaveTextContent("0s");
    expect(screen.getByRole("alert")).toHaveTextContent("Time’s up");
    expect(screen.getByRole("status")).toHaveTextContent("0 played");
    expect(JSON.parse(localStorage.getItem(PHRASE_STORAGE_KEY)!).currentId).toBe(before.currentId);
    fireEvent.click(button("Pass / Miss · Next person"));
    expect(screen.getByRole("status")).toHaveTextContent("1 played");
    expect(screen.getByRole("timer")).toHaveTextContent("10s");
  });
  it("pauses and resumes, restores a running deadline, and resets each new prompt", async () => {
    const view = await mount();
    fireEvent.change(screen.getByRole("combobox", { name: "Time per prompt" }), {
      target: { value: "20" },
    });
    fireEvent.click(button("Draw prompt"));
    fireEvent.click(button("Show host card"));
    vi.useFakeTimers();
    fireEvent.click(button("Start timer"));
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole("timer")).toHaveTextContent("18s");
    fireEvent.click(button("Pause timer"));
    act(() => vi.advanceTimersByTime(8000));
    expect(screen.getByRole("timer")).toHaveTextContent("18s");
    fireEvent.click(button("Resume timer"));
    view.unmount();
    act(() => vi.advanceTimersByTime(3000));
    render(<CompletePhraseGame />);
    expect(screen.getByRole("timer")).toHaveTextContent("15s");
    expect(button("Show host card")).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button("Correct · Next person"));
    expect(screen.getByRole("timer")).toHaveTextContent("20s");
    expect(screen.getByRole("status")).toHaveTextContent("1 played · 1 correct");
  });
  it("reads legacy saves without losing results and replaces retired pending prompts", async () => {
    const retired = ALL_PHRASE_PROMPTS.find((prompt) => prompt.id === "worship-6")!;
    localStorage.setItem(
      PHRASE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        currentId: retired.id,
        results: [{ id: "worship-1", correct: true }],
      }),
    );
    await mount();
    expect(screen.getByRole("status")).toHaveTextContent("1 played · 1 correct");
    expect(screen.getByRole("timer")).toHaveTextContent("5s");
    fireEvent.click(button("Draw prompt"));
    expect(JSON.parse(localStorage.getItem(PHRASE_STORAGE_KEY)!).results).toEqual([
      { id: "worship-1", correct: true },
    ]);
  });
  it("keeps both halves private, continues after a miss, avoids repeats, and restores progress hidden", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const view = await mount();
    fireEvent.click(button("Draw prompt"));
    expect(screen.queryByText("Amazing")).not.toBeInTheDocument();
    expect(screen.queryByText("Grace")).not.toBeInTheDocument();
    fireEvent.click(button("Show host card"));
    expect(screen.getByRole("heading", { name: "Amazing" })).toBeInTheDocument();
    expect(screen.getByText("Grace")).toBeInTheDocument();
    fireEvent.click(button("Pass / Miss · Next person"));
    expect(screen.getByRole("status")).toHaveTextContent(
      "1 played · 0 correct · 1 passed / missed",
    );
    expect(button("Show host card")).toHaveAttribute("aria-expanded", "false");
    const saved = JSON.parse(localStorage.getItem(PHRASE_STORAGE_KEY)!);
    expect(saved.results).toEqual([{ id: PHRASE_PROMPTS[0]!.id, correct: false }]);
    expect(saved.currentId).not.toBe(PHRASE_PROMPTS[0]!.id);
    view.unmount();
    await mountAfterPending();
    expect(screen.getByRole("status")).toHaveTextContent("1 played · 0 correct");
    expect(screen.queryByText("Thou Art")).not.toBeInTheDocument();
    fireEvent.click(button("Show host card"));
    fireEvent.click(button("Correct · Next person"));
    expect(screen.getByRole("status")).toHaveTextContent(
      "2 played · 1 correct · 1 passed / missed",
    );
    fireEvent.click(button("Undo last result"));
    expect(screen.getByRole("status")).toHaveTextContent("1 played · 0 correct");
    fireEvent.click(button("Show host card"));
    expect(screen.getByRole("heading", { name: "How Great" })).toBeInTheDocument();
  });
  it("ignores a previously saved category filter while preserving progress", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const books = PHRASE_PROMPTS.filter((prompt) => prompt.category === "books");
    localStorage.setItem(
      PHRASE_STORAGE_KEY,
      JSON.stringify({
        ...freshPhraseState(),
        category: "books",
        results: books.map((prompt) => ({ id: prompt.id, correct: false })),
      }),
    );
    await mount();
    expect(screen.queryByRole("combobox", { name: "Category" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(`${books.length} played`);
    fireEvent.click(button("Draw prompt"));
    const saved = JSON.parse(localStorage.getItem(PHRASE_STORAGE_KEY)!);
    expect(saved.results).toHaveLength(books.length);
    expect(saved.currentId).toMatch(/^four-worship-/);
    expect(saved).not.toHaveProperty("category");
  });
  it("does not replay a title that belongs to two categories", async () => {
    const worship = PHRASE_PROMPTS.find(
      (prompt) => prompt.category === "worship" && prompt.first === "Amazing",
    )!;
    localStorage.setItem(
      PHRASE_STORAGE_KEY,
      JSON.stringify({
        ...freshPhraseState(),
        category: "hymns",
        results: [{ id: worship.id, correct: true }],
      }),
    );
    const view = await mount();
    expect(screen.getByText(/unused prompts available/)).toHaveTextContent(
      `${phrasePool().length - 1} unused`,
    );
    view.unmount();
  });
  it("is playable when reading browser storage is denied", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Storage denied");
    });
    await mount();
    expect(button("Draw prompt")).toBeEnabled();
    fireEvent.click(button("Draw prompt"));
    expect(button("Show host card")).toBeInTheDocument();
  });
  it("requires explicit confirmation to reset and preserves unrelated games", async () => {
    localStorage.setItem("other-game", "keep me");
    await mount();
    fireEvent.click(button("Draw prompt"));
    const previous = localStorage.getItem(PHRASE_STORAGE_KEY);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(button("Restart game"));
    expect(localStorage.getItem(PHRASE_STORAGE_KEY)).toBe(previous);
    confirm.mockReturnValue(true);
    fireEvent.click(button("Restart game"));
    expect(screen.getByRole("status")).toHaveTextContent("0 played");
    expect(localStorage.getItem("other-game")).toBe("keep me");
  });
  it("preserves unreadable saves until a confirmed restart", async () => {
    localStorage.setItem(PHRASE_STORAGE_KEY, "broken");
    await mount();
    expect(button("Draw prompt")).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("preserved");
    expect(localStorage.getItem(PHRASE_STORAGE_KEY)).toBe("broken");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(button("Restart game"));
    expect(button("Draw prompt")).toBeEnabled();
    expect(JSON.parse(localStorage.getItem(PHRASE_STORAGE_KEY)!)).toEqual(freshPhraseState());
  });
  it("continues the current game with a clear notice if storage fails", async () => {
    await mount();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage full");
    });
    fireEvent.click(button("Draw prompt"));
    fireEvent.click(button("Show host card"));
    fireEvent.click(button("Pass / Miss · Next person"));
    expect(screen.getByRole("status")).toHaveTextContent("1 played");
    expect(screen.getByRole("alert")).toHaveTextContent("Keep this page open");
  });
});
async function mountAfterPending() {
  render(<CompletePhraseGame />);
  await waitFor(() => expect(button("Show host card")).toBeInTheDocument());
}
