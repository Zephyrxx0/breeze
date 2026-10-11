import { lazy, Suspense } from "react";
import { useIndiaSnapshot, type CityReading } from "../hooks/useIndiaSnapshot";
import { CITIES } from "../lib/cities";
import { instantToPlaceClock } from "../lib/format";
import type { MapPlace } from "./IndiaMap";

// The map (d3-geo + state outlines) is split out of the main bundle to protect first paint.
const IndiaMap = lazy(() => import("./IndiaMap"));

interface IndiaMapPanelProps {
  selected?: MapPlace | null;
  onSelect?: (place: { lat: number; lon: number; name: string }) => void;
  variant?: "hero" | "card";
}

function MapSkeleton() {
  return (
    <div className="mx-auto aspect-[520/610] w-full max-w-[26rem] animate-pulse rounded-[2rem] bg-ink/[0.06]" aria-busy="true" aria-label="Loading map" />
  );
}

export function IndiaMapPanel({ selected, onSelect, variant = "card" }: IndiaMapPanelProps) {
  const { data, isLoading, isError } = useIndiaSnapshot();

  if (isLoading) return <MapSkeleton />;

  // Fail soft: if the live snapshot fails, still show the map to pick places — with no numbers.
  const cities: CityReading[] = data?.cities ?? CITIES.map((c) => ({ ...c, pm25: null }));
  const validAt = data?.validAt ? `${instantToPlaceClock(data.validAt, 19800)} IST` : null;

  return (
    <Suspense fallback={<MapSkeleton />}>
      <IndiaMap
        cities={cities}
        validAtLabel={validAt}
        selected={selected}
        onSelect={onSelect}
        variant={variant}
        numbersAvailable={!isError && !!data}
      />
    </Suspense>
  );
}
