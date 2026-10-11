import React, { useEffect, useRef } from "react";
import { X, ShieldCheck, Info } from "lucide-react";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const H3 = "flex items-center gap-2 text-base font-bold text-ink";
const DOT = "h-2 w-2 rounded-full bg-accent";

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    // Body scroll lock
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      // Minimal focus trap
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-dialog-title"
      data-testid="about-dialog-modal"
      className="animate-fade fixed inset-0 z-50 flex items-end justify-center bg-[#04141d]/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="animate-rise flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[2rem] border border-line bg-surface shadow-[var(--shadow-pop)] sm:rounded-[2rem]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent-soft text-accent">
              <Info className="h-4 w-4" aria-hidden="true" />
            </span>
            <h2 id="about-dialog-title" className="text-lg font-bold tracking-tight text-ink">
              About Breeze &amp; Data Sources
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-full p-2 text-ink-3 transition hover:bg-inset hover:text-ink"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Educational Body */}
        <div className="space-y-6 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-ink-2">
          <section className="space-y-2">
            <h3 className={H3}>
              <span className={DOT}></span>
              1. Plain Verdicts &amp; PM2.5 (Why not AQI?)
            </h3>
            <p>
              Most air apps show a single composite number called <strong className="text-ink">AQI</strong>. In India,{" "}
              <strong className="text-ink">PM2.5</strong> (fine particles &le; 2.5 micrometres) is the dominant pollutant that
              reaches deep into lungs and the bloodstream.
            </p>
            <p>Breeze reads PM2.5 directly in &mu;g/m&sup3; and turns it into three plain verdicts:</p>
            <ul className="list-disc space-y-1 pl-5 marker:text-ink-3">
              <li>
                <strong className="text-ink">Good to go:</strong> clean air; fine for workouts, commuting and open windows.
              </li>
              <li>
                <strong className="text-ink">Take care:</strong> moderate particle levels; sensitive people should ease off strenuous outdoor activity.
              </li>
              <li>
                <strong className="text-ink">Stay indoors if you can:</strong> high pollution; keep windows closed, run a purifier, wear an N95/FFP2 outdoors.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className={H3}>
              <span className={DOT}></span>
              2. Ground Stations vs. Regional Model (~45 km)
            </h3>
            <p>Breeze states where every number comes from:</p>
            <div className="space-y-2 text-xs">
              <div className="space-y-1 rounded-2xl bg-inset p-3.5">
                <span className="font-bold text-ink">Ground monitors (CPCB / OpenAQ)</span>
                <p>
                  Real instruments run by pollution-control boards. When one is within 25 km and its reading is under 3 hours old,
                  Breeze shows its name, distance and age.
                </p>
              </div>
              <div className="space-y-1 rounded-2xl bg-inset p-3.5">
                <span className="font-bold text-ink">Regional model (Copernicus CAMS, ~45 km)</span>
                <p>
                  An atmospheric simulation at 0.4&deg; resolution. It covers places with no monitor, but describes a whole
                  region, not your street. Forecasts always come from this model.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className={H3}>
              <span className={DOT}></span>
              3. Honest Confidence Ratings
            </h3>
            <p>We would rather show uncertainty than invent certainty:</p>
            <ul className="space-y-2 text-xs">
              <li className="flex items-start gap-2.5">
                <span className="shrink-0 rounded-md bg-go/15 px-2 py-0.5 font-bold text-[#0b6b52] dark:text-[#5fe0b9]">High</span>
                <span>A monitoring station within 5 km, reading less than an hour old.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="shrink-0 rounded-md bg-accent-soft px-2 py-0.5 font-bold text-accent">Medium</span>
                <span>A station within 25 km (further away or older readings).</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="shrink-0 rounded-md bg-care/20 px-2 py-0.5 font-bold text-[#7a4f00] dark:text-[#ffd27a]">Low</span>
                <span>Regional model estimate only; no usable station nearby.</span>
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className={H3}>
              <span className={DOT}></span>
              4. Data Providers &amp; Licensing
            </h3>
            <p>Every number on screen is a live API call with a timestamp; nothing is mocked.</p>
            <ul className="list-disc space-y-1 pl-5 text-xs marker:text-ink-3">
              <li>
                <strong className="text-ink">Copernicus Atmosphere Monitoring Service (CAMS):</strong> air-quality model data (CC BY 4.0).
              </li>
              <li>
                <strong className="text-ink">Open-Meteo:</strong> air-quality and weather APIs, UV index, place search (CC BY 4.0).
              </li>
              <li>
                <strong className="text-ink">OpenAQ &amp; CPCB:</strong> open ground-monitor network.
              </li>
              <li>
                <strong className="text-ink">BigDataCloud:</strong> reverse geocoding to name your GPS location.
              </li>
            </ul>
          </section>

          <div className="flex items-start gap-2.5 rounded-2xl border border-care/50 bg-care/15 p-3.5 text-xs text-[#5c3d00] dark:text-[#ffe2a3]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              <strong>Disclaimer:</strong> Breeze gives general environmental guidance for everyday outdoor decisions, not individual
              medical advice. If you have a chronic respiratory or cardiac condition, follow your physician&apos;s recommendations.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-line bg-inset/60 p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-canvas transition hover:opacity-90"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
