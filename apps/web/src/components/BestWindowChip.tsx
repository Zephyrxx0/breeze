import { Sparkles } from "lucide-react";
import type { BestWindow } from "@breeze/core";

interface BestWindowChipProps {
  window: BestWindow | null;
}

export function BestWindowChip({ window }: BestWindowChipProps) {
  if (!window) return null;

  const startFormatted = formatTime(window.startWall);
  const endFormatted = formatTime(window.endWall);
  const isPoorOrWorse = window.meanPm25 >= 91;

  return (
    <div className="w-full bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
      <div className="p-2 bg-blue-600 text-white rounded-xl shrink-0 mt-0.5">
        <Sparkles className="w-4 h-4" />
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-bold text-blue-950">Cleanest 3-Hour Window</span>
          <span className="text-xs font-semibold px-2 py-0.5 bg-blue-200/80 text-blue-900 rounded-full">
            {Math.round(window.improvementPct * 100)}% lower
          </span>
        </div>
        <p className="text-blue-900 text-xs sm:text-sm leading-relaxed">
          {startFormatted} to {endFormatted} (averaging {Math.round(window.meanPm25)} µg/m³)
          {isPoorOrWorse && " — note that levels remain elevated."}
        </p>
      </div>
    </div>
  );
}

function formatTime(wallStr: string): string {
  // "YYYY-MM-DDTHH:MM" -> "H AM/PM"
  const hourNum = parseInt(wallStr.slice(11, 13), 10);
  if (hourNum === 0) return "12 AM";
  if (hourNum < 12) return `${hourNum} AM`;
  if (hourNum === 12) return "12 PM";
  return `${hourNum - 12} PM`;
}
