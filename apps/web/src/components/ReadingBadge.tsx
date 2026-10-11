import type { Category, Confidence } from "@breeze/core";
import { CheckCircle2, AlertCircle, AlertTriangle, ShieldAlert, RadioTower, Satellite } from "lucide-react";
import { CATEGORY_FILL, CATEGORY_ICON } from "../lib/theme";
import { CpcbScale } from "./CpcbScale";

interface ReadingBadgeProps {
  pm25: number;
  category: string;
  source: "station" | "model";
  confidence: Confidence | "high" | "medium" | "low";
  station?: {
    name: string;
    distanceKm: number;
    ageMinutes?: number;
  };
  /** Station reading age (minutes) derived from the measurement timestamp */
  ageMinutes?: number | null;
  isStale?: boolean;
}

export const CATEGORY_CONFIG: Record<
  string,
  {
    bg: string;
    text: string;
    border: string;
    icon: typeof CheckCircle2;
    iconColor: string;
  }
> = {
  Good: {
    bg: "bg-emerald-50",
    text: "text-emerald-950",
    border: "border-emerald-300",
    icon: CheckCircle2,
    iconColor: "text-emerald-700",
  },
  Satisfactory: {
    bg: "bg-lime-50",
    text: "text-lime-950",
    border: "border-lime-300",
    icon: CheckCircle2,
    iconColor: "text-lime-700",
  },
  Moderate: {
    bg: "bg-amber-50",
    text: "text-amber-950",
    border: "border-amber-300",
    icon: AlertCircle,
    iconColor: "text-amber-700",
  },
  Poor: {
    bg: "bg-orange-50",
    text: "text-orange-950",
    border: "border-orange-300",
    icon: AlertTriangle,
    iconColor: "text-orange-700",
  },
  "Very Poor": {
    bg: "bg-rose-50",
    text: "text-rose-950",
    border: "border-rose-300",
    icon: ShieldAlert,
    iconColor: "text-rose-700",
  },
  Severe: {
    bg: "bg-red-100",
    text: "text-red-950",
    border: "border-red-400",
    icon: ShieldAlert,
    iconColor: "text-red-800",
  },
};

const CONFIDENCE_STYLE: Record<string, string> = {
  high: "bg-go/15 text-[#0b6b52] dark:text-[#5fe0b9]",
  medium: "bg-accent-soft text-accent",
  low: "bg-care/20 text-[#7a4f00] dark:text-[#ffd27a]",
};

export function ReadingBadge({
  pm25,
  category,
  source,
  confidence,
  station,
  ageMinutes,
  isStale,
}: ReadingBadgeProps) {
  const fill = CATEGORY_FILL[category as Category];
  const Icon = CATEGORY_ICON[category as Category] ?? AlertCircle;
  const conf = String(confidence).toLowerCase();
  // Prefer the age derived from the timestamp; only fall back to a value the API explicitly provided.
  const age = ageMinutes ?? station?.ageMinutes ?? null;

  return (
    <div className="space-y-4 rounded-[1.4rem] bg-surface p-4 text-ink shadow-[0_10px_30px_-12px_rgb(0_0_0/0.35)] sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="flex items-baseline gap-2">
          <span
            className="tabular font-display text-[3.6rem] leading-[0.85] tracking-tight sm:text-[4.4rem]"
            data-testid="reading-pm25"
          >
            {Math.round(pm25)}
          </span>
          <span className="pb-1 text-sm font-semibold text-ink-2">µg/m³ PM2.5</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            data-testid="reading-category-badge"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.72rem] font-bold uppercase tracking-wider"
            style={fill ? { background: fill.fill, color: fill.on } : undefined}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" data-testid="reading-category-icon" />
            <span>{category}</span>
          </span>
          {isStale && (
            <span
              className="rounded-full border border-care/60 bg-care/15 px-2.5 py-1 text-xs font-bold text-[#6b4500] dark:text-[#ffd27a]"
              title={`Upstream live data timed out; showing cached data from ${age ?? "some"}m ago.`}
            >
              Cached {age ?? "—"}m ago
            </span>
          )}
        </div>
      </div>

      <CpcbScale pm25={pm25} />

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {source === "station" && station ? (
          <div className="inline-flex items-center gap-2 rounded-lg bg-inset px-2.5 py-1.5 font-medium text-ink-2">
            <RadioTower className="h-3.5 w-3.5 text-go" aria-hidden="true" />
            <span>
              Station: <strong className="text-ink">{station.name}</strong> ({Math.round(station.distanceKm)} km away
              {age !== null ? `, ${age}m ago` : ""})
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-lg bg-inset px-2.5 py-1.5 font-medium text-ink-2">
            <Satellite className="h-3.5 w-3.5 text-care" aria-hidden="true" />
            <span>Regional model estimate (~45 km)</span>
          </div>
        )}

        <span className={`rounded-lg px-2.5 py-1.5 font-semibold capitalize ${CONFIDENCE_STYLE[conf] ?? CONFIDENCE_STYLE.low}`}>
          {conf} confidence
        </span>
      </div>

      {isStale && (
        <p className="text-xs font-medium text-ink-2">
          Upstream live data timed out; showing cached data from {age ?? "some"}m ago.
        </p>
      )}
    </div>
  );
}
