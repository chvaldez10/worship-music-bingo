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
