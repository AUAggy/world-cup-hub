/**
 * Record the archive demo (Step 4).
 *
 * Implements docs/recording-guide.md: serves the archive build locally,
 * tours the five tabs in headless Chromium at 1440x900 @2x, saves a WebM
 * plus full-page stills, then ffmpeg converts to demo.mp4 and demo.gif.
 *
 * Run the archive build first:  bun run build:archive
 * Then:                         bun run record:demo
 */

import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, rename, readdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const PORT = 4599;
const BASE = `http://localhost:${PORT}`;
const MEDIA_DIR = join(import.meta.dirname, "..", "docs", "media");
const RAW_DIR = join(MEDIA_DIR, "raw");

const VIEWPORT = { width: 1440, height: 900 };
const SETTLE_MS = 700;

async function waitForServer(url: string, timeoutMs = 20_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`preview server did not start at ${url}`);
}

/** Smooth-scroll through the page in human-feeling steps. */
async function scrollTour(page: import("playwright").Page, steps: number, pauseMs: number) {
  const height = await page.evaluate(() => document.body.scrollHeight - window.innerHeight);
  for (let i = 1; i <= steps; i++) {
    await page.evaluate(
      (y) => window.scrollTo({ top: y, behavior: "smooth" }),
      Math.round((height * i) / steps),
    );
    await page.waitForTimeout(pauseMs);
  }
}

async function main() {
  await mkdir(RAW_DIR, { recursive: true });

  const server: ChildProcess = spawn("bun", ["run", "preview", "--port", String(PORT)], {
    stdio: "ignore",
  });
  process.on("exit", () => server.kill());

  try {
    await waitForServer(BASE);

    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 2,
      recordVideo: { dir: RAW_DIR, size: VIEWPORT },
    });
    const page = await context.newPage();

    const shot = (name: string) =>
      page.screenshot({ path: join(MEDIA_DIR, `${name}.png`), fullPage: true });
    const tab = (name: string) => page.getByRole("tab", { name, exact: true });

    // 1. Bracket (hero) — hold, slow tour to the final, back to top.
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForTimeout(7000);
    await scrollTour(page, 4, 2100);
    await page.waitForTimeout(3500);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await page.waitForTimeout(SETTLE_MS);
    await shot("bracket");

    // 2. Matches — brisk ledger pass.
    await tab("Matches").click();
    await page.waitForTimeout(SETTLE_MS);
    await scrollTour(page, 2, 1200);
    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await shot("matches");

    // 3. Group Stage — one brisk pass.
    await tab("Group Stage").click();
    await page.waitForTimeout(SETTLE_MS);
    await scrollTour(page, 2, 1100);
    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await shot("groups");

    // 4. Crowd Forecast — the separate crowd read.
    await tab("Crowd Forecast").click();
    await page.waitForTimeout(SETTLE_MS + 600);
    await scrollTour(page, 2, 1600);
    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await shot("forecast");

    // 5. Forecast vs. Reality — the star. Linger.
    await tab("Forecast vs. Reality").click();
    await page.waitForTimeout(SETTLE_MS);
    await page.waitForTimeout(8000); // hold on the champion's arc
    await scrollTour(page, 3, 2600);
    await page.waitForTimeout(3500);
    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await shot("reality");

    // 6. Footer — the "Final archive" thesis.
    await page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }),
    );
    await page.waitForTimeout(4500);

    await context.close(); // finalizes the video file
    await browser.close();
  } finally {
    server.kill();
  }

  // Playwright names the video randomly; normalize it.
  const rawFiles = await readdir(RAW_DIR);
  const webm = rawFiles.find((f) => f.endsWith(".webm"));
  if (!webm) throw new Error("no video recorded");
  const rawPath = join(RAW_DIR, webm);
  const normalized = join(RAW_DIR, "tour.webm");
  await rename(rawPath, normalized);

  console.log(`[record] raw video: ${normalized}`);
  console.log(`[record] stills: ${MEDIA_DIR}/{bracket,matches,groups,forecast,reality}.png`);
  console.log("[record] next: ffmpeg converts (see docs/recording-guide.md)");
}

await main();
