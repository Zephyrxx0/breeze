import { lazy, Suspense, useState, useRef, useMemo, useEffect } from "react";
import { ArrowUpRight, Info, MapPin, WifiOff } from "lucide-react";
import type { Activity } from "@breeze/core";
import { useLocationParams } from "../hooks/useLocationParams";
import { useAssessment } from "../hooks/useAssessment";
import { useSavedPlaces } from "../hooks/useSavedPlaces";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { SearchBox } from "../components/SearchBox";
import { LocationButton } from "../components/LocationButton";
import { SavedPlacesBar } from "../components/SavedPlacesBar";
import { AboutModal } from "../components/AboutModal";
import { Toast } from "../components/Toast";
import { Skeletons } from "../components/Skeletons";
import { ErrorCard } from "../components/ErrorCard";
import { VerdictHero } from "../components/VerdictHero";
import { BestWindowChip } from "../components/BestWindowChip";
import { TipList } from "../components/TipList";
import { WeatherStrip } from "../components/WeatherStrip";
import { ProvenanceFooter } from "../components/ProvenanceFooter";
import { ShareCard } from "../components/ShareCard";
import { SchoolPlanner } from "../components/SchoolPlanner";
import { PosterDialog } from "../components/PosterDialog";
import { IndiaMapPanel } from "../components/IndiaMapPanel";
import { Wordmark } from "../components/Logo";
import { captureAndShareCard } from "../lib/shareCardCapture";
import { deriveAssessment } from "../lib/assessment";
import { instantToPlaceClock } from "../lib/format";
import { CITIES, POPULAR_CITY_IDS } from "../lib/cities";
import { handleNavClick } from "../lib/route";
import { VERDICT_THEMES } from "../lib/theme";

// Bklit chart stack (visx + motion) is fetched only once there is data to draw.
const ForecastChart = lazy(() => import("../components/ForecastChart").then((m) => ({ default: m.ForecastChart })));

function ChartFallback() {
  return (
    <div className="card h-[26rem] animate-pulse p-6" aria-busy="true" aria-label="Loading forecast chart">
      <div className="mb-4 h-4 w-36 rounded-lg bg-ink/10" />
      <div className="h-80 rounded-2xl bg-ink/[0.06]" />
    </div>
  );
}

const DEFAULT_TINT = "20 99 154";

function canonicalUrl(lat: number, lon: number, name: string): string {
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLon = Math.round(lon * 100) / 100;
  return `${window.location.origin}/?lat=${roundedLat}&lon=${roundedLon}&n=${encodeURIComponent(name)}`;
}

function Welcome({
  onSelectPlace,
  onGeoError,
  geoError,
  clearGeoError,
  searchInputRef,
}: {
  onSelectPlace: (p: { lat: number; lon: number; name: string }) => void;
  onGeoError: (msg: string) => void;
  geoError: string | null;
  clearGeoError: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const popular = POPULAR_CITY_IDS.map((id) => CITIES.find((c) => c.id === id)!).filter(Boolean);
  return (
    <section className="grid items-center gap-10 py-4 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:py-10" aria-label="Choose a place">
      <div className="space-y-7">
        <div className="space-y-4">
          <h1 className="animate-rise text-balance font-display text-[clamp(2.8rem,7vw,5rem)] leading-[0.95] tracking-tight text-ink">
            Where are you <span className="italic text-accent">breathing</span> today?
          </h1>
          <p className="animate-rise max-w-md text-base leading-relaxed text-ink-2 sm:text-lg" style={{ animationDelay: "80ms" }}>
            Search any place in India, or use your location. You’ll get one honest verdict and what to do about it.
          </p>
        </div>

        <div className="animate-rise space-y-3" style={{ animationDelay: "160ms" }}>
          <SearchBox
            size="large"
            currentPlace=""
            onSelectPlace={onSelectPlace}
            errorMessage={geoError}
            onClearError={clearGeoError}
            inputRef={searchInputRef}
          />
          <div className="flex flex-wrap items-center gap-3">
            <LocationButton variant="large" onLocationFound={onSelectPlace} onError={onGeoError} />
            <span className="text-xs text-ink-3">Your location is only used when you tap this.</span>
          </div>
        </div>

        <div className="animate-rise space-y-2.5" style={{ animationDelay: "240ms" }}>
          <p className="text-[0.7rem] font-bold uppercase tracking-wider text-ink-3">Popular cities</p>
          <ul className="flex flex-wrap gap-2">
            {popular.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelectPlace({ lat: c.lat, lon: c.lon, name: c.name })}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface/70 px-3.5 py-2 text-sm font-semibold text-ink-2 backdrop-blur transition hover:-translate-y-0.5 hover:border-accent hover:bg-surface hover:text-ink"
                >
                  <MapPin className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" />
                  {c.short}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="animate-fade mx-auto w-full max-w-[28rem]" style={{ animationDelay: "200ms" }}>
        <div className="card p-4 sm:p-5">
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h2 className="text-sm font-bold tracking-tight text-ink">India right now</h2>
            <span className="text-[0.7rem] font-semibold text-ink-3">live · regional model</span>
          </div>
          <IndiaMapPanel variant="hero" onSelect={onSelectPlace} />
        </div>
      </div>
    </section>
  );
}

export function MainView() {
  const { lat, lon, name, hasLocation, isOutOfCoverage, setLocation } = useLocationParams();
  const [geoError, setGeoError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isPosterOpen, setIsPosterOpen] = useState(false);
  const [activity, setActivity] = useState<Activity>(() => {
    try {
      const stored = localStorage.getItem("breeze:activity");
      return stored === "runner" || stored === "worker" || stored === "parent" ? stored : "everyday";
    } catch {
      return "everyday";
    }
  });
  const handleActivityChange = (next: Activity) => {
    setActivity(next);
    try {
      localStorage.setItem("breeze:activity", next);
    } catch {
      // Ignore localStorage write failures
    }
  };
  const [isSharingCard, setIsSharingCard] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const online = useOnlineStatus();

  const { places, isCurrentSaved, toggleSaveCurrent, removePlace } = useSavedPlaces({ lat, lon, name });

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

  const { data, isLoading, isError, refetch, dataUpdatedAt } = useAssessment(lat, lon, hasLocation && !isOutOfCoverage);

  const a = useMemo(() => (data ? deriveAssessment(data, profile, Date.now(), activity) : null), [data, profile, activity]);

  const handleBookmarkToggle = () => {
    const res = toggleSaveCurrent();
    if (res.action === "saved") setToastMessage(`Saved ${name} to quick places`);
    else if (res.action === "removed") setToastMessage(`Removed ${name} from quick places`);
    else if (res.action === "limit_reached") setToastMessage("Maximum 5 places saved. Remove one to save another.");
  };

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard
      .writeText(canonicalUrl(lat, lon, name))
      .then(() => {
        setToastMessage("Link copied to clipboard!");
        setAnnouncement("Link copied to clipboard!");
      })
      .catch(() => setToastMessage("Could not copy link"));
  };

  const handleShareCard = async () => {
    if (!shareCardRef.current || !data?.air?.current || isSharingCard) return;
    setIsSharingCard(true);
    try {
      await captureAndShareCard({
        element: shareCardRef.current,
        placeName: name,
        verdict: a?.today.verdict || "Current Air Verdict",
        canonicalUrl: canonicalUrl(lat, lon, name),
        onToast: (msg) => {
          setToastMessage(msg);
          setAnnouncement(msg);
        },
      });
    } catch {
      setToastMessage("Could not generate share card");
    } finally {
      setIsSharingCard(false);
    }
  };

  const handleSelectPlace = (place: { lat: number; lon: number; name: string }) => {
    setGeoError(null);
    setLocation(place);
  };

  const handleGeoError = (msg: string) => {
    setGeoError(msg);
    searchInputRef.current?.focus();
  };

  // Tab title and ambient tint follow the verdict
  const verdict = a?.today.verdict;
  useEffect(() => {
    document.title = verdict && name ? `${verdict} · ${name} — Breeze` : "Breeze — is the air outside OK for you, right now?";
  }, [verdict, name]);
  const tint = verdict ? VERDICT_THEMES[verdict].tint : DEFAULT_TINT;

  const mapSelected = useMemo(
    () => (hasLocation && !isOutOfCoverage ? { lat, lon, name, pm25: a?.effective.pm25 ?? null } : null),
    [hasLocation, isOutOfCoverage, lat, lon, name, a]
  );

  const showTotalFailure =
    isError || !data?.air?.current || data.air.status === "unavailable" || !a;

  return (
    <div className="relative min-h-dvh" style={{ ["--tint" as string]: tint }}>
      <div className="ambient" aria-hidden="true" />

      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-3 py-6">
          <a href="/" onClick={handleNavClick("/")} aria-label="Breeze home" className="rounded-lg">
            <Wordmark />
          </a>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsAboutOpen(true)}
              data-testid="header-about-button"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold text-ink-2 transition hover:bg-surface hover:text-ink"
            >
              <Info className="h-4 w-4 text-accent" aria-hidden="true" />
              <span>About</span>
            </button>
          </div>
        </header>

        <main className="flex-1 space-y-6 pb-10">
          {/* Visually-hidden live announcer */}
          <div className="sr-only" role="status" aria-live="polite" aria-atomic="true" data-testid="aria-announcer">
            {announcement}
          </div>

          {!hasLocation ? (
            <Welcome
              onSelectPlace={handleSelectPlace}
              onGeoError={handleGeoError}
              geoError={geoError}
              clearGeoError={() => setGeoError(null)}
              searchInputRef={searchInputRef}
            />
          ) : (
            <>
              {/* Search & location bar */}
              <div className="space-y-2.5">
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
                  <LocationButton onLocationFound={handleSelectPlace} onError={handleGeoError} />
                </div>
                <SavedPlacesBar
                  places={places}
                  currentLat={lat}
                  currentLon={lon}
                  onSelectPlace={handleSelectPlace}
                  onRemovePlace={removePlace}
                />
              </div>

              {!online && (
                <div role="status" className="flex items-center gap-2.5 rounded-2xl border border-care/50 bg-care/15 px-4 py-3 text-sm font-medium text-[#5c3d00] dark:text-[#ffe2a3]">
                  <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    You’re offline.{" "}
                    {data
                      ? `Showing the last result, fetched at ${instantToPlaceClock(new Date(dataUpdatedAt).toISOString(), data.location.utcOffsetSeconds)}.`
                      : "Reconnect to get a live reading."}
                  </span>
                </div>
              )}

              {/* Content states */}
              {isOutOfCoverage ? (
                <div className="card mx-auto max-w-xl space-y-2 p-8 text-center">
                  <h2 className="font-display text-3xl text-ink">Breeze covers India</h2>
                  <p className="text-sm text-ink-2">
                    Selected coordinates ({lat.toFixed(2)}, {lon.toFixed(2)}) fall outside India&apos;s coverage area. Please choose a
                    location within India.
                  </p>
                </div>
              ) : isLoading ? (
                <Skeletons />
              ) : showTotalFailure || !data || !a ? (
                <ErrorCard
                  onRetry={() => refetch()}
                  title={!online ? "You’re offline" : undefined}
                  message={!online ? "Reconnect to the internet to get a live reading. Nothing is shown from memory." : undefined}
                />
              ) : (
                <div
                  className="space-y-6 lg:columns-2 lg:gap-7 lg:space-y-0 [&>*]:break-inside-avoid lg:[&>*]:mb-7"
                  id="assessment-content"
                >
                  <VerdictHero
                    data={data}
                    placeName={name}
                    profile={profile}
                    onProfileChange={handleProfileChange}
                    onAnnounce={setAnnouncement}
                    onCopyLink={handleCopyLink}
                    onShareCard={handleShareCard}
                    onOpenPoster={() => setIsPosterOpen(true)}
                    isSharing={isSharingCard}
                  />
                  {data.air.model?.hourly && data.air.model.hourly.length > 0 && (
                    <>
                      <Suspense fallback={<ChartFallback />}>
                        <ForecastChart
                          hourly={data.air.model.hourly}
                          utcOffsetSeconds={data.location.utcOffsetSeconds}
                          window={a.window}
                        />
                      </Suspense>
                      <BestWindowChip window={a.window} />
                    </>
                  )}
                  <TipList tips={a.tips} activity={activity} onActivityChange={handleActivityChange} />
                  <SchoolPlanner data={data} />
                  {data.weather && data.weather.status !== "unavailable" && (
                    <WeatherStrip weather={data.weather} utcOffsetSeconds={data.location.utcOffsetSeconds} />
                  )}
                  <div className="card p-5 sm:p-7">
                    <div className="mb-3 flex items-baseline justify-between px-1">
                      <h2 className="text-base font-bold tracking-tight text-ink">Around India</h2>
                      <span className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-ink-3">
                        tap a city <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                      </span>
                    </div>
                    <IndiaMapPanel selected={mapSelected} onSelect={handleSelectPlace} />
                  </div>
                </div>
              )}
            </>
          )}

          {hasLocation && !isOutOfCoverage && data && a && (
            <ProvenanceFooter data={data} onOpenAbout={() => setIsAboutOpen(true)} />
          )}
        </main>

        {!hasLocation && (
          <footer className="pb-8 text-center text-xs text-ink-3">
            <button
              type="button"
              onClick={() => setIsAboutOpen(true)}
              className="cursor-pointer rounded-sm font-semibold text-accent underline underline-offset-2"
            >
              How Breeze measures air quality &amp; where the data comes from
            </button>
            <p className="mt-2">General guidance, not medical advice.</p>
          </footer>
        )}
      </div>

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      <PosterDialog isOpen={isPosterOpen} onClose={() => setIsPosterOpen(false)} placeName={name} url={canonicalUrl(lat, lon, name)} />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />

      {/* Off-screen 1080×1350 share card (PNG capture target) */}
      {data?.air?.current && a && (
        <div
          style={{
            position: "fixed",
            left: "-9999px",
            top: 0,
            width: "1080px",
            height: "1350px",
            overflow: "hidden",
            pointerEvents: "none",
            zIndex: -100,
          }}
          aria-hidden="true"
        >
          <ShareCard ref={shareCardRef} data={data} profile={profile} tips={a.tips} placeName={name} />
        </div>
      )}
    </div>
  );
}

export default MainView;
