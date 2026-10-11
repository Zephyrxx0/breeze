import { useState } from "react";
import { Navigation, Loader2 } from "lucide-react";
import { reverseGeocode } from "../lib/geocode";

interface LocationButtonProps {
  onLocationFound: (loc: { lat: number; lon: number; name: string }) => void;
  onError: (msg: string) => void;
}

export function LocationButton({ onLocationFound, onError }: LocationButtonProps) {
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

  return (
    <button
      type="button"
      onClick={handleGetLocation}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3.5 py-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:text-slate-900 shadow-xs transition-colors shrink-0 disabled:opacity-50"
      title="Use my location"
      aria-label="Use my location"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
      ) : (
        <Navigation className="w-4 h-4 text-blue-600" />
      )}
      <span className="hidden sm:inline">Use my location</span>
    </button>
  );
}
