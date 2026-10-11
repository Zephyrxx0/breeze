import { forwardRef } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Wind } from "lucide-react";
import {
  categoryFor,
  verdictFor,
  reasonLines,
  confidenceFor,
  wallFromInstant,
  formatTip,
  type AssessResponse,
  type Tip,
} from "@breeze/core";

export interface ShareCardProps {
  data: AssessResponse;
  profile?: "standard" | "sensitive";
  tips?: Tip[];
}

const VERDICT_THEMES: Record<
  string,
  {
    bg: string;
    border: string;
    badgeBg: string;
    text: string;
    icon: typeof CheckCircle2;
    iconColor: string;
    pillBg: string;
  }
> = {
  "Good to go": {
    bg: "bg-emerald-50/60",
    border: "border-emerald-200",
    badgeBg: "bg-emerald-600",
    text: "text-emerald-950",
    icon: CheckCircle2,
    iconColor: "text-emerald-600",
    pillBg: "bg-emerald-100 text-emerald-800",
  },
  "Take care": {
    bg: "bg-amber-50/60",
    border: "border-amber-200",
    badgeBg: "bg-amber-600",
    text: "text-amber-950",
    icon: AlertCircle,
    iconColor: "text-amber-600",
    pillBg: "bg-amber-100 text-amber-800",
  },
  "Stay indoors if you can": {
    bg: "bg-rose-50/60",
    border: "border-rose-200",
    badgeBg: "bg-rose-600",
    text: "text-rose-950",
    icon: AlertTriangle,
    iconColor: "text-rose-600",
    pillBg: "bg-rose-100 text-rose-800",
  },
};

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(function ShareCard(
  { data, profile = "standard", tips = [] },
  ref
) {
  const current = data.air.current;
  if (!current) return null;

  const category = categoryFor(current.pm25);
  const verdict = verdictFor(category, profile);
  const conf = confidenceFor({
    source: current.source,
    distanceKm: current.station?.distanceKm,
  });
  const reasons = reasonLines({
    effective: {
      pm25: current.pm25,
      source: current.source,
      measuredAt: current.measuredAt,
      station: current.station,
      modelDistanceNote: current.modelDistanceNote,
      confidence: conf,
    },
    category,
    profile,
    nowMs: Date.now(),
  });
  const theme = VERDICT_THEMES[verdict] || VERDICT_THEMES["Take care"];
  const VerdictIcon = theme.icon;

  const measuredDate = new Date(current.measuredAt);
  const measuredWall = isNaN(measuredDate.getTime())
    ? current.measuredAt
    : wallFromInstant(measuredDate, data.location.utcOffsetSeconds);

  const sourceLabel =
    current.source === "station"
      ? current.station?.name || "Ground monitoring station"
      : "Regional atmospheric model (~45 km)";

  const topTips = tips.slice(0, 3);

  return (
    <div
      ref={ref}
      data-testid="share-card-container"
      style={{
        width: "1080px",
        height: "1350px",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      }}
      className="bg-white text-slate-900 flex flex-col justify-between p-16 select-none overflow-hidden relative box-border"
    >
      {/* Decorative gradient overlay */}
      <div
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-blue-100/50 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-emerald-100/40 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* 1. Header & Branding */}
      <div className="relative z-10 flex items-center justify-between border-b border-slate-200 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md">
            <Wind className="w-8 h-8" />
          </div>
          <div>
            <span className="text-3xl font-black tracking-tight text-slate-900">Breeze</span>
            <span className="block text-base font-semibold text-slate-500 uppercase tracking-widest">
              Live Air Verdict
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-block px-4 py-1.5 rounded-full text-sm font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {profile === "sensitive" ? "Sensitive Profile" : "Standard Profile"}
          </span>
        </div>
      </div>

      {/* 2. Location & Big Verdict Card */}
      <div className="relative z-10 space-y-6 my-auto">
        <div className="space-y-2">
          <span className="text-xl font-bold uppercase tracking-wider text-blue-600">
            Current Air Assessment
          </span>
          <h1 className="text-6xl font-black tracking-tight text-slate-950 leading-tight">
            {data.location.name}
          </h1>
        </div>

        {/* Big Verdict Hero Box */}
        <div
          className={`rounded-3xl border-2 ${theme.border} ${theme.bg} p-10 space-y-6 shadow-sm`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <VerdictIcon className={`w-16 h-16 ${theme.iconColor} shrink-0`} />
              <div>
                <span className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  Plain-Language Verdict
                </span>
                <h2 className={`text-5xl font-black tracking-tight ${theme.text}`}>
                  {verdict}
                </h2>
              </div>
            </div>
            <span className={`px-5 py-2.5 rounded-2xl text-lg font-black ${theme.pillBg}`}>
              {category.toUpperCase()}
            </span>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-200/60 text-xl leading-relaxed text-slate-700">
            <p className="font-bold text-slate-900">{reasons[0]}</p>
            <p className="text-slate-600">{reasons[1]}</p>
          </div>
        </div>

        {/* 3. PM2.5 Metric Block */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 flex flex-col justify-between">
            <span className="text-sm font-bold uppercase tracking-wider text-slate-500">
              PM2.5 Concentration
            </span>
            <div className="my-3 flex items-baseline gap-3">
              <span className="text-7xl font-black tracking-tight text-slate-950 tabular-nums">
                {Math.round(current.pm25)}
              </span>
              <span className="text-2xl font-bold text-slate-500">µg/m³</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-200/70 text-slate-700">
                Confidence: {conf.toUpperCase()}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-200/70 text-slate-700">
                Source: {current.source === "station" ? "Station" : "Model"}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 flex flex-col justify-between">
            <span className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Measurement Source
            </span>
            <div className="my-2 space-y-1">
              <p className="text-xl font-bold text-slate-900 line-clamp-2">
                {sourceLabel}
              </p>
              <p className="text-sm text-slate-500">
                Measured at {measuredWall}
              </p>
            </div>
            <p className="text-xs text-slate-400">
              {current.source === "station"
                ? "Official regulatory monitoring station via OpenAQ"
                : "Atmospheric reanalysis via ECMWF Copernicus / Open-Meteo"}
            </p>
          </div>
        </div>

        {/* 4. Actionable Tips Block */}
        {topTips.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-base font-bold text-slate-900 tracking-tight">
                Recommended Actions
              </span>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Rule-driven advice
              </span>
            </div>
            <ul className="space-y-3">
              {topTips.map((tip) => {
                const formatted = formatTip(tip);
                const [prefix, ...rest] = formatted.split(" — ");
                const body = rest.join(" — ");
                return (
                  <li
                    key={tip.id}
                    className="flex items-start gap-4 text-base text-slate-700 leading-snug"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      {body ? (
                        <>
                          <strong className="text-slate-900 font-semibold">{prefix}</strong>
                          <span className="text-slate-600"> — {body}</span>
                        </>
                      ) : (
                        <span>{formatted}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* 5. Provenance Footer & Verification URL */}
      <div className="relative z-10 flex items-center justify-between border-t border-slate-200 pt-6 text-sm text-slate-500">
        <div>
          <span className="font-semibold text-slate-700">Open-Meteo • OpenAQ • CAMS</span>
          <span className="mx-2">•</span>
          <span>Zero mock data</span>
        </div>
        <div className="font-mono text-base font-bold text-blue-600">
          breeze-air.in
        </div>
      </div>
    </div>
  );
});
