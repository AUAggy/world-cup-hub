/**
 * Module-memory snapshot cache.
 *
 * This keeps repeated server-function calls cheap inside a single
 * Worker isolate. Durable page-level caching is injected into the
 * Worker entry during deploy.
 */

import type { WorldCupSnapshot } from "../worldcup-types";
import { SNAPSHOT_TTL_SECONDS } from "./snapshot";

const CACHE_TTL_MS = SNAPSHOT_TTL_SECONDS * 1000;

let cache: { at: number; data: WorldCupSnapshot } | null = null;

export function getCachedSnapshot(): WorldCupSnapshot | null {
  if (!cache) return null;
  if (Date.now() - cache.at >= CACHE_TTL_MS) return null;
  return cache.data;
}

export function setCachedSnapshot(data: WorldCupSnapshot): void {
  cache = { at: Date.now(), data };
}
