import { useMemo, useState } from "react";
import { GraduationCap, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
import { wallFromInstant, wallAddHours, type AssessResponse } from "@breeze/core";
import { planSchoolDay, type SlotAdvice } from "../lib/schoolPlan";
import { CATEGORY_FILL } from "../lib/theme";
import { wallToHour } from "../lib/format";

interface SchoolPlannerProps {
  data: AssessResponse;
}

const ADVICE_ICON: Record<SlotAdvice, typeof CheckCircle2> = {
  "Outdoors OK": CheckCircle2,
  "Limit time outside": AlertCircle,
  "Move indoors": AlertTriangle,
};

const ADVICE_TONE: Record<SlotAdvice, string> = {
  "Outdoors OK": "text-[#0b6b52] dark:text-[#5fe0b9]",
  "Limit time outside": "text-[#7a4f00] dark:text-[#ffd27a]",
  "Move indoors": "text-[#a82f2f] dark:text-[#ff9b9b]",
};

/**
 * "Should PE move indoors?" — the organisers' own example. Hourly regional-model forecast
 * for typical school slots, judged with the Sensitive thresholds because children are
 * a sensitive group.
 */
export function SchoolPlanner({ data }: SchoolPlannerProps) {
  const hourly = data.air.model?.hourly;
  const offset = data.location.utcOffsetSeconds;
  const nowWall = wallFromInstant(Date.now(), offset);
  const todayStr = nowWall.slice(0, 10);
  const tomorrowStr = wallAddHours(nowWall, 24).slice(0, 10);
  const afterSchool = parseInt(nowWall.slice(11, 13), 10) >= 16;
  const [day, setDay] = useState<"today" | "tomorrow">(afterSchool ? "tomorrow" : "today");

  const plan = useMemo(
    () => (hourly?.length ? planSchoolDay(hourly, day === "today" ? todayStr : tomorrowStr, nowWall) : null),
    [hourly, day, todayStr, tomorrowStr, nowWall]
  );

  if (!plan || plan.slots.every((s) => s.mean === null)) return null;

  const summary =
    plan.moveIndoorCount > 0
      ? `${plan.moveIndoorCount} of ${plan.slots.filter((s) => !s.passed).length} remaining outdoor slots should move indoors.`
      : plan.slots.some((s) => !s.passed && s.advice === "Limit time outside")
        ? "Outdoor time is fine with care; keep it short for children with asthma."
        : plan.slots.every((s) => s.passed)
          ? "School day is over for today."
          : "Air looks fine for outdoor school activity.";

  return (
    <section className="card space-y-4 p-5 sm:p-7" aria-labelledby="school-planner-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="school-planner-title" className="text-base font-bold tracking-tight text-ink">
              School day planner
            </h2>
            <p className="text-xs text-ink-3">Should PE or playtime move indoors?</p>
          </div>
        </div>
        <div className="inline-flex gap-1 rounded-full bg-inset p-1" role="group" aria-label="School day">
          {(["today", "tomorrow"] as const).map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={day === d}
              onClick={() => setDay(d)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold capitalize transition ${
                day === d ? "bg-ink text-canvas" : "text-ink-2 hover:text-ink"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm font-semibold text-ink">{summary}</p>

      <ul className="space-y-2">
        {plan.slots.map(({ slot, mean, category, advice, passed }) => {
          const Icon = advice ? ADVICE_ICON[advice] : null;
          const fill = category ? CATEGORY_FILL[category] : null;
          return (
            <li
              key={slot.id}
              className={`flex items-center justify-between gap-3 rounded-2xl bg-inset px-3.5 py-3 ${passed ? "opacity-50" : ""}`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{slot.label}</p>
                <p className="tabular text-xs text-ink-3">
                  {wallToHour(`2000-01-01T${String(slot.start).padStart(2, "0")}`)} –{" "}
                  {wallToHour(`2000-01-01T${String(slot.end).padStart(2, "0")}`)}
                  {passed ? " · done" : ""}
                </p>
              </div>
              {mean !== null && category && advice && Icon && fill ? (
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`inline-flex items-center gap-1.5 text-sm font-bold ${ADVICE_TONE[advice]}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {advice}
                  </span>
                  <span
                    className="tabular rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold"
                    style={{ background: fill.fill, color: fill.on }}
                  >
                    {Math.round(mean)} µg/m³ · {category}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-ink-3">No forecast</span>
              )}
            </li>
          );
        })}
      </ul>

      {plan.cleanestHour && (
        <p className="text-xs leading-relaxed text-ink-2">
          Cleanest school hour {day === "today" ? "left today" : "tomorrow"}:{" "}
          <strong className="text-ink">
            {wallToHour(`2000-01-01T${String(plan.cleanestHour.hour).padStart(2, "0")}`)}
          </strong>{" "}
          (~{Math.round(plan.cleanestHour.pm25)} µg/m³). The best hour for the most active outdoor session.
        </p>
      )}
      <p className="text-[0.7rem] text-ink-3">
        Regional model forecast (~45 km), judged with the Sensitive thresholds because children are a sensitive group. General
        guidance, not medical advice.
      </p>
    </section>
  );
}
