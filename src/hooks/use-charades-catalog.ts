import { useEffect, useState } from "react";
import { CHARADES_CATEGORIES, charadesPrompts } from "@/data/game-prompts";
import {
  CHARADES_CACHE_KEY,
  catalogCategories,
  loadCharadesCatalog,
  parseCharadesCatalog,
} from "@/lib/charades-catalog";
import type { PromptCategory } from "@/hooks/use-party-game";

const starterCategories = CHARADES_CATEGORIES.map((category) => ({
  ...category,
  prompts: charadesPrompts(category.id),
}));
type Content = { categories: PromptCategory[]; notice?: string };

export function useCharadesCatalog() {
  const [content, setContent] = useState<Content | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let settled = false;
    const fallback = () => {
      if (!active || settled) return;
      settled = true;
      try {
        const cached = localStorage.getItem(CHARADES_CACHE_KEY);
        if (cached) {
          setContent({
            categories: catalogCategories(parseCharadesCatalog(JSON.parse(cached))),
            notice:
              "Couldn’t load updated prompts. Using the last saved prompt list for this visit.",
          });
          return;
        }
      } catch {
        /* An unavailable or invalid cache must not prevent playing. */
      }
      setContent({
        categories: starterCategories,
        notice: "Couldn’t load updated prompts. Using the starter prompt list for this visit.",
      });
    };
    const timeout = window.setTimeout(() => {
      fallback();
      controller.abort();
    }, 8000);
    loadCharadesCatalog(controller.signal)
      .then((catalog) => {
        if (!active || settled) return;
        settled = true;
        window.clearTimeout(timeout);
        try {
          localStorage.setItem(CHARADES_CACHE_KEY, JSON.stringify(catalog));
        } catch {
          /* Live content remains usable when browser storage is blocked. */
        }
        setContent({ categories: catalogCategories(catalog) });
      })
      .catch(() => {
        window.clearTimeout(timeout);
        fallback();
      });
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);
  return content;
}
