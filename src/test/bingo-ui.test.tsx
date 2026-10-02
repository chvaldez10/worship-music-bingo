import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { QueryClient } from "@tanstack/react-query";
import { routeTree } from "@/routeTree.gen";
import { CallerDashboard } from "@/components/bingo/CallerDashboard";
import { SONGS } from "@/data/songs";

function renderAt(path: string) {
  // The document shell includes stylesheets that jsdom cannot load.
  Object.assign(routeTree.options, {
    shellComponent: ({ children }: { children: ReactNode }) => <>{children}</>,
  });
  const router = createRouter({
    routeTree,
    isServer: false,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  return render(<RouterProvider router={router} />);
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("Player", () => {
  it("marks, unmarks, detects bingo, resets, regenerates and prints", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    const { container } = renderAt("/play");
    const free = await screen.findByRole("button", { name: "FREE" });
    expect(free).toBeDisabled();
    expect(free).toHaveAttribute("aria-pressed", "true");
    const cells = container.querySelectorAll<HTMLButtonElement>(".bingo-cell");
    fireEvent.click(cells[0]!);
    expect(cells[0]).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(cells[0]!);
    expect(cells[0]).toHaveAttribute("aria-pressed", "false");
    for (let i = 0; i < 5; i++) fireEvent.click(cells[i]!);
    expect(screen.getByText("BINGO!")).toBeInTheDocument();
    expect(container.querySelectorAll(".bingo-win")).toHaveLength(5);
    fireEvent.click(screen.getByText("Reset Marks"));
    expect(screen.queryByText("BINGO!")).not.toBeInTheDocument();
    expect(free).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByText("New Card"));
    expect(container.querySelectorAll('.bingo-cell[aria-pressed="true"]')).toHaveLength(1);
    fireEvent.click(screen.getByText("Print Card"));
    expect(print).toHaveBeenCalledOnce();
  });
});

describe("Print page", () => {
  it("reports invalid counts, generates numbered cards, and invokes browser printing", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    const { container } = renderAt("/print");
    const input = await screen.findByLabelText("Custom number of cards");
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.click(screen.getByText("Generate Cards"));
    expect(screen.getByRole("alert")).toHaveTextContent("whole number");
    fireEvent.click(screen.getByRole("button", { name: "5" }));
    fireEvent.click(screen.getByText("Generate Cards"));
    expect(container.querySelectorAll(".print-card")).toHaveLength(5);
    expect(screen.getByText("Card #005")).toBeInTheDocument();
    const originalCards = Array.from(
      container.querySelectorAll(".print-grid"),
      (grid) => grid.textContent,
    );
    fireEvent.click(screen.getByRole("button", { name: "4 per page" }));
    expect(container.querySelectorAll(".print-sheet")).toHaveLength(2);
    expect(screen.getByRole("status")).toHaveTextContent(
      "5 unique cards · 2 printed pages · 4 per page",
    );
    fireEvent.click(screen.getByRole("button", { name: "2 per page" }));
    expect(container.querySelectorAll(".print-sheet")).toHaveLength(3);
    expect(
      Array.from(container.querySelectorAll(".print-grid"), (grid) => grid.textContent),
    ).toEqual(originalCards);
    fireEvent.click(screen.getByRole("button", { name: "1 per page" }));
    expect(container.querySelectorAll(".print-sheet")).toHaveLength(5);
    fireEvent.click(screen.getByText("Generate Cards"));
    expect(
      Array.from(container.querySelectorAll(".print-grid"), (grid) => grid.textContent),
    ).not.toEqual(originalCards);
    fireEvent.click(screen.getByText("Print / Save as PDF"));
    expect(print).toHaveBeenCalledOnce();
  });
});

describe("Caller dashboard", () => {
  it("undoes the final call and confirms or cancels a restart", () => {
    localStorage.setItem("wmb-caller-v1", JSON.stringify(SONGS.map((song) => song.id)));
    render(<CallerDashboard />);
    expect(screen.getByText("All songs have been called.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Undo Last Song"));
    expect(screen.queryByText("All songs have been called.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Draw Next Song"));
    expect(screen.getByText("All songs have been called.")).toBeInTheDocument();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(screen.getByText("Restart Game"));
    expect(screen.getByText("All songs have been called.")).toBeInTheDocument();
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByText("Restart Game"));
    expect(screen.getByText("Draw the first song")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });
  it("keeps working when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Blocked");
    });
    render(<CallerDashboard />);
    expect(screen.getByRole("status")).toHaveTextContent("cannot be saved");
    fireEvent.click(screen.getByText("Draw Next Song"));
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
  });
});
