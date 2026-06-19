const DEFAULT_TTL_MS = 2 * 60 * 1000;

interface Entry<T> {
  at: number;
  data: T;
  ttlMs: number;
}

const cache = new Map<string, Entry<unknown>>();

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at >= entry.ttlMs) return null;
  return entry.data as T;
}

export function setCached<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): void {
  cache.set(key, { at: Date.now(), data, ttlMs });
}

export function clearForecastCache(): void {
  cache.clear();
}
