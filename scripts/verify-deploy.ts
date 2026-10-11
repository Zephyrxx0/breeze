import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

interface CheckResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: CheckResult[] = [];

async function main() {
  const amplifyUrl = (process.argv[2] || process.env.AMPLIFY_URL || "").replace(/\/$/, "");
  const functionUrl = (process.argv[3] || process.env.FUNCTION_URL || "https://gnwpit4zuxcyot7ojhizhvi3ji0sbihv.lambda-url.ap-south-1.on.aws").replace(/\/$/, "");

  console.log("=================================================");
  console.log("   Breeze Deployment Verification Suite          ");
  console.log("=================================================");
  console.log(`Amplify URL:  ${amplifyUrl || "(Not provided - skipping frontend tests)"}`);
  console.log(`Function URL: ${functionUrl}`);
  console.log("-------------------------------------------------\n");

  // 1. JS Bundle Budget (< 200 KB gzipped *initial* JS, PRD §16)
  //    Initial = everything the dashboard needs for first paint. The Bklit forecast chart and the
  //    India map are code-split and fetched after first paint, so they are reported but not counted.
  try {
    const assetsDir = join(process.cwd(), 'apps/web/dist/assets');
    const files = readdirSync(assetsDir);
    const jsFiles = files.filter(f => f.endsWith('.js'));
    const DEFERRED = [/^ForecastChart-/, /^IndiaMap-/];

    let initialRaw = 0;
    let initialGzip = 0;
    let deferredGzip = 0;
    const deferredNames: string[] = [];

    for (const f of jsFiles) {
      const content = readFileSync(join(assetsDir, f));
      const gz = gzipSync(content).byteLength;
      if (DEFERRED.some(re => re.test(f))) {
        deferredGzip += gz;
        deferredNames.push(f);
      } else {
        initialRaw += content.byteLength;
        initialGzip += gz;
      }
    }

    const maxBudget = 200 * 1024; // 200 KB = 204,800 bytes
    const passed = initialGzip < maxBudget;
    results.push({
      name: "Initial JS Bundle (< 200 KB gzipped)",
      passed,
      details: `Initial: ${(initialGzip / 1024).toFixed(2)} KB gzipped (${(initialRaw / 1024).toFixed(2)} KB raw). Deferred (chart + map): ${(deferredGzip / 1024).toFixed(2)} KB gzipped in ${deferredNames.length} chunk(s). Budget: 200 KB.`
    });
  } catch (err) {
    results.push({
      name: "Initial JS Bundle (< 200 KB gzipped)",
      passed: false,
      details: `Failed to inspect bundle assets: ${err instanceof Error ? err.message : String(err)}`
    });
  }

  // 2. CORS Preflight & Single ACAO Header
  if (functionUrl) {
    try {
      const testOrigin = amplifyUrl || "https://main.example.amplifyapp.com";
      const preflightRes = await fetch(`${functionUrl}/api/health`, {
        method: 'OPTIONS',
        headers: {
          'Origin': testOrigin,
          'Access-Control-Request-Method': 'GET',
        }
      });

      const acao = preflightRes.headers.get('access-control-allow-origin');
      const allHeaders = Array.from(preflightRes.headers.entries());
      const acaoHeaders = allHeaders.filter(([k]) => k.toLowerCase() === 'access-control-allow-origin');

      const isSingle = acaoHeaders.length === 1 && !acao?.includes(',');
      const isExpected = isSingle && (acao === '*' || acao === testOrigin);

      results.push({
        name: "Single Access-Control-Allow-Origin Header",
        passed: isExpected,
        details: `Status: ${preflightRes.status}, ACAO header count: ${acaoHeaders.length}, Value: "${acao || 'none'}"`
      });
    } catch (err) {
      results.push({
        name: "Single Access-Control-Allow-Origin Header",
        passed: false,
        details: `CORS verification request failed: ${err instanceof Error ? err.message : String(err)}`
      });
    }

    // 3. Warm API Latency (p95 <= 2.5s) & Live Assessment Structure
    try {
      // 1 warm-up call
      await fetch(`${functionUrl}/api/health`);

      const latencies: number[] = [];
      let samplePayload: any = null;

      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        const res = await fetch(`${functionUrl}/api/assess?lat=28.61&lon=77.21`);
        const duration = performance.now() - start;
        latencies.push(duration);
        if (i === 0 && res.ok) {
          samplePayload = await res.json();
        }
      }

      latencies.sort((a, b) => a - b);
      const p95 = latencies[Math.floor(latencies.length * 0.95)] || latencies[latencies.length - 1];
      const validPayload = samplePayload && samplePayload.location && samplePayload.air && samplePayload.weather;
      const passed = p95 <= 2500 && validPayload;

      results.push({
        name: "Warm API Latency p95 <= 2.5s & Live Schema",
        passed,
        details: `p95: ${p95.toFixed(1)}ms (samples: ${latencies.map(l => l.toFixed(0) + 'ms').join(', ')}). Air status: ${samplePayload?.air?.status}`
      });
    } catch (err) {
      results.push({
        name: "Warm API Latency p95 <= 2.5s & Live Schema",
        passed: false,
        details: `Latency test failed: ${err instanceof Error ? err.message : String(err)}`
      });
    }
  }

  // 4. Amplify Deep-Link SPA Rewrite
  if (amplifyUrl) {
    try {
      const deepLinkUrl = `${amplifyUrl}/?lat=28.61&lon=77.21&name=New%20Delhi`;
      const res = await fetch(deepLinkUrl);
      const contentType = res.headers.get('content-type') || "";
      const isHtml = contentType.includes('text/html');
      const passed = res.ok && isHtml;

      results.push({
        name: "Amplify Deep-Link SPA Rewrite (?lat=..&lon=..)",
        passed,
        details: `Status: ${res.status}, Content-Type: ${contentType}`
      });
    } catch (err) {
      results.push({
        name: "Amplify Deep-Link SPA Rewrite (?lat=..&lon=..)",
        passed: false,
        details: `Deep link test failed: ${err instanceof Error ? err.message : String(err)}`
      });
    }
  }

  // 5. Amplify /app route rewrite (landing CTA target must resolve to the SPA shell)
  if (amplifyUrl) {
    try {
      const res = await fetch(`${amplifyUrl}/app`);
      const contentType = res.headers.get('content-type') || "";
      const body = await res.text();
      const passed = res.ok && contentType.includes('text/html') && body.includes('id="root"');

      results.push({
        name: "Amplify /app SPA Rewrite (landing CTA target)",
        passed,
        details: `Status: ${res.status}, Content-Type: ${contentType}`
      });
    } catch (err) {
      results.push({
        name: "Amplify /app SPA Rewrite (landing CTA target)",
        passed: false,
        details: `/app test failed: ${err instanceof Error ? err.message : String(err)}`
      });
    }
  }

  // Print Summary Table
  console.log("Verification Summary:");
  let allPassed = true;
  for (const r of results) {
    const symbol = r.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`[${symbol}] ${r.name}`);
    console.log(`       Details: ${r.details}\n`);
    if (!r.passed) allPassed = false;
  }

  if (allPassed) {
    console.log("All automated checks PASSED!");
    process.exit(0);
  } else {
    console.error("One or more automated checks FAILED.");
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Fatal verification error:", err);
  process.exit(1);
});
