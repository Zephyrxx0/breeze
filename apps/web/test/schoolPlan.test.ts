import { describe, it, expect } from "vitest";
import { planSchoolDay } from "../src/lib/schoolPlan";

const day = (pm: (h: number) => number, date = "2026-10-12") =>
  Array.from({ length: 24 }, (_, h) => ({ time: `${date}T${String(h).padStart(2, "0")}:00`, pm25: pm(h) }));

describe("planSchoolDay (children use Sensitive thresholds)", () => {
  it("maps slot means through the sensitive matrix", () => {
    const plan = planSchoolDay(day((h) => (h === 11 ? 100 : h === 7 ? 40 : 20)), "2026-10-12", "2026-10-11T22");
    const by = Object.fromEntries(plan.slots.map((s) => [s.slot.id, s]));
    expect(by.assembly.advice).toBe("Limit time outside"); // 40 = Satisfactory → Take care (sensitive)
    expect(by.pe.category).toBe("Poor");
    expect(by.pe.advice).toBe("Move indoors"); // Poor + sensitive → stay indoors
    expect(by.lunch.advice).toBe("Outdoors OK");
    expect(plan.moveIndoorCount).toBe(1);
  });

  it("finds the cleanest school hour and ignores hours already past today", () => {
    const hourly = day((h) => (h === 8 ? 10 : h === 13 ? 15 : 50), "2026-10-11");
    const plan = planSchoolDay(hourly, "2026-10-11", "2026-10-11T10");
    expect(plan.cleanestHour).toEqual({ hour: 13, pm25: 15 });
    expect(plan.slots.find((s) => s.slot.id === "assembly")!.passed).toBe(true);
  });

  it("returns null means when the forecast has no points (never invents a value)", () => {
    const plan = planSchoolDay([], "2026-10-12", "2026-10-11T22");
    expect(plan.slots.every((s) => s.mean === null && s.advice === null)).toBe(true);
    expect(plan.cleanestHour).toBeNull();
  });
});
