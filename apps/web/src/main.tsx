import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  categoryFor,
  verdictFor,
  reasonLines,
  bestWindow,
  buildTips,
  formatTip,
  wallFromInstant,
  confidenceFor,
  type AssessResponse,
} from "@breeze/core";

function WalkingSkeleton() {
  const [data, setData] = useState<AssessResponse | null>(null);
  const [error, setError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  async function loadData() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/assess?lat=28.61&lon=77.21");
      if (!res.ok) {
        setError(true);
        return;
      }
      const json = (await res.json()) as AssessResponse;
      if (!json.air?.current) {
        // Zero air data honesty rule: leads to total failure state, never a verdict
        setError(true);
        return;
      }
      setData(json);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <div>Loading assessment...</div>;
  }

  // Failure branch: strictly "Can't assess right now" — NEVER a verdict word
  if (error || !data || !data.air?.current) {
    return (
      <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <h1>Can&apos;t assess right now</h1>
        <p>Live upstream data is temporarily unavailable.</p>
        <button onClick={loadData}>Retry</button>
      </div>
    );
  }

  // Success branch: run pure @breeze/core decision logic in the browser bundle
  const current = data.air.current;
  const category = categoryFor(current.pm25);
  const verdict = verdictFor(category, "standard");

  const conf = confidenceFor({
    source: current.source,
    distanceKm: current.station?.distanceKm,
  });

  const lines = reasonLines({
    effective: {
      pm25: current.pm25,
      source: current.source,
      measuredAt: current.measuredAt,
      station: current.station,
      modelDistanceNote: current.modelDistanceNote,
      confidence: conf,
    },
    category,
    profile: "standard",
    nowMs: Date.now(),
  });

  const windowResult = bestWindow(
    data.air.model?.hourly ?? [],
    wallFromInstant(Date.now(), data.location.utcOffsetSeconds)
  );

  const tips = buildTips(
    {
      effectivePm25: {
        pm25: current.pm25,
        source: current.source,
        measuredAt: current.measuredAt,
        confidence: conf,
      },
      window: windowResult,
      uv: data.weather?.hourly?.[0]?.uvIndex,
      feelsLikeC: data.weather?.hourly?.[0]?.apparentTemperature,
      rainProbNext6h: data.weather?.hourly?.[0]?.precipitationProbability,
    },
    "standard"
  );

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "600px" }}>
      <h2>Breeze (Walking Skeleton)</h2>
      <h1 style={{ fontSize: "2.5rem", margin: "1rem 0" }}>{verdict}</h1>

      <div style={{ margin: "1rem 0", color: "#444" }}>
        <p><strong>{lines[0]}</strong></p>
        <p>{lines[1]}</p>
      </div>

      {windowResult && (
        <div style={{ padding: "1rem", background: "#f0f8ff", borderRadius: "8px", margin: "1rem 0" }}>
          <h3>Cleanest 3-Hour Window</h3>
          <p>
            {windowResult.startWall.slice(11)} to {windowResult.endWall.slice(11)} (avg {Math.round(windowResult.meanPm25)} µg/m³, {Math.round(windowResult.improvementPct * 100)}% lower)
          </p>
        </div>
      )}

      <div style={{ margin: "1rem 0" }}>
        <h3>Tips</h3>
        <ul>
          {tips.map((t) => (
            <li key={t.id} style={{ marginBottom: "0.5rem" }}>
              {formatTip(t)}
            </li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: "2rem", fontSize: "0.85rem", color: "#888" }}>
        Location: Delhi ({data.location.lat}, {data.location.lon}) | Source: {current.source}
      </div>
    </div>
  );
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<WalkingSkeleton />);
}
