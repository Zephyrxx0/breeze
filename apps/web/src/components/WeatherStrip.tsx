import { Sun, Droplets, CloudRain, Wind, Thermometer, Sunrise, Sunset, type LucideIcon } from "lucide-react";
import type { AssessResponse } from "@breeze/core";
import { compassFromDegrees, wallToClock } from "../lib/format";
import { weatherNow } from "../lib/weatherNow";

interface WeatherStripProps {
  weather: AssessResponse["weather"];
  /** Place UTC offset, used to select the *current local hour* (hourly[0] is local midnight, not "now") */
  utcOffsetSeconds?: number;
  nowMs?: number;
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-inset p-3">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface shadow-sm ${tone}`}>
        <Icon className="h-[1.05rem] w-[1.05rem]" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <div className="text-[0.7rem] font-semibold text-ink-3">{label}</div>
        <div className="tabular text-sm font-bold text-ink">
          {value}
          {sub && <span className="ml-1 font-medium text-ink-3">{sub}</span>}
        </div>
      </div>
    </div>
  );
}

const num = (v: number | undefined) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null);

export function WeatherStrip({ weather, utcOffsetSeconds = 19800, nowMs }: WeatherStripProps) {
  // Fail-soft: weather missing or not covering the current hour → hide only this strip
  const w = weatherNow(weather, utcOffsetSeconds, nowMs ?? Date.now());
  if (!w) return null;

  const feels = num(w.feelsLikeC);
  const humidity = num(w.humidity);
  const uv = num(w.uvNow);
  const uvMax = num(w.uvMaxToday);
  const rain = num(w.rainNext6h);
  const wind = num(w.windSpeedKmh);

  return (
    <div className="card space-y-4 p-5 sm:p-7">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[0.7rem] font-bold uppercase tracking-wider text-ink-3">Current conditions</h3>
        <span className="text-[0.7rem] font-semibold text-ink-3">Open-Meteo</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {feels !== null && <Stat icon={Thermometer} label="Feels like" value={`${feels}°C`} tone="text-[#d9534f]" />}
        {humidity !== null && <Stat icon={Droplets} label="Humidity" value={`${humidity}%`} tone="text-[#2f8fd8]" />}
        {uv !== null && (
          <Stat icon={Sun} label="UV index" value={`${uv}`} sub={uvMax !== null ? `(max ${uvMax})` : undefined} tone="text-[#e8a317]" />
        )}
        {rain !== null && <Stat icon={CloudRain} label="Rain chance, next 6 h" value={`${rain}%`} tone="text-[#5b6fd6]" />}
        {wind !== null && (
          <Stat
            icon={Wind}
            label="Wind"
            value={`${wind} km/h`}
            sub={typeof w.windFromDeg === "number" ? `from ${compassFromDegrees(w.windFromDeg)}` : undefined}
            tone="text-[#2a9d8f]"
          />
        )}
        {w.sunrise && w.sunset && (
          <div className="flex items-center gap-3 rounded-2xl bg-inset p-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface text-[#e8860f] shadow-sm">
              <Sunrise className="h-[1.05rem] w-[1.05rem]" aria-hidden="true" />
            </span>
            <div className="min-w-0 text-[0.7rem] font-semibold leading-snug text-ink-3">
              <div className="tabular text-sm font-bold text-ink">{wallToClock(w.sunrise)}</div>
              <div className="flex items-center gap-1">
                <Sunset className="h-3 w-3" aria-hidden="true" />
                <span className="tabular">{wallToClock(w.sunset)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
