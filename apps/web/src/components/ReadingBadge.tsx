import type { Confidence } from "@breeze/core";

interface ReadingBadgeProps {
  pm25: number;
  category: string;
  source: "station" | "model";
  confidence: Confidence;
  station?: {
    name: string;
    distanceKm: number;
    ageMinutes: number;
  };
  isStale?: boolean;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Good: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  Satisfactory: { bg: "bg-lime-50", text: "text-lime-700", border: "border-lime-200" },
  Moderate: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  Poor: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  "Very Poor": { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  Severe: { bg: "bg-red-100", text: "text-red-900", border: "border-red-300" },
};

export function ReadingBadge({
  pm25,
  category,
  source,
  confidence,
  station,
  isStale,
}: ReadingBadgeProps) {
  const catTheme = CATEGORY_COLORS[category] || {
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
  };

  const confColor =
    confidence === "high"
      ? "bg-emerald-100 text-emerald-800"
      : confidence === "medium"
        ? "bg-blue-100 text-blue-800"
        : "bg-amber-100 text-amber-800";

  // Calculate age if station ageMinutes is available, or default
  const ageMinutes = station?.ageMinutes ?? 15;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline gap-2.5 flex-wrap">
        <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
          {Math.round(pm25)}
        </span>
        <span className="text-base font-semibold text-slate-500">µg/m³ PM2.5</span>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${catTheme.bg} ${catTheme.text} ${catTheme.border}`}
        >
          {category}
        </span>
        {isStale && (
          <span
            className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300"
            title={`Upstream live data timed out; showing cached data from ${ageMinutes}m ago.`}
          >
            Cached {ageMinutes}m ago
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">
        {/* Source Badge */}
        {source === "station" && station ? (
          <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md font-medium text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>
              Station: <strong className="text-slate-900">{station.name}</strong> ({Math.round(station.distanceKm)} km away, {station.ageMinutes}m ago)
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md font-medium text-slate-700">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            <span>Regional model estimate (~45 km)</span>
          </div>
        )}

        {/* Confidence Chip */}
        <span className={`px-2 py-0.5 rounded-md font-semibold capitalize ${confColor}`}>
          {confidence} confidence
        </span>
      </div>

      {isStale && (
        <p className="text-xs text-amber-800 font-medium">
          Upstream live data timed out; showing cached data from {ageMinutes}m ago.
        </p>
      )}
    </div>
  );
}

