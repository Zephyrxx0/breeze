# Breeze — Product Requirements Document

*Know before you go: a live go / no-go for the air outside, anywhere in India.*

Version 1.0 · 9 Oct 2026 · Owner: solo builder · Event: WeMakeDevs × AWS Environmental Hacks, Track 01 (Air) · Status: ready to build

## 1. Summary

Breeze answers one question for any resident of India: **is the air outside OK for me right now, and what should I do about it?**

A user searches for a place or taps *Use my location*. Breeze fetches live data and returns:

- one verdict: **Good to go**, **Take care** or **Stay indoors if you can**, with the reason;
- the current PM2.5 reading, labelled as a real station (name, distance, age) or a regional model estimate;
- a 48-hour PM2.5 forecast and the cleanest 3-hour window to go out;
- a short tip checklist: mask, exercise timing, sunscreen, hydration, indoor air;
- a shareable card (image plus link) for family and neighbourhood groups.

There are no accounts, no database and no mock data. Every number comes from a live API call, carries a timestamp, and is hidden rather than invented if its source fails. Breeze is built solo in about 48 hours and deployed on AWS (Amplify Hosting + Lambda).

**Originality.** Breeze is a new repository started on 9 Oct 2026. Aerate and Calm are reference only and no code is copied; what carries over is knowledge of which public APIs exist and how their data behaves.

## 2. Problem and opportunity

Air data in India is public, but a number or a colour is not a decision. Three gaps:

1. **Number, not action.** AQI apps show a value; the person still has to decide whether to run, commute, let children play or open windows.
2. **Hidden coverage gaps.** Monitoring stations are unevenly spread. Many apps fall back to a model without saying so. Breeze always states which one it is using, and how confident it is.
3. **Generic advice.** The same text for everyone. Breeze ties each tip to a measured value and to who is asking (standard or sensitive).

**Fit with Track 01.** The track asks teams to track what is in the air, warn the people most exposed, and change what happens on bad days. Breeze generalises the organisers' own example (a principal deciding whether PE moves indoors) to any resident deciding what to do today and tomorrow.

## 3. Goals, non-goals and success criteria

**Goals**

- G1. A verdict is visible within 3 seconds of choosing a place (warm, 4G).
- G2. Works for any place in India, with honest data provenance.
- G3. 100% live data. Nothing fabricated, nothing hard-coded as if it were data.
- G4. Public URL on AWS that anyone can open without instructions.
- G5. A shareable card that carries the verdict and a link.

**Non-goals (this version):** accounts, logins or roles; a database; push notifications; AI features; sub-kilometre modelling; indoor air sensing; medical advice; locations outside India; native apps.

**Mapping to the judging criteria**

| Criterion | What Breeze shows |
|---|---|
| Idea and Impact | One decision for one person, with a reason; honest about data quality; changes behaviour on bad days (mask, timing, stay in) |
| Built on AWS | Amplify Hosting + Lambda Function URL, deployed with AWS SAM (an AWS open-source tool); CloudWatch logs show live upstream calls |
| Design and usability | Verdict on the first screen, no login, phone-first, plain words |
| Execution | Public URL, works for any Indian place, fails soft |
| Demo video | Storyboard in section 18 |

## 4. Users and scenarios

**Primary user: any resident or visitor in India.** One optional switch, *Sensitive* (children, older adults, pregnancy, asthma, heart or lung conditions), makes verdicts and tips stricter. It is stored on the device; there is no profile.

- **Morning exerciser or commuter** checks before leaving and wants the cleanest window.
- **Parent or caregiver** decides on park time, outdoor play or school pick-up.
- **Outdoor worker or rider** wants to know when to be outside and when a mask matters.
- **Family group member** receives a card on WhatsApp and opens the live link.

## 5. Scope and priorities

| Tier | Contents | Deadline |
|---|---|---|
| P0 (MVP) | Place search, use-my-location, live assessment, verdict (Today and Tomorrow), 48 h chart, best window, tips, weather strip, provenance, sensitivity toggle, error states, AWS deployment | Public URL by Sat 10 Oct evening |
| P1 | Share card (PNG) with deep link, saved places, about and data-sources sheet | Sun 11 Oct morning |
| P2 (stretch) | Upwind fire and smoke context (NASA FIRMS), server-rendered link preview | Only if P0 and P1 are deployed and the video is not blocked |
| Prospects | Everything in section 20, including AI features | After the event |

Cut rule: if there is no public URL by Saturday 6 PM, drop P1 and P2 entirely.

## 6. Functional requirements

| ID | Requirement | Acceptance criteria | Tier |
|---|---|---|---|
| FR-01 | Place search: type-ahead after 2 characters, 250 ms debounce, India-only results (name, state), max 8 | 'Lucknow' lists Lucknow, Uttar Pradesh; non-Indian places never appear; no results shows a clear message | P0 |
| FR-02 | Use my location: geolocation requested only on tap; 8 s timeout; coordinates rounded to 2 decimals | Denied or timed out shows a message and focuses search; outside India shows 'Breeze covers India' | P0 |
| FR-03 | Place label: friendly name for GPS locations via reverse geocoding; fallback 'Your location' | Label never blocks data loading | P0 |
| FR-04 | Assessment fetch: one call to /api/assess; skeleton while loading; partial data renders | Each section shows ok, stale or unavailable independently | P0 |
| FR-05 | Current air: PM2.5 in µg/m³, category (colour and text), source badge, confidence chip | Badge names station, distance and age, or says 'model estimate (~45 km)' | P0 |
| FR-06 | Verdict: Today and Tomorrow tabs; level, headline, top 2 reasons | Matches the matrix in 7.2 at every category boundary (unit-tested) | P0 |
| FR-07 | Forecast chart: 48 h PM2.5 with category bands, now marker, night shading, tooltip | Readable at 360 px width; keyboard-focusable points | P0 |
| FR-08 | Best window: cleanest 3 h block in next 24 h daytime hours, with % improvement | Hidden when improvement is under 15% | P0 |
| FR-09 | Sensitivity toggle: Standard / Sensitive chip, persisted locally | Switching recomputes verdict and tips instantly, no refetch | P0 |
| FR-10 | Tip checklist: rule-driven, max 5, ordered by priority, each with a 'why' line | Every tip cites the value that triggered it | P0 |
| FR-11 | Weather strip: feels-like temperature, humidity, UV now and today's max, rain chance | Missing weather hides the strip only | P0 |
| FR-12 | Provenance: 'Updated hh:mm', per-source timestamps, attribution footer | CAMS / Open-Meteo, OpenAQ providers and NASA FIRMS credited | P0 |
| FR-13 | Failure handling: no mock data ever; stale cache allowed up to 3 h and labelled with age | Total failure shows retry; no number appears without a source | P0 |
| FR-14 | Accessibility: colour never the only signal; AA contrast; aria-live verdict; keyboard operable; reduced motion respected | Lighthouse accessibility at least 90 | P0 |
| FR-15 | Share card: 1080×1350 PNG; Web Share with fallback to download and copy link | Card shows place, verdict, PM2.5, 2–3 tips, 'as of' time and URL | P1 |
| FR-16 | Deep link: /?lat=..&lon=..&n=.. opens that place with live data | A link opened a day later shows current data | P1 |
| FR-17 | Saved places: up to 5 in localStorage as chips | Survives reload; no server involved | P1 |
| FR-18 | Fire and smoke context: upwind VIIRS detections within 300 km | See 7.6; clearly labelled as a heuristic | P2 |
| FR-19 | Link preview: server-rendered Open Graph image for shared links | WhatsApp unfurls with the live verdict | P2 |

## 7. Decision logic

All constants live in one config module in the shared core package so they can be reviewed and changed in one place. Breeze gives general guidance, not medical advice, and says so in the footer.

### 7.1 PM2.5 categories (CPCB NAQI)

| Category | PM2.5 µg/m³ | PM2.5 sub-index |
|---|---|---|
| Good | 0–30 | 0–50 |
| Satisfactory | 31–60 | 51–100 |
| Moderate | 61–90 | 101–200 |
| Poor | 91–120 | 201–300 |
| Very Poor | 121–250 | 301–400 |
| Severe | above 250 | 401–500 |

Verify these breakpoints against CPCB's published table before shipping. NAQI is defined on 24-hour averages; Breeze applies the same breakpoints to current and hourly values and labels the result 'PM2.5 category', not 'AQI'. The sub-index is linearly interpolated within each band.

### 7.2 Verdict matrix

| Category | Standard | Sensitive |
|---|---|---|
| Good | Good to go | Good to go |
| Satisfactory | Good to go | Take care |
| Moderate | Take care | Take care |
| Poor | Take care | Stay indoors if you can |
| Very Poor | Stay indoors if you can | Stay indoors if you can |
| Severe | Stay indoors if you can | Stay indoors if you can |

Extra reason lines: 'Getting worse by evening' when the next-6-hour forecast peak is a worse category; 'Local station reads much higher / lower than the regional model' when the station-to-model ratio is above 2 or below 0.5.

### 7.3 Effective PM2.5 and confidence

1. Ask OpenAQ for PM2.5 stations inside a bounding box of about 0.25° around the point, then keep those within 25 km (haversine).
2. Keep only readings that are valid (not negative), in µg/m³ and no older than 3 hours.
3. If two or more stations are within 10 km, use the median of the nearest three. Otherwise use the nearest one.
4. If no station qualifies, use the Open-Meteo / CAMS value for the current hour and label it 'model estimate (~45 km)'.
5. Confidence: **High** = station within 5 km and under 1 h old; **Medium** = station within 25 km; **Low** = model only.

'Today' uses the effective value now. 'Tomorrow' uses the daytime (06:00–20:00 local) mean of the model forecast and mentions the peak. Forecasts are always the regional model, and the UI says so.

### 7.4 Best window

Over the next 24 hours, restrict to 05:00–21:00 local, slide a 3-hour mean and pick the minimum. Show it only if it is at least 15% lower than the mean over the same period. Display the window, its mean and the improvement. The global model is natively 3-hourly, so windows shorter than 3 hours are never shown.

### 7.5 Tip rules

| ID | Trigger (standard / sensitive) | Tip | Priority |
|---|---|---|---|
| A1 | PM2.5 ≥ 91 / ≥ 61 | Wear a well-fitted N95 or FFP2 mask outdoors; cloth and surgical masks filter fine particles poorly | 1 |
| A5 | Sensitive and PM2.5 ≥ 31 | Keep any prescribed inhaler or medication with you and limit time outside | 1 |
| A2 | PM2.5 ≥ 91 | Skip outdoor exercise today | 2 |
| A3 | Best window exists and category is Moderate or worse | Go out between {window}; levels are about {x}% lower | 2 |
| A2b | PM2.5 61–90 | Do hard exercise indoors or in the cleanest window | 3 |
| A6 | UV ≥ 3 (≥ 8 for the stronger wording) | Use SPF 30+ sunscreen, a hat and sunglasses; UV peaks about 10 AM–4 PM. At 8+ seek shade at midday | 3 |
| A7 | Feels-like ≥ 35 °C | Drink water regularly and avoid heavy exertion at midday | 3 |
| A4 | PM2.5 ≥ 91 | Keep windows closed at peak hours, run a purifier if you have one, air the room when levels dip | 4 |
| A8 | Rain probability ≥ 60% in next 6 h | Rain is likely; carry an umbrella | 5 |
| A9 (P2) | Smoke heuristic is high | Smoke from fires upwind may raise levels later today | 2 |

Only the top 5 by priority are shown. Thresholds for UV and heat are configurable; verify them against WHO and IMD guidance before the demo.

### 7.6 Fire and smoke heuristic (P2)

Fetch VIIRS detections for a box of about ±3° around the point for the last 2 days. Drop low-confidence detections. For each, compute distance and bearing from the point. Count a detection as upwind if its bearing is within ±45° of the wind-from direction and its distance is at most 300 km and at most 24 h of travel at the mean wind speed. Report the count, the nearest distance and the bearing. If the mean wind is below 2 m/s, say that local sources dominate. FIRMS detects every thermal anomaly (crop fires, forest fires, industry), so the UI says 'fire detections', never 'stubble burning', and calls the result an indication, not a measurement.

## 8. Data sources and API contracts

| # | Source | Used for | Request | Auth | Cache TTL |
|---|---|---|---|---|---|
| 1 | Open-Meteo Geocoding | Place search | GET https://geocoding-api.open-meteo.com/v1/search?name={q}&count=8&language=en&countryCode=IN (also filter results to country_code IN) | None | Browser only |
| 2 | Open-Meteo Air Quality (CAMS) | Current and 48 h PM2.5, PM10 | GET https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&hourly=pm2_5,pm10&current=pm2_5&forecast_days=2&timezone=auto | None | 60 min |
| 3 | Open-Meteo Forecast | Feels-like, humidity, rain chance, UV, wind | GET https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,uv_index,wind_speed_10m,wind_direction_10m&daily=uv_index_max,sunrise,sunset&forecast_days=2&timezone=auto | None | 30 min |
| 4 | OpenAQ v3 | Nearest station PM2.5 | GET https://api.openaq.org/v3/locations?bbox={west,south,east,north}&parameters_id=2&limit=100, then GET /v3/locations/{id}/latest | Free key in X-API-Key header | 15 min |
| 5 | NASA FIRMS (P2) | Fire detections | GET https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/VIIRS_SNPP_NRT/{west,south,east,north}/2 | Free MAP_KEY | 60 min |
| 6 | BigDataCloud reverse geocode | Label for GPS locations | GET https://api.bigdatacloud.net/data/reverse-geocode-client?latitude={lat}&longitude={lon}&localityLanguage=en | None | Browser only |
| 7 | Browser APIs | Geolocation, Web Share, Canvas | n/a | Permission prompt | n/a |

**Data reality (state these in the demo).**

- Open-Meteo's global air-quality forecast comes from CAMS at about 45 km and 3-hourly steps, with up to 5 days of forecast. It describes a region, not a street. Attribution to CAMS and Open-Meteo is required (CC BY 4.0).
- OpenAQ v3 maps a location's latest values to sensors; /latest returns a sensor id, so the sensor-to-parameter mapping comes from the sensors list on the location record. Parameter id 2 is PM2.5.
- FIRMS area requests use west,south,east,north and a small day range; sources include VIIRS_SNPP_NRT and VIIRS_NOAA20_NRT.

**Verify on day one (Friday night):**

1. OpenAQ coordinate parameter order. The docs examples disagree, so use bbox (west,south,east,north), which is unambiguous.
2. Station coverage for metros, tier-2 cities and small towns. The result decides how often users see 'model estimate'.
3. FIRMS maximum day range and per-key request limits (P2).
4. Open-Meteo free-tier terms (non-commercial) and OpenAQ rate limits for a free key.
5. Terms of the reverse-geocoding service; fall back to 'Your location' if in doubt.

## 9. Architecture

```
 Browser: React SPA on AWS Amplify Hosting
   |  (1) place search / reverse label ---> Open-Meteo Geocoding, BigDataCloud (no key, direct)
   |  (2) GET /api/assess?lat&lon
   v
 AWS Lambda (Function URL): Hono app, Node.js, TypeScript
   |  in-memory TTL cache keyed by rounded lat/lon + source
   |--> Open-Meteo Air Quality  (CAMS: current + 48 h PM2.5)
   |--> Open-Meteo Forecast     (weather, UV, wind)
   |--> OpenAQ v3               (nearest station; key in env var)
   |--> NASA FIRMS (P2)         (fire detections; key in env var)
   |  normalise -> one AssessResponse (no verdict logic on the server)
   v
 Browser: @breeze/core (pure TypeScript) computes verdict, best window, tips
   -> UI and share card
 CloudWatch Logs: structured logs from Lambda
```

**Request lifecycle**

1. The user picks a place (search result, saved chip, deep link or GPS). Coordinates are rounded to 2 decimals.
2. The browser calls /api/assess once. The Lambda validates the input, checks the India bounding box and the cache.
3. On a cache miss it calls the upstream APIs in parallel, each with a 4 s timeout, and normalises the results.
4. A failed upstream becomes status unavailable for that section; if a recent cached copy exists it is returned as stale with its age.
5. The browser runs the shared core logic on the response, so the sensitivity toggle updates instantly and the same code can draw the share card.

**Design principles**

- **Backend for frontend.** One endpoint hides four upstream APIs and keeps keys out of the browser.
- **Logic in a pure shared package.** Verdict, windows and tips are deterministic, unit-tested functions.
- **Fail soft, never fake.** Missing data is shown as missing.
- **Stateless.** No database; preferences live in localStorage and the place lives in the URL.
- **Small surface.** Two AWS services for the product, a third (CloudWatch) automatically.

## 10. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + TypeScript on Vite | Fast builds, static output that Amplify serves directly |
| Styling | Tailwind CSS + CSS variables | Speed, and design tokens for verdict colours and dark mode |
| Data fetching | TanStack Query | Retries, request de-duplication, stale handling |
| Charts | Hand-written SVG component | Tiny bundle, full control of bands and night shading |
| Share image | html-to-image (P1), qrcode (optional) | Client-side, no server or database |
| Fonts | @fontsource, self-hosted | Reliable canvas capture, no flash of unstyled text |
| Backend | Hono on Node.js (TypeScript) | One codebase for Lambda and local dev |
| Validation | zod | Query parameters and upstream response parsing |
| HTTP | Native fetch + AbortController | Timeouts without extra dependencies |
| Shared logic | packages/core (pure TypeScript) | One source of truth, easy to unit-test |
| Deploy tooling | AWS SAM with esbuild | AWS open-source tool, repeatable deploys |
| Hosting | AWS Amplify Hosting | Git-connected deploys, HTTPS URL, SPA rewrite |
| Compute | AWS Lambda (arm64) with Function URL | No servers, free-tier friendly |
| Observability | Amazon CloudWatch Logs | Automatic with Lambda |
| Testing | Vitest, a live smoke script, optional Playwright | Logic tests plus real-API checks |
| Tooling | npm workspaces, ESLint, Prettier, public GitHub repo | Minimal setup for a solo build |

Runtime: Node.js 22.x or any newer Lambda-supported runtime. Pin exact versions in the lockfile.

## 11. Repository and modules

```
breeze/
  apps/
    web/                     React SPA
      src/components/        SearchBox, LocationButton, VerdictCard, ForecastChart,
                             BestWindow, TipList, WeatherStrip, ProvenanceBar, ShareCard
      src/lib/               api.ts, geo.ts, storage.ts, share.ts
      src/styles/tokens.css  colours, type scale, spacing
    api/                     Hono app
      src/app.ts             routes, CORS, error handling
      src/lambda.ts          Lambda adapter (Function URL)
      src/dev.ts             local Node server for development
      src/routes/assess.ts   validation, orchestration, normalisation
      src/clients/           openmeteoAir.ts, openmeteoWeather.ts, openaq.ts, firms.ts
      src/cache.ts           in-memory TTL cache
      template.yaml          AWS SAM template
  packages/
    core/                    pure TypeScript, no I/O
  scripts/
    smoke-live.ts            live check across many Indian places
  docs/                      PRD, architecture diagram, writeup, video script
```

**Core package (shared by browser and API)**

- `categoryFor(pm25)` and `subIndex(pm25)` implement section 7.1.
- `verdictFor(category, profile)` implements the matrix in 7.2.
- `selectEffectivePm25(station, model)` implements 7.3 and returns value, source and confidence.
- `bestWindow(hourly, now, tz)` implements 7.4.
- `buildTips(context, profile)` implements the rule table in 7.5.
- `haversineKm`, `bearingDeg` and `isUpwind` support 7.3 and 7.6.

**API clients.** Each client takes coordinates, calls one upstream with a 4 s timeout, parses the response with zod and returns a normalised object or a typed failure. No client contains verdict logic.

## 12. Own API specification

**GET /api/assess?lat={number}&lon={number}**

- Validation: both required; lat 6 to 38, lon 68 to 98.5 (India bounding box); anything else returns 400 with code `out_of_coverage`.
- Server rounds inputs to 2 decimals and uses them as the cache key.
- Response headers: `Cache-Control: public, max-age=300`; CORS limited to the Amplify origin and localhost.

```ts
interface AssessResponse {
  generatedAt: string;                       // ISO, UTC
  location: { lat: number; lon: number; timezone: string };
  air: {
    status: 'ok' | 'stale' | 'unavailable';
    current: {
      pm25: number;                          // ug/m3
      source: 'station' | 'model';
      measuredAt: string;
      station?: { id: number; name: string; distanceKm: number; provider?: string };
    } | null;
    model: { pm25Now: number | null; hourly: { time: string; pm25: number }[] };
    comparison?: { ratio: number };          // station / model, when both exist
  };
  weather: {
    status: 'ok' | 'stale' | 'unavailable';
    hourly: { time: string; feelsLikeC: number; humidity: number; precipProb: number;
              uv: number; windSpeed: number; windDir: number }[];
    daily: { date: string; uvMax: number; sunrise: string; sunset: string }[];
  };
  fires?: { status: 'ok' | 'stale' | 'unavailable'; detections: { lat: number; lon: number;
           time: string; confidence: string; frp: number }[] };   // P2
  sources: Record<string, { status: 'ok' | 'stale' | 'unavailable';
           fetchedAt?: string; ageMin?: number; error?: string }>;
}
```

**Errors:** 400 `invalid_params` or `out_of_coverage`; 502 `all_upstreams_failed` (every section unavailable and no cache); 200 with per-section status for partial failures. **GET /api/health** returns ok, time and build version.

**Why no verdict on the server.** The browser computes verdict, window and tips from the same core package. The sensitivity toggle then needs no network call, and there is one implementation to test.

## 13. AWS deployment

| Service | Role | Notes |
|---|---|---|
| AWS Amplify Hosting | Serves the built SPA over HTTPS | Connect the GitHub repo, set app root to apps/web, add the standard single-page-app rewrite to index.html, set VITE_API_BASE_URL |
| AWS Lambda | Runs the API | Node.js 22, arm64, 512 MB, 10 s timeout, Function URL with auth type NONE and CORS |
| Amazon CloudWatch Logs | Logging | 7-day retention; structured JSON logs |
| AWS SAM CLI | Build and deploy | `sam build` then `sam deploy --guided`; template lives in apps/api |
| AWS Budgets (guardrail) | Cost alert | Alert at a small threshold such as USD 5 |

**SAM template sketch**

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Parameters:
  OpenAqApiKey: { Type: String, NoEcho: true }
  AllowedOrigin: { Type: String }
Resources:
  BreezeApi:
    Type: AWS::Serverless::Function
    Properties:
      Runtime: nodejs22.x
      Architectures: [arm64]
      Handler: lambda.handler
      MemorySize: 512
      Timeout: 10
      ReservedConcurrentExecutions: 10
      FunctionUrlConfig:
        AuthType: NONE
        Cors:
          AllowOrigins: [!Ref AllowedOrigin, 'http://localhost:5173']
          AllowMethods: [GET]
      Environment:
        Variables:
          OPENAQ_API_KEY: !Ref OpenAqApiKey
    Metadata:
      BuildMethod: esbuild
Outputs:
  ApiUrl:
    Value: !GetAtt BreezeApiUrl.FunctionUrl
```

If the account's concurrency quota is too low to reserve 10, remove the reserved-concurrency line and rely on the budget alert. Add `FIRMS_MAP_KEY` only if P2 ships.

**Deployment steps**

1. Create or confirm the AWS account and credits; sign in to the CLI.
2. `sam build && sam deploy --guided` in apps/api; note the Function URL from the outputs.
3. In Amplify, connect the repo, set VITE_API_BASE_URL to the Function URL, deploy.
4. Add the Amplify URL to AllowedOrigin and redeploy the API.
5. Test on a real phone over mobile data.

**Local development.** `npm run dev` starts Vite and the Hono Node server with the same route code. `sam local start-api` is optional and needs Docker.

**AWS shots for the demo video:** the Amplify deployment, the Lambda function with its Function URL, CloudWatch log lines showing live upstream calls and timings, and the SAM template in the repo.

## 14. Frontend and UX specification

**Screen order (mobile first, 390 px):** search bar with a Use my location button; place name and Standard / Sensitive chip; verdict card with Today / Tomorrow tabs; current reading with source badge and confidence chip; 48 h chart with best-window highlight; tip checklist; weather strip; smoke panel (P2); provenance footer.

**States:** empty (search, location button and a row of popular-city shortcuts, which are plain labels and not data); loading (skeletons); loaded; partial (affected sections say unavailable); stale (age shown); error (retry); offline (message, last result kept and labelled).

**Design tokens**

| Token | Value |
|---|---|
| Good to go | Teal-green (about #1F9D7A) gradient |
| Take care | Amber (about #E8A317) gradient with dark text |
| Stay indoors | Coral-red (about #D64545) gradient |
| Surface | Soft white / deep slate, switching with the system theme |
| Typeface | One rounded sans family, self-hosted |
| Radius and spacing | Large radius (20–24 px), 8 px spacing grid |
| Motion | A slow, subtle wave on the verdict card; disabled under reduced motion |

Check every colour pair against WCAG AA with a contrast checker; the verdict always carries an icon and words as well as colour.

**Copy rules.** Short sentences, no jargon, a 'why' line under each verdict and tip, units on every number, and the footer line 'General guidance, not medical advice.'

## 15. Share card (P1)

- **Output:** a 1080×1350 PNG, rendered from an off-screen 540×675 element at pixel ratio 2.
- **Content:** place name, verdict with icon, PM2.5 value and category, source label (station or model), 2–3 top tips, 'As of 7:40 AM, 9 Oct', Breeze wordmark and the short URL (QR optional).
- **No database needed.** The link is `/?lat=..&lon=..&n=..`; it carries only the place and always loads live data. The card is a snapshot and says when it was taken.
- **Sharing:** Web Share API with files where supported; otherwise download the PNG and copy the link.
- **Gotchas:** wait for `document.fonts.ready` before capture; Safari may need the capture run twice; use only same-origin images and self-hosted fonts.
- **Privacy:** the card shows the place name, never raw coordinates.
- **P2 link preview:** a Lambda route returns a small HTML page with Open Graph tags plus a generated image so WhatsApp can unfurl the live verdict. It adds a rendering dependency and risk, so it ships only after everything else.

## 16. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | Verdict visible within 3 s (warm, 4G); API p95 at most 2.5 s warm and 5 s cold; initial JS under 200 KB gzipped; Lighthouse mobile performance at least 90 |
| Reliability | Parallel upstream calls, 4 s timeouts, per-section fail-soft, stale-while-error up to 3 h |
| Privacy | No accounts or analytics; coordinates rounded to 2 decimals; logs contain no coordinates beyond one decimal; location requested only on tap |
| Security | Input validation, CORS allow-list, keys only in Lambda environment, reserved concurrency where the quota allows, dependencies pinned |
| Observability | One structured log line per request: request id, per-upstream duration and status, cache hit or miss |
| Accessibility | WCAG AA contrast, keyboard operable, screen-reader friendly verdict, reduced motion |
| Compatibility | Latest two versions of Chrome, Safari, Firefox and Edge; Android Chrome is the priority |
| Attribution and terms | CAMS and Open-Meteo credited in the UI; OpenAQ data providers credited; NASA FIRMS acknowledged; re-check Open-Meteo's free-tier terms before any commercial use |

## 17. Testing and validation

- **Unit tests (Vitest):** every breakpoint boundary (30/31, 60/61, 90/91, 120/121, 250/251); the full verdict matrix; each tip rule; best-window selection; haversine, bearing and upwind geometry. Inputs in tests are test fixtures only; the product never ships fixtures or mock data.
- **Live smoke script:** `scripts/smoke-live.ts` calls /api/assess for at least 12 places (metros, tier-2 cities, two small towns, a hill town, the builder's home city) and one point outside India. It asserts the response shape, prints the station-versus-model mix and per-source status, and exits non-zero on a schema break. Run it before every deploy.
- **Manual QA matrix:** geolocation allow, deny and timeout; slow-network throttling; offline; iOS Safari and Android Chrome share flows; desktop download fallback; dark mode; 360 px width.
- **Reality check (prospect):** compare the model forecast with the station readings that follow, for a few cities, and show the result.

## 18. Delivery plan (Fri 9 Oct to Sun 11 Oct)

| When | Work | Exit check |
|---|---|---|
| Fri evening | Fresh public repo (first commit dated today), workspace scaffold, core types, all four API clients with live proof for 3 places, OpenAQ and AWS accounts ready, day-one verifications from section 8 | Real PM2.5, forecast and weather returned for 3 places |
| Sat morning | /api/assess complete, core logic and unit tests | Smoke script green locally |
| Sat midday | Web P0: search, location button, verdict, chart, tips, provenance | Works end-to-end locally |
| Sat afternoon | SAM deploy and Amplify deploy | **Public URL by about 6 PM**, tested on a phone |
| Sat evening | Sensitivity toggle, error and stale states, accessibility pass | P0 definition of done met |
| Sun morning | P1: share card, deep link, saved places; P2 only if time remains | Code freeze around noon |
| Sun midday | Record and upload the video, write the writeup, final smoke run | Video plays signed out |
| Sun early afternoon | Submit, well before the deadline (check the schedule page for the exact hour) | Submission confirmed |

**Demo video storyboard (3:00 maximum)**

1. 0:00–0:20 The problem and the person: a number is not a decision.
2. 0:20–1:20 Live walkthrough: search a city, use my location, verdict, the reason, best window, tips, Sensitive toggle.
3. 1:20–1:50 Honesty: station versus model badge, timestamps, confidence.
4. 1:50–2:20 Share card to a messaging app.
5. 2:20–2:50 AWS: Amplify, Lambda Function URL, CloudWatch live-call logs, SAM template.
6. 2:50–3:00 Close with the public URL.

**Writeup outline:** problem and person; what was built; where AWS fits and why; data honesty and limits; AI coding tools used (list them even though the product has no AI); credits and licences.

**Submission checklist:** public repo whose history starts on 9 Oct; README with run steps, environment variables and architecture; live URL; YouTube video of 3 minutes or less that plays signed out; writeup; all submitted before the deadline.

## 19. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Sparse OpenAQ coverage in small towns | Many users see model estimates | Say so plainly, show confidence, test coverage on Friday, treat it as honesty and not as a bug |
| Model resolution (about 45 km) | Verdict may not match the street | Label as regional, prefer stations, never present hyperlocal claims |
| Upstream rate limits or outages | Missing sections | Caching, per-section fail-soft, stale-while-error, key-free sources where possible |
| Public Function URL abused | Cost or throttling | Reserved concurrency where allowed, CORS allow-list, budget alert |
| Geolocation denied or inaccurate | No location | Search always available, clear message |
| FIRMS detections are not only crop fires | Misleading smoke claim | P2 only, worded as fire detections and an indication |
| Share capture bugs on iOS Safari | Broken card | Self-hosted fonts, double render, download fallback |
| Eligibility challenge | Disqualification | New repo from today, honest commit history, no copied code, list credits |
| Time (solo, about 48 hours) | Unfinished scope | Strict tiers and the Saturday 6 PM cut rule |

## 20. Prospects (after the event)

Nothing here is part of the current scope.

- **AI features (Google AI Studio / Gemini):** advisories in Hindi and regional languages, plain-language explanations of why a day is bad, natural-language questions such as 'Can I run tomorrow?', and routines personalised to a user's day.
- **Persistence:** short links and stored card snapshots (for example DynamoDB), optional saved places across devices.
- **Alerts:** morning push, WhatsApp or SMS messages triggered by a schedule (for example EventBridge Scheduler with Lambda).
- **Localisation:** static Hindi and regional-language interface strings before any model-generated text.
- **Better data:** blending more station networks and community sensors, spatial interpolation, forecast bias correction against stations, and a published forecast-versus-observed track record.
- **Smoke and sources:** wind trajectories and source apportionment, building on lessons from Aerate.
- **More products:** school and workplace views for many places, indoor-air guidance, a map view, a PWA with offline support, and the Heat and Water track topics.
- **Accounts and roles:** only if multi-user features ever require them.
