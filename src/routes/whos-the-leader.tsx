import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, UsersRound, Eye, Hand } from "lucide-react";
import { Select } from "@/components/ui-lite";
import { SecretLeaderCard } from "@/components/games/SecretLeaderCard";

export const Route = createFileRoute("/whos-the-leader")({
  head: () => ({
    meta: [
      { title: "Who’s the Leader? — Church Camp Games" },
      {
        name: "description",
        content:
          "Copy the secret leader’s actions and let the guesser work out who is leading the circle.",
      },
    ],
  }),
  component: WhosTheLeaderPage,
});

const steps = [
  {
    title: "Make a circle",
    detail: "Everyone sits or stands in a circle where they can see the group.",
  },
  {
    title: "Choose a guesser",
    detail: "Pick one person to guess. Have them look away while the group chooses a leader.",
  },
  {
    title: "Pick the secret leader",
    detail:
      "Quietly choose one person in the circle to lead the actions. Keep their identity secret from the guesser.",
  },
  {
    title: "Start copying",
    detail:
      "The leader starts an action, such as clapping or tapping their knees. Everyone copies as quickly and subtly as possible.",
  },
  {
    title: "Change the action",
    detail:
      "The leader periodically switches to a different action. The group follows each change.",
  },
  {
    title: "Keep the secret",
    detail:
      "Avoid staring at the leader. Keep your eyes moving around the circle so you do not give them away.",
  },
  {
    title: "Find the leader",
    detail:
      "The guesser watches from the middle of the circle and tries to identify who is controlling the actions.",
  },
];

function WhosTheLeaderPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        to="/"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft size={16} aria-hidden="true" /> All games
      </Link>
      <header className="mt-5 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <UsersRound size={16} aria-hidden="true" /> Copy & discover
          </p>
          <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">
            Who’s the Leader?
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            One secret leader. A circle of copycats. Can the guesser spot who is in charge?
          </p>
          <p className="mt-4 text-sm font-semibold text-muted-foreground">
            Everyone plays · No equipment · Sit or stand
          </p>
        </div>
        <label className="w-full rounded-2xl border border-border bg-card p-4 text-sm font-semibold sm:max-w-xs">
          Game version
          <Select defaultValue="whos-the-leader">
            <option value="whos-the-leader">Who’s the Leader?</option>
          </Select>
        </label>
      </header>
      <SecretLeaderCard />
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section
          aria-labelledby="leader-rules"
          className="rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-7"
        >
          <h2 id="leader-rules" className="font-display text-3xl">
            How to play
          </h2>
          <ol role="list" className="mt-6 space-y-6">
            {steps.map((step, index) => (
              <li role="listitem" key={step.title} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-primary"
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-1 leading-relaxed text-muted-foreground">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-7 border-t border-border pt-5 text-sm text-muted-foreground">
            Ready for another round? Choose a new guesser and a new secret leader.
          </p>
        </section>
        <div className="space-y-6">
          <section
            aria-labelledby="leader-roles"
            className="rounded-3xl border border-border bg-card p-5 sm:p-6"
          >
            <Eye size={24} className="text-primary" aria-hidden="true" />
            <h2 id="leader-roles" className="mt-3 font-display text-2xl">
              Know your role
            </h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="font-semibold">The leader</dt>
                <dd className="mt-1 leading-relaxed text-muted-foreground">
                  Start the actions and change them from time to time.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">The group</dt>
                <dd className="mt-1 leading-relaxed text-muted-foreground">
                  Copy the leader without making it obvious who you are watching.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">The guesser</dt>
                <dd className="mt-1 leading-relaxed text-muted-foreground">
                  Watch for who starts each change and guess the leader.
                </dd>
              </div>
            </dl>
          </section>
          <section aria-labelledby="leader-actions" className="rounded-3xl bg-secondary p-5 sm:p-6">
            <Hand size={24} className="text-primary" aria-hidden="true" />
            <h2 id="leader-actions" className="mt-3 font-display text-2xl">
              Easy action ideas
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2 text-sm">
              {["Clapping", "Tapping knees", "Snapping", "Moving arms"].map((action) => (
                <li key={action} className="rounded-full bg-card px-3 py-2">
                  {action}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
