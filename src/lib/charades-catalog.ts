import { z } from "zod";
import type { PromptCategory } from "@/hooks/use-party-game";

const id = z.number().int().positive().max(2147483647);
const text = z.string().trim().min(1);
const catalogSchema = z.object({
  categories: z.array(z.object({ id, slug: text, label: text })).min(1),
  prompts: z.array(z.object({ id, category_id: id, title: text, detail: z.string().nullable() })),
  songs: z.array(z.object({ id, title: text })),
});
export type CharadesCatalog = z.infer<typeof catalogSchema>;
export const CHARADES_CACHE_KEY = "camp-charades-catalog-v1";

export function parseCharadesCatalog(value: unknown): CharadesCatalog {
  const catalog = catalogSchema.parse(value);
  for (const rows of [catalog.categories, catalog.prompts, catalog.songs]) {
    if (new Set(rows.map((row) => row.id)).size !== rows.length) {
      throw new Error("Duplicate content IDs");
    }
  }
  if (new Set(catalog.categories.map((row) => row.slug)).size !== catalog.categories.length) {
    throw new Error("Duplicate categories");
  }
  const categoryIds = new Set(catalog.categories.map((row) => row.id));
  if (catalog.prompts.some((row) => !categoryIds.has(row.category_id))) {
    throw new Error("Unknown prompt category");
  }
  if (!catalogCategories(catalog).length) throw new Error("No playable categories");
  return catalog;
}

// Preserve IDs from existing saved games; new database rows have their own namespace.
function promptId(id: number): string {
  if (id <= 24) return `bible-${id}`;
  if (id <= 44) return `church-${id - 24}`;
  return `charades-${id}`;
}

export function catalogCategories(catalog: CharadesCatalog): PromptCategory[] {
  return catalog.categories
    .map((category) => ({
      id: category.slug,
      label: category.label,
      prompts:
        category.slug === "songs"
          ? catalog.songs.map((song) => ({
              id: `song-${String(song.id).padStart(2, "0")}`,
              title: song.title,
            }))
          : catalog.prompts
              .filter((prompt) => prompt.category_id === category.id)
              .map((prompt) => ({
                id: promptId(prompt.id),
                title: prompt.title,
                ...(prompt.detail?.trim() ? { detail: prompt.detail.trim() } : {}),
              })),
    }))
    .filter((category) => category.prompts.length > 0);
}

async function readAll<T>(
  query: (start: number, end: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await query(offset, offset + 999);
    if (error || !data) throw new Error("Could not load Charades content");
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

export async function loadCharadesCatalog(signal: AbortSignal): Promise<CharadesCatalog> {
  const { supabase } = await import("@/integrations/supabase/client");
  const [categories, prompts, songs] = await Promise.all([
    readAll((start, end) =>
      supabase
        .from("charades_categories")
        .select("id,slug,label")
        .order("id")
        .range(start, end)
        .abortSignal(signal),
    ),
    readAll((start, end) =>
      supabase
        .from("charades_prompts")
        .select("id,category_id,title,detail")
        .order("id")
        .range(start, end)
        .abortSignal(signal),
    ),
    readAll((start, end) =>
      supabase.from("songs").select("id,title").order("id").range(start, end).abortSignal(signal),
    ),
  ]);
  return parseCharadesCatalog({ categories, prompts, songs });
}
