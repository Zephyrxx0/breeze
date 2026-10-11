# Breeze: Video Walkthrough Script & Demo Checklist

**Maximum Duration Ceiling:** 3 minutes (03:00)  
**Target Duration:** 02:45 – 02:55  
**Format:** Screen recording with voiceover narration + webcam picture-in-picture (optional).  
**Resolution:** 1080p (1920×1080) at 60 fps.  

---

## 1. Timing & Screenplay Guide

| Timestamp | Screen Action | Voiceover Script |
|---|---|---|
| **0:00 – 0:20** | **Hook & Problem Statement:**<br/>Open on browser with clean Breeze homepage (`main.d3332j0zzsigpw.amplifyapp.com`). Clean, fast load. | *"Every day in India, millions of people ask: is the air outside safe for me right now, and what should I do about it? Traditional apps answer with abstract numbers like 'AQI 320' or hide behind slow ads and mandatory accounts. We built Breeze — one plain-language, honest verdict visible in under three seconds with zero mock data."* |
| **0:20 – 0:50** | **Core Verdict & Location Search:**<br/>Type "Connaught Place, New Delhi". Results drop down instantly. Click to select. | *"Let's check Connaught Place in Central Delhi. In a single second, Breeze gives you one clear verdict: 'Take care' or 'Stay indoors if you can'. No confusing numbers to guess — just plain language, backed by the official CPCB PM2.5 standards. Notice the reasons: PM2.5 is 86 µg/m³, measured just 10 minutes ago from an official monitoring station 2 km away."* |
| **0:50 – 1:20** | **Sensitive Group & Tomorrow Forecast:**<br/>1. Click the "Sensitive group" toggle.<br/>2. Click the "Tomorrow" tab. | *"If someone in your family has asthma, is elderly, or is a child, tap 'Sensitive group'. With zero network lag, the verdict instantly recalculates with stricter safety thresholds. Now let's look ahead: tap 'Tomorrow'. Breeze analyzes 48 hours of atmospheric forecast and highlights the cleanest 3-hour window — showing you exactly when to run errands or ventilate your home."* |
| **1:20 – 1:50** | **Data Honesty & Rural Regional Fallback:**<br/>Search a rural town without ground stations (e.g. "Kedarnath" or "Coorg"). | *"What happens when there's no ground monitoring station nearby? Other apps invent a fake number. Breeze never fakes data. When we look up a rural area, Breeze openly labels the reading as a 'Regional atmospheric model (~45 km)' from ECMWF Copernicus, lowering the confidence badge to Low. You always know where your numbers came from."* |
| **1:50 – 2:20** | **Visual Sharing & Saved Places:**<br/>1. Tap "Share Card".<br/>2. Tap the bookmark icon to save Delhi.<br/>3. Switch between saved place chips. | *"When you want to protect family or friends on WhatsApp, tap 'Share Card'. Breeze renders a crisp 1080x1350 story card right inside your browser, ready to share or download. You can also save up to five favorite places into instant quick chips with one tap, stored completely privately in your own browser."* |
| **2:20 – 2:45** | **AWS Architecture & Zero-Cost Serverless:**<br/>Switch tab to AWS Console / SAM template snippet (`apps/api`). | *"Under the hood, Breeze is powered by AWS. The frontend is hosted on AWS Amplify for global edge distribution. The backend runs Hono on an AWS Lambda Function URL powered by ARM64 Graviton. By skipping API Gateway, we cut costs to zero and dropped cold starts under 400 milliseconds. All core logic runs in a pure TypeScript package with 100% deterministic test coverage."* |
| **2:45 – 3:00** | **Call to Action & Wrap-up:**<br/>Return to Breeze browser window. | *"Breeze: transparent, actionable air quality for everyone in India. Try it live today at our Amplify URL. Thank you!"* |

---

## 2. Pre-Recording Technical Checklist

- [ ] **Clean Browser Environment:**
  - Open a fresh incognito / private browser window.
  - Disable all third-party browser extensions and ad blockers.
  - Browser zoom set to 100% or 110% for crisp typography.
  - Screen resolution set to 1920×1080.
- [ ] **Live Connectivity:**
  - Verify live API endpoint responds with HTTP 200:
    ```bash
    curl -s "https://gnwpit4zuxcyot7ojhizhvi3ji0sbihv.lambda-url.ap-south-1.on.aws/api/assess?lat=28.61&lon=77.21" | jq .air.status
    ```
- [ ] **Audio Quality:**
  - Dedicated external microphone tested.
  - Background noise filtered / silenced.
- [ ] **Timing Verification:**
  - Run through script with stopwatch; ensure total runtime does not exceed 2 minutes 55 seconds.

