import { createFileRoute } from "@tanstack/react-router";
import { HostedPromptGame } from "@/components/games/HostedPromptGame";
import { useCharadesCatalog } from "@/hooks/use-charades-catalog";

export const Route = createFileRoute("/charades")({
  head: () => ({
    meta: [
      { title: "Charades — Church Camp Games" },
      {
        name: "description",
        content:
          "Act out Bible events, characters, worship songs, and church activities with teams and a round timer.",
      },
    ],
  }),
  component: CharadesPage,
});

const prompts: [] = [];

function CharadesPage() {
  const content = useCharadesCatalog();
  if (!content)
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <h1 className="font-display text-4xl sm:text-5xl">Charades</h1>
        <p role="status" className="mt-4 text-muted-foreground">
          Loading game prompts…
        </p>
      </main>
    );
  return (
    <HostedPromptGame
      gameId="charades"
      title="Charades"
      description="A little acting, a lot of laughter. Take turns bringing familiar stories, songs, and church life to life."
      defaultSeconds={60}
      timedTurns
      teamTurnInstructions={[
        "Choose a category and one actor for the active team. Keep this screen visible only to the actor and host.",
        "Start the team turn. The same actor keeps acting without speaking, singing, or spelling words until the timer ends.",
        "Correct earns one point and immediately draws the next prompt. Pass also draws the next prompt. Neither resets the timer.",
        "When time runs out, the next team chooses its actor. Change categories between turns; no prompts repeat until restart.",
      ]}
      prompts={prompts}
      categories={content.categories}
      {...(content.notice ? { contentNotice: content.notice } : {})}
      detailLabel="Acting hint"
      instructions={[
        "Choose a category and let one actor from the active team reveal the prompt privately.",
        "Hide the prompt and start the timer. Act without speaking, singing, or spelling words.",
        "The team guesses before time runs out. The host awards one point for a correct answer, or records Pass / Miss.",
        "The next team takes a turn. Pick another category whenever a round is finished.",
      ]}
    />
  );
}
