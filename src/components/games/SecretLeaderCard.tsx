import { useEffect, useState, type FormEvent } from "react";
import { Btn } from "@/components/ui-lite";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LoadingState } from "@/components/PageLoading";
import { LEADER_STORAGE_KEY, leaderNameSchema, savedLeaderSchema } from "@/lib/leader";
import { PromptCard } from "./PromptCard";

export function SecretLeaderCard() {
  const [name, setName] = useState("");
  const [ready, setReady] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    function load() {
      setRevealed(false);
      setEditing(false);
      try {
        const raw = localStorage.getItem(LEADER_STORAGE_KEY);
        setName(raw === null ? "" : savedLeaderSchema.parse(JSON.parse(raw)).name);
        setNotice("");
      } catch {
        setName("");
        setNotice(
          "The saved leader could not be loaded. Choose a leader to replace the saved name.",
        );
      } finally {
        setReady(true);
      }
    }
    load();
    const onStorage = (event: StorageEvent) => {
      if (event.key === LEADER_STORAGE_KEY || event.key === null) load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function chooseLeader(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = leaderNameSchema.safeParse(new FormData(event.currentTarget).get("name"));
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]!.message);
      return;
    }
    try {
      localStorage.setItem(LEADER_STORAGE_KEY, JSON.stringify({ version: 1, name: parsed.data }));
      setName(parsed.data);
      setRevealed(false);
      setEditing(false);
      setNotice("");
    } catch {
      setFormError(
        "Could not save the leader on this device. Your previous saved name is unchanged.",
      );
    }
  }

  function clearLeader() {
    try {
      localStorage.removeItem(LEADER_STORAGE_KEY);
      setName("");
      setRevealed(false);
      setNotice("");
    } catch {
      setNotice("Could not clear the saved leader. Try again on this device.");
    }
  }

  return (
    <section
      aria-labelledby="secret-leader-title"
      className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-7"
    >
      <h2 id="secret-leader-title" className="font-display text-2xl">
        Secret leader
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Keep this card hidden from the guesser. The name is saved on this device.
      </p>
      {!ready ? (
        <LoadingState message="Loading the secret leader…" />
      ) : (
        <>
          {notice && (
            <p role="status" className="mt-4 rounded-xl bg-secondary p-3 text-sm">
              {notice}
            </p>
          )}
          <PromptCard
            title={name || undefined}
            revealed={revealed}
            onToggle={() => setRevealed((value) => !value)}
            emptyTitle="Choose a leader"
            emptyDetail="Have the guesser look away while you enter the leader’s name."
            hiddenTitle="Leader hidden"
            hiddenDetail="Reveal the name only when the guesser is looking away."
            revealLabel="Reveal leader"
            hideLabel="Hide leader"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <Dialog
              open={editing}
              onOpenChange={(open) => {
                setEditing(open);
                setFormError("");
                if (open) setRevealed(false);
              }}
            >
              <DialogTrigger asChild>
                <Btn variant="outline">{name ? "Change leader" : "Set leader"}</Btn>
              </DialogTrigger>
              <DialogContent
                overlayClassName="bg-foreground/20 backdrop-blur-sm"
                className="max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-3xl bg-card sm:rounded-3xl [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center"
              >
                <form onSubmit={chooseLeader}>
                  <DialogHeader className="pr-10 text-left">
                    <DialogTitle className="font-display text-2xl">Choose the leader</DialogTitle>
                    <DialogDescription>
                      Ask the guesser to look away. Saving the name hides the card.
                    </DialogDescription>
                  </DialogHeader>
                  <label className="mt-5 block text-sm font-semibold">
                    Leader’s name
                    <input
                      name="name"
                      required
                      maxLength={120}
                      defaultValue={name}
                      autoComplete="off"
                      className="mt-2 min-h-12 w-full min-w-0 rounded-xl border border-border bg-background px-4 py-3 text-base font-normal focus:outline-primary"
                    />
                  </label>
                  {formError && (
                    <p role="alert" className="mt-3 text-sm text-destructive">
                      {formError}
                    </p>
                  )}
                  <div className="mt-6 flex flex-wrap justify-end gap-2">
                    <Btn type="button" variant="ghost" onClick={() => setEditing(false)}>
                      Cancel
                    </Btn>
                    <Btn type="submit">Save leader</Btn>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            {name && (
              <Btn variant="ghost" onClick={clearLeader}>
                Clear leader
              </Btn>
            )}
          </div>
        </>
      )}
    </section>
  );
}
