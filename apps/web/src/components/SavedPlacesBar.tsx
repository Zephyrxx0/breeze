import { X, MapPin } from "lucide-react";
import type { SavedPlace } from "../hooks/useSavedPlaces";

interface SavedPlacesBarProps {
  places: SavedPlace[];
  currentLat: number;
  currentLon: number;
  onSelectPlace: (place: { lat: number; lon: number; name: string }) => void;
  onRemovePlace: (place: SavedPlace) => void;
}

export function SavedPlacesBar({
  places,
  currentLat,
  currentLon,
  onSelectPlace,
  onRemovePlace,
}: SavedPlacesBarProps) {
  if (places.length === 0) return null;

  return (
    <div
      data-testid="saved-places-bar"
      className="w-full flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1"
      role="region"
      aria-label="Saved places"
    >
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 pl-1 shrink-0 flex items-center gap-1">
        <MapPin className="w-3 h-3" aria-hidden="true" />
        Saved:
      </span>
      {places.map((place) => {
        const isActive =
          Math.abs(place.lat - currentLat) < 0.02 && Math.abs(place.lon - currentLon) < 0.02;

        return (
          <div
            key={`${place.lat}-${place.lon}`}
            className={`inline-flex items-center rounded-full text-xs transition-all shrink-0 border ${
              isActive
                ? "bg-blue-50 border-blue-600 text-blue-900 font-bold shadow-2xs"
                : "bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectPlace(place)}
              className="px-2.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-l-full"
            >
              {place.name}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemovePlace(place);
              }}
              aria-label={`Remove ${place.name} from saved places`}
              className="pr-2 pl-0.5 py-1 text-slate-400 hover:text-slate-700 rounded-r-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <X className="w-3 h-3" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
