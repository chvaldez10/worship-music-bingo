import { createFileRoute } from "@tanstack/react-router";
import { CompletePhraseGame } from "@/components/games/CompletePhraseGame";

export const Route = createFileRoute("/complete-the-phrase")({
  head: () => ({
    meta: [
      { title: "Complete the Phrase — Church Camp Games" },
      {
        name: "description",
        content:
          "A fast Christian phrase completion game for a line of players, with a private host card.",
      },
    ],
  }),
  component: CompletePhraseGame,
});
