import { Sunrise } from "lucide-react";
import { wallAddHours, type BestWindow } from "@breeze/core";
import { wallToHour } from "../lib/format";

interface BestWindowChipProps {
  window: BestWindow | null;
}

/** Hidden by design when there is no window ≥ 15% cleaner than average (PRD §7.4). */
export function BestWindowChip({ window }: BestWindowChipProps) {
  if (!window) return null;

  // endWall is the last hour *inside* the window, so the block finishes an hour later
  const startFormatted = wallToHour(window.startWall);
  const endFormatted = wallToHour(wallAddHours(window.endWall, 1));
  const isPoorOrWorse = window.meanPm25 >= 91;

  return (
    <div className="card relative flex items-center gap-4 overflow-hidden p-5 sm:p-7">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-10 -top-10 h-36 w-36 rounded-full bg-accent/15 blur-2xl"
      />
      <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent text-accent-ink shadow-[0_8px_20px_-8px_var(--accent)]">
        <Sunrise className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="relative min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <h3 className="text-sm font-bold tracking-tight text-ink">Cleanest 3-Hour Window</h3>
          <span className="rounded-full bg-go/15 px-2.5 py-0.5 text-xs font-bold text-[#0b6b52] dark:text-[#5fe0b9]">
            {Math.round(window.improvementPct * 100)}% lower
          </span>
        </div>
        <p className="font-display text-[1.9rem] leading-none tracking-tight text-ink">
          {startFormatted} <span className="text-ink-3">→</span> {endFormatted}
        </p>
        <p className="text-xs leading-relaxed text-ink-2">
          Averaging {Math.round(window.meanPm25)} µg/m³ over the next 24 hours
          {isPoorOrWorse && " — note that levels remain elevated."}
        </p>
      </div>
    </div>
  );
}
