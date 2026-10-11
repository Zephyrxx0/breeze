import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorCard } from "../components/ErrorCard";
import { ReadingBadge } from "../components/ReadingBadge";
import { VerdictHero } from "../components/VerdictHero";
import type { AssessResponse } from "@breeze/core";

const mockStationOnlyResponse: AssessResponse = {
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
      pm25: 45,
      source: "station",
      measuredAt: "2026-10-11T12:00:00.000Z",
      station: {
        id: "station-1",
        name: "ITO Station",
        distanceKm: 3.2,
        ageMinutes: 20,
      },
    },
    model: {
      hourly: [], // Model failed / empty
    },
  },
  meta: {
    cachedAt: 0,
    requestId: "req-failsoft-test-1",
  },
};

const mockModelOnlyResponse: AssessResponse = {
  location: {
    lat: 28.61,
    lon: 77.21,
    name: "Rural Area",
    country: "India",
    timezone: "Asia/Kolkata",
    utcOffsetSeconds: 19800,
  },
  air: {
    status: "ok",
    current: {
      pm25: 55,
      source: "model",
      measuredAt: "2026-10-11T12:00:00.000Z",
    },
    model: {
      hourly: [
        { time: "2026-10-11T12:00", pm25: 55, pm10: 80 },
        { time: "2026-10-12T12:00", pm25: 60, pm10: 90 },
      ],
    },
  },
  meta: {
    cachedAt: 0,
    requestId: "req-failsoft-test-2",
  },
};

describe("Honest Fail-Soft States (ASM-03, ASM-04)", () => {
  it("renders ErrorCard on total air failure with accessible Retry button and zero fake numbers", () => {
    const onRetry = vi.fn();
    render(<ErrorCard onRetry={onRetry} />);

    expect(screen.getByRole("heading", { name: "Can't assess right now" })).toBeTruthy();
    expect(
      screen.getByText(/Live upstream air data is temporarily unavailable/i)
    ).toBeTruthy();

    const retryBtn = screen.getByRole("button", { name: /Retry/i });
    expect(retryBtn).toBeTruthy();
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledOnce();

    // Verify no fake numbers or fake units are rendered
    expect(screen.queryByText(/µg\/m³/i)).toBeNull();
  });

  it("renders warm amber badge when air data is stale from cache", () => {
    render(
      <ReadingBadge
        pm25={85}
        category="Moderate"
        source="station"
        confidence="medium"
        station={{
          name: "Anand Vihar",
          distanceKm: 5.5,
          ageMinutes: 42,
        }}
        isStale={true}
      />
    );

    // Stale pill badge
    expect(screen.getByText("Cached 42m ago")).toBeTruthy();
    // Subtext explanation
    expect(
      screen.getByText(/Upstream live data timed out; showing cached data from 42m ago\./i)
    ).toBeTruthy();
  });

  it("handles station-only degrade path: disables Tomorrow tab and shows inline warning", () => {
    render(
      <VerdictHero
        data={mockStationOnlyResponse}
        profile="standard"
        onProfileChange={() => {}}
      />
    );

    // Today tab is available
    const todayBtn = screen.getByRole("button", { name: "Today" });
    expect(todayBtn).toBeTruthy();

    // Tomorrow tab is disabled
    const tomorrowBtn = screen.getByRole("button", { name: "Tomorrow" });
    expect(tomorrowBtn).toHaveProperty("disabled", true);

    // Inline note explaining model is temporarily unavailable
    expect(screen.getByText("Forecast model temporarily unavailable")).toBeTruthy();
  });

  it("handles model-only degrade path: clearly labels regional model estimate and low confidence", () => {
    render(
      <ReadingBadge
        pm25={mockModelOnlyResponse.air.current.pm25}
        category="Satisfactory"
        source="model"
        confidence="low"
      />
    );

    expect(screen.getByText("Regional model estimate (~45 km)")).toBeTruthy();
    expect(screen.getByText("low confidence")).toBeTruthy();
  });
});
