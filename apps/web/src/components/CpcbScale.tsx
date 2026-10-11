import { CATEGORY_FILL, CATEGORY_ORDER } from "../lib/theme";

/** Edges of the six CPCB PM2.5 bands (µg/m³). Severe is drawn up to 500 for the marker maths. */
const EDGES = [0, 30, 60, 90, 120, 250, 500];

/** 0..1 position of a PM2.5 value on a scale of six equal-width category segments. */
export function scalePosition(pm25: number): number {
  const v = Math.max(0, pm25);
  for (let i = 0; i < 6; i++) {
    if (v <= EDGES[i + 1]) return (i + (v - EDGES[i]) / (EDGES[i + 1] - EDGES[i])) / 6;
  }
  return 1;
}

/**
 * Six-segment CPCB scale with a marker. Decorative: the value and category are always
 * stated in text next to it, so the whole graphic is hidden from assistive tech.
 */
export function CpcbScale({ pm25 }: { pm25: number }) {
  const pos = scalePosition(pm25) * 100;
  return (
    <div aria-hidden="true" className="pt-1">
      <div className="relative">
        <div className="flex h-2.5 gap-[3px]">
          {CATEGORY_ORDER.map((c) => (
            <span key={c} className="h-full flex-1 first:rounded-l-full last:rounded-r-full" style={{ background: CATEGORY_FILL[c].fill }} />
          ))}
        </div>
        <span
          className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-surface bg-ink shadow-[0_2px_8px_rgb(0_0_0/0.35)] transition-[left] duration-700 ease-out"
          style={{ left: `${Math.min(98.5, Math.max(1.5, pos))}%` }}
        />
      </div>
      <div className="mt-1.5 flex gap-[3px] text-[0.65rem] font-medium tabular text-ink-3">
        {["0", "30", "60", "90", "120", "250+"].map((t) => (
          <span key={t} className="flex-1">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
