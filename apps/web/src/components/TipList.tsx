import { CheckCircle2 } from "lucide-react";
import { formatTip, type Tip } from "@breeze/core";

interface TipListProps {
  tips: Tip[];
}

export function TipList({ tips }: TipListProps) {
  if (tips.length === 0) return null;

  return (
    <div className="w-full bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          What you should do
        </h2>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Actionable Tips
        </span>
      </div>

      <ul className="space-y-3">
        {tips.map((tip) => {
          const formatted = formatTip(tip);
          const [prefix, ...rest] = formatted.split(" — ");
          const body = rest.join(" — ");

          return (
            <li
              key={tip.id}
              className="flex items-start gap-3 text-sm text-slate-700 leading-relaxed bg-slate-50/60 p-3 rounded-xl border border-slate-100"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                {body ? (
                  <>
                    <strong className="text-slate-900 font-semibold">{prefix}</strong>
                    <span className="text-slate-700"> — {body}</span>
                  </>
                ) : (
                  <span>{formatted}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

