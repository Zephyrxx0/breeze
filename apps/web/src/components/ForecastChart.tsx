import { useState, useRef, useEffect, useMemo } from "react";
import { bestWindow, categoryFor, wallFromInstant, type BestWindow, type Category } from "@breeze/core";
import { AreaChart, Area } from "./charts/area-chart";
import { Grid } from "./charts/grid";
import { XAxis } from "./charts/x-axis";
import { YAxis } from "./charts/y-axis";
import { ChartTooltip } from "./charts/tooltip";
import { ReferenceArea } from "./charts/reference-area";
import { useChartStable, useChartHover } from "./charts/chart-context";
import { wallToLocalDate } from "../lib/format";
import { CATEGORY_FILL } from "../lib/theme";

interface ForecastChartProps {
  hourly: Array<{
    time: string;
    pm25: number;
    pm10?: number;
  }>;
  utcOffsetSeconds: number;
  /** Optional precomputed window; computed from `hourly` when omitted */
  window?: BestWindow | null;
}

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested in test/chart.test.ts)
// ---------------------------------------------------------------------------
export interface CpcbBand {
  min: number;
  max: number;
  color: string;
  label: string;
}

export const CPCB_THRESHOLDS: CpcbBand[] = [
  { min: 0, max: 30, color: CATEGORY_FILL.Good.fill, label: "Good" },
  { min: 30, max: 60, color: CATEGORY_FILL.Satisfactory.fill, label: "Satisfactory" },
  { min: 60, max: 90, color: CATEGORY_FILL.Moderate.fill, label: "Moderate" },
  { min: 90, max: 120, color: CATEGORY_FILL.Poor.fill, label: "Poor" },
  { min: 120, max: 250, color: CATEGORY_FILL["Very Poor"].fill, label: "Very Poor" },
  { min: 250, max: Infinity, color: CATEGORY_FILL.Severe.fill, label: "Severe" },
];

/** Clamps keyboard scrubbing index */
export function clampIndex(index: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, index));
}

/** Night (before 06:00, from 20:00) runs as [startIdx, endIdx]; endIdx is the first non-night point (or the last point). */
export function nightRuns(hourly: Array<{ time: string }>): Array<[number, number]> {
  const runs: Array<[number, number]> = [];
  let start = -1;
  hourly.forEach((h, i) => {
    const hour = parseInt(h.time.slice(11, 13), 10);
    const night = hour < 6 || hour >= 20;
    if (night && start < 0) start = i;
    if (!night && start >= 0) {
      runs.push([start, i]);
      start = -1;
    }
  });
  if (start >= 0) runs.push([start, hourly.length - 1]);
  return runs.filter(([a, b]) => b > a);
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
  const dayPrefix = datePart === todayDateStr ? "Today" : "Tomorrow";
  return `${dayPrefix}, ${formatHourLabel(wallStr)}`;
}

// ---------------------------------------------------------------------------
// Chart internals that need Bklit's context
// ---------------------------------------------------------------------------
function NowLine({ at }: { at: Date }) {
  const { xScale, innerHeight } = useChartStable();
  const x = xScale(at);
  if (x === undefined || Number.isNaN(x)) return null;
  return (
    <g aria-hidden="true" pointerEvents="none">
      <line x1={x} x2={x} y1={0} y2={innerHeight} stroke="var(--ink-2)" strokeWidth={1.25} strokeDasharray="3 3" />
      <text x={x} y={-7} textAnchor="middle" fontSize={10} fontWeight={700} letterSpacing="0.08em" fill="var(--ink-2)">
        NOW
      </text>
    </g>
  );
}

/** Syncs keyboard scrubbing → Bklit tooltip, and Bklit hover → parent readout. */
function Bridge({ kbIndex, kbSeq, onHover }: { kbIndex: number; kbSeq: number; onHover: (i: number) => void }) {
  const { data, xScale, yScale, xAccessor } = useChartStable();
  const { tooltipData, setTooltipData } = useChartHover();

  useEffect(() => {
    if (kbSeq === 0) return;
    const d = data[kbIndex];
    if (!d) return;
    setTooltipData({
      point: d,
      index: kbIndex,
      x: xScale(xAccessor(d)) ?? 0,
      yPositions: { pm25: yScale(d.pm25 as number) ?? 0 },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kbSeq]);

  const hoverIndex = tooltipData?.index;
  useEffect(() => {
    if (hoverIndex !== undefined) onHover(hoverIndex);
  }, [hoverIndex, onHover]);

  return null;
}

export function ForecastChart({ hourly, utcOffsetSeconds, window: windowProp }: ForecastChartProps) {
  const nowMs = Date.now();
  const currentWall = wallFromInstant(nowMs, utcOffsetSeconds);
  const todayDateStr = currentWall.slice(0, 10);

  const nowIndex = useMemo(() => {
    if (!hourly?.length) return 0;
    const exact = hourly.findIndex((p) => p.time.slice(0, 13) === currentWall.slice(0, 13));
    if (exact >= 0) return exact;
    // Series does not contain the current hour: start at the nearest point
    const idx = hourly.findIndex((p) => p.time.slice(0, 13) > currentWall.slice(0, 13));
    return idx < 0 ? hourly.length - 1 : idx;
  }, [hourly, currentWall]);

  const [activeIndex, setActiveIndex] = useState<number>(nowIndex);
  const [kbSeq, setKbSeq] = useState(0);
  const [debouncedAnnouncement, setDebouncedAnnouncement] = useState<string>("");

  const window = useMemo(
    () => (windowProp !== undefined ? windowProp : bestWindow(hourly ?? [], currentWall)),
    [windowProp, hourly, currentWall]
  );

  const data = useMemo(
    () => (hourly ?? []).map((h) => ({ date: wallToLocalDate(h.time), pm25: Math.round(h.pm25 * 10) / 10 })),
    [hourly]
  );

  const nowDate = useMemo(() => {
    const base = wallToLocalDate(currentWall);
    const minutes = new Date(nowMs + utcOffsetSeconds * 1000).getUTCMinutes();
    return new Date(base.getTime() + minutes * 60000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWall, utcOffsetSeconds]);

  const nights = useMemo(() => nightRuns(hourly ?? []), [hourly]);

  const active = hourly?.[activeIndex];
  const activeCategory: Category | null = active ? categoryFor(active.pm25) : null;
  const activeLabel = active ? formatDayAndHour(active.time, todayDateStr) : "";

  // 120ms debounced live-region announcement
  useEffect(() => {
    if (!active || !activeCategory) return;
    const msg = `${activeLabel}: ${Math.round(active.pm25)} µg/m³, ${activeCategory}`;
    const timer = setTimeout(() => setDebouncedAnnouncement(msg), 120);
    return () => clearTimeout(timer);
  }, [active, activeCategory, activeLabel]);

  // Fail-soft: no hourly data → render nothing
  if (!hourly || hourly.length === 0 || !active) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const bump = (i: number) => {
      setActiveIndex(clampIndex(i, 0, hourly.length - 1));
      setKbSeq((s) => s + 1);
    };
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      bump(activeIndex - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      bump(activeIndex + 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      bump(0);
    } else if (e.key === "End") {
      e.preventDefault();
      bump(hourly.length - 1);
    }
  };

  const ariaValueText = activeCategory ? `${activeLabel}: ${Math.round(active.pm25)} µg/m³, ${activeCategory}` : "";
  const fill = activeCategory ? CATEGORY_FILL[activeCategory] : null;
  const isNow = activeIndex === nowIndex;

  return (
    <div className="card space-y-4 p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold tracking-tight text-ink">48-hour forecast</h2>
          <p className="text-xs text-ink-3">Hourly PM2.5 · regional model (CAMS, ~45 km)</p>
        </div>
        <div className="flex items-center gap-4 text-[0.7rem] font-medium text-ink-3">
          {window && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-accent/35 ring-1 ring-accent/60" aria-hidden="true" /> Cleanest window
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-ink/15" aria-hidden="true" /> Night
          </span>
        </div>
      </div>

      {/* Readout for the scrubbed hour (hover, touch or arrow keys) */}
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-inset px-4 py-3" aria-hidden="true">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wider text-ink-3">
            {isNow ? "Now · " : ""}
            {activeLabel}
          </p>
          <p className="tabular font-display text-4xl leading-none text-ink">
            {Math.round(active.pm25)}
            <span className="ml-1.5 font-sans text-xs font-semibold text-ink-3">µg/m³</span>
          </p>
        </div>
        {fill && activeCategory && (
          <span className="rounded-full px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-wider" style={{ background: fill.fill, color: fill.on }}>
            {activeCategory}
          </span>
        )}
      </div>

      <div
        className="rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-surface"
        tabIndex={0}
        role="slider"
        aria-label="48-hour PM2.5 air quality forecast chart"
        aria-valuemin={0}
        aria-valuemax={hourly.length - 1}
        aria-valuenow={activeIndex}
        aria-valuetext={ariaValueText}
        onKeyDown={handleKeyDown}
      >
        {/* Screen Reader Live Region */}
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {debouncedAnnouncement}
        </div>

        <div className="select-none">
          <AreaChart
            data={data}
            aspectRatio="2 / 1"
            margin={{ top: 22, right: 10, bottom: 34, left: 34 }}
            animationDuration={900}
          >
            {/* CPCB category bands */}
            {CPCB_THRESHOLDS.map((b) => (
              <ReferenceArea
                key={b.label}
                y1={b.min}
                y2={Number.isFinite(b.max) ? b.max : 1000}
                fill={b.color}
                fillOpacity={0.11}
                strokeWidth={0}
                fadeEdges={false}
              />
            ))}
            {/* Night shading */}
            {nights.map(([a, b]) => (
              <ReferenceArea
                key={`night-${a}`}
                x1={data[a].date}
                x2={data[b].date}
                fill="var(--ink)"
                fillOpacity={0.055}
                strokeWidth={0}
                fadeEdges={false}
              />
            ))}
            {/* Cleanest 3-hour window */}
            {window && (
              <ReferenceArea
                x1={wallToLocalDate(window.startWall)}
                x2={wallToLocalDate(window.endWall)}
                fill="var(--accent)"
                fillOpacity={0.2}
                stroke="var(--accent)"
                strokeWidth={1.25}
                strokeStyle="solid"
                fadeEdges={false}
              />
            )}
            <Grid horizontal numTicksRows={4} />
            <Area dataKey="pm25" fill="var(--accent)" fillOpacity={0.28} strokeWidth={2.5} />
            <YAxis numTicks={4} />
            <XAxis numTicks={5} />
            <NowLine at={nowDate} />
            <ChartTooltip
              showDatePill={false}
              rows={(p) => {
                const v = p.pm25 as number;
                const c = categoryFor(v);
                return [{ color: CATEGORY_FILL[c].fill, label: c, value: `${Math.round(v)} µg/m³` }];
              }}
            />
            <Bridge kbIndex={activeIndex} kbSeq={kbSeq} onHover={setActiveIndex} />
          </AreaChart>
        </div>
      </div>

      <ul className="hide-scrollbar -mx-1 flex gap-x-4 gap-y-1 overflow-x-auto px-1 text-[0.7rem] font-medium text-ink-3" aria-label="PM2.5 category colours">
        {CPCB_THRESHOLDS.slice(0, 5).map((b) => (
          <li key={b.label} className="inline-flex shrink-0 items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: b.color }} aria-hidden="true" />
            {b.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
