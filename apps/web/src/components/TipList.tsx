import {
  Activity as ActivityIcon,
  Anchor,
  Baby,
  HardHat,
  CloudRain,
  Droplets,
  Dumbbell,
  Flame,
  HeartPulse,
  Home,
  ShieldPlus,
  Sun,
  Sunrise,
  type LucideIcon,
} from "lucide-react";
import { ACTIVITY_LABELS, formatTip, type Activity, type Tip } from "@breeze/core";

interface TipListProps {
  tips: Tip[];
  activity?: Activity;
  onActivityChange?: (activity: Activity) => void;
}

const ACTIVITIES: Activity[] = ["everyday", "runner", "worker", "parent"];

const TIP_ICON: Record<string, LucideIcon> = {
  A1: ShieldPlus, // N95 mask
  A5: HeartPulse, // inhaler / medication
  A2: Dumbbell, // skip outdoor exercise
  A2b: Dumbbell,
  A3: Sunrise, // cleanest window
  A6: Sun, // UV
  A7: Droplets, // hydration
  A4: Home, // windows closed
  A8: CloudRain, // umbrella
  A9: Flame, // smoke
  R1: ActivityIcon,
  R2: ActivityIcon,
  R3: ActivityIcon,
  R4: ActivityIcon,
  W1: HardHat,
  W2: HardHat,
  W3: HardHat,
  K0: Baby,
  K1: Baby,
  K2: Baby,
  K3: Baby,
};

export function TipList({ tips, activity = "everyday", onActivityChange }: TipListProps) {
  if (tips.length === 0 && !onActivityChange) return null;

  return (
    <div className="card space-y-4 p-5 sm:p-7">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-bold tracking-tight text-ink">What you should do</h2>
        <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-ink-3">Actionable tips</span>
      </div>

      {onActivityChange && (
        <div role="group" aria-label="Tips for" className="-mt-1 flex flex-wrap gap-1.5">
          {ACTIVITIES.map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={activity === a}
              onClick={() => onActivityChange(a)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                activity === a
                  ? "border-transparent bg-ink text-canvas"
                  : "border-line-strong text-ink-2 hover:border-accent hover:text-ink"
              }`}
            >
              {ACTIVITY_LABELS[a]}
            </button>
          ))}
        </div>
      )}

      {tips.length === 0 && (
        <p className="rounded-2xl bg-inset p-4 text-sm text-ink-2">
          Nothing special to do right now. Conditions don’t trigger any precautions.
        </p>
      )}

      <ul className="space-y-2.5">
        {tips.map((tip, i) => {
          const formatted = formatTip(tip);
          const [prefix, ...rest] = formatted.split(" — ");
          const body = rest.join(" — ");
          const Icon = TIP_ICON[tip.id] ?? Anchor;

          return (
            <li
              key={tip.id}
              className="animate-rise flex items-start gap-3.5 rounded-2xl bg-inset p-3.5 text-sm leading-relaxed text-ink-2"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                <Icon className="h-[1.1rem] w-[1.1rem]" aria-hidden="true" />
              </span>
              <div className="min-w-0 pt-0.5">
                {body ? (
                  <>
                    <strong className="block text-[0.72rem] font-bold tracking-wide text-ink-3">{prefix}</strong>
                    <span className="text-ink">{body}</span>
                  </>
                ) : (
                  <span className="text-ink">{formatted}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
