import { useState, type ReactNode } from "react";
import { Btn } from "@/components/ui-lite";
import { karaokeLibrarySchema, type KaraokeLibrary } from "@/lib/karaoke";
import type { useKaraoke } from "@/hooks/use-karaoke";
import { Download, Upload } from "lucide-react";

type Props = Pick<
  ReturnType<typeof useKaraoke>,
  "ready" | "save" | "exportLibrary" | "setError"
> & { onImported: () => void; children?: ReactNode; className?: string };
export function LibraryBackups({
  ready,
  save,
  exportLibrary,
  setError,
  onImported,
  children,
  className,
}: Props) {
  const [pendingImport, setPendingImport] = useState<KaraokeLibrary | null>(null);
  const [notice, setNotice] = useState("");
  return (
    <>
      <div className={className ?? "mt-5 flex flex-wrap items-center gap-2"}>
        {children}
        <Btn
          variant="ghost"
          className="rounded-xl px-3"
          aria-label="Export backup"
          disabled={!ready}
          onClick={exportLibrary}
        >
          <Download aria-hidden="true" size={16} /> Export
        </Btn>
        <label
          className={`relative inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground focus-within:ring-2 focus-within:ring-ring ${!ready ? "opacity-40" : ""}`}
        >
          <Upload aria-hidden="true" size={16} /> Import
          <input
            aria-label="Import karaoke backup"
            type="file"
            accept=".json,application/json"
            disabled={!ready}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            onChange={async (event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (!file) return;
              try {
                if (file.size > 10_000_000) throw new Error("too large");
                setPendingImport(karaokeLibrarySchema.parse(JSON.parse(await file.text())));
              } catch {
                setError("This file is not a valid karaoke backup. Your library is unchanged.");
              }
            }}
          />
        </label>
      </div>
      {pendingImport && (
        <div className="mt-4 w-full rounded-xl border border-border bg-card p-4">
          <p>
            Replace this device’s library with {pendingImport.songs.length} songs and{" "}
            {pendingImport.setlists.length} setlists? Export your current library first if you want
            to keep it.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn
              onClick={() => {
                if (save(() => pendingImport, true)) {
                  setPendingImport(null);
                  onImported();
                  setNotice("Backup imported.");
                }
              }}
            >
              Replace library
            </Btn>
            <Btn variant="ghost" onClick={() => setPendingImport(null)}>
              Cancel import
            </Btn>
          </div>
        </div>
      )}
      <p role="status" className={notice ? "mt-2 text-sm text-primary" : "sr-only"}>
        {notice}
      </p>
    </>
  );
}
