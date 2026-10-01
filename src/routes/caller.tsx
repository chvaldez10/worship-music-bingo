import { createFileRoute } from "@tanstack/react-router";
import { CallerDashboard } from "@/components/bingo/CallerDashboard";

export const Route = createFileRoute("/caller")({
  head: () => ({
    meta: [
      { title: "Caller — Worship Music Bingo" },
      { name: "description", content: "Host dashboard for drawing and tracking worship songs during bingo." },
      { property: "og:title", content: "Caller — Worship Music Bingo" },
      { property: "og:description", content: "Host dashboard for drawing and tracking worship songs during bingo." },
    ],
  }),
  component: () => (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <CallerDashboard />
    </main>
  ),
});
