import { useEffect, useState } from "react";
import {
  KARAOKE_STORAGE_KEY,
  backfillWorshipGenre,
  KaraokeConflictError,
  karaokeLibrarySchema,
  starterLibrary,
  type KaraokeLibrary,
} from "@/lib/karaoke";

export function useKaraoke() {
  const [library, setLibrary] = useState<KaraokeLibrary>(starterLibrary);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    function load() {
      try {
        const raw = localStorage.getItem(KARAOKE_STORAGE_KEY);
        const saved = raw ? karaokeLibrarySchema.parse(JSON.parse(raw)) : starterLibrary();
        const updated = backfillWorshipGenre(saved);
        setLibrary(updated);
        setBlocked(false);
        setError("");
        if (raw && updated !== saved) {
          try {
            localStorage.setItem(KARAOKE_STORAGE_KEY, JSON.stringify(updated));
          } catch {
            setError(
              "Worship genres are shown, but could not be saved on this device. Export a backup to keep them.",
            );
          }
        }
      } catch {
        setBlocked(true);
        setError(
          "Your saved library could not be loaded. Export a backup before replacing it with an imported library.",
        );
      } finally {
        setReady(true);
      }
    }
    load();
    const onStorage = (event: StorageEvent) => {
      if (event.key === KARAOKE_STORAGE_KEY || event.key === null) load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  function save(update: (current: KaraokeLibrary) => KaraokeLibrary, replace = false) {
    if (!ready || (blocked && !replace)) return false;
    try {
      const raw = localStorage.getItem(KARAOKE_STORAGE_KEY);
      const current = replace
        ? library
        : raw
          ? karaokeLibrarySchema.parse(JSON.parse(raw))
          : starterLibrary();
      const next = karaokeLibrarySchema.parse(update(current));
      localStorage.setItem(KARAOKE_STORAGE_KEY, JSON.stringify(next));
      setLibrary(next);
      setError("");
      setBlocked(false);
      return true;
    } catch (cause) {
      if (cause instanceof KaraokeConflictError) {
        setError(cause.message);
        return false;
      }
      setError(
        "Could not save. Check the entered values or your browser’s available storage. Your previous library is unchanged.",
      );
      return false;
    }
  }
  function exportLibrary() {
    try {
      const raw = localStorage.getItem(KARAOKE_STORAGE_KEY) ?? JSON.stringify(library, null, 2);
      const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "karaoke-library.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Could not export your library.");
    }
  }
  return { library, ready, error, blocked, save, exportLibrary, setError };
}
