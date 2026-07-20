/**
 * Archive-mode flag. Safe to import from client code — no JSON snapshots
 * are pulled in here (see frozen.ts for the server-only data).
 *
 * Archive mode is baked in at build time via `bun run build:archive`
 * (VITE_ARCHIVE_MODE=1). The deployed artifact IS the archive: no runtime
 * config, no upstream fetches.
 */

export const ARCHIVE_MODE = import.meta.env.VITE_ARCHIVE_MODE === "1";

/**
 * Shown in the footer as "data frozen as of …". Must match the capturedAt
 * in src/data/frozen/worldcup-snapshot.json — tests/frozen asserts this.
 */
export const ARCHIVE_CAPTURED_AT = "2026-07-20T01:40:46.233Z";
