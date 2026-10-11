import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, X, Bookmark } from "lucide-react";
import { searchPlaces, type GeocodeResult } from "../lib/geocode";

interface SearchBoxProps {
  currentPlace: string;
  onSelectPlace: (place: { lat: number; lon: number; name: string }) => void;
  errorMessage?: string | null;
  onClearError?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  isSaved?: boolean;
  onToggleSave?: () => void;
}

export function SearchBox({
  currentPlace,
  onSelectPlace,
  errorMessage,
  onClearError,
  inputRef,
  isSaved,
  onToggleSave,
}: SearchBoxProps) {
  const [query, setQuery] = useState(currentPlace);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const activeInputRef = inputRef || internalInputRef;

  // Sync query text with external place changes
  useEffect(() => {
    setQuery(currentPlace);
  }, [currentPlace]);

  // Debounced search (300ms)
  useEffect(() => {
    if (!isOpen || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const places = await searchPlaces(query);
        setResults(places.slice(0, 8));
        setSelectedIndex(-1);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  // Dismiss on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        activeInputRef.current &&
        !activeInputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setQuery(currentPlace);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [currentPlace, activeInputRef]);

  const handleSelect = (place: GeocodeResult) => {
    const label = place.admin1 ? `${place.name}, ${place.admin1}` : place.name;
    setQuery(label);
    setIsOpen(false);
    if (onClearError) onClearError();
    onSelectPlace({
      lat: place.latitude,
      lon: place.longitude,
      name: label,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setQuery(currentPlace);
    }
  };

  return (
    <div className="w-full relative">
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
        <input
          ref={activeInputRef}
          type="text"
          value={query}
          aria-label="Search city or town in India"
          placeholder="Search place in India..."
          className="w-full pl-11 pr-18 py-3 bg-white border border-slate-200 rounded-xl shadow-xs text-slate-900 placeholder-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 transition-all font-medium text-base"
          onFocus={() => {
            setQuery("");
            setIsOpen(true);
            if (onClearError) onClearError();
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                setResults([]);
                activeInputRef.current?.focus();
              }}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {onToggleSave && (
            <button
              type="button"
              aria-label={isSaved ? "Remove from saved places" : "Save this place"}
              data-testid="bookmark-place-button"
              onClick={onToggleSave}
              className={`p-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                isSaved
                  ? "text-blue-600 bg-blue-50 hover:bg-blue-100"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? "fill-blue-600" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {/* Geolocation / bounds inline error banner */}
      {errorMessage && (
        <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-center gap-2">
          <span>⚠️ {errorMessage}</span>
        </div>
      )}

      {/* Dropdown Results */}
      {isOpen && (results.length > 0 || loading) && (
        <div
          ref={dropdownRef}
          className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg max-h-72 overflow-y-auto py-1"
        >
          {loading && results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500">Searching places in India...</div>
          ) : (
            results.map((place, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={`${place.id}-${idx}`}
                  type="button"
                  onClick={() => handleSelect(place)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-sm transition-colors ${
                    isSelected ? "bg-blue-50 text-blue-950 font-medium" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">
                    <span className="font-semibold text-slate-900">{place.name}</span>
                    {place.admin1 ? `, ${place.admin1}` : ""}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

