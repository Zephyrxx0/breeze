import { Sun, Droplets, CloudRain, Wind, Thermometer } from "lucide-react";
import type { AssessResponse } from "@breeze/core";

interface WeatherStripProps {
  weather: AssessResponse["weather"];
}

export function WeatherStrip({ weather }: WeatherStripProps) {
  // Fail-soft rule: if weather is unavailable or missing, hide completely without error
  if (!weather || weather.status === "unavailable" || !weather.hourly || weather.hourly.length === 0) {
    return null;
  }

  const current = weather.hourly[0];
  const uvMax = weather.daily?.uvIndexMax ?? current.uvIndex;

  return (
    <div className="w-full bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Current Conditions
        </h3>
        <span className="text-xs font-semibold text-slate-400">Open-Meteo</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-700">
        {/* Feels Like */}
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <Thermometer className="w-4 h-4 text-rose-500 shrink-0" />
          <div>
            <div className="text-xs text-slate-500">Feels like</div>
            <div className="text-sm font-bold text-slate-900">
              {Math.round(current.apparentTemperature)}°C
            </div>
          </div>
        </div>

        {/* Humidity */}
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <Droplets className="w-4 h-4 text-blue-500 shrink-0" />
          <div>
            <div className="text-xs text-slate-500">Humidity</div>
            <div className="text-sm font-bold text-slate-900">
              {Math.round(current.relativeHumidity)}%
            </div>
          </div>
        </div>

        {/* UV Index */}
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <Sun className="w-4 h-4 text-amber-500 shrink-0" />
          <div>
            <div className="text-xs text-slate-500">UV Index</div>
            <div className="text-sm font-bold text-slate-900">
              {Math.round(current.uvIndex)} (max {Math.round(uvMax)})
            </div>
          </div>
        </div>

        {/* Rain Chance */}
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <CloudRain className="w-4 h-4 text-indigo-500 shrink-0" />
          <div>
            <div className="text-xs text-slate-500">Rain chance</div>
            <div className="text-sm font-bold text-slate-900">
              {Math.round(current.precipitationProbability)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

