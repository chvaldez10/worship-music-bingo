import type { ReactNode } from "react";
import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { routeTree } from "@/routeTree.gen";

function renderAt(path: string) {
  // The document shell includes stylesheets that jsdom cannot load.
  Object.assign(routeTree.options, {
    shellComponent: ({ children }: { children: ReactNode }) => <>{children}</>,
  });
  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree,
    isServer: false,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  return render(<RouterProvider router={router} />);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// Assert only that the router mounts and paints, never page content:
// routes are rewritten as the app is built and this must keep passing.
describe("App routing", () => {
  it("keeps the main menu simple while all camp games remain reachable from the hub", async () => {
    renderAt("/");
    await screen.findByRole("heading", { name: /Church Camp Games/i });
    const navigation = within(screen.getByRole("navigation", { name: "Games" }));
    expect(navigation.getByRole("link", { name: "All games" })).toHaveAttribute("href", "/");
    expect(navigation.getByRole("link", { name: "Song library" })).toHaveAttribute(
      "href",
      "/songs",
    );
    expect(navigation.queryByRole("link", { name: "Charades" })).not.toBeInTheDocument();
    const hub = within(screen.getByRole("main"));
    for (const path of ["/bingo", "/charades", "/singing-bee"])
      expect(hub.getAllByRole("link").some((link) => link.getAttribute("href") === path)).toBe(
        true,
      );
  });
  it("renders the index route", async () => {
    const { container } = renderAt("/");

    await waitFor(() => expect(container.querySelector("main, h1")).not.toBeNull());
  });

  it("renders the not-found route", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const { container } = renderAt("/this-route-does-not-exist");

    await waitFor(() => expect(container.querySelector("main, h1")).not.toBeNull());
  });
});
