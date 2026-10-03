import { act, cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import type { ComponentType, ReactNode } from "react";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PageLoading } from "@/components/PageLoading";
import { CallerDashboard } from "@/components/bingo/CallerDashboard";
import { Route as PlayRoute } from "@/routes/play";
import { Route as SingingRoute } from "@/routes/singing-bee";
import { Route as KaraokeRoute } from "@/routes/karaoke";
import { SongLibraryPage } from "@/components/songs/SongLibraryPage";
import { getRouter } from "@/router";
import { SONGS } from "@/data/songs";
import { Route as RootRoute } from "@/routes/__root";

const Play = PlayRoute.options.component as ComponentType;
const SingingBee = SingingRoute.options.component as ComponentType;
const Karaoke = KaraokeRoute.options.component as ComponentType;

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("Page readiness", () => {
  it.each([
    ["bingo player", Play, "FREE"],
    ["bingo caller", CallerDashboard, "Draw Next Song"],
    ["singing bee", SingingBee, "Draw next prompt"],
    ["karaoke", Karaoke, "Create setlist"],
    ["song library", SongLibraryPage, "Add song"],
  ] as const)("keeps %s controls hidden until saved state has loaded", async (_, Page, button) => {
    const initial = renderToString(<Page />);
    expect(initial).toContain('role="status"');
    expect(initial).toContain('aria-busy="true"');
    expect(initial).not.toContain("<button");
    render(<Page />);
    expect(await screen.findByRole("button", { name: button })).toBeInTheDocument();
    expect(document.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it("shows restored caller content when the spinner disappears", () => {
    localStorage.setItem("wmb-caller-v1", JSON.stringify([SONGS[0]!.id]));
    render(<CallerDashboard />);
    expect(screen.getByRole("heading", { name: SONGS[0]!.title })).toBeInTheDocument();
    expect(screen.queryByText("Draw the first song")).not.toBeInTheDocument();
    expect(document.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it("leaves loading on a storage failure and exposes the usable fallback", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
    render(<SingingBee />);
    expect(screen.getByRole("button", { name: "Draw next prompt" })).toBeEnabled();
    expect(screen.getByText(/saved game could not be restored/)).toBeInTheDocument();
    expect(document.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it("announces loading without exposing the decorative spinner to screen readers", () => {
    const { container } = render(<PageLoading />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading page…");
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelectorAll("main")).toHaveLength(1);
  });

  it("shows the same spinner during navigation and replaces it only when the route is ready", async () => {
    const router = getRouter();
    const printRoute = router.routesById["/print"];
    const previousBeforeLoad = printRoute.options.beforeLoad;
    let finish!: () => void;
    Object.assign(printRoute.options, {
      beforeLoad: () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    });
    // Use a fragment instead of the document shell, whose stylesheets jsdom cannot load.
    const previousRootOptions = { ...RootRoute.options };
    Object.assign(RootRoute.options, {
      shellComponent: ({ children }: { children: ReactNode }) => <>{children}</>,
    });
    router.update({
      context: router.options.context!,
      history: createMemoryHistory({ initialEntries: ["/"] }),
      isServer: false,
    });
    try {
      render(<RouterProvider router={router} />);
      await screen.findByRole("heading", { name: /Church Camp Games/i });
      let navigation!: Promise<void>;
      await act(async () => {
        navigation = router.navigate({ to: "/print" });
      });
      expect(await screen.findByText("Loading page…")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Generate Cards" })).not.toBeInTheDocument();
      await act(async () => {
        finish();
        await navigation;
      });
      expect(await screen.findByRole("button", { name: "Generate Cards" })).toBeEnabled();
      expect(screen.queryByText("Loading page…")).not.toBeInTheDocument();
    } finally {
      if (previousBeforeLoad) Object.assign(printRoute.options, { beforeLoad: previousBeforeLoad });
      else delete printRoute.options.beforeLoad;
      Object.assign(RootRoute.options, previousRootOptions);
    }
  });
});
