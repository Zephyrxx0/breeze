# Decision logic runs in the browser, not on the server

The API returns raw normalised data (station reading, model forecast, weather) and the browser computes category, verdict, best window and tips from the shared `@breeze/core` package. The sensitivity toggle (FR-09) must recompute instantly with no network round-trip, and one deterministic, unit-tested implementation serves both the UI and the share-card renderer — so we accepted that decision logic ships in the client bundle and cannot be hot-fixed server-side.
