import { forwardRef } from "react";
import { formatTip, type AssessResponse, type Tip } from "@breeze/core";
import { deriveAssessment } from "../lib/assessment";
import { CATEGORY_FILL, CATEGORY_ORDER, VERDICT_THEMES } from "../lib/theme";
import { scalePosition } from "./CpcbScale";
import { instantToPlaceClock } from "../lib/format";

export interface ShareCardProps {
  data: AssessResponse;
  profile?: "standard" | "sensitive";
  tips?: Tip[];
  /** Friendly place label (never raw coordinates — PRD §15) */
  placeName?: string;
  /** Short host shown on the card, e.g. "breeze.example.com" */
  shareUrl?: string;
}

// Fixed light palette: the card is a shareable artefact and must not follow the viewer's theme.
const INK = "#0b1a20";
const INK2 = "#3d525a";
const INK3 = "#5a6f77";
const SANS = '"Figtree Variable", system-ui, -apple-system, "Segoe UI", sans-serif';
const SERIF = '"Instrument Serif", Georgia, "Times New Roman", serif';

function formatAsOf(nowMs: number, utcOffsetSeconds: number): string {
  const shifted = new Date(nowMs + utcOffsetSeconds * 1000);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const clock = instantToPlaceClock(new Date(nowMs).toISOString(), utcOffsetSeconds) ?? "";
  return `${clock}, ${shifted.getUTCDate()} ${months[shifted.getUTCMonth()]}`;
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(function ShareCard(
  { data, profile = "standard", tips = [], placeName, shareUrl },
  ref
) {
  const nowMs = Date.now();
  const a = deriveAssessment(data, profile, nowMs);
  if (!a) return null;

  const { effective, today, confidence } = a;
  const verdict = today.verdict;
  const theme = VERDICT_THEMES[verdict];
  const fill = CATEGORY_FILL[today.category];
  const place = placeName || (data.location as { name?: string }).name || "Your location";
  const host = shareUrl || (typeof window !== "undefined" ? window.location.host : "");

  const sourceLabel =
    effective.source === "station"
      ? effective.station?.name || "Ground monitoring station"
      : "Regional atmospheric model (~45 km)";
  const sourceDetail =
    effective.source === "station"
      ? `Official monitor${effective.station ? `, ${Math.round(effective.station.distanceKm)} km away` : ""}${
          a.ageMin !== null ? ` · ${a.ageMin} min old` : ""
        } · via OpenAQ`
      : "Copernicus CAMS via Open-Meteo · estimate for a ~45 km area";

  const topTips = tips.slice(0, 3);
  const pos = Math.min(98, Math.max(2, scalePosition(effective.pm25) * 100));
  const verdictSize = verdict.length <= 12 ? 176 : 124;
  const Icon = theme.icon;

  return (
    <div
      ref={ref}
      data-testid="share-card-container"
      style={{
        width: "1080px",
        height: "1350px",
        fontFamily: SANS,
        background: "#f1f6f4",
        color: INK,
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Verdict-coloured sky */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "0 0 auto 0",
          height: 800,
          background: theme.gradient,
          borderRadius: "0 0 80px 80px",
        }}
      />
      <div
        aria-hidden="true"
        style={{ position: "absolute", top: -160, right: -120, width: 560, height: 560, borderRadius: "50%", background: "rgba(255,255,255,0.22)", filter: "blur(70px)" }}
      />
      <svg aria-hidden="true" viewBox="0 0 1200 120" preserveAspectRatio="none" style={{ position: "absolute", left: 0, top: 690, width: 1080, height: 110, opacity: 0.14, color: theme.text }} fill="currentColor">
        <path d="M0 60 C 150 20, 300 100, 450 60 S 750 20, 900 60 S 1050 100, 1200 60 V120 H0 Z" />
      </svg>

      <div style={{ position: "relative", zIndex: 1, padding: "68px 72px 0", color: theme.text, flex: "0 0 auto" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <svg viewBox="0 0 64 64" width="60" height="60" aria-hidden="true">
              <rect width="64" height="64" rx="18" fill="rgba(255,255,255,0.22)" />
              <g fill="none" stroke={theme.text} strokeWidth="5" strokeLinecap="round">
                <path d="M14 24h26a7 7 0 1 0-7-7" />
                <path d="M14 34h34a7 7 0 1 1-7 7" />
                <path d="M14 44h16" />
              </g>
            </svg>
            <span style={{ fontFamily: SERIF, fontSize: 56, lineHeight: 1 }}>Breeze</span>
          </div>
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              padding: "10px 24px",
              borderRadius: 999,
              background: theme.chip,
              letterSpacing: 0.4,
            }}
          >
            {profile === "sensitive" ? "Sensitive profile" : "Standard profile"}
          </span>
        </div>

        {/* place + verdict */}
        <p style={{ margin: "70px 0 0", fontSize: 28, fontWeight: 700, letterSpacing: 3.5, textTransform: "uppercase", color: theme.textSoft }}>
          Air right now · {place}
        </p>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 28, marginTop: 22 }}>
          <Icon width={verdictSize * 0.5} height={verdictSize * 0.5} style={{ flex: "0 0 auto", marginTop: verdictSize * 0.12 }} strokeWidth={1.7} aria-hidden="true" />
          <h2 style={{ margin: 0, fontFamily: SERIF, fontWeight: 400, fontSize: verdictSize, lineHeight: 0.94, letterSpacing: -2 }}>{verdict}</h2>
        </div>
        <p style={{ margin: "34px 0 0", fontSize: 31, fontWeight: 600, lineHeight: 1.35, maxWidth: 900 }}>{today.reasons[0]}</p>
      </div>

      {/* Reading + tips sheet */}
      <div style={{ position: "relative", zIndex: 1, padding: "0 56px", marginTop: "auto", marginBottom: 0, flex: "0 0 auto", transform: "translateY(-6px)" }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 48,
            padding: "40px 48px",
            boxShadow: "0 30px 60px -30px rgba(11,26,32,0.45)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
              <span style={{ fontFamily: SERIF, fontSize: 150, lineHeight: 0.85, letterSpacing: -3 }}>{Math.round(effective.pm25)}</span>
              <span style={{ fontSize: 28, fontWeight: 700, color: INK2 }}>µg/m³ PM2.5</span>
            </div>
            <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", padding: "12px 28px", borderRadius: 999, background: fill.fill, color: fill.on }}>
              {today.category}
            </span>
          </div>

          <div style={{ position: "relative", marginTop: 30 }}>
            <div style={{ display: "flex", gap: 4, height: 16 }}>
              {CATEGORY_ORDER.map((c, i) => (
                <span
                  key={c}
                  style={{
                    flex: 1,
                    background: CATEGORY_FILL[c].fill,
                    borderRadius: i === 0 ? "99px 0 0 99px" : i === 5 ? "0 99px 99px 0" : 0,
                  }}
                />
              ))}
            </div>
            <span
              style={{
                position: "absolute",
                top: "50%",
                left: `${pos}%`,
                width: 34,
                height: 34,
                marginLeft: -17,
                marginTop: -17,
                borderRadius: "50%",
                background: INK,
                border: "6px solid #fff",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginTop: 26, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", fontSize: 24, color: INK2 }}>
            <strong style={{ color: INK }}>{sourceLabel}</strong>
            <span style={{ padding: "4px 14px", borderRadius: 999, background: "#eaf1f0", fontWeight: 700, fontSize: 22 }}>
              {confidence.toLowerCase()} confidence
            </span>
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 22, color: INK3 }}>{sourceDetail}</p>
        </div>

        {topTips.length > 0 && (
          <ul style={{ listStyle: "none", margin: "28px 0 0", padding: "0 16px", display: "flex", flexDirection: "column", gap: 16 }}>
            {topTips.map((tip, i) => {
              const formatted = formatTip(tip);
              const [prefix, ...rest] = formatted.split(" — ");
              const body = rest.join(" — ");
              return (
                <li key={tip.id} style={{ display: "flex", alignItems: "flex-start", gap: 20, fontSize: 27, lineHeight: 1.3, color: INK2 }}>
                  <span
                    style={{
                      flex: "0 0 auto",
                      width: 40,
                      height: 40,
                      borderRadius: 14,
                      background: "#dcebf5",
                      color: "#14639a",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 800,
                      fontSize: 22,
                      marginTop: 2,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span>
                    {body ? (
                      <>
                        <strong style={{ color: INK }}>{prefix}</strong>
                        <span> — {body}</span>
                      </>
                    ) : (
                      formatted
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* footer */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "26px 72px 44px",
          fontSize: 24,
          color: INK3,
          flex: "0 0 auto",
        }}
      >
        <span>
          As of <strong style={{ color: INK2 }}>{formatAsOf(nowMs, data.location.utcOffsetSeconds)}</strong> · general guidance, not medical advice
        </span>
        <span style={{ fontWeight: 800, color: "#14639a", fontSize: 26 }}>{host}</span>
      </div>
    </div>
  );
});
