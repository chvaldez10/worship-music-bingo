import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import axe from "axe-core";
import { routeTree } from "@/routeTree.gen";

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  localStorage.clear();
});

// jsdom has no layout engine; contrast is verified separately in browser QA.
describe("Accessible game pages", () => {
  it.each(["/", "/bingo", "/play", "/caller", "/print", "/charades", "/singing-bee"])(
    "has no automated semantic violations on %s",
    async (path) => {
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
      const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
      expect(
        results.violations.map((violation) => ({
          id: violation.id,
          nodes: violation.nodes.map((node) => node.html),
        })),
      ).toEqual([]);
    },
  );
});
