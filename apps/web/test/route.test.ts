import { describe, it, expect } from "vitest";
import { resolveRoute } from "../src/lib/route";

describe("resolveRoute", () => {
  it("shows the landing page at /", () => {
    expect(resolveRoute({ pathname: "/", search: "" })).toBe("landing");
  });
  it("opens the app at /app (with or without trailing slash)", () => {
    expect(resolveRoute({ pathname: "/app", search: "" })).toBe("app");
    expect(resolveRoute({ pathname: "/app/", search: "?lat=1" })).toBe("app");
  });
  it("keeps canonical share links (/?lat&lon) working", () => {
    expect(resolveRoute({ pathname: "/", search: "?lat=28.61&lon=77.21&n=Delhi" })).toBe("app");
  });
  it("ignores partial coordinates", () => {
    expect(resolveRoute({ pathname: "/", search: "?lat=28.61" })).toBe("landing");
  });
});
