import { useState, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLocationParams } from "./hooks/useLocationParams";
import { useAssessment } from "./hooks/useAssessment";
import { SearchBox } from "./components/SearchBox";
import { LocationButton } from "./components/LocationButton";
import { Skeletons } from "./components/Skeletons";
import { ErrorCard } from "./components/ErrorCard";

const queryClient = new QueryClient();

export function MainView() {
  const { lat, lon, name, isOutOfCoverage, setLocation } = useLocationParams();
  const [geoError, setGeoError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, isError, refetch } = useAssessment(lat, lon, !isOutOfCoverage);

  const handleSelectPlace = (place: { lat: number; lon: number; name: string }) => {
    setGeoError(null);
    setLocation(place);
  };

  const handleGeoError = (msg: string) => {
    setGeoError(msg);
    searchInputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center">
      <header className="w-full max-w-xl px-4 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tight text-blue-600">Breeze</span>
          <span className="text-xs px-2 py-0.5 font-semibold bg-blue-100 text-blue-800 rounded-full">India</span>
        </div>
        <div className="text-xs text-slate-500 font-medium">Live air verdict</div>
      </header>

      <main className="w-full max-w-xl px-4 py-3 space-y-4 flex-1">
        {/* Search & Location Bar */}
        <div className="flex items-center gap-2">
          <SearchBox
            currentPlace={name}
            onSelectPlace={handleSelectPlace}
            errorMessage={geoError || (isOutOfCoverage ? "Breeze covers India only (lat 6–38, lon 68–98.5)." : null)}
            onClearError={() => setGeoError(null)}
            inputRef={searchInputRef}
          />
          <LocationButton
            onLocationFound={handleSelectPlace}
            onError={handleGeoError}
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
        ) : isError || !data?.air?.current ? (
          <ErrorCard onRetry={() => refetch()} />
        ) : (
          <div className="space-y-4" id="assessment-content">
            {/* Placeholder container where Plan 02 & 03 components mount */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs text-slate-700 text-sm">
              <p className="font-semibold text-slate-900">Assessment loaded for {name}</p>
              <p className="text-xs text-slate-500 mt-1">PM2.5: {data.air.current.pm25} µg/m³ · Source: {data.air.current.source}</p>
            </div>
          </div>
        )}
      </main>
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
