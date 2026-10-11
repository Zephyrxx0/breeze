import { serve } from "@hono/node-server";
import { app } from "./app";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Load .env from workspace root if present
try {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const rootEnvPath = resolve(currentDir, "../../../.env");
  if (existsSync(rootEnvPath)) {
    const content = readFileSync(rootEnvPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        process.env[key] ??= val;
      }
    }
  }
} catch {
  // Gracefully continue without .env
}

const port = Number(process.env.PORT ?? 8787);
console.log(`Starting Breeze API dev server on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
});
