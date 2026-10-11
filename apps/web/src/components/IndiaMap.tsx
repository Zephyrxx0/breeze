import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import { categoryFor, type Category } from "@breeze/core";
import topology from "../assets/india-states.json";
import type { CityReading } from "../hooks/useIndiaSnapshot";
import { CATEGORY_FILL, CATEGORY_ORDER, CATEGORY_RANGE } from "../lib/theme";

export interface MapPlace {
  lat: number;
  lon: number;
  name: string;
  /** Assessed PM2.5 for the pinned place (station or model) */
  pm25?: number | null;
}

interface IndiaMapProps {
  cities: CityReading[];
  /** Live PM2.5 per city is a regional-model estimate; shown in the caption */
  validAtLabel?: string | null;
  selected?: MapPlace | null;
  onSelect?: (place: { lat: number; lon: number; name: string }) => void;
  /** Visual density: "hero" for the welcome screen, "card" inside the dashboard */
  variant?: "hero" | "card";
  /** Hide per-city numbers (e.g. snapshot failed) but keep the map interactive */
  numbersAvailable?: boolean;
}

const WIDTH = 520;
const HEIGHT = 610;

const geo = feature(topology as unknown as Topology, (topology as unknown as Topology).objects.states);

function categoryOrNull(pm25: number | null | undefined): Category | null {
  return typeof pm25 === "number" && pm25 >= 0 ? categoryFor(pm25) : null;
}

/**
 * India overview: state outlines (official boundary) with one dot per city coloured by the
 * live CAMS regional-model PM2.5. Selected place gets a pulsing pin.
 */
export default function IndiaMap({
  cities,
  validAtLabel,
  selected,
  onSelect,
  variant = "card",
  numbersAvailable = true,
}: IndiaMapProps) {
  const [hover, setHover] = useState<string | null>(null);
  const hero = variant === "hero";
  const r = hero ? 13 : 11;

  const hovered = useMemo(() => cities.find((c) => c.id === hover) ?? null, [cities, hover]);
  const hoveredCat = hovered ? categoryOrNull(hovered.pm25) : null;
  const selectedCat = categoryOrNull(selected?.pm25);
  const selectedIsCity =
    !!selected && cities.some((c) => Math.abs(selected.lat - c.lat) < 0.2 && Math.abs(selected.lon - c.lon) < 0.2);

  return (
    <figure className="m-0">
      <ComposableMap
        width={WIDTH}
        height={HEIGHT}
        projection="geoMercator"
        projectionConfig={{ center: [82.7, 22.8], scale: 1000 }}
        className="h-auto w-full"
        role="img"
        aria-label="Map of India with live regional-model PM2.5 by city"
      >
        <Geographies geography={geo}>
          {({ geographies }) =>
            geographies.map((g) => (
              <Geography
                key={g.rsmKey}
                geography={g}
                strokeWidth={0.7}
                className="fill-[var(--map-land)] stroke-[var(--map-line)] outline-none transition-colors duration-150 hover:fill-[var(--map-land-hover)]"
              />
            ))
          }
        </Geographies>

        {cities.map((c) => {
          const cat = numbersAvailable ? categoryOrNull(c.pm25) : null;
          const fill = cat ? CATEGORY_FILL[cat] : null;
          const isSel = !!selected && Math.abs(selected.lat - c.lat) < 0.2 && Math.abs(selected.lon - c.lon) < 0.2;
          const label =
            cat && c.pm25 !== null
              ? `${c.short}: ${Math.round(c.pm25)} micrograms per cubic metre PM2.5, ${cat}, regional model estimate`
              : `${c.short}: no live model value`;
          return (
            <Marker key={c.id} coordinates={[c.lon, c.lat]}>
              <g
                role={onSelect ? "button" : "img"}
                tabIndex={onSelect ? 0 : -1}
                aria-label={label}
                className="cursor-pointer outline-none [&:focus-visible>circle:nth-last-of-type(1)]:stroke-[var(--accent)]"
                onClick={() => onSelect?.({ lat: c.lat, lon: c.lon, name: c.name })}
                onKeyDown={(e) => {
                  if (onSelect && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onSelect({ lat: c.lat, lon: c.lon, name: c.name });
                  }
                }}
                onMouseEnter={() => setHover(c.id)}
                onMouseLeave={() => setHover((h) => (h === c.id ? null : h))}
                onFocus={() => setHover(c.id)}
                onBlur={() => setHover((h) => (h === c.id ? null : h))}
              >
                {isSel && <circle r={r + 7} fill="none" stroke="var(--ink)" strokeWidth={1.5} opacity={0.5} />}
                <circle
                  r={r}
                  fill={fill ? fill.fill : "var(--surface-2)"}
                  stroke={isSel ? "var(--ink)" : "var(--surface)"}
                  strokeWidth={isSel ? 2.5 : 2}
                />
                {cat && c.pm25 !== null ? (
                  <text
                    textAnchor="middle"
                    dy="0.34em"
                    fontSize={hero ? 11 : 9.5}
                    fontWeight={800}
                    fill={fill!.on}
                    pointerEvents="none"
                    className="tabular"
                  >
                    {Math.round(c.pm25)}
                  </text>
                ) : (
                  <text textAnchor="middle" dy="0.34em" fontSize={10} fill="var(--ink-3)" pointerEvents="none">
                    –
                  </text>
                )}
                {(hover === c.id || isSel) && (
                  <text
                    y={-r - 7}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={700}
                    fill="var(--ink)"
                    stroke="var(--surface)"
                    strokeWidth={4}
                    paintOrder="stroke"
                    pointerEvents="none"
                  >
                    {c.short}
                  </text>
                )}
              </g>
            </Marker>
          );
        })}

        {/* Pin for a place that is not one of the overview cities */}
        {selected && !selectedIsCity && (
          <Marker coordinates={[selected.lon, selected.lat]}>
            <g pointerEvents="none">
              <circle
                r={14}
                fill={selectedCat ? CATEGORY_FILL[selectedCat].fill : "var(--accent)"}
                opacity={0.28}
                className="animate-ping-soft"
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
              />
              <circle r={8} fill={selectedCat ? CATEGORY_FILL[selectedCat].fill : "var(--accent)"} stroke="var(--ink)" strokeWidth={2.5} />
              <text y={-18} textAnchor="middle" fontSize={12} fontWeight={800} fill="var(--ink)" stroke="var(--surface)" strokeWidth={4} paintOrder="stroke">
                {selected.name.split(",")[0]}
              </text>
            </g>
          </Marker>
        )}
      </ComposableMap>

      <figcaption className="mt-3 space-y-2.5 text-center">
        <p className="min-h-[1.25rem] text-sm font-medium text-ink-2" aria-live="polite">
          {hovered && hovered.pm25 !== null && hoveredCat ? (
            <>
              <strong className="text-ink">{hovered.short}</strong> · {Math.round(hovered.pm25)} µg/m³ · {hoveredCat}
              <span className="text-ink-3"> · regional model estimate</span>
            </>
          ) : onSelect ? (
            <span className="text-ink-3">Tap a city to see its verdict</span>
          ) : null}
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1 text-[0.68rem] font-medium text-ink-3" aria-label="PM2.5 category colours">
          {CATEGORY_ORDER.slice(0, 5).map((c) => (
            <li key={c} className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_FILL[c].fill }} aria-hidden="true" />
              {c} <span className="opacity-70">{CATEGORY_RANGE[c]}</span>
            </li>
          ))}
        </ul>
        <p className="text-[0.68rem] text-ink-3">
          {numbersAvailable
            ? `CAMS regional model (~45 km) · µg/m³${validAtLabel ? ` · valid ${validAtLabel}` : ""}`
            : "Live city values are unavailable right now."}
        </p>
      </figcaption>
    </figure>
  );
}
