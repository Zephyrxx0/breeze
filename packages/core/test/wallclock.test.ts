import { describe, it, expect } from "vitest";
import {
  parseWall,
  wallFromInstant,
  wallAddHours,
  hourLabel,
} from "../src/wallclock";

describe("wallclock", () => {
  it("parses canonical hour and Open-Meteo string with trailing minutes", () => {
    const p1 = parseWall("2026-10-11T15");
    expect(p1.year).toBe(2026);
    expect(p1.month).toBe(10);
    expect(p1.day).toBe(11);
    expect(p1.hour).toBe(15);
    expect(p1.dateString).toBe("2026-10-11");

    const p2 = parseWall("2026-10-11T15:00");
    expect(p2.year).toBe(2026);
    expect(p2.month).toBe(10);
    expect(p2.day).toBe(11);
    expect(p2.hour).toBe(15);

    expect(() => parseWall("2026-10-11")).toThrow();
  });

  it("produces byte-identical output regardless of process.env.TZ mutation", () => {
    const epoch = 1791720000000; // Fixed timestamp
    const istOffset = 19800; // +05:30

    const originalTz = process.env.TZ;
    try {
      process.env.TZ = "UTC";
      const utcRun = wallFromInstant(epoch, istOffset);

      process.env.TZ = "America/New_York";
      const nyRun = wallFromInstant(epoch, istOffset);

      process.env.TZ = "Asia/Kolkata";
      const kolkataRun = wallFromInstant(epoch, istOffset);

      expect(utcRun).toBe(nyRun);
      expect(utcRun).toBe(kolkataRun);
    } finally {
      process.env.TZ = originalTz;
    }
  });

  it("adds hours purely in wall-clock space", () => {
    const w1 = "2026-10-11T22";
    expect(wallAddHours(w1, 3)).toBe("2026-10-12T01");
    expect(wallAddHours(w1, 26)).toBe("2026-10-13T00");
  });

  it("formats human hour labels", () => {
    expect(hourLabel(21)).toBe("~9 PM");
    expect(hourLabel(9)).toBe("~9 AM");
    expect(hourLabel(12)).toBe("~12 PM");
    expect(hourLabel(0)).toBe("~12 AM");
  });
});
