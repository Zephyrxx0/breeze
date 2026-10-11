# Breeze — Hackathon Submission Writeup

**Project Title:** Breeze: India Live Air Verdict  
**Submission Category:** Web Applications / Public Utility / Climate & Environmental Impact  
**Core Purpose:** Answer one question for any resident or visitor in India: *is the air outside OK for me right now, and what should I do about it?*  
**Live Application URL:** https://main.d36a3fyg1r79q6.amplifyapp.com  
**API Endpoint (AWS Lambda Function URL):** https://6u7szg647lq72w2345v4oxl42e0ypmfn.lambda-url.ap-south-1.on.aws/api/assess  
**Repository:** https://github.com/zeph/breeze  

---

## 1. Problem & Context

India is home to many of the most polluted cities in the world. During winter inversions, stubble burning periods, and industrial peaks, particulate matter (PM2.5) concentrations routinely exceed safe World Health Organization guidelines by 10 to 50 times.

Yet, the digital tools available to citizens suffer from three major systemic flaws:
1. **Abstract, Obscure Metrics:** Existing apps display opaque, unitless numbers like "AQI 342" without translating what this means for a morning jog, a child with asthma, or ventilating a room.
2. **False Precision & Data Dishonesty:** When ground monitoring stations fail or don't exist in a district, apps frequently interpolate or display stale/fabricated numbers without disclosing the source.
3. **Heavy, Ad-Laden Interfaces:** Commercial platforms force users through account signups, push-notification prompts, cluttered ads, and megabytes of JavaScript that choke on spotty 3G/4G connections.

---

## 2. What We Built

Breeze is a fast, lightweight, privacy-respecting progressive web application built to serve every person in India with **one honest verdict** in under three seconds:

### Core Pillars

1. **One Plain-Language Verdict:**
   - **Good to go** (Green): Safe for all typical outdoor activities.
   - **Take care** (Amber): Sensitive individuals and prolonged strenuous exertion should exercise caution.
   - **Stay indoors if you can** (Red): Hazardous particulate levels; masks and indoor air filtration strongly recommended.
   - Backed by an authoritative 12-cell matrix mapping directly to Indian CPCB (Central Pollution Control Board) standards.

2. **Full Data Honesty & Provenance:**
   - Every number shows its exact origin: an official ground monitoring station (with station name and distance in km) or ECMWF Copernicus regional model reanalysis (~45 km grid cell).
   - Timestamped with measurement age. If data is stale (>3 hours), a warning is rendered. If an upstream API fails, the section degrades to `unavailable` rather than hallucinating mock data.

3. **Cleanest 3-Hour Window:**
   - Scans 48-hour place-local forecasts to highlight the cleanest 3-hour window (e.g. *"Cleanest air today is 2:00 PM – 5:00 PM (35% cleaner)"*).

4. **Instant Sensitivity Toggle:**
   - One-click toggle between Standard and Sensitive Group (elderly, asthma, COPD, pediatric) with lower exposure thresholds, updating verdicts with zero network refetch.

5. **Client-Side Story Share Cards:**
   - Renders a pixel-perfect 1080×1350 PNG share card entirely client-side using `html-to-image` and Web Share API, with automatic image download and link clipboard fallback.

6. **Privacy-Preserving & Zero-Account:**
   - No user database, no cookies, no tracking. Coordinates are truncated to 2 decimal places before API querying to prevent location fingerprinting.

---

## 3. AWS Architecture & Technical Rationale

Breeze was built specifically to demonstrate high reliability, ultra-low operational costs, and rapid responsiveness using serverless AWS primitives:

```
[ Browser / Mobile Client ]
            │
            ├──── HTTPS ───► [ AWS Amplify Hosting ] (Static SPA, React 19 + Vite 8)
            │
            └──── HTTPS ───► [ AWS Lambda Function URL (ap-south-1) ]
                                  │   (Hono 4 on Node.js 24 arm64)
                                  │
                                  ├──► OpenAQ v3 API (Ground PM2.5 Stations)
                                  ├──► Open-Meteo Air Quality (ECMWF CAMS 45km)
                                  └──► Open-Meteo Forecast (Weather, UV, Rain)
```

### Architecture Decisions

- **AWS Lambda Function URL instead of API Gateway:**
  - *Why:* For a single public REST endpoint (`GET /api/assess`), Lambda Function URLs eliminate API Gateway request fees, reduce configuration complexity, and strip 15–30 ms of proxy latency.
  - *Runtime:* Node.js 24 on Graviton (`arm64`) provides sub-second cold starts (<450 ms) and warm response times under 150 ms.
- **In-Memory LRU Cache with Stale-While-Revalidate:**
  - In-memory 15-minute TTL caching on 2-decimal rounded coordinates shields upstream open-data APIs from rate limits and ensures blazing performance under traffic spikes.
- **AWS Amplify Hosting:**
  - Global CDN edge caching for the Vite 8 single-page application.
  - Zero server maintenance, automated CI/CD branch deployments, and a total initial JS gzip payload of just **127.5 KB** (well within our 200 KB budget).
- **Zero Database Footprint:**
  - Breeze eliminates RDS/DynamoDB cost entirely; saved places and user preferences are stored in the user's browser `localStorage`, guaranteeing 100% data ownership and privacy.

---

## 4. Verification & Performance Metrics

- **Bundle Size:**
  - `dist/assets/index.js`: **127.53 kB** gzipped (Target: <200 kB).
  - `dist/assets/index.css`: **8.50 kB** gzipped.
- **Automated Test Coverage:**
  - **17 test files, 96 unit & integration tests** passing with 100% green status across `@breeze/core`, `@breeze/api`, and `@breeze/web`.
  - Multi-timezone invariant suite (`pnpm test:tz`) verifies identical calculation results under both `TZ=UTC` and `TZ=Asia/Kolkata`.
- **Live Contract Smoke Testing:**
  - Validated against live production APIs in Delhi, Mumbai, Bengaluru, and rural non-station coordinates.

---

## 5. Mandatory AI Coding Tool Disclosures

In accordance with hackathon guidelines, we disclose all AI coding assistance utilized during development:

- **AI Tools Used:**
  - Google Gemini / Claude Code CLI agentic workflows for scaffolding, code editing, test authoring, and documentation generation.
- **Human Architectural Oversight & Quality Control:**
  - All domain rules, CPCB threshold math, fail-soft state machines, and data-honesty constraints were conceived, directed, and reviewed by human engineers.
  - **Zero Runtime AI:** Breeze contains **no LLMs or runtime AI models** in its inference path. All assessments, reason lines, and tips are computed deterministically via `@breeze/core` pure functions in <1 millisecond, guaranteeing zero hallucinations, zero token costs, and 100% predictable medical-grade guidance.
