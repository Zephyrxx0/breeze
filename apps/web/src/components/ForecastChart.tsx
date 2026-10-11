import { useState, useRef, useId, useCallback, useEffect } from "react";
import { categoryFor, wallFromInstant, type AssessResponse } from "@breeze/core";
import { ForecastTooltip, type TooltipPoint } from "./ForecastTooltip";

interface ForecastChartProps {
  hourly: Array<{
    time: string;
    pm25: number;
    pm10?: number;
  }>;
  utcOffsetSeconds: number;
}

// Chart layout constants
export const CHART_WIDTH = 600;
export const CHART_HEIGHT = 220;
export const PLOT_LEFT = 40;
export const PLOT_RIGHT = 580;
export const PLOT_TOP = 25;
export const PLOT_BOTTOM = 185;

export interface CpcbBand {
  min: number;
  max: number;
  color: string;
  label: string;
}

export const CPCB_THRESHOLDS: CpcbBand[] = [
  { min: 0, max: 30, color: "#10b981", label: "Good" },
  { min: 30, max: 60, color: "#84cc16", label: "Satisfactory" },
  { min: 60, max: 90, color: "#f59e0b", label: "Moderate" },
  { min: 90, max: 120, color: "#f97316", label: "Poor" },
  { min: 120, max: 250, color: "#ef4444", label: "Very Poor" },
  { min: 250, max: Infinity, color: "#b91c1c", label: "Severe" },
];

/** Maps PM2.5 value to SVG Y coordinate (inverted) */
export function yForPm25(val: number, maxVal: number, top = PLOT_TOP, bottom = PLOT_BOTTOM): number {
  if (maxVal <= 0) return bottom;
  const clamped = Math.max(0, val);
  const ratio = Math.min(1, clamped / maxVal);
  return bottom - ratio * (bottom - top);
}

/** Maps hourly point index to SVG X coordinate */
export function xForIndex(index: number, total: number, left = PLOT_LEFT, right = PLOT_RIGHT): number {
  if (total <= 1) return left;
  return left + (index / (total - 1)) * (right - left);
}

/** Clamps keyboard scrubbing index */
export function clampIndex(index: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, index));
}

/** Generates SVG bands for CPCB NAQI ranges up to dynamic max */
export function getCpcbBands(maxVal: number, top = PLOT_TOP, bottom = PLOT_BOTTOM) {
  return CPCB_THRESHOLDS.filter((b) => b.min < maxVal).map((band) => {
    const bandMax = Math.min(band.max, maxVal);
    const yTop = yForPm25(bandMax, maxVal, top, bottom);
    const yBottom = yForPm25(band.min, maxVal, top, bottom);
    return {
      y: yTop,
      height: Math.max(0, yBottom - yTop),
      color: band.color,
      label: band.label,
      threshold: band.min,
    };
  });
}

function formatHourLabel(wallStr: string): string {
  const hourNum = parseInt(wallStr.slice(11, 13), 10);
  if (hourNum === 0) return "12 AM";
  if (hourNum < 12) return `${hourNum} AM`;
  if (hourNum === 12) return "12 PM";
  return `${hourNum - 12} PM`;
}

function formatDayAndHour(wallStr: string, todayDateStr: string): string {
  const datePart = wallStr.slice(0, 10);
  const hour = formatHourLabel(wallStr);
  const dayPrefix = datePart === todayDateStr ? "Today" : "Tomorrow";
  return `${dayPrefix}, ${hour}`;
}

export function ForecastChart({ hourly, utcOffsetSeconds }: ForecastChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const chartId = useId();

  // Fail-soft: if hourly data is absent, return null without crash
  if (!hourly || hourly.length === 0) {
    return null;
  }

  const nowMs = Date.now();
  const currentWall = wallFromInstant(nowMs, utcOffsetSeconds);
  const todayDateStr = currentWall.slice(0, 10);

  // Compute dynamic max PM2.5 (at least 130 to show Good through Poor clearly)
  const rawMax = Math.max(...hourly.map((p) => p.pm25));
  const dynamicMax = rawMax > 110 ? Math.ceil((rawMax * 1.2) / 30) * 30 : 130;

  // Find index closest to "Now"
  let nowIndex = 0;
  let minDiff = Infinity;
  hourly.forEach((pt, idx) => {
    const diff = Math.abs(pt.time.localeCompare(currentWall));
    if (diff < minDiff) {
      minDiff = diff;
      nowIndex = idx;
    }
  });

  const [activeIndex, setActiveIndex] = useState<number | null>(nowIndex);
  const [debouncedAnnouncement, setDebouncedAnnouncement] = useState<string>("");

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const current = activeIndex ?? nowIndex;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setActiveIndex(clampIndex(current - 1, 0, hourly.length - 1));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setActiveIndex(clampIndex(current + 1, 0, hourly.length - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(hourly.length - 1);
    }
  };

  // Pointer move handler
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const relativeX = ((e.clientX - rect.left) / rect.width) * CHART_WIDTH;

      if (relativeX < PLOT_LEFT || relativeX > PLOT_RIGHT) return;

      const step = (PLOT_RIGHT - PLOT_LEFT) / (hourly.length - 1);
      const index = Math.round((relativeX - PLOT_LEFT) / step);
      setActiveIndex(clampIndex(index, 0, hourly.length - 1));
    },
    [hourly.length]
  );

  const bands = getCpcbBands(dynamicMax, PLOT_TOP, PLOT_BOTTOM);

  // Build SVG path points
  const points = hourly.map((pt, i) => ({
    x: xForIndex(i, hourly.length, PLOT_LEFT, PLOT_RIGHT),
    y: yForPm25(pt.pm25, dynamicMax, PLOT_TOP, PLOT_BOTTOM),
    pt,
  }));

  // Path data strings
  const linePath = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `${acc} L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }, "");

  const areaPath = `${linePath} L ${PLOT_RIGHT} ${PLOT_BOTTOM} L ${PLOT_LEFT} ${PLOT_BOTTOM} Z`;

  // Night shading intervals: hours < 6 or >= 20
  const nightRects: Array<{ xStart: number; xEnd: number }> = [];
  let inNight = false;
  let startX = 0;

  hourly.forEach((h, i) => {
    const hour = parseInt(h.time.slice(11, 13), 10);
    const isNight = hour < 6 || hour >= 20;
    const x = xForIndex(i, hourly.length, PLOT_LEFT, PLOT_RIGHT);

    if (isNight && !inNight) {
      inNight = true;
      startX = Math.max(PLOT_LEFT, x - (PLOT_RIGHT - PLOT_LEFT) / (hourly.length * 2));
    } else if (!isNight && inNight) {
      inNight = false;
      const endX = x - (PLOT_RIGHT - PLOT_LEFT) / (hourly.length * 2);
      nightRects.push({ xStart: startX, xEnd: endX });
    }
  });
  if (inNight) {
    nightRects.push({ xStart: startX, xEnd: PLOT_RIGHT });
  }

  // Active tooltip point
  const currentActive = activeIndex !== null && hourly[activeIndex] ? hourly[activeIndex] : null;
  const tooltipPoint: TooltipPoint | null = currentActive
    ? {
        timeStr: formatDayAndHour(currentActive.time, todayDateStr),
        pm25: currentActive.pm25,
        x: xForIndex(activeIndex!, hourly.length, PLOT_LEFT, PLOT_RIGHT),
        y: yForPm25(currentActive.pm25, dynamicMax, PLOT_TOP, PLOT_BOTTOM),
      }
    : null;

  const nowX = xForIndex(nowIndex, hourly.length, PLOT_LEFT, PLOT_RIGHT);

  // 120ms debounced live region announcement
  useEffect(() => {
    if (!tooltipPoint) return;
    const cat = categoryFor(tooltipPoint.pm25);
    const msg = `${tooltipPoint.timeStr}: ${Math.round(tooltipPoint.pm25)} µg/m³, ${cat}`;

    const timer = setTimeout(() => {
      setDebouncedAnnouncement(msg);
    }, 120);

    return () => clearTimeout(timer);
  }, [tooltipPoint]);

  const activePm25Round = tooltipPoint ? Math.round(tooltipPoint.pm25) : 0;
  const activeCategory = tooltipPoint ? categoryFor(tooltipPoint.pm25) : "";
  const ariaValueText = tooltipPoint
    ? `${tooltipPoint.timeStr}: ${activePm25Round} µg/m³, ${activeCategory}`
    : "";

  return (
    <div
      className="w-full bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3 relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
      tabIndex={0}
      role="slider"
      aria-label="48-hour PM2.5 air quality forecast chart"
      aria-valuemin={0}
      aria-valuemax={hourly.length - 1}
      aria-valuenow={activeIndex ?? nowIndex}
      aria-valuetext={ariaValueText}
      onKeyDown={handleKeyDown}
    >
      {/* Screen Reader Live Region */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {debouncedAnnouncement}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">48-Hour Forecast</h2>
          <p className="text-xs text-slate-500">Hourly PM2.5 trajectory &amp; CPCB quality bands</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
          <span className="w-2.5 h-2.5 rounded-xs bg-slate-800/10 inline-block" /> Night shading
        </div>
      </div>

      {/* Responsive SVG Container */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="w-full h-auto touch-none"
          preserveAspectRatio="xMidYMid meet"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setActiveIndex(nowIndex)}
        >
          <defs>
            <linearGradient id={`area-grad-${chartId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* CPCB Category Colored Background Bands */}
          {bands.map((band, idx) => (
            <g key={idx}>
              <rect
                x={PLOT_LEFT}
                y={band.y}
                width={PLOT_RIGHT - PLOT_LEFT}
                height={band.height}
                fill={band.color}
                fillOpacity="0.08"
              />
              {/* Threshold Grid Line & Value Label */}
              {band.threshold > 0 && (
                <>
                  <line
                    x1={PLOT_LEFT}
                    y1={yForPm25(band.threshold, dynamicMax, PLOT_TOP, PLOT_BOTTOM)}
                    x2={PLOT_RIGHT}
                    y2={yForPm25(band.threshold, dynamicMax, PLOT_TOP, PLOT_BOTTOM)}
                    stroke="#94a3b8"
                    strokeWidth="0.5"
                    strokeDasharray="2 2"
                    strokeOpacity="0.5"
                  />
                  <text
                    x={PLOT_LEFT - 6}
                    y={yForPm25(band.threshold, dynamicMax, PLOT_TOP, PLOT_BOTTOM) + 3}
                    textAnchor="end"
                    className="text-[9px] fill-slate-400 font-mono"
                  >
                    {band.threshold}
                  </text>
                </>
              )}
            </g>
          ))}

          {/* Night Shading Bands */}
          {nightRects.map((nr, idx) => (
            <rect
              key={`night-${idx}`}
              x={nr.xStart}
              y={PLOT_TOP}
              width={Math.max(0, nr.xEnd - nr.xStart)}
              height={PLOT_BOTTOM - PLOT_TOP}
              fill="#0f172a"
              fillOpacity="0.05"
            />
          ))}

          {/* Filled Area Gradient */}
          <path d={areaPath} fill={`url(#area-grad-${chartId})`} />

          {/* Main Trajectory Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* "Now" Vertical Marker */}
          <line
            x1={nowX}
            y1={PLOT_TOP}
            x2={nowX}
            y2={PLOT_BOTTOM}
            stroke="#64748b"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <text
            x={nowX}
            y={PLOT_TOP - 6}
            textAnchor="middle"
            className="text-[10px] font-bold fill-slate-600 tracking-wider uppercase"
          >
            Now
          </text>

          {/* X-Axis Ticks (6-hour intervals) */}
          {hourly.map((pt, i) => {
            const hour = parseInt(pt.time.slice(11, 13), 10);
            if (hour % 6 !== 0) return null;
            const x = xForIndex(i, hourly.length, PLOT_LEFT, PLOT_RIGHT);
            const label = formatHourLabel(pt.time);
            return (
              <g key={`x-tick-${i}`}>
                <line x1={x} y1={PLOT_BOTTOM} x2={x} y2={PLOT_BOTTOM + 4} stroke="#cbd5e1" strokeWidth="1" />
                <text
                  x={x}
                  y={PLOT_BOTTOM + 16}
                  textAnchor="middle"
                  className="text-[9px] fill-slate-400 font-medium"
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Interactive Scrubbing Dot */}
          {tooltipPoint && (
            <g>
              <circle
                cx={tooltipPoint.x}
                cy={tooltipPoint.y}
                r="6"
                fill="#2563eb"
                stroke="#ffffff"
                strokeWidth="2.5"
                className="shadow-sm drop-shadow-md"
              />
              <line
                x1={tooltipPoint.x}
                y1={PLOT_TOP}
                x2={tooltipPoint.x}
                y2={PLOT_BOTTOM}
                stroke="#3b82f6"
                strokeWidth="1"
                strokeOpacity="0.4"
              />
            </g>
          )}
        </svg>

        {/* Tooltip Overlay */}
        <ForecastTooltip point={tooltipPoint} chartWidth={CHART_WIDTH} />
      </div>
    </div>
  );
}

