# Breeze

A live go / no-go assessment of outdoor air quality for any place in India, delivered as a verdict with reasons, a forecast window, and actionable tips. No accounts, no database — every number is live and carries a source.

## Language

**PM2.5 Category**:
The six-band classification (Good, Satisfactory, Moderate, Poor, Very Poor, Severe) applied to a PM2.5 concentration in µg/m³. Bands are defined on the continuous scale with half-open boundaries: [0,30], (30,60], (60,90], (90,120], (120,250], (250,∞) — fractional readings are never rounded before classifying.
_Avoid_: AQI, NAQI, air quality index. Breeze shows a PM2.5 category, never an AQI, because CPCB's index is defined on 24-hour averages and Breeze applies the breakpoints to current and hourly values.

**Verdict**:
The single plain-language decision for a place — *Good to go*, *Take care*, or *Stay indoors if you can* — derived from a PM2.5 Category and the user's profile, plus up to two reason lines.
_Avoid_: advice, recommendation, assessment (an assessment contains a verdict; they are not the same thing).

**Profile**:
The user's sensitivity setting, either Standard or Sensitive, stored on the device. It makes verdicts and tips stricter; it never changes the data.
_Avoid_: mode, account, preference, persona.

**Place**:
A point identified by its coordinates (rounded to two decimals, which form its identity) plus a display label. Search results, GPS fixes, saved chips and deep links are all the same concept; the label is presentation only and never determines behaviour.
_Avoid_: location (ambiguous — can mean the device's GPS), city, destination.

**Assessment**:
Everything Breeze knows about one Place at one moment — current reading, forecast, weather — and everything derived from it (verdict, best window, tips). The day boundaries inside an assessment are the Place's local days, not the viewer's.
_Avoid_: check-up, reading (a reading is one number; an assessment is the whole picture).

**Effective PM2.5**:
The single value the verdict is based on: the nearest qualifying station reading if one exists, otherwise the regional model estimate for the current hour. The source is always named to the user.
_Avoid_: AQI value, the reading, ambient value.

**Confidence**:
A High / Medium / Low judgement of how trustworthy the effective PM2.5 is — High for a nearby, fresh station, Medium for a distant station, Low for a model estimate.
_Avoid_: accuracy, certainty, quality score.

**Best Window**:
The cleanest 3-hour block within the next 24 hours of daytime hours, presented as a fact ("levels about X% lower than the rest of the day") — never as an invitation to go out when the window's own air is Poor or worse.
_Avoid_: safe window, good time (implies a guarantee Breeze cannot make).

**Stale**:
An assessment served from cache because the live fetch failed; it always carries its age. A merely old measurement is not stale — its age is shown on the number itself.
_Avoid_: old, cached, outdated (blurs "we couldn't refresh" with "the measurement is old").
