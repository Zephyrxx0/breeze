import { categoryFor, verdictFor, type Category, type Verdict } from "@breeze/core";

export interface SchoolSlot {
  id: string;
  label: string;
  /** Local hour, inclusive */
  start: number;
  /** Local hour, exclusive */
  end: number;
}

/** A typical Indian school day; editable in one place. */
export const SCHOOL_SLOTS: readonly SchoolSlot[] = [
  { id: "assembly", label: "Morning assembly", start: 7, end: 8 },
  { id: "play", label: "Morning break", start: 10, end: 11 },
  { id: "pe", label: "PE / sports", start: 11, end: 12 },
  { id: "lunch", label: "Lunch break", start: 12, end: 13 },
  { id: "dismissal", label: "Dismissal", start: 15, end: 16 },
];

export type SlotAdvice = "Outdoors OK" | "Limit time outside" | "Move indoors";

export const ADVICE_FOR_VERDICT: Record<Verdict, SlotAdvice> = {
  "Good to go": "Outdoors OK",
  "Take care": "Limit time outside",
  "Stay indoors if you can": "Move indoors",
};

export interface SlotPlan {
  slot: SchoolSlot;
  /** Mean model PM2.5 for the slot; null when the forecast has no points for it */
  mean: number | null;
  category: Category | null;
  advice: SlotAdvice | null;
  /** Slot already finished (today only) */
  passed: boolean;
}

export interface SchoolDayPlan {
  slots: SlotPlan[];
  /** Cleanest school-hour (07:00–16:00) with its PM2.5, for scheduling outdoor activity */
  cleanestHour: { hour: number; pm25: number } | null;
  /** Number of upcoming slots where indoor is advised */
  moveIndoorCount: number;
}

/**
 * Children use the Sensitive thresholds (PRD §4: children are the example sensitive group).
 * `dateStr` is the place-local YYYY-MM-DD; `nowHour` is only used to flag finished slots today.
 */
export function planSchoolDay(
  hourly: Array<{ time: string; pm25: number }>,
  dateStr: string,
  nowWall: string,
  slots: readonly SchoolSlot[] = SCHOOL_SLOTS
): SchoolDayPlan {
  const day = hourly.filter((h) => h.time.startsWith(dateStr));
  const hourOf = (t: string) => parseInt(t.slice(11, 13), 10);
  const isToday = nowWall.startsWith(dateStr);
  const nowHour = parseInt(nowWall.slice(11, 13), 10);

  const plans: SlotPlan[] = slots.map((slot) => {
    const pts = day.filter((h) => hourOf(h.time) >= slot.start && hourOf(h.time) < slot.end);
    const passed = isToday && nowHour >= slot.end;
    if (pts.length === 0) return { slot, mean: null, category: null, advice: null, passed };
    const mean = pts.reduce((s, p) => s + p.pm25, 0) / pts.length;
    const category = categoryFor(mean);
    return { slot, mean, category, advice: ADVICE_FOR_VERDICT[verdictFor(category, "sensitive")], passed };
  });

  const schoolHours = day.filter((h) => hourOf(h.time) >= 7 && hourOf(h.time) < 16 && (!isToday || hourOf(h.time) >= nowHour));
  let cleanestHour: SchoolDayPlan["cleanestHour"] = null;
  for (const h of schoolHours) {
    if (!cleanestHour || h.pm25 < cleanestHour.pm25) cleanestHour = { hour: hourOf(h.time), pm25: h.pm25 };
  }

  return {
    slots: plans,
    cleanestHour,
    moveIndoorCount: plans.filter((p) => !p.passed && p.advice === "Move indoors").length,
  };
}
