import { useEffect, useState } from "react";
import {
  GUESS_SONG_STORAGE_KEY,
  guessSongSchema,
  initialGuessSongState,
  type GuessSongState,
} from "@/lib/guess-the-song";

export function useGuessSong() {
  const [state, setState] = useState(initialGuessSongState);
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function load() {
      try {
        const raw = localStorage.getItem(GUESS_SONG_STORAGE_KEY);
        setState(raw === null ? initialGuessSongState() : guessSongSchema.parse(JSON.parse(raw)));
        setBlocked(false);
        setError("");
      } catch {
        setBlocked(true);
        setError(
          "The saved scoreboard could not be loaded. Start fresh to replace it, or try reopening this page.",
        );
      } finally {
        setReady(true);
      }
    }
    load();
    const onStorage = (event: StorageEvent) => {
      if (event.key === GUESS_SONG_STORAGE_KEY || event.key === null) load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function save(update: (current: GuessSongState) => GuessSongState, replace = false) {
    if (!ready || (blocked && !replace)) return false;
    try {
      const raw = replace ? null : localStorage.getItem(GUESS_SONG_STORAGE_KEY);
      const current =
        raw === null ? initialGuessSongState() : guessSongSchema.parse(JSON.parse(raw));
      const next = guessSongSchema.parse(update(current));
      localStorage.setItem(GUESS_SONG_STORAGE_KEY, JSON.stringify(next));
      setState(next);
      setError("");
      setBlocked(false);
      return true;
    } catch {
      setError(
        "Could not save on this device. Your names and scores are unchanged. Check your browser’s storage and try again.",
      );
      return false;
    }
  }
  return { state, ready, blocked, error, save };
}
