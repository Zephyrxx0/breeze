import { toPng, toBlob } from "html-to-image";

export interface CaptureOptions {
  element: HTMLElement;
  placeName: string;
  verdict: string;
  canonicalUrl: string;
  onToast?: (message: string) => void;
}

/**
 * Executes a resilient double-pass capture of the 1080x1350 card element.
 * 1. Checks document.fonts.ready to ensure fonts are fully loaded.
 * 2. Runs an initial warm-up toPng pass to prime WebKit SVG foreignObject rasterizers.
 * 3. Waits 150ms RAF delay.
 * 4. Runs true toBlob pass with explicit 1080x1350 dimensions.
 * 5. Attempts navigator.share with the PNG File object.
 * 6. Falls back to direct PNG download + clipboard copy link on unsupported devices or errors.
 */
export async function captureAndShareCard({
  element,
  placeName,
  verdict,
  canonicalUrl,
  onToast,
}: CaptureOptions): Promise<void> {
  // Step 1: Wait for web fonts if supported
  if (typeof document !== "undefined" && "fonts" in document) {
    try {
      await document.fonts.ready;
    } catch {
      // Non-fatal if font check fails
    }
  }

  // Step 2: Warm-up pass (discards output, primes WebKit rasterizer)
  try {
    await toPng(element, {
      cacheBust: true,
      width: 1080,
      height: 1350,
      canvasWidth: 1080,
      canvasHeight: 1350,
      pixelRatio: 1,
    });
  } catch {
    // Non-fatal warm-up pass
  }

  // Step 3: Settling frame delay (150ms RAF timeout)
  await new Promise((resolve) => setTimeout(resolve, 150));

  // Step 4: True capture pass
  const blob = await toBlob(element, {
    cacheBust: true,
    width: 1080,
    height: 1350,
    canvasWidth: 1080,
    canvasHeight: 1350,
    pixelRatio: 1,
  });

  if (!blob) {
    throw new Error("Failed to generate share card image");
  }

  // Slugify place name for clean filename
  const cleanSlug = placeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const fileName = `breeze-${cleanSlug || "air-verdict"}.png`;

  const file = new File([blob], fileName, { type: "image/png" });

  // Step 5: Native Web Share API check
  const canShareFiles =
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] });

  if (canShareFiles && typeof navigator.share === "function") {
    try {
      await navigator.share({
        files: [file],
        title: `Air in ${placeName} — Breeze`,
        text: `Air in ${placeName} is "${verdict}". Check live assessment: ${canonicalUrl}`,
      });
      return;
    } catch (err: unknown) {
      // AbortError indicates user cancelled share sheet — return silently without error or fallback
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      // Non-abort errors fall through to download + copy fallback below
    }
  }

  // Step 6: Fallback download & clipboard copy
  triggerDownload(blob, fileName);

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(canonicalUrl);
    } catch {
      // Ignore clipboard write failures
    }
  }

  onToast?.("Card downloaded & link copied to clipboard!");
}

function triggerDownload(blob: Blob, fileName: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Revoke object URL after brief delay to release memory
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
