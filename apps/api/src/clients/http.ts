export type ClientResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Executes a fetch request with an AbortController timeout.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 4000
): Promise<Response> {
  const ac = new AbortController();
  const parentSignal = options.signal;

  let timer: ReturnType<typeof setTimeout> | undefined;
  if (timeoutMs > 0) {
    timer = setTimeout(() => {
      ac.abort(new Error(`Timeout of ${timeoutMs}ms exceeded`));
    }, timeoutMs);
  }

  // Chain parent abort signal if provided
  if (parentSignal) {
    if (parentSignal.aborted) {
      ac.abort(parentSignal.reason);
    } else {
      parentSignal.addEventListener("abort", () => ac.abort(parentSignal.reason));
    }
  }

  try {
    return await fetch(url, {
      ...options,
      signal: ac.signal,
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
}
