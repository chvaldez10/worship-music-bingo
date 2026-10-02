import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HostedPromptGame } from "@/components/games/HostedPromptGame";
import { CHARADES_CATEGORIES, charadesPrompts, type CharadesCategory } from "@/data/game-prompts";

export const Route = createFileRoute("/charades")({
  head: () => ({
    meta: [
      { title: "Charades — Church Camp Games" },
      {
        name: "description",
        content:
          "Act out Bible events, worship songs, and church activities with teams and a round timer.",
      },
    ],
  }),
  component: CharadesPage,
});

function CharadesPage() {
  const [category, setCategory] = useState<CharadesCategory>("bible");
  return (
    <HostedPromptGame
      title="Charades"
      description="A little acting, a lot of laughter. Take turns bringing familiar stories, songs, and church life to life."
      defaultSeconds={60}
      prompts={charadesPrompts(category)}
      category={category}
      categories={CHARADES_CATEGORIES}
      onCategoryChange={(id) => {
        if (CHARADES_CATEGORIES.some((item) => item.id === id)) setCategory(id as CharadesCategory);
      }}
      instructions={[
        "Choose a category and let one actor from the active team reveal the prompt privately.",
        "Hide the prompt and start the timer. Act without speaking, singing, or spelling words.",
        "The team guesses before time runs out. The host awards one point for a correct answer, or records Pass / Miss.",
        "The next team takes a turn. Pick another category whenever a round is finished.",
      ]}
    />
  );
}
