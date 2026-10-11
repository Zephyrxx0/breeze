import { useEffect, useRef, useState } from "react";
import { Printer, X } from "lucide-react";
import { Wordmark } from "./Logo";

interface PosterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  placeName: string;
  url: string;
}

/**
 * Printable noticeboard poster (school, RWA, workplace). Deliberately carries NO air numbers:
 * a printed page would go stale, so it only holds a QR code to the live verdict.
 */
export function PosterDialog({ isOpen, onClose, placeName, url }: PosterDialogProps) {
  const [qr, setQr] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setQr(null);
    setFailed(false);
    import("qrcode")
      .then((m) => m.toDataURL(url, { width: 640, margin: 1, errorCorrectionLevel: "M", color: { dark: "#0b1a20", light: "#ffffff" } }))
      .then((d) => !cancelled && setQr(d))
      .catch(() => !cancelled && setFailed(true));
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, url, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="poster-title"
      className="animate-fade fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#04141d]/60 p-4 backdrop-blur-sm print:static print:bg-transparent print:p-0"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-md space-y-4">
        <div className="flex items-center justify-between gap-2 print:hidden">
          <h2 id="poster-title" className="text-lg font-bold text-white">
            Noticeboard poster
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!qr}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0b1a20] disabled:opacity-50"
            >
              <Printer className="h-4 w-4" aria-hidden="true" /> Print
            </button>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close poster"
              className="rounded-full bg-white/15 p-2 text-white hover:bg-white/25"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="print-poster rounded-[2rem] bg-white p-8 text-center text-[#0b1a20] shadow-[var(--shadow-pop)] print:rounded-none print:shadow-none">
          <div className="mb-6 flex justify-center">
            <Wordmark />
          </div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#566b73]">Is the air outside OK today?</p>
          <h3 className="mt-2 font-display text-5xl leading-none">{placeName.split(",")[0]}</h3>
          <div className="mx-auto mt-6 grid aspect-square w-64 place-items-center rounded-2xl border border-black/10 p-2">
            {qr ? (
              <img src={qr} alt={`QR code linking to the live air quality verdict for ${placeName}`} className="h-full w-full" />
            ) : failed ? (
              <span className="px-4 text-sm text-[#566b73]">Could not generate the QR code.</span>
            ) : (
              <span className="text-sm text-[#566b73]">Generating…</span>
            )}
          </div>
          <p className="mt-6 text-xl font-semibold">Scan for today’s live verdict</p>
          <p className="mt-1 text-sm text-[#3d525a]">Good to go · Take care · Stay indoors if you can</p>
          <p className="mt-5 break-all text-xs text-[#566b73]">{url}</p>
          <p className="mt-4 text-[0.7rem] text-[#566b73]">
            Live data from Copernicus CAMS, OpenAQ and Open-Meteo. General guidance, not medical advice.
          </p>
        </div>
      </div>
    </div>
  );
}
