import { categoryFor } from "@breeze/core";

export interface TooltipPoint {
  timeStr: string;
  pm25: number;
  x: number;
  y: number;
}

interface ForecastTooltipProps {
  point: TooltipPoint | null;
  chartWidth?: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  Good: "bg-emerald-100 text-emerald-800 border-emerald-300",
  Satisfactory: "bg-lime-100 text-lime-800 border-lime-300",
  Moderate: "bg-amber-100 text-amber-800 border-amber-300",
  Poor: "bg-orange-100 text-orange-800 border-orange-300",
  "Very Poor": "bg-rose-100 text-rose-800 border-rose-300",
  Severe: "bg-red-200 text-red-900 border-red-400",
};

export function ForecastTooltip({ point, chartWidth = 600 }: ForecastTooltipProps) {
  if (!point) return null;

  const category = categoryFor(point.pm25);
  const colorClass = CATEGORY_COLORS[category] || "bg-slate-100 text-slate-800 border-slate-300";

  // Prevent tooltip from overflowing left or right edges
  // Chart is 600 wide. Tooltip width ~140px.
  const tooltipWidth = 140;
  let leftPos = point.x - tooltipWidth / 2;
  if (leftPos < 10) leftPos = 10;
  if (leftPos + tooltipWidth > chartWidth - 10) leftPos = chartWidth - tooltipWidth - 10;

  // Position above the point if space permits, else below
  const topPos = point.y > 65 ? point.y - 55 : point.y + 15;

  return (
    <div
      className="absolute pointer-events-none z-20 flex flex-col items-center transition-transform duration-75 ease-out"
      style={{
        left: `${(leftPos / chartWidth) * 100}%`,
        top: `${(topPos / 220) * 100}%`,
        width: `${(tooltipWidth / chartWidth) * 100}%`,
      }}
    >
      <div className="bg-slate-900/90 backdrop-blur-xs text-white text-xs rounded-xl px-2.5 py-1.5 shadow-lg border border-slate-700/50 flex flex-col items-center gap-1 w-full text-center">
        <span className="text-[11px] font-medium text-slate-300">{point.timeStr}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-sm tracking-tight">{Math.round(point.pm25)}</span>
          <span className="text-[10px] text-slate-400">µg/m³</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${colorClass}`}>
            {category}
          </span>
        </div>
      </div>
    </div>
  );
}
