export function Skeletons() {
  return (
    <div className="w-full space-y-4 animate-pulse" aria-busy="true" aria-label="Loading air quality assessment">
      {/* Hero Verdict Card Skeleton (~180px) */}
      <div className="w-full h-48 bg-slate-200/70 rounded-2xl p-6 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="w-24 h-5 bg-slate-300 rounded-md" />
            <div className="w-48 h-8 bg-slate-300 rounded-md" />
          </div>
          <div className="w-20 h-7 bg-slate-300 rounded-full" />
        </div>
        <div className="space-y-2 pt-4">
          <div className="w-3/4 h-4 bg-slate-300 rounded-md" />
          <div className="w-1/2 h-4 bg-slate-300 rounded-md" />
        </div>
      </div>

      {/* Forecast Chart Skeleton (~240px) */}
      <div className="w-full h-60 bg-slate-200/70 rounded-2xl p-6 flex flex-col justify-between">
        <div className="flex justify-between items-center">
          <div className="w-36 h-5 bg-slate-300 rounded-md" />
          <div className="w-28 h-4 bg-slate-300 rounded-md" />
        </div>
        <div className="w-full h-36 bg-slate-300/60 rounded-xl" />
        <div className="flex justify-between pt-2">
          <div className="w-16 h-3 bg-slate-300 rounded-md" />
          <div className="w-16 h-3 bg-slate-300 rounded-md" />
          <div className="w-16 h-3 bg-slate-300 rounded-md" />
        </div>
      </div>

      {/* Tips / Weather Strip Skeleton (~160px) */}
      <div className="w-full h-40 bg-slate-200/70 rounded-2xl p-6 space-y-3">
        <div className="w-28 h-5 bg-slate-300 rounded-md" />
        <div className="w-full h-4 bg-slate-300 rounded-md" />
        <div className="w-5/6 h-4 bg-slate-300 rounded-md" />
        <div className="w-2/3 h-4 bg-slate-300 rounded-md" />
      </div>
    </div>
  );
}
