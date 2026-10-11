import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  server: {
    // Bind dual-stack (IPv4 + IPv6). Vite's default "localhost" bound only ::1 on this machine,
    // so http://127.0.0.1:5173 (and IPv4-first browsers) could not connect.
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
  test: {
    environment: "happy-dom",
    globals: true,
  },
});
