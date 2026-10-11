import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ShareCard } from "../components/ShareCard";
import { VerdictHero } from "../components/VerdictHero";
import { captureAndShareCard } from "../lib/shareCardCapture";
import type { AssessResponse } from "@breeze/core";

// Mock html-to-image
vi.mock("html-to-image", () => ({
  toPng: vi.fn().mockResolvedValue("data:image/png;base64,mockPng"),
  toBlob: vi.fn().mockImplementation(() =>
    Promise.resolve(new Blob(["mock-png-data"], { type: "image/png" }))
  ),
}));

const mockAssessmentData: AssessResponse = {
  location: {
    lat: 28.61,
    lon: 77.21,
    name: "New Delhi, Delhi",
    country: "India",
    countryCode: "IN",
    admin1: "Delhi",
    timezone: "Asia/Kolkata",
    utcOffsetSeconds: 19800,
  },
  air: {
    status: "ok",
    current: {
      pm25: 85.5,
      source: "station",
      measuredAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      station: {
        id: "loc-1",
        name: "Connaught Place Monitoring Station",
        distanceKm: 2.1,
      },
    },
    station: {
      status: "ok",
      station: {
        id: "loc-1",
        name: "Connaught Place Monitoring Station",
        distanceKm: 2.1,
      },
      latest: {
        pm25: 85.5,
        measuredAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      },
    },
    model: {
      status: "ok",
      current: {
        pm25: 80.0,
        time: "2026-10-11T12:00",
      },
      hourly: [
        { time: "2026-10-11T12:00", pm25: 80, pm10: 120 },
        { time: "2026-10-11T13:00", pm25: 85, pm10: 130 },
      ],
    },
  },
  meta: {
    assessedAt: new Date().toISOString(),
    engine: "breeze-engine-v1",
  },
};

describe("Share Card Feature (SHR-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ShareCard template component", () => {
    it("renders fixed 1080x1350 card with place, verdict, pm25, and provenance", () => {
      render(
        <ShareCard
          data={mockAssessmentData}
          profile="standard"
          tips={[
            { id: "mask", kind: "mask", priority: 1, text: "Wear an N95 mask outdoors" },
          ]}
        />
      );

      const card = screen.getByTestId("share-card-container");
      expect(card).toBeTruthy();
      expect(card.style.width).toBe("1080px");
      expect(card.style.height).toBe("1350px");

      // Place name
      expect(card.textContent).toContain("New Delhi, Delhi");

      // PM2.5 metric
      expect(card.textContent).toContain("86");
      expect(card.textContent).toContain("µg/m³");

      // Station provenance
      expect(card.textContent).toContain("Connaught Place Monitoring Station");
      expect(card.textContent).toContain("breeze-air.in");

      // Tips block
      expect(card.textContent).toContain("Wear an N95 mask outdoors");
    });

    it("renders model label when air source is model", () => {
      const modelOnlyData: AssessResponse = {
        ...mockAssessmentData,
        air: {
          ...mockAssessmentData.air,
          current: {
            pm25: 42.0,
            source: "model",
            measuredAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            modelDistanceNote: "Nearest ground station >50 km; regional estimate",
          },
        },
      };

      render(<ShareCard data={modelOnlyData} profile="standard" />);
      const card = screen.getByTestId("share-card-container");
      expect(card.textContent).toContain("Regional atmospheric model (~45 km)");
    });
  });

  describe("VerdictHero Share Card button state", () => {
    it("disables Share Card button when air status is unavailable", () => {
      const unavailableData: AssessResponse = {
        ...mockAssessmentData,
        air: {
          status: "unavailable",
          current: null,
        },
      };

      render(
        <VerdictHero
          data={unavailableData}
          onShareCard={vi.fn()}
        />
      );

      const shareButton = screen.getByTestId("share-card-button");
      expect(shareButton.hasAttribute("disabled")).toBe(true);
      expect(shareButton.getAttribute("title")).toContain("Air assessment unavailable");
    });

    it("shows 'Generating...' when isSharing is true", () => {
      render(
        <VerdictHero
          data={mockAssessmentData}
          onShareCard={vi.fn()}
          isSharing={true}
        />
      );

      const shareButton = screen.getByTestId("share-card-button");
      expect(shareButton.textContent).toContain("Generating...");
      expect(shareButton.hasAttribute("disabled")).toBe(true);
    });
  });

  describe("captureAndShareCard pipeline", () => {
    it("uses navigator.share when navigator.canShare returns true", async () => {
      const mockShare = vi.fn().mockResolvedValue(undefined);
      const mockCanShare = vi.fn().mockReturnValue(true);

      Object.defineProperty(navigator, "canShare", {
        value: mockCanShare,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(navigator, "share", {
        value: mockShare,
        configurable: true,
        writable: true,
      });

      const element = document.createElement("div");
      document.body.appendChild(element);

      await captureAndShareCard({
        element,
        placeName: "New Delhi",
        verdict: "Take care",
        canonicalUrl: "https://breeze.air/?lat=28.61&lon=77.21&n=New%20Delhi",
      });

      expect(mockCanShare).toHaveBeenCalledTimes(1);
      expect(mockShare).toHaveBeenCalledTimes(1);
      const shareArg = mockShare.mock.calls[0][0];
      expect(shareArg.title).toContain("New Delhi");
      expect(shareArg.files[0].name).toBe("breeze-new-delhi.png");

      document.body.removeChild(element);
    });

    it("falls back to file download and toast when navigator.canShare is false or absent", async () => {
      Object.defineProperty(navigator, "canShare", {
        value: () => false,
        configurable: true,
        writable: true,
      });

      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: mockWriteText },
        configurable: true,
        writable: true,
      });

      const onToast = vi.fn();
      const element = document.createElement("div");
      document.body.appendChild(element);

      // Spy on click
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

      await captureAndShareCard({
        element,
        placeName: "New Delhi",
        verdict: "Take care",
        canonicalUrl: "https://breeze.air/?lat=28.61&lon=77.21&n=New%20Delhi",
        onToast,
      });

      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(mockWriteText).toHaveBeenCalledWith("https://breeze.air/?lat=28.61&lon=77.21&n=New%20Delhi");
      expect(onToast).toHaveBeenCalledWith("Card downloaded & link copied to clipboard!");

      clickSpy.mockRestore();
      document.body.removeChild(element);
    });

    it("handles AbortError quietly without triggering fallback download", async () => {
      const abortError = new Error("User canceled");
      abortError.name = "AbortError";

      const mockShare = vi.fn().mockRejectedValue(abortError);
      Object.defineProperty(navigator, "canShare", {
        value: () => true,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(navigator, "share", {
        value: mockShare,
        configurable: true,
        writable: true,
      });

      const onToast = vi.fn();
      const element = document.createElement("div");
      document.body.appendChild(element);

      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

      await captureAndShareCard({
        element,
        placeName: "Bengaluru",
        verdict: "Good to go",
        canonicalUrl: "https://breeze.air/?lat=12.97&lon=77.59&n=Bengaluru",
        onToast,
      });

      // Should not trigger download or toast when aborted
      expect(clickSpy).not.toHaveBeenCalled();
      expect(onToast).not.toHaveBeenCalled();

      clickSpy.mockRestore();
      document.body.removeChild(element);
    });
  });
});

