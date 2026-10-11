import React, { useEffect, useRef } from "react";
import { X, ExternalLink, ShieldCheck, Info } from "lucide-react";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus close button on open
    closeButtonRef.current?.focus();

    // Body scroll lock
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Escape listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-dialog-title"
      data-testid="about-dialog-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-lg max-h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 focus-visible:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600" aria-hidden="true" />
            <h2 id="about-dialog-title" className="text-lg font-black tracking-tight text-slate-900">
              About Breeze &amp; Data Sources
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Educational Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-6 text-sm text-slate-600 leading-relaxed">
          {/* Section 1: Plain Verdicts & PM2.5 */}
          <section className="space-y-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              1. Plain Verdicts &amp; PM2.5 (Why not AQI?)
            </h3>
            <p>
              Most air apps show a single composite number called <strong>AQI</strong> (Air Quality Index). But in India, <strong>PM2.5</strong> (fine inhalable particulate matter &le; 2.5 micrometres) is the overwhelmingly dominant pollutant that penetrates deep into lungs and the bloodstream.
            </p>
            <p>
              Breeze focuses on PM2.5 directly in &mu;g/m&sup3; and translates it into three plain-language daily verdicts:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-700">
              <li><strong>Good to go:</strong> Clean air; ideal for outdoor workouts, commuting, and opening windows.</li>
              <li><strong>Take care:</strong> Moderate particulate levels; sensitive individuals should reduce strenuous outdoor activity.</li>
              <li><strong>Stay indoors if you can:</strong> High pollution; keep windows closed, run purifiers, and wear N95/FFP2 masks outdoors.</li>
            </ul>
          </section>

          {/* Section 2: Stations vs Regional Model */}
          <section className="space-y-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              2. Ground Stations vs. Regional Model (~45 km)
            </h3>
            <p>
              Breeze always labels the exact provenance of every number:
            </p>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                <span className="font-bold text-slate-900">Physical Ground Monitors (CPCB / OpenAQ):</span>
                <p className="text-slate-600">Real continuous measurement sensors installed by pollution control boards. When one is within 30 km, Breeze displays the station name, distance, and reading age.</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                <span className="font-bold text-slate-900">Regional Model (~45 km Copernicus CAMS):</span>
                <p className="text-slate-600">Satellite and atmospheric simulation from the European CAMS Global model at 0.4&deg; resolution (~45 km grid cell). It provides complete coverage across rural and tier-2/3 India where no physical monitor exists, but represents a regional average rather than street-level microclimate.</p>
              </div>
            </div>
          </section>

          {/* Section 3: Confidence Ratings */}
          <section className="space-y-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              3. Honest Confidence Ratings
            </h3>
            <p>
              We believe in fail-soft transparency rather than invented certainty:
            </p>
            <ul className="space-y-1.5 text-xs">
              <li className="flex items-start gap-2">
                <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 shrink-0">High</span>
                <span>Active physical ground station located within 15 km of your selected place.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-800 shrink-0">Medium</span>
                <span>Physical station located 15–30 km away, or model alignment with regional conditions.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="px-2 py-0.5 rounded font-bold bg-blue-100 text-blue-800 shrink-0">Low</span>
                <span>Pure regional model estimate (~45 km grid) with no physical sensor nearby.</span>
              </li>
            </ul>
          </section>

          {/* Section 4: Data Providers & Attribution */}
          <section className="space-y-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              4. Data Providers &amp; Licensing
            </h3>
            <p>
              Breeze runs on 100% live upstream APIs with zero fake numbers or mock fixtures:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-700">
              <li><strong>Copernicus Atmosphere Monitoring Service (CAMS):</strong> Air quality forecasts and global atmospheric data (CC BY 4.0).</li>
              <li><strong>Open-Meteo:</strong> Weather forecasts, solar radiation, UV index, and API delivery.</li>
              <li><strong>OpenAQ &amp; CPCB:</strong> Real-time open ground air monitoring network.</li>
              <li><strong>BigDataCloud:</strong> Reverse geocoding for GPS coordinate labelling.</li>
            </ul>
          </section>

          {/* Medical Disclaimer */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200/60 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              <strong>Disclaimer:</strong> Breeze provides general environmental guidance for daily outdoor decisions, not individual medical advice. Individuals with chronic respiratory or cardiac conditions should follow their physician&apos;s recommendations.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
