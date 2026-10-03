import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import axe from "axe-core";
import { SecretLeaderCard } from "@/components/games/SecretLeaderCard";
import { LEADER_STORAGE_KEY } from "@/lib/leader";

const saved = (name: string) => JSON.stringify({ version: 1, name });
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("Secret leader card", () => {
  it("saves a trimmed name, reveals and hides it, and restores it hidden after reopening", async () => {
    const first = render(<SecretLeaderCard />);
    fireEvent.click(screen.getByRole("button", { name: "Set leader" }));
    const dialog = screen.getByRole("dialog", { name: "Choose the leader" });
    expect(within(dialog).getByLabelText("Leader’s name")).toHaveFocus();
    fireEvent.change(within(dialog).getByLabelText("Leader’s name"), {
      target: { value: "  Jordan  " },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save leader" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(localStorage.getItem(LEADER_STORAGE_KEY)).toBe(saved("Jordan"));
    expect(screen.queryByText("Jordan")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Jordan")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reveal leader" }));
    expect(screen.getByRole("heading", { name: "Jordan" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hide leader" }));
    expect(screen.queryByText("Jordan")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reveal leader" }));
    first.unmount();
    render(<SecretLeaderCard />);
    expect(screen.getByRole("heading", { name: "Leader hidden" })).toBeInTheDocument();
    expect(screen.queryByText("Jordan")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reveal leader" }));
    expect(screen.getByRole("heading", { name: "Jordan" })).toBeInTheDocument();
  });

  it("keeps editing private, validates blank names, and leaves the saved name unchanged on cancellation", async () => {
    localStorage.setItem(LEADER_STORAGE_KEY, saved("Jordan"));
    render(<SecretLeaderCard />);
    fireEvent.click(screen.getByRole("button", { name: "Reveal leader" }));
    fireEvent.click(screen.getByRole("button", { name: "Change leader" }));
    const dialog = screen.getByRole("dialog", { name: "Choose the leader" });
    expect(screen.getByText("Leader hidden")).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Leader’s name"), { target: { value: "   " } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save leader" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Enter a name");
    const report = await axe.run(dialog, { rules: { "color-contrast": { enabled: false } } });
    expect(report.violations.map((item) => item.id)).toEqual([]);
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Change leader" })).toHaveFocus();
    expect(localStorage.getItem(LEADER_STORAGE_KEY)).toBe(saved("Jordan"));
    expect(screen.queryByText("Jordan")).not.toBeInTheDocument();
  });

  it("hides the card when another tab changes or clears the saved leader", () => {
    localStorage.setItem(LEADER_STORAGE_KEY, saved("Jordan"));
    render(<SecretLeaderCard />);
    fireEvent.click(screen.getByRole("button", { name: "Reveal leader" }));
    localStorage.setItem(LEADER_STORAGE_KEY, saved("Alex"));
    fireEvent(window, new StorageEvent("storage", { key: LEADER_STORAGE_KEY }));
    expect(screen.getByRole("heading", { name: "Leader hidden" })).toBeInTheDocument();
    expect(screen.queryByText("Jordan")).not.toBeInTheDocument();
    expect(screen.queryByText("Alex")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reveal leader" }));
    expect(screen.getByRole("heading", { name: "Alex" })).toBeInTheDocument();
    localStorage.clear();
    fireEvent(window, new StorageEvent("storage", { key: null }));
    expect(screen.getByRole("button", { name: "Set leader" })).toBeInTheDocument();
    expect(screen.queryByText("Alex")).not.toBeInTheDocument();
  });

  it("preserves malformed storage until explicitly replaced and reports failed saves", () => {
    localStorage.setItem(LEADER_STORAGE_KEY, "{broken");
    render(<SecretLeaderCard />);
    expect(screen.getByRole("status")).toHaveTextContent("could not be loaded");
    expect(localStorage.getItem(LEADER_STORAGE_KEY)).toBe("{broken");
    fireEvent.click(screen.getByRole("button", { name: "Set leader" }));
    fireEvent.change(screen.getByLabelText("Leader’s name"), { target: { value: "Alex" } });
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage blocked");
    });
    fireEvent.click(screen.getByRole("button", { name: "Save leader" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Could not save");
    expect(localStorage.getItem(LEADER_STORAGE_KEY)).toBe("{broken");
    write.mockRestore();
    fireEvent.click(screen.getByRole("button", { name: "Save leader" }));
    expect(localStorage.getItem(LEADER_STORAGE_KEY)).toBe(saved("Alex"));
    expect(screen.getByRole("heading", { name: "Leader hidden" })).toBeInTheDocument();
  });

  it("clears only this game's name and removes the revealed name from the page", () => {
    localStorage.setItem(LEADER_STORAGE_KEY, saved("Jordan"));
    localStorage.setItem("unrelated-game", "keep");
    render(<SecretLeaderCard />);
    fireEvent.click(screen.getByRole("button", { name: "Reveal leader" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear leader" }));
    expect(localStorage.getItem(LEADER_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem("unrelated-game")).toBe("keep");
    expect(screen.queryByText("Jordan")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Set leader" })).toBeInTheDocument();
  });
});
