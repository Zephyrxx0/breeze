import { useState } from "react";
import { Navigation, Loader2 } from "lucide-react";
import { reverseGeocode } from "../lib/geocode";

interface LocationButtonProps {
  onLocationFound: (loc: { lat: number; lon: number; name: string }) => void;
  onError: (msg: string) => void;
  /** Visual treatment: compact icon pill next to search, or a larger standalone button */
  variant?: "compact" | "large";
}

export function LocationButton({ onLocationFound, onError, variant = "compact" }: LocationButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      onError("Geolocation is not supported by your browser. Please search above.");
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        try {
          const rev = await reverseGeocode(lat, lon);
          const name = rev.city || rev.locality || rev.principalSubdivision || "Your location";
          onLocationFound({ lat, lon, name });
        } catch {
          onLocationFound({ lat, lon, name: "Your location" });
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          onError("Location access denied. Please type a city above.");
        } else if (err.code === err.TIMEOUT) {
          onError("Location request timed out. Please type a city above.");
        } else {
          onError("Unable to retrieve location. Please type a city above.");
        }
      },
      { timeout: 8000, maximumAge: 60000, enableHighAccuracy: false }
    );
  };

  const large = variant === "large";

  return (
    <button
      type="button"
      onClick={handleGetLocation}
      disabled={loading}
      className={
        large
          ? "inline-flex items-center justify-center gap-2.5 rounded-full bg-ink px-6 py-3.5 text-sm font-semibold text-canvas shadow-[0_14px_30px_-14px_rgb(12_26_32/0.6)] transition hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
          : "inline-flex h-12 shrink-0 items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-sm font-semibold text-ink shadow-[var(--shadow-card)] transition hover:border-accent disabled:opacity-60"
      }
      title="Use my location"
      aria-label="Use my location"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Navigation className={large ? "h-4 w-4" : "h-4 w-4 text-accent"} aria-hidden="true" />
      )}
      <span className={large ? "" : "hidden sm:inline"}>Use my location</span>
    </button>
  );
}
