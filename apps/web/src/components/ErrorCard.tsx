import { CloudOff, RefreshCw } from "lucide-react";

interface ErrorCardProps {
  onRetry: () => void;
  title?: string;
  message?: string;
}

export function ErrorCard({
  onRetry,
  title = "Can't assess right now",
  message = "Live upstream air data is temporarily unavailable. Missing data is shown honestly rather than fabricated.",
}: ErrorCardProps) {
  return (
    <div className="card mx-auto max-w-xl space-y-5 p-8 text-center sm:p-10">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-care/20 text-[#8a5a00] dark:text-[#ffd27a]">
        <CloudOff className="h-7 w-7" aria-hidden="true" />
      </div>
      <div className="mx-auto max-w-md space-y-2">
        <h2 className="font-display text-3xl text-ink">{title}</h2>
        <p className="text-sm leading-relaxed text-ink-2">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-canvas transition hover:opacity-90 active:scale-[0.97]"
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        <span>Retry</span>
      </button>
    </div>
  );
}
