import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ReadingBadge, CATEGORY_CONFIG } from "../components/ReadingBadge";
import { VerdictHero } from "../components/VerdictHero";
import { ForecastChart } from "../components/ForecastChart";
import { MainView } from "../App";
import type { AssessResponse } from "@breeze/core";
import fs from "node:fs";
import path from "node:path";

const mockFullAssessResponse: AssessResponse = {
  location: {
    lat: 28.61,
    lon: 77.21,
    name: "New Delhi",
    country: "India",
    timezone: "Asia/Kolkata",
    utcOffsetSeconds: 19800,
  },
  air: {
    status: "ok",
    current: {
      pm25: 75,
      source: "station",
      measuredAt: "2026-10-11T12:00:00.000Z",
      station: {
        id: "loc-1",
        name: "Mandir Marg",
        distanceKm: 3.2,
        ageMinutes: 10,
      },
    },
    model: {
      hourly: [
        { time: "2026-10-11T10:00", pm25: 55 },
        { time: "2026-10-11T11:00", pm25: 65 },
        { time: "2026-10-11T12:00", pm25: 75 },
        { time: "2026-10-11T13:00", pm25: 85 },
        { time: "2026-10-12T10:00", pm25: 95 },
      ],
    },
  },
  weather: {
    status: "ok",
    hourly: [
      {
        time: "2026-10-11T12:00",
        apparentTemperature: 28,
        precipitationProbability: 0,
        uvIndex: 3,
      },
    ],
    daily: {
      uvIndexMax: [4],
    },
  },
  meta: {
    cachedAt: 0,
    requestId: "req-a11y-1",
  },
};

describe("WCAG AA Accessibility Suite (UAX-02)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    vi.setSystemTime(new Date("2026-10-11T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("1. Non-Color Triad (Text + Number + Semantic Icon)", () => {
    it("renders text, numeric PM2.5, and distinct semantic SVG icons for all categories", () => {
      const testCases = [
        { cat: "Good", pm25: 25 },
        { cat: "Satisfactory", pm25: 50 },
        { cat: "Moderate", pm25: 75 },
        { cat: "Poor", pm25: 110 },
        { cat: "Very Poor", pm25: 180 },
        { cat: "Severe", pm25: 350 },
      ];

      for (const tc of testCases) {
        const { unmount } = render(
          <ReadingBadge
            pm25={tc.pm25}
            category={tc.cat}
            source="station"
            confidence="high"
          />
        );

        // 1. Numeric PM2.5
        const numberEl = screen.getByTestId("reading-pm25");
        expect(numberEl.textContent).toBe(String(tc.pm25));

        // 2. Text Category
        const badgeEl = screen.getByTestId("reading-category-badge");
        expect(badgeEl.textContent).toContain(tc.cat);

        // 3. Semantic Icon
        const iconEl = screen.getByTestId("reading-category-icon");
        expect(iconEl).toBeTruthy();
        expect(iconEl.getAttribute("aria-hidden")).toBe("true");

        unmount();
      }
    });

    it("renders semantic icon on VerdictHero headline", () => {
      render(
        <VerdictHero
          data={mockFullAssessResponse}
          profile="standard"
          onProfileChange={() => {}}
        />
      );

      const verdictIcon = screen.getByTestId("verdict-hero-icon");
      expect(verdictIcon).toBeTruthy();
      expect(verdictIcon.getAttribute("aria-hidden")).toBe("true");
    });
  });

  describe("2. Polite ARIA Live Announcements", () => {
    it("announces verdict on load and tab switch", () => {
      const onAnnounce = vi.fn();
      render(
        <VerdictHero
          data={mockFullAssessResponse}
          profile="standard"
          onProfileChange={() => {}}
          onAnnounce={onAnnounce}
        />
      );

      // Called on initial mount
      expect(onAnnounce).toHaveBeenCalledWith(
        expect.stringMatching(/^Today: Take care, PM2.5 75 µg\/m³, Moderate/)
      );

      // Switch to tomorrow tab
      const tomorrowBtn = screen.getByRole("button", { name: "Tomorrow" });
      fireEvent.click(tomorrowBtn);

      expect(onAnnounce).toHaveBeenCalledWith(
        expect.stringMatching(/^Tomorrow:/)
      );
    });

    it("announces updated profile and recalculated verdict on profile switch", () => {
      const onAnnounce = vi.fn();
      const onProfileChange = vi.fn();
      render(
        <VerdictHero
          data={mockFullAssessResponse}
          profile="standard"
          onProfileChange={onProfileChange}
          onAnnounce={onAnnounce}
        />
      );

      const sensitiveBtn = screen.getByRole("button", { name: "Sensitive group" });
      fireEvent.click(sensitiveBtn);

      expect(onProfileChange).toHaveBeenCalledWith("sensitive");
      expect(onAnnounce).toHaveBeenCalledWith(
        "Profile updated to Sensitive group. Recalculated verdict: Take care"
      );
    });

    it("debounces chart keyboard scrub live announcements at 120ms", () => {
      const hourly = [
        { time: "2026-10-11T12:00", pm25: 50 },
        { time: "2026-10-11T13:00", pm25: 80 },
        { time: "2026-10-11T14:00", pm25: 120 },
      ];

      render(<ForecastChart hourly={hourly} utcOffsetSeconds={19800} />);

      const slider = screen.getByRole("slider");
      expect(slider).toBeTruthy();

      // Live region starts empty or with now announcement after 120ms
      act(() => {
        vi.advanceTimersByTime(120);
      });

      const liveRegion = slider.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeTruthy();

      // Press ArrowRight to move to index 1
      fireEvent.keyDown(slider, { key: "ArrowRight" });

      // Before 120ms debounce: announcement has not updated to index 1 yet
      act(() => {
        vi.advanceTimersByTime(60);
      });
      expect(liveRegion?.textContent).not.toContain("80 µg/m³");

      // After full 120ms debounce: announcement updates
      act(() => {
        vi.advanceTimersByTime(70);
      });
      expect(liveRegion?.textContent).toContain("80 µg/m³");
      expect(liveRegion?.textContent).toContain("Moderate");
    });
  });

  describe("3. Keyboard Operability & Focus Rings", () => {
    it("has accessible slider attributes and keyboard navigation on ForecastChart", () => {
      const hourly = [
        { time: "2026-10-11T12:00", pm25: 40 },
        { time: "2026-10-11T13:00", pm25: 60 },
      ];

      render(<ForecastChart hourly={hourly} utcOffsetSeconds={19800} />);

      const slider = screen.getByRole("slider");
      expect(slider.getAttribute("tabIndex")).toBe("0");
      expect(slider.getAttribute("aria-valuemin")).toBe("0");
      expect(slider.getAttribute("aria-valuemax")).toBe("1");
      expect(slider.className).toContain("focus-visible:ring-blue-600");
    });
  });

  describe("4. Prefers-Reduced-Motion & WCAG AA Tokens", () => {
    it("tokens.css defines @media (prefers-reduced-motion: reduce) rules", () => {
      const cssPath = path.resolve(__dirname, "../styles/tokens.css");
      const cssContent = fs.readFileSync(cssPath, "utf-8");

      expect(cssContent).toContain("@media (prefers-reduced-motion: reduce)");
      expect(cssContent).toContain("animation-duration: 0.01ms");
      expect(cssContent).toContain("transition-duration: 0.01ms");
      expect(cssContent).toContain(".animate-pulse");
    });

    it("verifies contrast-compliant color tokens in CATEGORY_CONFIG", () => {
      // Good: emerald-950 on emerald-50
      expect(CATEGORY_CONFIG.Good.text).toBe("text-emerald-950");
      expect(CATEGORY_CONFIG.Good.bg).toBe("bg-emerald-50");

      // Satisfactory: lime-950 on lime-50
      expect(CATEGORY_CONFIG.Satisfactory.text).toBe("text-lime-950");
      expect(CATEGORY_CONFIG.Satisfactory.bg).toBe("bg-lime-50");

      // Moderate: amber-950 on amber-50
      expect(CATEGORY_CONFIG.Moderate.text).toBe("text-amber-950");
      expect(CATEGORY_CONFIG.Moderate.bg).toBe("bg-amber-50");

      // Poor: orange-950 on orange-50
      expect(CATEGORY_CONFIG.Poor.text).toBe("text-orange-950");
      expect(CATEGORY_CONFIG.Poor.bg).toBe("bg-orange-50");

      // Very Poor: rose-950 on rose-50
      expect(CATEGORY_CONFIG["Very Poor"].text).toBe("text-rose-950");
      expect(CATEGORY_CONFIG["Very Poor"].bg).toBe("bg-rose-50");

      // Severe: red-950 on red-100
      expect(CATEGORY_CONFIG.Severe.text).toBe("text-red-950");
      expect(CATEGORY_CONFIG.Severe.bg).toBe("bg-red-100");
    });
  });
});
