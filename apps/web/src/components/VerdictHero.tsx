import { useState, useEffect, useMemo } from "react";
import { AlertCircle, Link as LinkIcon, QrCode, Share2, UserRound } from "lucide-react";
import { verdictFor, type AssessResponse, type Category } from "@breeze/core";
import { ReadingBadge } from "./ReadingBadge";
import { deriveAssessment } from "../lib/assessment";
import { CATEGORY_FILL, VERDICT_THEMES } from "../lib/theme";

interface VerdictHeroProps {
  data: AssessResponse;
  placeName?: string;
  profile?: "standard" | "sensitive";
  onProfileChange?: (profile: "standard" | "sensitive") => void;
  onAnnounce?: (message: string) => void;
  onCopyLink?: () => void;
  onShareCard?: () => void;
  onOpenPoster?: () => void;
  isSharing?: boolean;
}

/** Two slow, offset wave layers along the bottom edge. Decorative; stilled by reduced motion. */
function Waves() {
  const path = "M0 60 C 150 20, 300 100, 450 60 S 750 20, 900 60 S 1050 100, 1200 60 V120 H0 Z";
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-24 overflow-hidden opacity-[0.13] sm:h-28" style={{ color: "currentColor" }}>
      <div className="wave-track animate-wave absolute bottom-0 left-0 h-full">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="h-full w-1/2" fill="currentColor"><path d={path} /></svg>
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="h-full w-1/2" fill="currentColor"><path d={path} /></svg>
      </div>
      <div className="wave-track animate-wave-slow absolute bottom-[-0.6rem] left-0 h-full opacity-70">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="h-full w-1/2" fill="currentColor"><path d={path} /></svg>
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="h-full w-1/2" fill="currentColor"><path d={path} /></svg>
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  icon: Icon,
  children,
  testId,
  disabled,
  title,
  primary,
  chip,
  chipActive,
  chipActiveText,
}: {
  onClick?: () => void;
  icon: typeof LinkIcon;
  children: React.ReactNode;
  testId: string;
  disabled?: boolean;
  title?: string;
  primary?: boolean;
  chip: string;
  chipActive: string;
  chipActiveText: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? (primary ? undefined : String(children))}
      data-testid={testId}
      className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-[0.82rem] whitespace-nowrap font-semibold transition hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
      style={primary ? { background: chipActive, color: chipActiveText } : { background: chip }}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className={primary ? "sr-only sm:not-sr-only whitespace-nowrap" : "sr-only"}>{children}</span>
    </button>
  );
}

export function VerdictHero({
  data,
  placeName,
  profile = "standard",
  onProfileChange,
  onAnnounce,
  onCopyLink,
  onShareCard,
  onOpenPoster,
  isSharing,
}: VerdictHeroProps) {
  const [activeTab, setActiveTab] = useState<"today" | "tomorrow">("today");

  const a = useMemo(() => deriveAssessment(data, profile, Date.now()), [data, profile]);
  const isModelUnavailable = !a?.tomorrow;
  const effectiveTab = isModelUnavailable ? "today" : activeTab;

  const activeVerdict = a ? (effectiveTab === "today" ? a.today.verdict : a.tomorrow!.verdict) : null;
  const activeCategory: Category | null = a ? (effectiveTab === "today" ? a.today.category : a.tomorrow!.category) : null;
  const activeReasons = a ? (effectiveTab === "today" ? a.today.reasons : a.tomorrow!.reasonLines) : null;
  const activePm = a ? (effectiveTab === "today" ? a.effective.pm25 : a.tomorrow!.daytimeMean) : null;

  // Emit announcement on tab / data changes
  useEffect(() => {
    if (!onAnnounce || !activeVerdict || activePm === null || !activeCategory || !activeReasons) return;
    const tabName = effectiveTab === "today" ? "Today" : "Tomorrow";
    onAnnounce(`${tabName}: ${activeVerdict}, PM2.5 ${Math.round(activePm)} µg/m³, ${activeCategory}, ${activeReasons[0]}`);
  }, [effectiveTab, activeVerdict, activeCategory, activePm, activeReasons, onAnnounce]);

  if (!a || !activeVerdict || !activeCategory || !activeReasons || activePm === null) {
    return (
      <div className="card space-y-4 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-8 w-8 shrink-0 text-care" aria-hidden="true" />
          <h1 className="font-display text-4xl text-ink">Air assessment unavailable</h1>
        </div>
        <p className="text-sm text-ink-2">
          Live air quality data for this location is temporarily unavailable from upstream sources.
        </p>
        <div className="flex items-center gap-2 border-t border-line pt-4">
          {onCopyLink && (
            <button
              type="button"
              onClick={onCopyLink}
              data-testid="copy-link-button"
              className="inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2.5 text-[0.82rem] font-semibold text-ink"
            >
              <LinkIcon className="h-4 w-4" aria-hidden="true" />
              <span>Copy Link</span>
            </button>
          )}
          {onShareCard && (
            <button
              type="button"
              disabled
              title="Air assessment unavailable — cannot share card"
              data-testid="share-card-button"
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[0.82rem] font-semibold text-canvas opacity-50"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              <span>Share Card</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const theme = VERDICT_THEMES[activeVerdict];
  const VerdictIcon = theme.icon;

  const handleProfileSelect = (newProfile: "standard" | "sensitive") => {
    if (!onProfileChange) return;
    onProfileChange(newProfile);
    if (onAnnounce) {
      const recomputed = verdictFor(activeCategory, newProfile);
      const profileLabel = newProfile === "standard" ? "Standard" : "Sensitive group";
      onAnnounce(`Profile updated to ${profileLabel}. Recalculated verdict: ${recomputed}`);
    }
  };

  const segBase =
    "rounded-full px-4 py-2 text-[0.8rem] font-bold transition focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-45";
  const segStyle = (on: boolean) =>
    on ? { background: theme.chipActive, color: theme.chipActiveText } : { color: theme.text };

  const tomorrowFill = CATEGORY_FILL[a.tomorrow?.category ?? "Good"];

  return (
    <section
      className="relative isolate overflow-hidden rounded-[2rem] p-6 shadow-[0_30px_60px_-28px_rgb(0_0_0/0.45)] transition-[background] duration-700 sm:p-9"
      style={{ background: theme.gradient, color: theme.text }}
      aria-label="Air quality verdict"
    >
      <Waves />
      {/* soft light bloom */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-28 -z-10 h-72 w-72 rounded-full bg-white/25 blur-3xl"
      />

      <div className="relative space-y-7">
        {/* Top bar: day tabs + share actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex gap-1 rounded-full p-1" style={{ background: theme.chip }} role="group" aria-label="Forecast day selection">
            <button
              type="button"
              onClick={() => setActiveTab("today")}
              aria-pressed={effectiveTab === "today"}
              className={segBase}
              style={segStyle(effectiveTab === "today")}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => !isModelUnavailable && setActiveTab("tomorrow")}
              disabled={isModelUnavailable}
              aria-pressed={effectiveTab === "tomorrow"}
              title={isModelUnavailable ? "Forecast model temporarily unavailable" : undefined}
              className={segBase}
              style={segStyle(effectiveTab === "tomorrow")}
            >
              Tomorrow
            </button>
          </div>
          <div className="flex items-center gap-1.5">
          {onCopyLink && (
            <ActionButton testId="copy-link-button" icon={LinkIcon} onClick={onCopyLink} chip={theme.chip} chipActive={theme.chipActive} chipActiveText={theme.chipActiveText}>
              Copy Link
            </ActionButton>
          )}
          {onOpenPoster && (
            <ActionButton testId="poster-button" icon={QrCode} onClick={onOpenPoster} chip={theme.chip} chipActive={theme.chipActive} chipActiveText={theme.chipActiveText}>
              QR poster
            </ActionButton>
          )}
          {onShareCard && (
            <ActionButton
              testId="share-card-button"
              icon={Share2}
              onClick={onShareCard}
              disabled={isSharing}
              primary
              chip={theme.chip}
              chipActive={theme.chipActive}
              chipActiveText={theme.chipActiveText}
            >
              {isSharing ? "Generating..." : "Share Card"}
            </ActionButton>
          )}
        </div>
        </div>
        {isModelUnavailable && (
          <span className="inline-block rounded-full bg-black/20 px-3 py-1 text-xs font-semibold text-white">
            Forecast model temporarily unavailable
          </span>
        )}
        {/* Headline */}
        <div className="space-y-4">
          {placeName && (
            <p className="text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: theme.textSoft }}>
              {effectiveTab === "today" ? "Right now" : "Tomorrow, daytime"} · {placeName}
            </p>
          )}
          <div className="flex items-start gap-3 sm:gap-4">
            <VerdictIcon
              className="mt-1.5 h-9 w-9 shrink-0 sm:mt-3 sm:h-12 sm:w-12"
              aria-hidden="true"
              data-testid="verdict-hero-icon"
              strokeWidth={1.75}
            />
            <h1 className="text-balance font-display text-[clamp(2.6rem,8vw,4.9rem)] leading-[0.95] tracking-tight">
              {activeVerdict}
            </h1>
          </div>
        </div>

        {/* Reasons */}
        <div className="space-y-1.5 text-[0.98rem] leading-relaxed sm:text-base">
          <p className="font-semibold">{activeReasons[0]}</p>
          <p style={{ color: theme.textSoft }}>{activeReasons[1]}</p>
        </div>

        {/* Reading */}
        {effectiveTab === "today" ? (
          <ReadingBadge
            pm25={a.effective.pm25}
            category={a.today.category}
            source={a.effective.source}
            confidence={a.confidence}
            station={a.effective.station ? { ...a.effective.station } : undefined}
            ageMinutes={a.ageMin}
            isStale={a.isStale}
          />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] bg-surface p-4 text-ink shadow-[0_10px_30px_-12px_rgb(0_0_0/0.35)] sm:p-5">
            <div className="flex items-baseline gap-2">
              <span className="tabular font-display text-[3.2rem] leading-[0.85] sm:text-[3.8rem]">
                {Math.round(a.tomorrow!.daytimeMean)}
              </span>
              <span className="pb-1 text-sm font-semibold text-ink-2">µg/m³ daytime mean</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className="rounded-full px-3 py-1.5 font-bold uppercase tracking-wider"
                style={{ background: tomorrowFill.fill, color: tomorrowFill.on }}
              >
                {a.tomorrow!.category}
              </span>
              <span className="rounded-lg bg-inset px-2.5 py-1.5 font-medium text-ink-2">Regional model forecast · low confidence</span>
            </div>
          </div>
        )}

        {/* Guidance profile */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t pt-5" style={{ borderColor: theme.chip }}>
          <div className="min-w-0">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em]" style={{ color: theme.textSoft }}>Guidance for</p>
            <p id="profile-desc" className="text-xs leading-normal" style={{ color: theme.textSoft }}>
              Lower thresholds for asthma, elderly, children &amp; respiratory sensitivity
            </p>
          </div>
          {onProfileChange && (
            <div
              className="inline-flex gap-1 rounded-full p-1"
              style={{ background: theme.chip }}
              role="group"
              aria-label="Health Sensitivity Profile"
              aria-describedby="profile-desc"
            >
              <button
                type="button"
                onClick={() => handleProfileSelect("standard")}
                aria-pressed={profile === "standard"}
                className={segBase}
                style={segStyle(profile === "standard")}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => handleProfileSelect("sensitive")}
                aria-pressed={profile === "sensitive"}
                className={`${segBase} inline-flex items-center gap-1.5`}
                style={segStyle(profile === "sensitive")}
              >
                <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                Sensitive group
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
