import type { AssessResponse } from "@breeze/core";
import { instantToPlaceClock } from "../lib/format";

interface ProvenanceFooterProps {
  data: AssessResponse;
  onOpenAbout?: () => void;
}

const LINK =
  "text-ink-2 underline decoration-line-strong underline-offset-2 transition hover:text-ink hover:decoration-accent rounded-sm";

type Status = "ok" | "stale" | "unavailable";

function StatusDot({ status }: { status: Status }) {
  const tone = status === "ok" ? "bg-go" : status === "stale" ? "bg-care" : "bg-ink-3/50";
  return <span className={`h-2 w-2 shrink-0 rounded-full ${tone}`} aria-hidden="true" />;
}

export function ProvenanceFooter({ data, onOpenAbout }: ProvenanceFooterProps) {
  const offset = data.location.utcOffsetSeconds;
  const updatedTime = instantToPlaceClock(data.generatedAt, offset) ?? "Recently";

  const rows: Array<{ label: string; status: Status; detail: string }> = [
    {
      label: "Air model (CAMS)",
      status: (data.sources?.openmeteo_air?.status as Status) ?? "unavailable",
      detail: instantToPlaceClock(data.sources?.openmeteo_air?.fetchedAt, offset) ?? statusWord(data.sources?.openmeteo_air),
    },
    {
      label: "Weather (Open-Meteo)",
      status: (data.sources?.openmeteo_forecast?.status as Status) ?? "unavailable",
      detail: instantToPlaceClock(data.sources?.openmeteo_forecast?.fetchedAt, offset) ?? statusWord(data.sources?.openmeteo_forecast),
    },
    {
      label: "Ground stations (OpenAQ)",
      status: (data.sources?.openaq?.status as Status) ?? "unavailable",
      detail:
        data.sources?.openaq?.status === "ok"
          ? (instantToPlaceClock(data.sources.openaq.fetchedAt, offset) ?? "ok")
          : data.air.current?.source === "station"
            ? statusWord(data.sources?.openaq)
            : "none in range",
    },
  ];

  return (
    <footer className="space-y-5 pb-6 pt-2 text-xs leading-relaxed text-ink-3">
      <div className="card space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-ink-2">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-go" aria-hidden="true" />
            Updated at <strong className="text-ink">{updatedTime}</strong> (local time)
          </span>
          {onOpenAbout && (
            <button
              type="button"
              onClick={onOpenAbout}
              data-testid="footer-open-about-button"
              className="cursor-pointer rounded-sm font-semibold text-accent underline underline-offset-2"
            >
              Learn how Breeze measures air quality &amp; data sources &rarr;
            </button>
          )}
        </div>
        <ul className="grid gap-x-6 gap-y-1.5 border-t border-line pt-3 sm:grid-cols-3">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center gap-2">
              <StatusDot status={r.status} />
              <span className="text-ink-2">{r.label}</span>
              <span className="tabular ml-auto text-ink-3 sm:ml-1">{r.detail}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-1.5 px-1">
        <p>
          Air quality model data provided by{" "}
          <a href="https://atmosphere.copernicus.eu/" target="_blank" rel="noopener noreferrer" className={LINK}>
            Copernicus Atmosphere Monitoring Service (CAMS)
          </a>{" "}
          &amp;{" "}
          <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className={LINK}>
            Open-Meteo
          </a>{" "}
          under{" "}
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className={LINK}>
            CC BY 4.0
          </a>
          . Ground station readings aggregated via{" "}
          <a href="https://openaq.org/" target="_blank" rel="noopener noreferrer" className={LINK}>
            OpenAQ
          </a>
          .
        </p>
        <p className="text-[0.7rem]">
          <strong>Disclaimer:</strong> General guidance, not medical advice. Air quality impacts vary by individual
          health condition and duration of exposure.
        </p>
      </div>
    </footer>
  );
}

function statusWord(s?: { status: string; ageMin?: number }): string {
  if (!s) return "unavailable";
  if (s.status === "stale") return s.ageMin !== undefined ? `cached ${s.ageMin}m ago` : "cached";
  return s.status;
}
