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

  // 1. JS Bundle Budget (< 200 KB gzipped)
  try {
    const assetsDir = join(process.cwd(), 'apps/web/dist/assets');
    const files = readdirSync(assetsDir);
    const jsFiles = files.filter(f => f.endsWith('.js'));
    
    let totalRawBytes = 0;
    let totalGzipBytes = 0;

    for (const f of jsFiles) {
      const content = readFileSync(join(assetsDir, f));
      totalRawBytes += content.byteLength;
      totalGzipBytes += gzipSync(content).byteLength;
    }

    const maxBudget = 200 * 1024; // 200 KB = 204,800 bytes
    const passed = totalGzipBytes < maxBudget;
    results.push({
      name: "JS Bundle Size (< 200 KB gzipped)",
      passed,
      details: `Total: ${(totalGzipBytes / 1024).toFixed(2)} KB gzipped (${(totalRawBytes / 1024).toFixed(2)} KB raw) across ${jsFiles.length} file(s). Budget: 200 KB.`
    });
  } catch (err) {
    results.push({
      name: "JS Bundle Size (< 200 KB gzipped)",
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
