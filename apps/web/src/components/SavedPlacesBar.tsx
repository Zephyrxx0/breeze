import { X, Bookmark } from "lucide-react";
import type { SavedPlace } from "../hooks/useSavedPlaces";

interface SavedPlacesBarProps {
  places: SavedPlace[];
  currentLat: number;
  currentLon: number;
  onSelectPlace: (place: { lat: number; lon: number; name: string }) => void;
  onRemovePlace: (place: SavedPlace) => void;
}

export function SavedPlacesBar({ places, currentLat, currentLon, onSelectPlace, onRemovePlace }: SavedPlacesBarProps) {
  if (places.length === 0) return null;

  return (
    <div
      data-testid="saved-places-bar"
      className="hide-scrollbar flex w-full items-center gap-2 overflow-x-auto py-1"
      role="region"
      aria-label="Saved places"
    >
      <span className="flex shrink-0 items-center gap-1.5 pl-1 text-[0.68rem] font-bold uppercase tracking-wider text-ink-3">
        <Bookmark className="h-3 w-3" aria-hidden="true" />
        Saved
      </span>
      {places.map((place) => {
        const isActive = Math.abs(place.lat - currentLat) < 0.02 && Math.abs(place.lon - currentLon) < 0.02;

        return (
          <div
            key={`${place.lat}-${place.lon}`}
            data-active={isActive}
            className={`inline-flex shrink-0 items-center rounded-full border text-[0.8rem] transition ${
              isActive
                ? "border-accent bg-accent-soft font-bold text-accent"
                : "border-line-strong bg-surface/70 font-medium text-ink-2 hover:bg-surface hover:text-ink"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectPlace(place)}
              aria-current={isActive ? "true" : undefined}
              className="rounded-l-full py-1.5 pl-3.5 pr-2"
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
              className="rounded-r-full py-1.5 pl-0.5 pr-2.5 text-ink-3 hover:text-ink"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
