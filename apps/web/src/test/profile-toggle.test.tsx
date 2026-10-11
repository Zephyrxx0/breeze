import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VerdictHero } from "../components/VerdictHero";
import { buildTips, type AssessResponse, type EffectivePm25 } from "@breeze/core";

// Mock AssessResponse with PM2.5 = 65 (Moderate category)
// Under Standard: category Moderate -> verdict "Take care", mask at 91
// Under Sensitive: category Moderate -> verdict "Take care" (or at 65, sensitive mask tip triggers!)
const mockAssessResponse: AssessResponse = {
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
      pm25: 65,
      source: "station",
      measuredAt: "2026-10-11T12:00:00.000Z",
      station: {
        id: "loc-delhi-1",
        name: "Connaught Place, Delhi",
        distanceKm: 2.4,
        ageMinutes: 12,
      },
    },
    model: {
      hourly: [
        { time: "2026-10-11T00:00", pm25: 50, pm10: 90 },
        { time: "2026-10-11T12:00", pm25: 65, pm10: 110 },
        { time: "2026-10-12T10:00", pm25: 70, pm10: 120 },
        { time: "2026-10-12T18:00", pm25: 85, pm10: 140 },
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
        uvIndex: 4,
      },
    ],
    daily: {
      uvIndexMax: [5],
    },
  },
  meta: {
    cachedAt: 0,
    requestId: "req-profile-test-1",
  },
};

describe("Sensitive Profile Toggle (UAX-01)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders Standard by default and displays explanatory caption", () => {
    render(
      <VerdictHero
        data={mockAssessResponse}
        profile="standard"
        onProfileChange={() => {}}
      />
    );

    expect(screen.getByRole("group", { name: /Health Sensitivity Profile/i })).toBeTruthy();
    expect(screen.getByText(/Lower thresholds for asthma, elderly, children & respiratory sensitivity/i)).toBeTruthy();

    const standardBtn = screen.getByRole("button", { name: "Standard" });
    const sensitiveBtn = screen.getByRole("button", { name: "Sensitive group" });

    expect(standardBtn).toBeTruthy();
    expect(sensitiveBtn).toBeTruthy();
  });

  it("updates verdict and reason lines client-side on profile toggle", () => {
    let currentProfile: "standard" | "sensitive" = "standard";
    const onProfileChange = vi.fn((newProfile: "standard" | "sensitive") => {
      currentProfile = newProfile;
    });

    const { rerender } = render(
      <VerdictHero
        data={mockAssessResponse}
        profile={currentProfile}
        onProfileChange={onProfileChange}
      />
    );

    // Initial reason line for standard profile
    expect(screen.getByText("Standard profile — general guidance for most people")).toBeTruthy();

    // Click Sensitive group
    fireEvent.click(screen.getByRole("button", { name: "Sensitive group" }));
    expect(onProfileChange).toHaveBeenCalledWith("sensitive");

    // Rerender with sensitive profile (simulating parent state update)
    rerender(
      <VerdictHero
        data={mockAssessResponse}
        profile="sensitive"
        onProfileChange={onProfileChange}
      />
    );

    // Reason line recomputed
    expect(screen.getByText("Your Sensitive profile acts at lower levels")).toBeTruthy();
  });

  it("triggers ZERO network refetches during profile recomputation", () => {
    const fetchSpy = vi.spyOn(window, "fetch");

    let activeProfile: "standard" | "sensitive" = "standard";
    const handleProfileChange = (p: "standard" | "sensitive") => {
      activeProfile = p;
      localStorage.setItem("breeze:profile", p);
    };

    const { rerender } = render(
      <VerdictHero
        data={mockAssessResponse}
        profile={activeProfile}
        onProfileChange={handleProfileChange}
      />
    );

    // Flip to sensitive
    fireEvent.click(screen.getByRole("button", { name: "Sensitive group" }));

    rerender(
      <VerdictHero
        data={mockAssessResponse}
        profile={activeProfile}
        onProfileChange={handleProfileChange}
      />
    );

    // Assert ZERO network calls occurred
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem("breeze:profile")).toBe("sensitive");
  });

  it("updates tips correctly between standard and sensitive profiles", () => {
    const effectivePm25: EffectivePm25 = {
      pm25: 65,
      source: "station",
      measuredAt: "2026-10-11T12:00:00Z",
      confidence: "high",
    };

    // Standard profile at PM2.5 = 65 (threshold for mask is 91) -> No mask tip
    const standardTips = buildTips(
      {
        effectivePm25,
        window: null,
      },
      "standard"
    );
    const hasStandardMask = standardTips.some((t) => t.id === "A1");
    expect(hasStandardMask).toBe(false);

    // Sensitive profile at PM2.5 = 65 (threshold for mask is 61) -> A1 Mask tip triggers!
    const sensitiveTips = buildTips(
      {
        effectivePm25,
        window: null,
      },
      "sensitive"
    );
    const hasSensitiveMask = sensitiveTips.some((t) => t.id === "A1");
    expect(hasSensitiveMask).toBe(true);

    // Also A5 inhaler tip triggers at ≥31 µg/m³ for sensitive profile
    const hasSensitiveInhaler = sensitiveTips.some((t) => t.id === "A5");
    expect(hasSensitiveInhaler).toBe(true);
  });
});
