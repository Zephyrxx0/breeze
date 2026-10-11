import { useState } from "react";
import {
  categoryFor,
  verdictFor,
  reasonLines,
  confidenceFor,
  wallFromInstant,
  type AssessResponse,
} from "@breeze/core";
import { ReadingBadge } from "./ReadingBadge";

interface VerdictHeroProps {
  data: AssessResponse;
}

const VERDICT_THEMES: Record<string, { bg: string; text: string; badgeBg: string }> = {
  "Good to go": {
    bg: "from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-200",
    text: "text-emerald-900",
    badgeBg: "bg-emerald-600 text-white",
  },
  "Take care": {
    bg: "from-amber-500/10 via-amber-500/5 to-transparent border-amber-200",
    text: "text-amber-950",
    badgeBg: "bg-amber-600 text-white",
  },
  "Stay indoors if you can": {
    bg: "from-rose-500/10 via-rose-500/5 to-transparent border-rose-200",
    text: "text-rose-950",
    badgeBg: "bg-rose-600 text-white",
  },
};

export function VerdictHero({ data }: VerdictHeroProps) {
  const [activeTab, setActiveTab] = useState<"today" | "tomorrow">("today");

  const current = data.air.current;
  const isStale = data.air.status === "stale";
  const nowMs = Date.now();
  const utcOffsetSeconds = data.location.utcOffsetSeconds;

  // Confidence calculation
  const conf = confidenceFor({
    source: current.source,
    distanceKm: current.station?.distanceKm,
  });

  // Today calculation
  const todayCategory = categoryFor(current.pm25);
  const todayVerdict = verdictFor(todayCategory, "standard");
  const todayReasons = reasonLines({
    effective: {
      pm25: current.pm25,
      source: current.source,
      measuredAt: current.measuredAt,
      station: current.station,
      modelDistanceNote: current.modelDistanceNote,
      confidence: conf,
    },
    category: todayCategory,
    profile: "standard",
    nowMs,
  });

  // Tomorrow calculation (from air.model.hourly)
  const hourly = data.air.model?.hourly ?? [];
  const currentWall = wallFromInstant(nowMs, utcOffsetSeconds);
  const todayDateStr = currentWall.slice(0, 10);

  // Derive tomorrow's date string in location local wall clock
  const tomorrowDate = new Date(nowMs + 86400000);
  const tomorrowWall = wallFromInstant(tomorrowDate.getTime(), utcOffsetSeconds);
  const tomorrowDateStr = tomorrowWall.slice(0, 10);

  const tomorrowPoints = hourly.filter((h) => h.time.startsWith(tomorrowDateStr));
  const tomorrowDaytimePoints = tomorrowPoints.filter((h) => {
    const hour = parseInt(h.time.slice(11, 13), 10);
    return hour >= 6 && hour < 20;
  });

  const tomorrowDaytimeMean =
    tomorrowDaytimePoints.length > 0
      ? tomorrowDaytimePoints.reduce((acc, p) => acc + p.pm25, 0) / tomorrowDaytimePoints.length
      : current.pm25;

  const tomorrowCategory = categoryFor(tomorrowDaytimeMean);
  const tomorrowVerdict = verdictFor(tomorrowCategory, "standard");

  // Worst peak hour across all 24h of tomorrow
  let tomorrowPeakHour = "";
  let tomorrowPeakCat = "Moderate";
  if (tomorrowPoints.length > 0) {
    const peak = tomorrowPoints.reduce((max, p) => (p.pm25 > max.pm25 ? p : max), tomorrowPoints[0]);
    const peakHourNum = parseInt(peak.time.slice(11, 13), 10);
    const ampm = peakHourNum >= 12 ? `${peakHourNum === 12 ? 12 : peakHourNum - 12} PM` : `${peakHourNum === 0 ? 12 : peakHourNum} AM`;
    tomorrowPeakHour = `~${ampm}`;
    tomorrowPeakCat = categoryFor(peak.pm25);
  }

  const tomorrowReasons = [
    `Tomorrow's daytime mean is ${Math.round(tomorrowDaytimeMean)} µg/m³ — ${tomorrowCategory} (model forecast)`,
    tomorrowPeakHour
      ? `Tomorrow evening peaks at ${tomorrowPeakCat} (${tomorrowPeakHour})`
      : "Model forecast for regional daytime conditions",
  ];

  const activeVerdict = activeTab === "today" ? todayVerdict : tomorrowVerdict;
  const activeReasons = activeTab === "today" ? todayReasons : tomorrowReasons;
  const theme = VERDICT_THEMES[activeVerdict] || VERDICT_THEMES["Take care"];

  return (
    <div
      className={`w-full bg-gradient-to-b ${theme.bg} bg-white border rounded-3xl p-6 sm:p-7 shadow-xs space-y-5 transition-all`}
    >
      {/* Segmented Controls for Today / Tomorrow */}
      <div className="flex items-center justify-between">
        <div className="inline-flex p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("today")}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "today"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tomorrow")}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "tomorrow"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Tomorrow
          </button>
        </div>

        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {activeTab === "today" ? "Right Now" : "Forecast"}
        </span>
      </div>

      {/* Hero Headline Verdict */}
      <div>
        <h1 className={`text-3xl sm:text-4xl font-black tracking-tight ${theme.text}`}>
          {activeVerdict}
        </h1>
      </div>

      {/* Reading & Provenance Details (for Today tab) */}
      {activeTab === "today" && (
        <ReadingBadge
          pm25={current.pm25}
          category={todayCategory}
          source={current.source}
          confidence={conf}
          station={current.station}
          isStale={isStale}
        />
      )}

      {/* Top-2 Reason Lines */}
      <div className="space-y-1.5 pt-1 border-t border-slate-200/60 text-sm text-slate-700 leading-relaxed">
        <p className="font-semibold text-slate-900">{activeReasons[0]}</p>
        <p className="text-slate-600">{activeReasons[1]}</p>
      </div>
    </div>
  );
}

