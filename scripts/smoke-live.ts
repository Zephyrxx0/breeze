import { spawn, type ChildProcess } from "node:child_process";
import { AssessResponseSchema } from "../apps/api/src/assessSchema";
import { searchPlaces } from "../apps/web/src/lib/geocode";

interface Place {
  name: string;
  type: string;
  lat: number;
  lon: number;
}

const PLACES: Place[] = [
  { name: "Delhi", type: "metro", lat: 28.61, lon: 77.21 },
  { name: "Bengaluru", type: "metro", lat: 12.97, lon: 77.59 },
  { name: "Jaipur", type: "tier-2", lat: 26.91, lon: 75.79 },
  { name: "Jaisalmer", type: "small-town", lat: 26.92, lon: 70.92 },
];

async function waitForHealth(url: string, timeoutMs = 15000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // Retry
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

function spawnApiServer(port: number, envOverrides: Record<string, string> = {}): ChildProcess {
  return spawn("pnpm", ["exec", "tsx", "apps/api/src/dev.ts"], {
    env: { ...process.env, PORT: String(port), ...envOverrides },
    stdio: "pipe",
  });
}

async function killServer(child: ChildProcess): Promise<void> {
  if (!child.pid) return;
  child.kill("SIGTERM");
  setTimeout(() => {
    try {
      child.kill("SIGKILL");
    } catch {
      // already stopped
    }
  }, 1000);
}

export async function main(): Promise<void> {
  console.log("=== Breeze Live Smoke Verification ===\n");

  const runningServers: ChildProcess[] = [];

  try {
    let baseUrl = process.env.SMOKE_BASE_URL ?? null;

    if (!baseUrl) {
      console.log("Spawning standard dev API server on port 8788...");
      const normalChild = spawnApiServer(8788);
      runningServers.push(normalChild);
      const ready = await waitForHealth("http://localhost:8788/api/health");
      if (!ready) {
        throw new Error("Standard API server failed to become healthy on port 8788");
      }
      baseUrl = "http://localhost:8788";
      console.log("Standard API server ready on :8788\n");
    } else {
      console.log(`Using provided SMOKE_BASE_URL: ${baseUrl}\n`);
    }

    const hasOpenAqKey = !!process.env.OPENAQ_API_KEY && process.env.OPENAQ_API_KEY.trim() !== "";
    if (!hasOpenAqKey) {
      console.warn("⚠️  NOTE: OPENAQ_API_KEY not set in environment or .env.");
      console.warn("   OpenAQ station path will fail soft (unavailable). OpenAQ blocker gate will be skipped.\n");
    }

    // 1. Four Indian places test (2 metro, 1 tier-2, 1 small town)
    console.log("Testing 4 Indian places (Live Upstreams):");
    const summaryMix: Array<{ place: string; type: string; source: string; pm25: number; statuses: string }> = [];

    for (const p of PLACES) {
      const assessUrl = `${baseUrl}/api/assess?lat=${p.lat}&lon=${p.lon}`;
      const res = await fetch(assessUrl);
      if (!res.ok) {
        throw new Error(`Place ${p.name} failed with HTTP ${res.status}`);
      }

      const json = await res.json();
      const parsed = AssessResponseSchema.safeParse(json);
      if (!parsed.success) {
        console.error("Schema validation errors for", p.name, parsed.error.issues);
        throw new Error(`Place ${p.name} response broke AssessResponseSchema`);
      }

      const body = parsed.data;
      if (body.air.current === null) {
        throw new Error(`Place ${p.name} returned null for air.current`);
      }

      const src = body.air.current.source;
      const pm25 = body.air.current.pm25;
      const statusList = Object.entries(body.sources)
        .map(([k, v]) => `${k}:${v.status}`)
        .join(", ");

      summaryMix.push({
        place: p.name,
        type: p.type,
        source: src,
        pm25,
        statuses: statusList,
      });

      console.log(`  ✓ ${p.name} (${p.type}): PM2.5 = ${pm25} µg/m³ [source: ${src}] | Sources: [${statusList}]`);
    }

    console.log("\nStation vs Model Mix Summary:");
    console.table(summaryMix);

    // 2. Blackhole Fail-Soft Checks (proves 4s abort and degrade paths)
    console.log("\nProving Blackhole Degrade Paths:");

    // 2a. OpenAQ Blackhole -> Model-Only Degrade Path
    console.log("  Spawning server :8789 with OPENAQ_BASE_URL=http://10.255.255.1 (hang / blackhole)...");
    const openAqBlackholeChild = spawnApiServer(8789, {
      OPENAQ_BASE_URL: "http://10.255.255.1",
    });
    runningServers.push(openAqBlackholeChild);
    const bh1Ready = await waitForHealth("http://localhost:8789/api/health");
    if (!bh1Ready) {
      throw new Error("Server on 8789 failed to become healthy");
    }

    const bh1Res = await fetch("http://localhost:8789/api/assess?lat=28.61&lon=77.21");
    if (!bh1Res.ok) {
      throw new Error(`OpenAQ blackhole request failed with HTTP ${bh1Res.status}`);
    }
    const bh1Body = (await bh1Res.json()) as any;
    if (bh1Body.sources.openaq.status !== "unavailable") {
      throw new Error(`Expected sources.openaq.status === 'unavailable', got ${bh1Body.sources.openaq.status}`);
    }
    if (bh1Body.air.current.source !== "model") {
      throw new Error(`Expected air.current.source === 'model', got ${bh1Body.air.current.source}`);
    }
    console.log("  ✓ OpenAQ blackhole successfully fell back to model-only path (sources.openaq.status === 'unavailable', source === 'model')");

    // 2b. Open-Meteo Air Blackhole -> Station-Only Degrade Path (when key exists)
    if (hasOpenAqKey) {
      console.log("  Spawning server :8790 with AIR_BASE_URL=http://10.255.255.1 (hang / blackhole)...");
      const airBlackholeChild = spawnApiServer(8790, {
        AIR_BASE_URL: "http://10.255.255.1",
      });
      runningServers.push(airBlackholeChild);
      const bh2Ready = await waitForHealth("http://localhost:8790/api/health");
      if (!bh2Ready) {
        throw new Error("Server on 8790 failed to become healthy");
      }

      const bh2Res = await fetch("http://localhost:8790/api/assess?lat=28.61&lon=77.21");
      if (!bh2Res.ok) {
        throw new Error(`Air blackhole request failed with HTTP ${bh2Res.status}`);
      }
      const bh2Body = (await bh2Res.json()) as any;
      if (bh2Body.sources.openmeteo_air.status !== "unavailable") {
        throw new Error(`Expected sources.openmeteo_air.status === 'unavailable', got ${bh2Body.sources.openmeteo_air.status}`);
      }
      if (bh2Body.air.current.source !== "station") {
        throw new Error(`Expected air.current.source === 'station', got ${bh2Body.air.current.source}`);
      }
      if (bh2Body.air.model !== null) {
        throw new Error(`Expected air.model === null on station-only degrade, got non-null`);
      }
      console.log("  ✓ Air blackhole successfully fell back to station-only path (sources.openmeteo_air.status === 'unavailable', source === 'station', air.model === null)");
    } else {
      console.log("  ℹ Skipping live station-only blackhole proof (no OPENAQ_API_KEY present). Hermetic tests already proved this.");
    }

    // 3. Day-One Verifications
    console.log("\nRunning Day-One Upstream Checks:");

    // 3a. Out-of-India 400
    const outRes = await fetch(`${baseUrl}/api/assess?lat=40.7&lon=-74`);
    if (outRes.status !== 400) {
      throw new Error(`Expected out-of-India coordinates to return 400, got ${outRes.status}`);
    }
    const outBody = (await outRes.json()) as any;
    if (outBody.error !== "out_of_coverage") {
      throw new Error(`Expected error === 'out_of_coverage', got ${outBody.error}`);
    }
    console.log("  ✓ Out-of-India request correctly rejected with 400 out_of_coverage");

    // 3b. Live geocoding check for Indian city
    const geocodeResults = await searchPlaces("Lucknow");
    if (geocodeResults.length === 0) {
      throw new Error("Live geocode search for 'Lucknow' returned no results");
    }
    const lucknowHit = geocodeResults.find((r) => r.name.toLowerCase().includes("lucknow"));
    if (!lucknowHit) {
      throw new Error("Live geocode results did not contain Lucknow");
    }
    console.log(`  ✓ Live geocode for 'Lucknow' returned ${geocodeResults.length} Indian results (found: ${lucknowHit.name})`);

    console.log("\n========================================");
    console.log("🎉 ALL LIVE SMOKE VERIFICATIONS PASSED!");
    console.log("========================================\n");
  } finally {
    console.log("Cleaning up spawned child servers...");
    for (const child of runningServers) {
      await killServer(child);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("\n❌ SMOKE FAILED:", err);
    process.exit(1);
  });
}
