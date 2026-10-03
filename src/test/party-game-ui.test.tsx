import { cleanup, fireEvent, render, screen, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HostedPromptGame } from "@/components/games/HostedPromptGame";

const prompts = [
  { id: "one", title: "First song" },
  { id: "two", title: "Second song" },
];
function renderGame() {
  return render(
    <HostedPromptGame
      gameId="test"
      title="Test game"
      description="Team challenge"
      prompts={prompts}
      defaultSeconds={30}
      instructions={["Take turns."]}
    />,
  );
}
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Hosted game controls", () => {
  it("hides fresh prompts, scores once, exhausts the bank and restarts with confirmation", () => {
    renderGame();
    fireEvent.click(screen.getByText("Draw next prompt"));
    expect(screen.getByText("Prompt hidden")).toBeInTheDocument();
    expect(screen.queryByText("First song")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Reveal prompt"));
    expect(screen.queryByText("Prompt hidden")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Correct · +1 point"));
    expect(screen.getByLabelText("Team 1 score")).toHaveTextContent("1");
    expect(screen.getByText("Up next: Team 2")).toBeInTheDocument();
    expect(screen.getByText("Correct · +1 point")).toBeDisabled();
    fireEvent.click(screen.getByText("Draw next prompt"));
    fireEvent.click(screen.getByText("Pass / Miss"));
    expect(screen.getByText("Draw next prompt")).toBeDisabled();
    expect(screen.getByText(/All prompts used/)).toBeInTheDocument();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(screen.getByText("Restart game"));
    expect(screen.getByLabelText("Team 1 score")).toHaveTextContent("1");
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByText("Restart game"));
    expect(screen.getByLabelText("Team 1 score")).toHaveTextContent("0");
    expect(screen.getByText("Draw next prompt")).not.toBeDisabled();
  });
  it("pauses, resumes, and expires the timer while preserving host scoring", () => {
    renderGame();
    vi.useFakeTimers();
    fireEvent.click(screen.getByText("Draw next prompt"));
    fireEvent.click(screen.getByText("Reveal prompt"));
    fireEvent.click(screen.getByText("Start timer"));
    expect(screen.getByText("Prompt hidden")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByRole("timer")).toHaveTextContent("20s");
    fireEvent.click(screen.getByText("Pause timer"));
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByRole("timer")).toHaveTextContent("20s");
    fireEvent.click(screen.getByText("Start timer"));
    act(() => vi.advanceTimersByTime(21000));
    expect(screen.getByRole("timer")).toHaveTextContent("0s");
    expect(screen.getByText(/Time's up/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Pass / Miss"));
    expect(screen.getByText("Up next: Team 2")).toBeInTheDocument();
  });
});

describe("Saved host games", () => {
  it("preserves an unrestorable game until the host explicitly starts a new one", () => {
    const saved = JSON.stringify({ version: 1, state: { category: "removed-category" } });
    sessionStorage.setItem("camp-game-test-v1", saved);
    renderGame();
    expect(screen.getByText(/Its saved copy is unchanged/)).toBeInTheDocument();
    expect(sessionStorage.getItem("camp-game-test-v1")).toBe(saved);
    fireEvent.change(screen.getByLabelText("Team 1 name"), { target: { value: "New team" } });
    expect(sessionStorage.getItem("camp-game-test-v1")).toBe(saved);
    fireEvent.click(screen.getByText("Draw next prompt"));
    expect(sessionStorage.getItem("camp-game-test-v1")).not.toBe(saved);
    expect(JSON.parse(sessionStorage.getItem("camp-game-test-v1")!).state.teams[0].name).toBe(
      "New team",
    );
    expect(screen.queryByText(/Its saved copy is unchanged/)).not.toBeInTheDocument();
  });
  it("saves the timer deadline without repeatedly writing storage on each tick", () => {
    renderGame();
    vi.useFakeTimers();
    fireEvent.click(screen.getByText("Draw next prompt"));
    const save = vi.spyOn(Storage.prototype, "setItem");
    fireEvent.click(screen.getByText("Start timer"));
    act(() => vi.advanceTimersByTime(10000));
    expect(save).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(20000));
    expect(save).toHaveBeenCalledTimes(2);
  });
  it("restores the prompt category when undoing after a category change", () => {
    const categories = [
      { id: "bible", label: "Bible events", prompts: prompts.slice(0, 1) },
      { id: "church", label: "Church activities", prompts: prompts.slice(1) },
    ];
    render(
      <HostedPromptGame
        gameId="categories"
        title="Charades"
        description="Act"
        defaultSeconds={60}
        prompts={prompts}
        categories={categories}
        instructions={["Take turns."]}
      />,
    );
    fireEvent.click(screen.getByText("Draw next prompt"));
    fireEvent.click(screen.getByText("Correct · +1 point"));
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "church" } });
    fireEvent.click(screen.getByText("Undo last result"));
    expect(screen.getByLabelText("Category")).toHaveValue("bible");
    expect(screen.getByLabelText("Team 1 score")).toHaveTextContent("0");
    fireEvent.click(screen.getByText("Reveal prompt"));
    expect(screen.getByRole("heading", { name: "First song" })).toBeInTheDocument();
  });
  it("restores the same round, scores and timer on remount, with the prompt hidden", () => {
    const first = renderGame();
    fireEvent.click(screen.getByText("Draw next prompt"));
    fireEvent.click(screen.getByText("Correct · +1 point"));
    fireEvent.click(screen.getByText("Draw next prompt"));
    fireEvent.click(screen.getByText("Reveal prompt"));
    const title = screen.getAllByRole("heading", { level: 2 })[0]?.textContent;
    fireEvent.click(screen.getByText("Start timer"));
    first.unmount();
    renderGame();
    expect(screen.getByLabelText("Team 1 score")).toHaveTextContent("1");
    expect(screen.getByText("Team 2's turn")).toBeInTheDocument();
    expect(screen.getByText("Prompt hidden")).toBeInTheDocument();
    expect(screen.getByText("Pause timer")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Reveal prompt"));
    expect(screen.getAllByRole("heading", { level: 2 })[0]?.textContent).toBe(title);
  });
  it("warns and recovers from malformed storage and unavailable storage", () => {
    sessionStorage.setItem("camp-game-test-v1", "{broken");
    renderGame();
    expect(screen.getByText(/The saved game could not be restored/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Draw next prompt"));
    expect(screen.getByText("Correct · +1 point")).not.toBeDisabled();
    cleanup();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Blocked");
    });
    renderGame();
    expect(screen.getByText(/This browser cannot save game progress/)).toBeInTheDocument();
  });
  it("supports correcting the last result before a new prompt is drawn", () => {
    renderGame();
    fireEvent.click(screen.getByText("Draw next prompt"));
    fireEvent.click(screen.getByText("Correct · +1 point"));
    fireEvent.click(screen.getByText("Undo last result"));
    expect(screen.getByLabelText("Team 1 score")).toHaveTextContent("0");
    expect(screen.getByText("Team 1's turn")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Pass / Miss"));
    expect(screen.getByLabelText("Team 1 score")).toHaveTextContent("0");
  });
});
