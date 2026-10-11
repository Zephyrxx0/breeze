import { Hono } from "hono";
import { healthRoute } from "./routes/health";
import { assessRoutes } from "./routes/assess";

export const app = new Hono();

// Mount routes
app.route("/api", healthRoute);
app.route("/api", assessRoutes);

// Central error handler
app.onError((err, c) => {
  console.error("API error:", err);
  return c.json({ error: "internal" }, 500);
});
