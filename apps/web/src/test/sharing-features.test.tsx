import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Toast } from "../components/Toast";
import { SavedPlacesBar } from "../components/SavedPlacesBar";
import { AboutModal } from "../components/AboutModal";

describe("Sharing & Saved Places components", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("Toast component (SHR-01)", () => {
    it("renders message and calls onDismiss after duration", async () => {
      vi.useFakeTimers();
      const onDismiss = vi.fn();
      const { rerender } = render(<Toast message="Link copied to clipboard!" onDismiss={onDismiss} durationMs={2000} />);

      const toast = screen.getByRole("status");
      expect(toast.textContent).toContain("Link copied to clipboard!");

      vi.advanceTimersByTime(2000);
      expect(onDismiss).toHaveBeenCalledTimes(1);

      rerender(<Toast message={null} onDismiss={onDismiss} />);
      expect(screen.queryByRole("status")).toBeNull();

      vi.useRealTimers();
    });
  });

  describe("SavedPlacesBar component (SHR-03)", () => {
    const places = [
      { lat: 28.61, lon: 77.21, name: "New Delhi" },
      { lat: 12.97, lon: 77.59, name: "Bengaluru" },
    ];

    it("renders nothing when places array is empty", () => {
      const { container } = render(
        <SavedPlacesBar
          places={[]}
          currentLat={28.61}
          currentLon={77.21}
          onSelectPlace={vi.fn()}
          onRemovePlace={vi.fn()}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it("renders chips and highlights active place within 0.02 degrees", () => {
      render(
        <SavedPlacesBar
          places={places}
          currentLat={28.614}
          currentLon={77.209}
          onSelectPlace={vi.fn()}
          onRemovePlace={vi.fn()}
        />
      );

      const delhiBtn = screen.getByText("New Delhi");
      const blrBtn = screen.getByText("Bengaluru");
      expect(delhiBtn).toBeTruthy();
      expect(blrBtn).toBeTruthy();

      // Check active styling on parent chip wrapper
      expect(delhiBtn.getAttribute("aria-current")).toBe("true");
      expect(blrBtn.getAttribute("aria-current")).toBeNull();
      expect(delhiBtn.closest("div")?.getAttribute("data-active")).toBe("true");
    });

    it("triggers onSelectPlace when clicked", () => {
      const onSelect = vi.fn();
      render(
        <SavedPlacesBar
          places={places}
          currentLat={28.61}
          currentLon={77.21}
          onSelectPlace={onSelect}
          onRemovePlace={vi.fn()}
        />
      );

      fireEvent.click(screen.getByText("Bengaluru"));
      expect(onSelect).toHaveBeenCalledWith(places[1]);
    });

    it("triggers onRemovePlace with discrete remove button", () => {
      const onRemove = vi.fn();
      render(
        <SavedPlacesBar
          places={places}
          currentLat={28.61}
          currentLon={77.21}
          onSelectPlace={vi.fn()}
          onRemovePlace={onRemove}
        />
      );

      const removeBtn = screen.getByLabelText("Remove Bengaluru from saved places");
      fireEvent.click(removeBtn);
      expect(onRemove).toHaveBeenCalledWith(places[1]);
    });
  });

  describe("AboutModal dialog component (SHR-04)", () => {
    it("renders nothing when isOpen is false", () => {
      const { container } = render(<AboutModal isOpen={false} onClose={vi.fn()} />);
      expect(container.firstChild).toBeNull();
    });

    it("renders dialog with 4 educational sections and closes on ESC or backdrop click", () => {
      const onClose = vi.fn();
      render(<AboutModal isOpen={true} onClose={onClose} />);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeTruthy();
      expect(screen.getByText(/About Breeze & Data Sources/i)).toBeTruthy();

      // Verify the 4 key sections
      expect(screen.getByText(/1\. Plain Verdicts & PM2\.5/i)).toBeTruthy();
      expect(screen.getByText(/2\. Ground Stations vs\. Regional Model/i)).toBeTruthy();
      expect(screen.getByText(/3\. Honest Confidence Ratings/i)).toBeTruthy();
      expect(screen.getByText(/4\. Data Providers & Licensing/i)).toBeTruthy();

      // Press Escape
      fireEvent.keyDown(window, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);

      // Click Close button
      fireEvent.click(screen.getByLabelText("Close dialog"));
      expect(onClose).toHaveBeenCalledTimes(2);
    });
  });
});

