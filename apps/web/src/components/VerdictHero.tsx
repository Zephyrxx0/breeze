import { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Link as LinkIcon, Share2 } from "lucide-react";
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
  profile?: "standard" | "sensitive";
  onProfileChange?: (profile: "standard" | "sensitive") => void;
  onAnnounce?: (message: string) => void;
  onCopyLink?: () => void;
  onShareCard?: () => void;
  isSharing?: boolean;
}

const VERDICT_THEMES: Record<
  string,
  {
    bg: string;
    text: string;
    badgeBg: string;
    icon: typeof CheckCircle2;
    iconColor: string;
  }
> = {
  "Good to go": {
    bg: "from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-200",
    text: "text-emerald-950",
    badgeBg: "bg-emerald-600 text-white",
    icon: CheckCircle2,
    iconColor: "text-emerald-600",
  },
  "Take care": {
    bg: "from-amber-500/10 via-amber-500/5 to-transparent border-amber-200",
    text: "text-amber-950",
    badgeBg: "bg-amber-600 text-white",
    icon: AlertCircle,
    iconColor: "text-amber-600",
  },
  "Stay indoors if you can": {
    bg: "from-rose-500/10 via-rose-500/5 to-transparent border-rose-200",
    text: "text-rose-950",
    badgeBg: "bg-rose-600 text-white",
    icon: AlertTriangle,
    iconColor: "text-rose-600",
  },
};

export function VerdictHero({
  data,
  profile = "standard",
  onProfileChange,
  onAnnounce,
  onCopyLink,
  onShareCard,
  isSharing,
}: VerdictHeroProps) {
  const [activeTab, setActiveTab] = useState<"today" | "tomorrow">("today");

  const current = data.air.current;
  const isAirUnavailable = data.air.status === "unavailable" || !current;
  const isStale = data.air.status === "stale";
  const nowMs = Date.now();
  const utcOffsetSeconds = data.location.utcOffsetSeconds;

  // Station-only mode check (model hourly missing or empty)
  const isModelUnavailable = !data.air.model?.hourly || data.air.model.hourly.length === 0;

  if (isAirUnavailable) {
    return (
      <div className="w-full bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-8 h-8 text-amber-600 shrink-0" aria-hidden="true" />
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Air assessment unavailable
          </h1>
        </div>
        <p className="text-sm text-slate-600">
          Live air quality data for this location is temporarily unavailable from upstream sources.
        </p>
        <div className="pt-2 flex items-center gap-2 border-t border-slate-200/40">
          {onCopyLink && (
            <button
              type="button"
              onClick={onCopyLink}
              data-testid="copy-link-button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/80 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/80 shadow-2xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 active:scale-98"
            >
              <LinkIcon className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              <span>Copy Link</span>
            </button>
          )}
          {onShareCard && (
            <button
              type="button"
              onClick={onShareCard}
              disabled={true}
              title="Air assessment unavailable — cannot share card"
              data-testid="share-card-button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-400 cursor-not-allowed text-white shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5 text-blue-100" aria-hidden="true" />
              <span>Share Card</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Confidence calculation
  const conf = confidenceFor({
    source: current.source,
    distanceKm: current.station?.distanceKm,
  });

  // Today calculation (using active profile)
  const todayCategory = categoryFor(current.pm25);
  const todayVerdict = verdictFor(todayCategory, profile);
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
    profile,
    nowMs,
  });

  // Tomorrow calculation (from air.model.hourly)
  const hourly = data.air.model?.hourly ?? [];
  const currentWall = wallFromInstant(nowMs, utcOffsetSeconds);

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
  const tomorrowVerdict = verdictFor(tomorrowCategory, profile);

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

  // If model is unavailable, force "today" tab
  const effectiveTab = isModelUnavailable ? "today" : activeTab;
  const activeVerdict = effectiveTab === "today" ? todayVerdict : tomorrowVerdict;
  const activeReasons = effectiveTab === "today" ? todayReasons : tomorrowReasons;
  const theme = VERDICT_THEMES[activeVerdict] || VERDICT_THEMES["Take care"];
  const VerdictIcon = theme.icon;

  // Emit announcement on tab / data changes
  useEffect(() => {
    if (!onAnnounce) return;
    const tabName = effectiveTab === "today" ? "Today" : "Tomorrow";
    const pmVal = effectiveTab === "today" ? Math.round(current.pm25) : Math.round(tomorrowDaytimeMean);
    const catName = effectiveTab === "today" ? todayCategory : tomorrowCategory;
    const topReason = activeReasons[0] || "";
    onAnnounce(`${tabName}: ${activeVerdict}, PM2.5 ${pmVal} µg/m³, ${catName}, ${topReason}`);
  }, [effectiveTab, activeVerdict, todayCategory, tomorrowCategory, current.pm25, tomorrowDaytimeMean, activeReasons, onAnnounce]);

  // Handle profile change and announce
  const handleProfileSelect = (newProfile: "standard" | "sensitive") => {
    if (!onProfileChange) return;
    onProfileChange(newProfile);
    if (onAnnounce) {
      const recomputedVerdict = verdictFor(
        effectiveTab === "today" ? todayCategory : tomorrowCategory,
        newProfile
      );
      const profileLabel = newProfile === "standard" ? "Standard" : "Sensitive group";
      onAnnounce(`Profile updated to ${profileLabel}. Recalculated verdict: ${recomputedVerdict}`);
    }
  };

  return (
    <div
      className={`w-full bg-gradient-to-b ${theme.bg} bg-white border rounded-3xl p-6 sm:p-7 shadow-xs space-y-5 transition-all`}
    >
      {/* Header controls: Profile Toggle & Today/Tomorrow Tabs */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Segmented Controls for Today / Tomorrow */}
          <div className="flex items-center gap-2">
            <div className="inline-flex p-1 bg-slate-100 rounded-xl" aria-label="Forecast day selection">
              <button
                type="button"
                onClick={() => setActiveTab("today")}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                  effectiveTab === "today"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => !isModelUnavailable && setActiveTab("tomorrow")}
                disabled={isModelUnavailable}
                title={isModelUnavailable ? "Forecast model temporarily unavailable" : undefined}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                  isModelUnavailable
                    ? "opacity-40 cursor-not-allowed text-slate-400"
                    : effectiveTab === "tomorrow"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tomorrow
              </button>
            </div>
            {isModelUnavailable && (
              <span className="text-xs text-amber-800 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Forecast model temporarily unavailable
              </span>
            )}
          </div>

          {/* Profile Toggle Control (Standard vs Sensitive) */}
          {onProfileChange && (
            <div className="flex flex-col sm:items-end">
              <div
                className="inline-flex p-1 bg-slate-100 rounded-xl"
                role="group"
                aria-label="Health Sensitivity Profile"
                aria-describedby="profile-desc"
              >
                <button
                  type="button"
                  onClick={() => handleProfileSelect("standard")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                    profile === "standard"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => handleProfileSelect("sensitive")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                    profile === "sensitive"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Sensitive group
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Explanatory Caption beneath toggle */}
        <p id="profile-desc" className="text-xs text-slate-500 leading-normal">
          Lower thresholds for asthma, elderly, children &amp; respiratory sensitivity
        </p>
      </div>

      {/* Hero Headline Verdict with Non-Color Semantic Icon */}
      <div className="flex items-center gap-3">
        <VerdictIcon
          className={`w-8 h-8 sm:w-9 sm:h-9 ${theme.iconColor} shrink-0`}
          aria-hidden="true"
          data-testid="verdict-hero-icon"
        />
        <h1 className={`text-3xl sm:text-4xl font-black tracking-tight ${theme.text}`}>
          {activeVerdict}
        </h1>
      </div>

      {/* Reading & Provenance Details (for Today tab) */}
      {effectiveTab === "today" && (
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

      {/* Share & Copy Link Actions */}
      <div className="pt-2 flex items-center gap-2 border-t border-slate-200/40">
        {onCopyLink && (
          <button
            type="button"
            onClick={onCopyLink}
            data-testid="copy-link-button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/80 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/80 shadow-2xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 active:scale-98"
          >
            <LinkIcon className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            <span>Copy Link</span>
          </button>
        )}
        {onShareCard && (
          <button
            type="button"
            onClick={onShareCard}
            disabled={isSharing || isAirUnavailable}
            title={isAirUnavailable ? "Air assessment unavailable — cannot share card" : undefined}
            data-testid="share-card-button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white shadow-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 active:scale-98"
          >
            <Share2 className="w-3.5 h-3.5 text-blue-100" aria-hidden="true" />
            <span>{isSharing ? "Generating..." : "Share Card"}</span>
          </button>
        )}
      </div>
    </div>
  );
}


