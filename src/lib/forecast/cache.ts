const DEFAULT_TTL_MS = 2 * 60 * 1000;

interface Entry<T> {
  at: number;
  data: T;
  ttlMs: number;
}

type CloudflareCacheStorage = CacheStorage & { default?: Cache };

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

export async function getDurableCached<T>(key: string): Promise<T | null> {
  const memoryValue = getCached<T>(key);
  if (memoryValue) return memoryValue;

  const durableCache = getDefaultCache();
  if (!durableCache) return null;

  try {
    const response = await durableCache.match(cacheRequest(key));
    if (!response) return null;

    const data = (await response.json()) as T;
    const ttlMs = Number(response.headers.get("x-cache-ttl-ms"));
    const writtenAt = Number(response.headers.get("x-cache-written-at"));
    const remainingTtlMs =
      Number.isFinite(ttlMs) && Number.isFinite(writtenAt)
        ? ttlMs - (Date.now() - writtenAt)
        : DEFAULT_TTL_MS;
    if (remainingTtlMs <= 0) return null;

    setCached(key, data, remainingTtlMs);
    return data;
  } catch {
    return null;
  }
}

export async function setDurableCached<T>(
  key: string,
  data: T,
  ttlMs = DEFAULT_TTL_MS,
): Promise<void> {
  setCached(key, data, ttlMs);

  const durableCache = getDefaultCache();
  if (!durableCache) return;

  try {
    await durableCache.put(
      cacheRequest(key),
      new Response(JSON.stringify(data), {
        headers: {
          "Cache-Control": `public, max-age=${Math.ceil(ttlMs / 1000)}`,
          "Content-Type": "application/json; charset=utf-8",
          "x-cache-ttl-ms": String(ttlMs),
          "x-cache-written-at": String(Date.now()),
        },
      }),
    );
  } catch {
    // In-memory cache is still available if the platform cache is unavailable.
  }
}

export function clearForecastCache(): void {
  cache.clear();
}

function getDefaultCache(): Cache | null {
  const storage = (globalThis as { caches?: CloudflareCacheStorage }).caches;
  return storage?.default ?? null;
}

function cacheRequest(key: string): Request {
  return new Request(`https://world-cup-hub.local/__forecast-cache/${encodeURIComponent(key)}`);
}
