import { LoaderCircle } from "lucide-react";

export function LoadingState({ message = "Loading page…" }: { message?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 py-12 text-center"
    >
      <LoaderCircle
        aria-hidden="true"
        className="size-10 animate-spin text-primary motion-reduce:animate-none"
        strokeWidth={2}
      />
      <p className="text-base text-muted-foreground">{message}</p>
    </div>
  );
}

export function PageLoading({ message = "Loading page…" }: { message?: string }) {
  return (
    <main className="mx-auto w-full max-w-6xl">
      <LoadingState message={message} />
    </main>
  );
}
