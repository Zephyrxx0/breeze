---
status: testing
phase: 05-sharing-submission
source:
  - 05-01-SUMMARY.md
  - 05-02-SUMMARY.md
  - 05-03-SUMMARY.md
started: 2026-10-11T20:55:00+05:30
updated: 2026-10-11T20:55:00+05:30
---

## Current Test

number: 1
name: Copy Link Canonical Deep Linking
expected: |
  On any loaded air assessment (e.g. New Delhi), click "Copy Link" in the VerdictHero card.
  A toast notification appears saying "Link copied to clipboard!".
  Pasting into the address bar opens the exact place with live assessment data.
awaiting: user response

## Tests

### 1. Copy Link Canonical Deep Linking
expected: On any loaded air assessment, clicking "Copy Link" copies `/?lat=..&lon=..&n=..` to clipboard and triggers a non-blocking toast.
result: [pending]

### 2. 1080x1350 PNG Share Card Generation & Web Share
expected: Clicking "Share Card" generates a high-resolution 1080x1350 PNG card with verdict, PM2.5, tips, and provenance. On desktop/unsupported devices, it automatically downloads `breeze-<place>.png` and copies the link to clipboard with a toast.
result: [pending]

### 3. Quick Saved Places Chips Bar & 5-Place Ceiling
expected: Tapping the bookmark icon in the search box saves the current place to a quick chip below the search bar. Tapping a chip immediately loads that place. Tapping the discrete (x) removes it. Attempting to save more than 5 places triggers a ceiling warning toast.
result: [pending]

### 4. Accessible About & Data Sources Dialog
expected: Clicking "About" in the top header or the trigger in the footer opens the educational modal explaining PM2.5 vs AQI, station vs 45km model, confidence ratings, and licenses. Pressing Escape or clicking the backdrop closes it cleanly.
result: [pending]

### 5. Final Submission Package & Automated Checks
expected: Production README.md, SUBMISSION.md with AI disclosures, and docs/VIDEO_WALKTHROUGH.md are fully authored and aligned with verified live AWS Amplify and Lambda Function URLs.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
