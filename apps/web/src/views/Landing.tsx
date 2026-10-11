import { ArrowRight, Gauge, RadioTower, Sunrise } from "lucide-react";
import { Wordmark } from "../components/Logo";
import { handleNavClick } from "../lib/route";

const APP_PATH = "/app";

/** Slow drifting colour fields + faint wind streaks. Purely decorative, no data. */
function Sky() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,var(--canvas)_0%,var(--canvas-2)_100%)]" />

      <div className="animate-drift-a absolute -left-[12vw] top-[4vh] h-[46vmax] w-[46vmax] rounded-full bg-[#2fb98f] opacity-[0.22] blur-[90px] dark:opacity-[0.18]" />
      <div className="animate-drift-b absolute -right-[14vw] top-[8vh] h-[42vmax] w-[42vmax] rounded-full bg-[#4aa3df] opacity-[0.26] blur-[100px] dark:opacity-[0.2]" />
      <div className="animate-drift-c absolute bottom-[-18vh] left-[22vw] h-[38vmax] w-[38vmax] rounded-full bg-[#f2b233] opacity-[0.18] blur-[110px] dark:opacity-[0.1]" />

      <svg
        className="absolute inset-0 h-full w-full text-accent opacity-[0.42]"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        focusable="false"
      >
        {[
          "M-40 610 C 240 540, 420 700, 700 620 S 1180 520, 1500 600",
          "M-40 700 C 260 640, 460 780, 760 700 S 1200 620, 1500 690",
          "M-40 520 C 200 470, 520 580, 800 510 S 1220 430, 1500 500",
          "M-40 790 C 300 740, 520 860, 820 790 S 1240 720, 1500 780",
        ].map((d, i) => (
          <g key={d}>
            <path d={d} stroke="currentColor" strokeOpacity="0.16" strokeWidth="1" />
            <path
              d={d}
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeDasharray="90 310"
              className="animate-flow"
              style={{ animationDuration: `${8 + i * 2.5}s`, animationDelay: `${-i * 2}s` }}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

const VERDICTS = [
  { label: "Good to go", dot: "bg-go" },
  { label: "Take care", dot: "bg-care" },
  { label: "Stay indoors if you can", dot: "bg-stay" },
];

const FEATURES = [
  {
    icon: Gauge,
    title: "One honest verdict",
    body: "Good to go, take care, or stay indoors — with the reason in plain words, not just a number.",
  },
  {
    icon: RadioTower,
    title: "Station or model, always labelled",
    body: "A real monitor within 25 km when there is one, a ~45 km regional model when there isn’t. We say which.",
  },
  {
    icon: Sunrise,
    title: "The cleanest 3 hours",
    body: "A 48-hour forecast that finds the best window to step out, run, or open the windows.",
  },
];

export function Landing() {
  return (
    <div className="relative isolate min-h-dvh overflow-x-clip">
      <Sky />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 pt-6 sm:px-8 sm:pt-8">
        <a href="/" aria-label="Breeze home" className="rounded-lg">
          <Wordmark />
        </a>
        <a
          href={APP_PATH}
          onClick={handleNavClick(APP_PATH)}
          className="rounded-full border border-line-strong bg-surface/60 px-4 py-2 text-sm font-semibold text-ink backdrop-blur transition hover:bg-surface"
        >
          Open app
        </a>
      </header>

      <main>
        {/* Hero */}
        <section className="relative mx-auto flex min-h-[calc(100dvh-5.5rem)] w-full max-w-5xl flex-col items-center justify-center px-5 pb-20 pt-10 text-center sm:px-8">
          {/* breathing rings */}
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-[58%]">
            <div className="animate-breathe h-[34rem] w-[34rem] rounded-full border border-accent/20 sm:h-[44rem] sm:w-[44rem]" />
            <div
              className="animate-breathe absolute inset-[3.5rem] rounded-full border border-accent/15 sm:inset-[5rem]"
              style={{ animationDelay: "-1.2s" }}
            />
            <div
              className="animate-breathe absolute inset-[7rem] rounded-full bg-accent/[0.05] sm:inset-[10rem]"
              style={{ animationDelay: "-2.4s" }}
            />
          </div>

          <p
            className="animate-rise mb-7 inline-flex items-center gap-2.5 rounded-full border border-line-strong bg-surface/70 px-3.5 py-1.5 text-[0.8rem] font-semibold tracking-wide text-ink-2 backdrop-blur"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping-soft absolute inline-flex h-full w-full rounded-full bg-go" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-go" />
            </span>
            Live air quality · all of India
          </p>

          <h1
            className="animate-rise text-balance font-display text-[clamp(3.4rem,11vw,8.2rem)] leading-[0.92] tracking-[-0.02em] text-ink"
            style={{ animationDelay: "80ms" }}
          >
            Know before
            <br />
            <span className="italic text-accent">you go.</span>
          </h1>

          <p
            className="animate-rise mt-7 max-w-xl text-balance text-lg leading-relaxed text-ink-2 sm:text-xl"
            style={{ animationDelay: "170ms" }}
          >
            Is the air outside okay for you, right now? One calm, honest answer — and what to do about it.
          </p>

          <div
            className="animate-rise mt-10 flex flex-col items-center gap-4 sm:flex-row"
            style={{ animationDelay: "260ms" }}
          >
            <a
              href={APP_PATH}
              onClick={handleNavClick(APP_PATH)}
              data-testid="landing-cta"
              className="group inline-flex items-center gap-3 rounded-full bg-ink px-7 py-4 text-base font-semibold text-canvas shadow-[0_18px_40px_-14px_rgb(12_26_32/0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_44px_-12px_rgb(12_26_32/0.6)] active:translate-y-0"
            >
              Check the air near me
              <span className="grid h-7 w-7 place-items-center rounded-full bg-canvas/15 transition group-hover:translate-x-0.5">
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </a>
            <a
              href="#how"
              className="rounded-full px-4 py-3 text-sm font-semibold text-ink-2 underline decoration-line-strong decoration-2 underline-offset-[6px] transition hover:text-ink hover:decoration-accent"
            >
              How it works
            </a>
          </div>

          <ul
            className="animate-rise mt-14 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-sm font-medium text-ink-2"
            style={{ animationDelay: "360ms" }}
            aria-label="The three possible verdicts"
          >
            {VERDICTS.map((v) => (
              <li key={v.label} className="inline-flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${v.dot}`} aria-hidden="true" />
                {v.label}
              </li>
            ))}
          </ul>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto w-full max-w-5xl scroll-mt-8 px-5 pb-24 sm:px-8">
          <div className="grid gap-px overflow-hidden rounded-[1.75rem] border border-line bg-line shadow-[var(--shadow-card)] sm:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-surface/80 p-7 backdrop-blur sm:p-8">
                <span className="mb-5 grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="mb-2 text-lg font-bold tracking-tight text-ink">{title}</h2>
                <p className="text-[0.95rem] leading-relaxed text-ink-2">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-5 pb-10 text-center text-[0.8rem] leading-relaxed text-ink-3 sm:px-8">
        <p>
          Live open data from Copernicus CAMS, OpenAQ and Open-Meteo. No accounts, no tracking.
          <br className="hidden sm:inline" /> General guidance, not medical advice.
        </p>
      </footer>
    </div>
  );
}
