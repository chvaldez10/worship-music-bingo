import { createFileRoute } from "@tanstack/react-router";
import { SongLibraryPage } from "@/components/songs/SongLibraryPage";

export const Route = createFileRoute("/songs")({
  head: () => ({ meta: [{ title: "Song Library • Church Camp Games" }] }),
  component: SongLibraryPage,
});
