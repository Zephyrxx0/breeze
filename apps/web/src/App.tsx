import { useState, useRef, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  bestWindow,
  buildTips,
  confidenceFor,
  wallFromInstant,
  type EffectivePm25,
} from "@breeze/core";
import { Info } from "lucide-react";
import { useLocationParams } from "./hooks/useLocationParams";
import { useAssessment } from "./hooks/useAssessment";
import { useSavedPlaces } from "./hooks/useSavedPlaces";
import { SearchBox } from "./components/SearchBox";
import { LocationButton } from "./components/LocationButton";
import { SavedPlacesBar } from "./components/SavedPlacesBar";
import { AboutModal } from "./components/AboutModal";
import { Toast } from "./components/Toast";
import { Skeletons } from "./components/Skeletons";
import { ErrorCard } from "./components/ErrorCard";
import { VerdictHero } from "./components/VerdictHero";
import { ForecastChart } from "./components/ForecastChart";
import { BestWindowChip } from "./components/BestWindowChip";
import { TipList } from "./components/TipList";
import { WeatherStrip } from "./components/WeatherStrip";
import { ProvenanceFooter } from "./components/ProvenanceFooter";

const queryClient = new QueryClient();

export function MainView() {
  const { lat, lon, name, isOutOfCoverage, setLocation } = useLocationParams();
  const [geoError, setGeoError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { places, isCurrentSaved, toggleSaveCurrent, removePlace } = useSavedPlaces({
    lat,
    lon,
    name,
  });

  const handleBookmarkToggle = () => {
    const res = toggleSaveCurrent();
    if (res.action === "saved") {
      setToastMessage(`Saved ${name} to quick places`);
    } else if (res.action === "removed") {
      setToastMessage(`Removed ${name} from quick places`);
    } else if (res.action === "limit_reached") {
      setToastMessage("Maximum 5 places saved. Remove one to save another.");
    }
  };

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    const roundedLat = Math.round(lat * 100) / 100;
    const roundedLon = Math.round(lon * 100) / 100;
    const url = `${window.location.origin}/?lat=${roundedLat}&lon=${roundedLon}&n=${encodeURIComponent(name)}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setToastMessage("Link copied to clipboard!");
        setAnnouncement("Link copied to clipboard!");
      })
      .catch(() => {
        setToastMessage("Could not copy link");
      });
  };

  // Profile state: hydrated synchronously from localStorage, strictly validated
  const [profile, setProfile] = useState<"standard" | "sensitive">(() => {
    try {
      const stored = localStorage.getItem("breeze:profile");
      return stored === "sensitive" ? "sensitive" : "standard";
    } catch {
      return "standard";
    }
  });

  const handleProfileChange = (newProfile: "standard" | "sensitive") => {
    setProfile(newProfile);
    try {
      localStorage.setItem("breeze:profile", newProfile);
    } catch {
      // Ignore localStorage write failures
    }
  };

  const handleAnnounce = (msg: string) => {
    setAnnouncement(msg);
  };

  const { data, isLoading, isError, refetch } = useAssessment(lat, lon, !isOutOfCoverage);

  const handleSelectPlace = (place: { lat: number; lon: number; name: string }) => {
    setGeoError(null);
    setLocation(place);
  };

  const handleGeoError = (msg: string) => {
    setGeoError(msg);
    searchInputRef.current?.focus();
  };

  const assessmentDetails = useMemo(() => {
    if (!data?.air?.current || data.air.status === "unavailable") return null;

    const current = data.air.current;
    const nowMs = Date.now();
    const conf = confidenceFor({
      source: current.source,
      distanceKm: current.station?.distanceKm,
    });

    const effectivePm25: EffectivePm25 = {
      pm25: current.pm25,
      source: current.source,
      measuredAt: current.measuredAt,
      station: current.station,
      modelDistanceNote: current.modelDistanceNote,
      confidence: conf,
    };

    const hourlyAir = (data.air.model?.hourly ?? []).map((h) => ({
      time: h.time,
      pm25: h.pm25,
      pm10: h.pm10,
    }));

    const currentWall = wallFromInstant(nowMs, data.location.utcOffsetSeconds);
    const cleanestWindow = bestWindow(hourlyAir, currentWall);

    const weatherFirst = data.weather?.hourly?.[0];
    const uv = weatherFirst?.uvIndex ?? data.weather?.daily?.uvIndexMax?.[0];
    const feelsLikeC = weatherFirst?.apparentTemperature;
    const rainProbNext6h = weatherFirst?.precipitationProbability;

    const tips = buildTips(
      {
        effectivePm25,
        window: cleanestWindow,
        uv,
        feelsLikeC,
        rainProbNext6h,
      },
      profile
    );

    return {
      cleanestWindow,
      tips,
    };
  }, [data, profile]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center">
      <header className="w-full max-w-xl px-4 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tight text-blue-600">Breeze</span>
          <span className="text-xs px-2 py-0.5 font-semibold bg-blue-100 text-blue-800 rounded-full">India</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsAboutOpen(true)}
            data-testid="header-about-button"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 px-2 py-1 rounded-lg hover:bg-slate-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer transition-colors"
          >
            <Info className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
            <span>About</span>
          </button>
          <div className="text-xs text-slate-400 font-medium hidden sm:inline">Live air verdict</div>
        </div>
      </header>

      <main className="w-full max-w-xl px-4 py-3 space-y-4 flex-1">
        {/* Visually-Hidden Screen Reader Live Announcer Region */}
        <div
          className="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-testid="aria-announcer"
        >
          {announcement}
        </div>

        {/* Search & Location Bar */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <SearchBox
              currentPlace={name}
              onSelectPlace={handleSelectPlace}
              errorMessage={geoError || (isOutOfCoverage ? "Breeze covers India only (lat 6–38, lon 68–98.5)." : null)}
              onClearError={() => setGeoError(null)}
              inputRef={searchInputRef}
              isSaved={isCurrentSaved}
              onToggleSave={handleBookmarkToggle}
            />
            <LocationButton
              onLocationFound={handleSelectPlace}
              onError={handleGeoError}
            />
          </div>

          {/* Saved Places Chips Bar */}
          <SavedPlacesBar
            places={places}
            currentLat={lat}
            currentLon={lon}
            onSelectPlace={handleSelectPlace}
            onRemovePlace={removePlace}
          />
        </div>

        {/* Content States */}
        {isOutOfCoverage ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-2">
            <h3 className="font-bold text-amber-900">Breeze covers India</h3>
            <p className="text-sm text-amber-800">
              Selected coordinates ({lat.toFixed(2)}, {lon.toFixed(2)}) fall outside India&apos;s coverage area. Please choose a location within India.
            </p>
          </div>
        ) : isLoading ? (
          <Skeletons />
        ) : isError || !data?.air?.current || data.air.status === "unavailable" || !assessmentDetails ? (
          <ErrorCard onRetry={() => refetch()} />
        ) : (
          <div className="space-y-4" id="assessment-content">
            <VerdictHero
              data={data}
              profile={profile}
              onProfileChange={handleProfileChange}
              onAnnounce={handleAnnounce}
              onCopyLink={handleCopyLink}
            />
            {data.air.model?.hourly && data.air.model.hourly.length > 0 && (
              <ForecastChart
                hourly={data.air.model.hourly}
                utcOffsetSeconds={data.location.utcOffsetSeconds}
              />
            )}
            {data.air.model?.hourly && data.air.model.hourly.length > 0 && (
              <BestWindowChip window={assessmentDetails.cleanestWindow} />
            )}
            <TipList tips={assessmentDetails.tips} />
            {data.weather && data.weather.status !== "unavailable" && (
              <WeatherStrip weather={data.weather} />
            )}
            <ProvenanceFooter
              data={data}
              onOpenAbout={() => setIsAboutOpen(true)}
            />
          </div>
        )}
      </main>

      {/* Floating Feedback Toast */}
      <Toast
        message={toastMessage}
        onDismiss={() => setToastMessage(null)}
      />

      {/* About & Data Sources Modal */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainView />
    </QueryClientProvider>
  );
}

export default App;
