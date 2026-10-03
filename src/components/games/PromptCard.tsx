import { useId } from "react";
import { Btn } from "@/components/ui-lite";

/** Shared private card for host prompts and the secret leader's name. */
export function PromptCard({
  title,
  detail,
  detailLabel,
  titleLabel,
  revealed,
  onToggle,
  emptyTitle = "Ready to play?",
  emptyDetail = "Draw your first prompt to begin.",
  hiddenTitle = "Prompt hidden",
  hiddenDetail = "Let only the actor or host see the prompt.",
  revealLabel = "Reveal prompt",
  hideLabel = "Hide prompt",
}: {
  title?: string | undefined;
  detail?: string | undefined;
  detailLabel?: string | undefined;
  titleLabel?: string;
  revealed: boolean;
  onToggle: () => void;
  emptyTitle?: string;
  emptyDetail?: string;
  hiddenTitle?: string;
  hiddenDetail?: string;
  revealLabel?: string;
  hideLabel?: string;
}) {
  const contentId = useId();
  return (
    <div className="mt-4">
      <div
        id={contentId}
        className="prompt-card flex min-h-48 flex-col items-center justify-center rounded-2xl bg-secondary p-6 text-center"
      >
        {title && revealed && titleLabel && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {titleLabel}
          </p>
        )}
        <h2
          className={`max-w-full font-display text-3xl [overflow-wrap:anywhere] ${title && revealed ? "sm:text-4xl" : ""}`}
        >
          {title ? (revealed ? title : hiddenTitle) : emptyTitle}
        </h2>
        {title && revealed ? (
          detail?.trim() && (
            <p className="mt-3 max-w-prose text-base leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
              {detailLabel && (
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide">
                  {detailLabel}
                </span>
              )}
              {detail}
            </p>
          )
        ) : (
          <p className="mt-2 text-muted-foreground">{title ? hiddenDetail : emptyDetail}</p>
        )}
      </div>
      {title && (
        <Btn
          variant="outline"
          className="mt-4"
          onClick={onToggle}
          aria-expanded={revealed}
          aria-controls={contentId}
        >
          {revealed ? hideLabel : revealLabel}
        </Btn>
      )}
    </div>
  );
}
