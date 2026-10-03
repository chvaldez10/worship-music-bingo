import { createFileRoute } from "@tanstack/react-router";
import { GuessSongScoreboard } from "@/components/games/GuessSongScoreboard";

export const Route = createFileRoute("/guess-the-song")({
  head: () => ({ meta: [{ title: "Guess the Song • Church Camp Games" }] }),
  component: GuessSongScoreboard,
});
