import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, screen, fireEvent, waitFor } from "@testing-library/react";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import axe from "axe-core";
import { routeTree } from "@/routeTree.gen";

vi.mock("@/lib/charades-catalog", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/charades-catalog")>()),
  loadCharadesCatalog: async () => ({
    categories: [{ id: 4, slug: "bible-characters", label: "Bible characters" }],
    prompts: [
      { id: 99, category_id: 4, title: "Jonah", detail: "Mime being swallowed by a giant fish." },
    ],
    songs: [],
  }),
}));

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  localStorage.clear();
});

// jsdom has no layout engine; contrast is verified separately in browser QA.
describe("Accessible game pages", () => {
  it.each([
    "/",
    "/bingo",
    "/play",
    "/caller",
    "/print",
    "/charades",
    "/singing-bee",
    "/whos-the-leader",
    "/guess-the-song",
    "/songs",
    "/karaoke",
  ])("has no automated semantic violations on %s", async (path) => {
    Object.assign(routeTree.options, {
      shellComponent: ({ children }: { children: ReactNode }) => <>{children}</>,
    });
    const router = createRouter({
      routeTree,
      isServer: false,
      context: { queryClient: new QueryClient() },
      history: createMemoryHistory({ initialEntries: [path] }),
    });
    const { container } = render(<RouterProvider router={router} />);
    await screen.findByRole("main");
    if (path === "/charades") {
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Start team turn" })).toBeEnabled(),
      );
      fireEvent.click(screen.getByRole("button", { name: "Start team turn" }));
      expect(screen.getByText("Mime being swallowed by a giant fish.")).toBeInTheDocument();
    }
    const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(
      results.violations.map((violation) => ({
        id: violation.id,
        nodes: violation.nodes.map((node) => node.html),
      })),
    ).toEqual([]);
  });
});
