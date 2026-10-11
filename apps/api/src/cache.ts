export interface SectionEntry<T> {
  data: T;
  fetchedAtMs: number;
}

export const STALE_MAX_MS = 3 * 60 * 60 * 1000; // 3 hours
const MAX_KEYS = 200;

// Module-scoped in-memory cache
const cacheStore = new Map<string, Record<string, SectionEntry<unknown>>>();

/**
 * Retrieves a fresh section from cache if within ttlMs.
 */
export function getFresh<T>(
  key: string,
  section: string,
  ttlMs: number,
  nowMs = Date.now()
): T | null {
  const sections = cacheStore.get(key);
  if (!sections) return null;
  const entry = sections[section] as SectionEntry<T> | undefined;
  if (!entry) return null;
  if (nowMs - entry.fetchedAtMs <= ttlMs) {
    return entry.data;
  }
  return null;
}

/**
 * Saves a section into the cache and evicts oldest keys (FIFO) if exceeding MAX_KEYS.
 */
export function setSection<T>(
  key: string,
  section: string,
  data: T,
  nowMs = Date.now()
): void {
  let sections = cacheStore.get(key);
  if (!sections) {
    // FIFO eviction if capacity reached
    if (cacheStore.size >= MAX_KEYS) {
      const firstKey = cacheStore.keys().next().value;
      if (firstKey !== undefined) {
        cacheStore.delete(firstKey);
      }
    }
    sections = {};
    cacheStore.set(key, sections);
  }

  sections[section] = {
    data,
    fetchedAtMs: nowMs,
  };
}

/**
 * Returns stale fallback data with ageMin if age is <= 3 hours (180 min).
 * Returns null if older than 3 hours or missing.
 */
export function getStaleFallback<T>(
  key: string,
  section: string,
  nowMs = Date.now()
): { data: T; ageMin: number } | null {
  const sections = cacheStore.get(key);
  if (!sections) return null;
  const entry = sections[section] as SectionEntry<T> | undefined;
  if (!entry) return null;

  const ageMs = nowMs - entry.fetchedAtMs;
  if (ageMs > 0 && ageMs <= STALE_MAX_MS) {
    return {
      data: entry.data,
      ageMin: Math.floor(ageMs / 60000),
    };
  }
  return null;
}

/**
 * Clears the cache (test helper).
 */
export function clearCache(): void {
  cacheStore.clear();
}
