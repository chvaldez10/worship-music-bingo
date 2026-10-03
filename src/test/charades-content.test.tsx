import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CHARADES_CACHE_KEY,
  catalogCategories,
  loadCharadesCatalog,
  parseCharadesCatalog,
} from "@/lib/charades-catalog";
import { useCharadesCatalog } from "@/hooks/use-charades-catalog";
import { initialPartyState, partyReducer, restorePartyState } from "@/lib/party-game";
import { Route } from "@/routes/charades";

vi.mock("@/lib/charades-catalog", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/charades-catalog")>()),
  loadCharadesCatalog: vi.fn(),
}));
const payload = {
  categories: [
    { id: 1, slug: "bible", label: "Bible events" },
    { id: 2, slug: "songs", label: "Worship songs" },
    { id: 3, slug: "church", label: "Church activities" },
    { id: 4, slug: "bible-characters", label: "Bible characters" },
  ],
  prompts: [
    { id: 1, category_id: 1, title: "Noah building the ark", detail: null },
    { id: 25, category_id: 3, title: "Leading worship", detail: "   " },
    { id: 99, category_id: 4, title: "Jonah", detail: "Mime being swallowed by a giant fish." },
  ],
  songs: [{ id: 7, title: "Firm Foundation" }],
};
const Page = Route.options.component as ComponentType;
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("Database Charades content", () => {
  it("keeps a saved game from a removed category until a new timed turn is started", async () => {
    const state = partyReducer(initialPartyState(60, "old-category", true), {
      type: "turn-start",
      prompt: { id: "retired-prompt", title: "Retired prompt" },
      now: Date.now(),
    });
    const saved = JSON.stringify({ version: 1, state });
    sessionStorage.setItem("camp-game-charades-v1", saved);
    vi.mocked(loadCharadesCatalog).mockResolvedValue(parseCharadesCatalog(payload));
    render(<Page />);
    await screen.findByText(/Its saved copy is unchanged/);
    expect(sessionStorage.getItem("camp-game-charades-v1")).toBe(saved);
    fireEvent.click(screen.getByRole("button", { name: "Start team turn" }));
    expect(sessionStorage.getItem("camp-game-charades-v1")).not.toBe(saved);
    expect(screen.queryByText(/Its saved copy is unchanged/)).not.toBeInTheDocument();
  });
  it("loads new categories and details without changing saved-game identities", () => {
    const categories = catalogCategories(parseCharadesCatalog(payload));
    expect(categories.map((c) => c.id)).toEqual(["bible", "songs", "church", "bible-characters"]);
    expect(categories.flatMap((c) => c.prompts).map((p) => p.id)).toEqual([
      "bible-1",
      "song-07",
      "church-1",
      "charades-99",
    ]);
    expect(categories[2]!.prompts[0]).not.toHaveProperty("detail");
    expect(categories[3]!.prompts[0]!.detail).toBe(payload.prompts[2]!.detail);
    let state = partyReducer(initialPartyState(60, "bible"), {
      type: "draw",
      prompt: { id: "bible-1", title: "Old name" },
    });
    state = partyReducer(state, { type: "result", result: "correct", now: 0 });
    const restored = restorePartyState(
      { version: 1, state },
      categories.flatMap((c) => c.prompts),
      categories.map((c) => c.id),
      0,
    );
    expect(restored.teams[0]!.score).toBe(1);
    expect(restored.history[0]!.prompt.title).toBe("Noah building the ark");
  });

  it("rejects corrupt content rather than starting a game with ambiguous IDs", () => {
    expect(() =>
      parseCharadesCatalog({ ...payload, prompts: [...payload.prompts, payload.prompts[0]] }),
    ).toThrow();
    expect(() =>
      parseCharadesCatalog({ ...payload, prompts: [{ ...payload.prompts[0], category_id: 500 }] }),
    ).toThrow();
    expect(() => parseCharadesCatalog({ ...payload, songs: [{ id: 7, title: " " }] })).toThrow();
    expect(() =>
      parseCharadesCatalog({ categories: payload.categories, prompts: [], songs: [] }),
    ).toThrow();
  });

  it("shows a database acting hint only while its prompt is revealed, including after a refresh", async () => {
    vi.mocked(loadCharadesCatalog).mockResolvedValue(parseCharadesCatalog(payload));
    const first = render(<Page />);
    expect(screen.getByText("Loading game prompts…")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Charades category")).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Charades category"), {
      target: { value: "bible-characters" },
    });
    fireEvent.click(screen.getByText("Start team turn"));
    expect(screen.getByRole("heading", { name: "Jonah" })).toBeInTheDocument();
    expect(screen.getByText("Acting hint")).toBeInTheDocument();
    expect(screen.getByText(payload.prompts[2]!.detail!)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Hide prompt"));
    expect(screen.queryByText(payload.prompts[2]!.detail!)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Jonah" })).not.toBeInTheDocument();
    first.unmount();
    render(<Page />);
    await waitFor(() => expect(screen.getByText("Reveal prompt")).toBeInTheDocument());
    expect(screen.queryByText(payload.prompts[2]!.detail!)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Reveal prompt"));
    expect(screen.getByText(payload.prompts[2]!.detail!)).toBeInTheDocument();
    expect(screen.getByLabelText("Charades category")).toHaveValue("bible-characters");
  });

  it("uses the last successful list when the connection fails", async () => {
    localStorage.setItem(CHARADES_CACHE_KEY, JSON.stringify(payload));
    vi.mocked(loadCharadesCatalog).mockRejectedValue(new Error("Offline"));
    const { result } = renderHook(useCharadesCatalog);
    await waitFor(() => expect(result.current?.notice).toMatch(/last saved/));
    expect(result.current?.categories.at(-1)?.prompts[0]?.detail).toBe(payload.prompts[2]!.detail);
  });

  it("recovers from a corrupt cache and keeps the starter game playable", async () => {
    localStorage.setItem(CHARADES_CACHE_KEY, "{broken");
    vi.mocked(loadCharadesCatalog).mockRejectedValue(new Error("Offline"));
    const { result } = renderHook(useCharadesCatalog);
    await waitFor(() => expect(result.current?.notice).toMatch(/starter/));
    expect(result.current?.categories[0]?.prompts).toHaveLength(24);
  });

  it("bounds loading time and ignores a late response so an ongoing game is not reset", async () => {
    vi.useFakeTimers();
    let resolve!: (catalog: ReturnType<typeof parseCharadesCatalog>) => void;
    vi.mocked(loadCharadesCatalog).mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const { result } = renderHook(useCharadesCatalog);
    act(() => vi.advanceTimersByTime(8000));
    expect(result.current?.notice).toMatch(/starter/);
    const snapshot = result.current;
    await act(async () => resolve(parseCharadesCatalog(payload)));
    expect(result.current).toBe(snapshot);
    expect(localStorage.getItem(CHARADES_CACHE_KEY)).toBeNull();
  });

  it("loads live details even when browser cache storage is blocked", async () => {
    vi.mocked(loadCharadesCatalog).mockResolvedValue(parseCharadesCatalog(payload));
    const storage = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage blocked");
    });
    const { result } = renderHook(useCharadesCatalog);
    await waitFor(() => expect(result.current?.categories).toHaveLength(4));
    expect(result.current?.notice).toBeUndefined();
    storage.mockRestore();
  });
});
