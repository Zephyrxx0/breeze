import { wallFromInstant, type AssessResponse } from "@breeze/core";

interface ProvenanceFooterProps {
  data: AssessResponse;
}

function formatWallTime(isoUtc?: string, utcOffsetSeconds: number = 0): string {
  if (!isoUtc) return "Recently";
  try {
    const ms = new Date(isoUtc).getTime();
    if (isNaN(ms)) return "Recently";
    const wall = wallFromInstant(ms, utcOffsetSeconds);
    const hourNum = parseInt(wall.slice(11, 13), 10);
    const minuteStr = wall.slice(14, 16);
    const ampm = hourNum >= 12 ? "PM" : "AM";
    const h12 = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    return `${h12}:${minuteStr} ${ampm}`;
  } catch {
    return "Recently";
  }
}

export function ProvenanceFooter({ data }: ProvenanceFooterProps) {
  const offset = data.location.utcOffsetSeconds;
  const updatedTime = formatWallTime(data.generatedAt, offset);

  const airFetchedAt =
    data.sources?.openmeteo_air?.fetchedAt ||
    data.air.current?.measuredAt ||
    data.generatedAt;
  const airTime = formatWallTime(airFetchedAt, offset);

  const weatherFetchedAt =
    data.sources?.openmeteo_forecast?.fetchedAt || data.generatedAt;
  const weatherTime = formatWallTime(weatherFetchedAt, offset);

  return (
    <footer className="w-full pt-8 pb-12 border-t border-slate-200/80 text-xs text-slate-500 space-y-4">
      {/* Timestamps */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-slate-600">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          <span>
            Updated at <strong className="text-slate-800">{updatedTime}</strong> (local time)
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span>Air: {airTime}</span>
          <span>Weather: {weatherTime}</span>
        </div>
      </div>

      {/* Attribution links (CC BY 4.0 compliant) */}
      <div className="space-y-1.5 leading-relaxed text-slate-500">
        <p>
          Air quality model data provided by{" "}
          <a
            href="https://atmosphere.copernicus.eu/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-700 underline hover:text-slate-900 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            Copernicus Atmosphere Monitoring Service (CAMS)
          </a>{" "}
          &amp;{" "}
          <a
            href="https://open-meteo.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-700 underline hover:text-slate-900 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            Open-Meteo
          </a>{" "}
          under{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-700 underline hover:text-slate-900 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            CC BY 4.0
          </a>
          .
        </p>
        <p>
          Ground station readings aggregated via{" "}
          <a
            href="https://openaq.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-700 underline hover:text-slate-900 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            OpenAQ
          </a>
          .
        </p>
      </div>

      {/* Medical disclaimer */}
      <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
        <p>
          <strong>Disclaimer:</strong> General guidance, not medical advice. Air quality impacts
          vary by individual health condition and duration of exposure.
        </p>
      </div>
    </footer>
  );
}

