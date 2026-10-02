import { createFileRoute } from "@tanstack/react-router";
import { HostedPromptGame } from "@/components/games/HostedPromptGame";
import { singingBeePrompts } from "@/data/game-prompts";

export const Route = createFileRoute("/singing-bee")({
  head: () => ({
    meta: [
      { title: "Worship Singing Bee — Church Camp Games" },
      {
        name: "description",
        content: "A host-led worship singing challenge using the shared worship song bank.",
      },
    ],
  }),
  component: SingingBeePage,
});

function SingingBeePage() {
  return (
    <HostedPromptGame
      title="Worship Singing Bee"
      description="Start a familiar worship song, stop singing, and let the team carry it on. The same song bank powers Worship Bingo."
      prompts={singingBeePrompts()}
      defaultSeconds={30}
      instructions={[
        "The host draws and privately reveals a song title. Agree on the verse or chorus and how much the team must sing.",
        "The host sings the opening from memory, then stops. Hide the title and start the timer for the team to continue.",
        "Judge the words rather than vocal ability. Award one point for a correct continuation, or record Pass / Miss.",
        "Rotate teams and draw another song. Songs do not repeat during a game. Decide how many rounds to play before starting.",
      ]}
    />
  );
}
