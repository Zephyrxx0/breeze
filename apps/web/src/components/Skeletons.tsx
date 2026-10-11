export function Skeletons() {
  const bar = "rounded-lg bg-ink/10";
  return (
    <div className="grid animate-pulse gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]" aria-busy="true" aria-label="Loading air quality assessment">
      <div className="space-y-5">
        <div className="space-y-6 rounded-[2rem] bg-ink/[0.07] p-6 sm:p-8">
          <div className="flex justify-between">
            <div className={`h-9 w-40 rounded-full bg-ink/10`} />
            <div className={`h-9 w-48 rounded-full bg-ink/10`} />
          </div>
          <div className="space-y-3">
            <div className={`h-3 w-44 ${bar}`} />
            <div className={`h-16 w-3/4 ${bar}`} />
          </div>
          <div className="space-y-2">
            <div className={`h-4 w-5/6 ${bar}`} />
            <div className={`h-4 w-1/2 ${bar}`} />
          </div>
          <div className="h-36 rounded-[1.4rem] bg-ink/10" />
        </div>
        <div className="card h-72 p-6">
          <div className={`mb-4 h-4 w-36 ${bar}`} />
          <div className="h-48 rounded-2xl bg-ink/[0.06]" />
        </div>
      </div>
      <div className="space-y-5">
        <div className="card h-56 space-y-3 p-6">
          <div className={`h-4 w-32 ${bar}`} />
          <div className="h-14 rounded-2xl bg-ink/[0.06]" />
          <div className="h-14 rounded-2xl bg-ink/[0.06]" />
        </div>
        <div className="card h-48 p-6">
          <div className={`h-4 w-28 ${bar}`} />
        </div>
      </div>
    </div>
  );
}
