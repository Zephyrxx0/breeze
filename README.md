# Breeze (India)

**Is the air outside OK for me right now, and what should I do about it?**

Breeze provides one honest, plain-language verdict for any resident or visitor anywhere in India. No abstract composite AQI numbers, no mandatory accounts, no ads, and **zero mock data**.

Every single measurement is fetched live, timestamped, and attributed either to an official ground monitoring station or to an ECMWF Copernicus regional model grid cell (~45 km). When upstream data is missing, Breeze tells you honestly instead of inventing a number.

---

## Key Features

1. **One Plain-Language Verdict:**
   - Three actionable outcomes: **"Good to go"**, **"Take care"**, or **"Stay indoors if you can"**.
   - Derived from a strict 12-cell decision matrix matching India CPCB (Central Pollution Control Board) PM2.5 breakpoints.
   - Number-first explanations (e.g. *"PM2.5 is 86 µg/m³ — Moderate, from a station 2 km away"*).

2. **Ground Station vs. Regional Model Transparency:**
   - Official regulatory stations via OpenAQ within 25 km are prioritized with freshness badges.
   - When no station is nearby, Breeze transparently displays regional atmospheric model data from ECMWF Copernicus (CAMS Global ~45 km) with a confidence rating (High / Medium / Low).

3. **Cleanest 3-Hour Window Finder:**
   - Scans 48-hour local hourly forecasts to highlight the cleanest contiguous 3-hour period for safe outdoor activities, errands, or window ventilation.

4. **Health Sensitivity Profile Toggle:**
   - Instant zero-refetch toggle between **Standard** and **Sensitive Group** (asthma, COPD, children, elderly, cardiovascular conditions) with lower tolerance thresholds.

5. **Visual Sharing & Deep Linking:**
   - **1080×1350 PNG Share Card:** Client-side rendered story-proportioned image via Web Share API or one-tap download with link clipboard copy.
   - **Canonical Deep Links:** Share exact place assessments using clean coordinate and place query strings (`/?lat=28.61&lon=77.21&n=New%20Delhi`).
   - **Saved Places:** Bookmark up to 5 quick places in browser storage (`breeze:saved-places`) with active place chip indicators and zero-latency switching.

6. **Educational About Dialog:**
   - Transparent explanations of PM2.5 vs composite AQI, station vs 45 km model physics, confidence metrics, and open data licensing.

---

## System Architecture

Breeze is architected as an ultra-lightweight, zero-cost-tier monorepo:

```mermaid
graph TD
    User([User Browser]) -->|HTTPS| WebApp[AWS Amplify Hosting<br/>React 19 + Vite 8 SPA]
    WebApp -->|GET /api/assess?lat=..&lon=..| LambdaAPI[AWS Lambda Function URL<br/>Hono on Node.js 24 arm64]
    LambdaAPI -->|Shared Logic| CorePkg[@breeze/core Engine<br/>Pure TypeScript Matrix]
    
    subgraph Upstream Data Sources
        LambdaAPI -->|Live PM2.5 Stations| OpenAQ[OpenAQ v3 API]
        LambdaAPI -->|CAMS Global 45km Forecast| CAMS[Open-Meteo Air Quality API]
        LambdaAPI -->|Hourly Weather & UV| OMWeather[Open-Meteo Forecast API]
    end
    
    WebApp -->|Client-side Geocoding| OMGeo[Open-Meteo Geocoding API]
    WebApp -->|Client-side Reverse Geo| BigDataCloud[BigDataCloud Reverse Geocoding]
```

### Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Web SPA** | React 19, TypeScript, Vite 8, Tailwind CSS v4 | Sub-200 KB initial JS gzip budget, CSS-first token styling, instant reactivity. |
| **API** | Hono 4, Node.js 24 (arm64), `@hono/aws-lambda` | Direct Lambda Function URL (no API Gateway latency or cost), sub-second cold starts. |
| **Core Domain** | `@breeze/core` (pure TS) | Zero-dependency domain model shared between API and Web: CPCB categories, haversine math, verdict matrices, tip generator. |
| **Data Fetching** | TanStack Query v5 | Client-side query caching, deduplication, and resilient fail-soft state management. |
| **Image Generation**| `html-to-image` | Client-side 1080×1350 canvas rasterization with WebKit warm-up loop. |
| **Testing** | Vitest 5 | 17 test suites (96 tests) across core, API, and web with multi-timezone validation. |

---

## Data Honesty Guarantees

- **100% Live Upstream Data:** Every measurement comes from official sensors or peer-reviewed CAMS reanalysis.
- **Fail-Soft Status Reporting:** When an upstream service is unreachable, the affected section displays `unavailable` with a user-friendly retry button rather than fallback mock numbers.
- **Privacy by Design:** Coordinates are rounded to 2 decimal places (~1.1 km) before logging and querying. No tracking cookies, no advertising scripts, and no analytics databases.

---

## Getting Started

### Prerequisites

- Node.js >= 22.12 (Node 24 recommended)
- `pnpm` >= 10 (`corepack enable pnpm`)

### Installation

```bash
git clone https://github.com/your-username/breeze.git
cd breeze
pnpm install
```

### Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `OPENAQ_API_KEY` | *(Optional)* API key from [explore.openaq.org](https://explore.openaq.org). Without a key, Breeze runs in graceful model-only fallback mode. |

### Development Commands

```bash
# Start both Web and API concurrently
pnpm dev

# Run unit and integration tests across monorepo
pnpm test

# Run multi-timezone test suite (UTC and Asia/Kolkata invariants)
pnpm test:tz

# Build web application for production
pnpm --filter @breeze/web build

# Execute live upstream API contract smoke verification
pnpm smoke
```

---

## Deployment

### AWS Lambda API Deployment (AWS SAM)

The API is bundled using `esbuild` and deployed to an AWS Lambda Function URL:

```bash
cd apps/api
sam build
sam deploy --guided
```

### Frontend Static Hosting (AWS Amplify)

The React web application is built to static assets (`apps/web/dist`) and hosted via AWS Amplify Hosting or any S3 + CloudFront distribution.

---

## Open Data Attributions & Licenses

- **Copernicus Atmosphere Monitoring Service (CAMS):** European Centre for Medium-Range Weather Forecasts (ECMWF) & Open-Meteo ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)).
- **OpenAQ:** Air quality monitoring data licensed under Open Database License (ODbL) and CC BY 4.0.
- **Open-Meteo:** Weather and air quality forecast APIs ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)).
- **BigDataCloud:** Free client-side reverse geocoding API.
