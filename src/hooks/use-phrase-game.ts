import { useEffect, useState } from "react";
import { z } from "zod";
import { ALL_PHRASE_PROMPTS, PHRASE_PROMPTS, phraseKey } from "@/data/complete-the-phrase";

export const PHRASE_TIMER_OPTIONS = [5, 10, 15, 20] as const;
export const PHRASE_STORAGE_KEY = "camp-complete-the-phrase-v1";
const ids = new Set(ALL_PHRASE_PROMPTS.map((prompt) => prompt.id));
const schema = z
  .object({
    version: z.literal(1),
    timerSeconds: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20)]).default(5),
    remainingMs: z.number().int().min(0).max(20000).default(5000),
    deadline: z.number().finite().nonnegative().nullable().default(null),
    currentId: z
      .string()
      .nullable()
      .refine((value) => value === null || ids.has(value)),
    results: z
      .array(z.object({ id: z.string().refine((value) => ids.has(value)), correct: z.boolean() }))
      .max(ALL_PHRASE_PROMPTS.length),
  })
  .refine(
    (state) =>
      new Set(state.results.map((result) => result.id)).size === state.results.length &&
      !state.results.some((result) => result.id === state.currentId),
  );
export type PhraseState = z.infer<typeof schema>;
export const freshPhraseState = (): PhraseState => ({
  version: 1,
  timerSeconds: 5,
  remainingMs: 5000,
  deadline: null,
  currentId: null,
  results: [],
});

export function usePhraseGame() {
  const [state, setState] = useState(freshPhraseState);
  const [loaded, setLoaded] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(PHRASE_STORAGE_KEY);
    } catch {
      setNotice(
        "This browser cannot access saved progress. Keep this page open to continue playing.",
      );
    }
    if (saved) {
      try {
        const parsed = schema.safeParse(JSON.parse(saved));
        if (!parsed.success) throw new Error("Invalid progress");
        const restored = parsed.data;
        if (
          restored.currentId &&
          !PHRASE_PROMPTS.some((prompt) => prompt.id === restored.currentId)
        ) {
          const old = ALL_PHRASE_PROMPTS.find((prompt) => prompt.id === restored.currentId)!;
          const replacement = PHRASE_PROMPTS.find((prompt) => phraseKey(prompt) === phraseKey(old));
          restored.currentId = replacement?.id ?? null;
          restored.deadline = null;
          restored.remainingMs = restored.timerSeconds * 1000;
        }
        setState(restored);
      } catch {
        setBlocked(true);
        setNotice(
          "Saved progress could not be read. It has been preserved. Use Restart game to start fresh.",
        );
      }
    }
    setLoaded(true);
  }, []);
  const save = (next: PhraseState, restart = false) => {
    if (!loaded || (blocked && !restart)) return false;
    try {
      localStorage.setItem(PHRASE_STORAGE_KEY, JSON.stringify(next));
      setNotice(null);
      setBlocked(false);
    } catch {
      // Keep the active game usable if this browser denies storage.
      setNotice("This browser could not save progress. Keep this page open to continue playing.");
      if (blocked) return false;
    }
    setState(next);
    return true;
  };
  return { state, loaded, blocked, notice, save };
}
