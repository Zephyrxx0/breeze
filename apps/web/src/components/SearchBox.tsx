import React, { useState, useEffect, useRef, useId } from "react";
import { Search, MapPin, X, Bookmark, Loader2, TriangleAlert } from "lucide-react";
import { searchPlaces, type GeocodeResult } from "../lib/geocode";

interface SearchBoxProps {
  currentPlace: string;
  onSelectPlace: (place: { lat: number; lon: number; name: string }) => void;
  errorMessage?: string | null;
  onClearError?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  isSaved?: boolean;
  onToggleSave?: () => void;
  /** Larger input for the empty/welcome state */
  size?: "default" | "large";
}

export function SearchBox({
  currentPlace,
  onSelectPlace,
  errorMessage,
  onClearError,
  inputRef,
  isSaved,
  onToggleSave,
  size = "default",
}: SearchBoxProps) {
  const [query, setQuery] = useState(currentPlace);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const activeInputRef = inputRef || internalInputRef;
  const listId = useId();

  // Sync query text with external place changes
  useEffect(() => {
    setQuery(currentPlace);
  }, [currentPlace]);

  // Debounced search (250 ms, ≥ 2 characters — FR-01)
  useEffect(() => {
    if (!isOpen || query.trim().length < 2) {
      setResults([]);
      setSearched(false);
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
        setSearched(true);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  // Dismiss on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery(currentPlace);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [currentPlace]);

  const handleSelect = (place: GeocodeResult) => {
    const label = place.admin1 ? `${place.name}, ${place.admin1}` : place.name;
    setQuery(label);
    setIsOpen(false);
    if (onClearError) onClearError();
    onSelectPlace({ lat: place.latitude, lon: place.longitude, name: label });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setQuery(currentPlace);
      return;
    }
    if (!isOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSelect(results[selectedIndex >= 0 ? selectedIndex : 0]);
    }
  };

  const large = size === "large";
  const showList = isOpen && query.trim().length >= 2 && (loading || results.length > 0 || searched);

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative flex items-center">
        <Search
          className={`pointer-events-none absolute text-ink-3 ${large ? "left-5 h-5 w-5" : "left-4 h-[1.15rem] w-[1.15rem]"}`}
          aria-hidden="true"
        />
        <input
          ref={activeInputRef}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={selectedIndex >= 0 ? `${listId}-${selectedIndex}` : undefined}
          autoComplete="off"
          value={query}
          aria-label="Search city or town in India"
          placeholder="Search a city or town in India…"
          className={`w-full rounded-full border border-line-strong bg-surface text-ink shadow-[var(--shadow-card)] placeholder:text-ink-3 transition focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 ${
            large ? "py-4 pl-13 pr-24 text-lg" : "h-12 pl-11 pr-24 text-base"
          } font-medium`}
          onFocus={(e) => {
            e.target.select();
            if (onClearError) onClearError();
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        <div className="absolute right-2 flex items-center gap-0.5">
          {loading && <Loader2 className="mr-1 h-4 w-4 animate-spin text-ink-3" aria-hidden="true" />}
          {query && !loading && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                setResults([]);
                setSearched(false);
                activeInputRef.current?.focus();
              }}
              className="rounded-full p-1.5 text-ink-3 transition hover:bg-inset hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          {onToggleSave && (
            <button
              type="button"
              aria-label={isSaved ? "Remove from saved places" : "Save this place"}
              aria-pressed={!!isSaved}
              data-testid="bookmark-place-button"
              onClick={onToggleSave}
              className={`rounded-full p-2 transition ${
                isSaved ? "bg-accent-soft text-accent" : "text-ink-3 hover:bg-inset hover:text-ink"
              }`}
            >
              <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Geolocation / bounds inline error banner */}
      {errorMessage && (
        <div role="alert" className="mt-2.5 flex items-center gap-2 rounded-2xl border border-care/50 bg-care/15 px-4 py-2.5 text-sm font-medium text-[#6b4500] dark:text-[#ffd27a]">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Dropdown Results */}
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="animate-fade absolute left-0 right-0 z-50 mt-2 max-h-80 overflow-y-auto rounded-3xl border border-line bg-surface p-1.5 shadow-[var(--shadow-pop)]"
        >
          {loading && results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-ink-3">Searching places in India…</li>
          ) : results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-ink-3">No places found in India for “{query.trim()}”. Try another spelling.</li>
          ) : (
            results.map((place, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <li key={`${place.id}-${idx}`} role="option" id={`${listId}-${idx}`} aria-selected={isSelected}>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => handleSelect(place)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left text-sm transition ${
                      isSelected ? "bg-accent-soft text-ink" : "text-ink-2 hover:bg-inset"
                    }`}
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
                    <span className="truncate">
                      <span className="font-semibold text-ink">{place.name}</span>
                      {place.admin1 ? `, ${place.admin1}` : ""}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
