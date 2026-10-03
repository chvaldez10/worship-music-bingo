import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { Prompt } from "@/data/game-prompts";
import {
  initialPartyState,
  partyReducer,
  restorePartyState,
  type PartyAction,
} from "@/lib/party-game";

export type PromptCategory = { id: string; label: string; prompts: Prompt[] };

/** A tab owns its host game; different host tabs cannot overwrite each other. */
export function usePartyGame(
  gameId: string,
  prompts: Prompt[],
  categories: PromptCategory[] | undefined,
  defaultSeconds: number,
  timedTurns = false,
) {
  const [state, reduceDispatch] = useReducer(partyReducer, undefined, () =>
    initialPartyState(defaultSeconds, categories?.[0]?.id ?? null, timedTurns),
  );
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const canSave = useRef(true);
  const key = `camp-game-${gameId}-v1`;
  const bank = useMemo(
    () => (categories ? categories.flatMap((category) => category.prompts) : prompts),
    [prompts, categories],
  );
  const categoryIds = useMemo(() => categories?.map((category) => category.id) ?? [], [categories]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(key);
      if (saved) {
        const restored = restorePartyState(JSON.parse(saved), bank, categoryIds, Date.now());
        // A resumed round must use the category that contains its current prompt.
        const group = categories?.find((category) =>
          category.prompts.some((prompt) => prompt.id === restored.current?.prompt.id),
        );
        reduceDispatch({
          type: "restore",
          state:
            restored.current?.result === null && group
              ? { ...restored, category: group.id }
              : restored,
        });
      }
      canSave.current = true;
    } catch {
      canSave.current = false;
      setStorageError(
        "The saved game could not be restored. Its saved copy is unchanged. Starting a new game will replace it.",
      );
    }
    setLoaded(true);
  }, [key, bank, categoryIds, categories]);

  // A running deadline is sufficient to restore time; avoid writing four times a second.
  const serialized = JSON.stringify({
    version: 1,
    state: {
      ...state,
      timer: {
        ...state.timer,
        remainingMs:
          state.timer.deadline === null ? state.timer.remainingMs : state.timer.duration * 1000,
      },
    },
  });
  useEffect(() => {
    if (!loaded || !canSave.current) return;
    try {
      sessionStorage.setItem(key, serialized);
    } catch {
      setStorageError(
        "This browser cannot save game progress. Keep this page open; refreshing or leaving it will lose the game.",
      );
    }
  }, [key, loaded, serialized]);

  const dispatch = (action: PartyAction) => {
    if (!canSave.current && ["draw", "turn-start", "restart"].includes(action.type)) {
      canSave.current = true;
      setStorageError(null);
    }
    reduceDispatch(action);
  };

  useEffect(() => {
    if (state.timer.deadline === null) return;
    const tick = () => reduceDispatch({ type: "timer-tick", now: Date.now() });
    const interval = window.setInterval(tick, 250);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    tick();
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [state.timer.deadline]);

  return { state, dispatch, loaded, storageError };
}
