#!/usr/bin/env node
/**
 * Post-build: inject security headers and homepage SSR cache logic into the
 * default TanStack Worker entry.
 */
import { existsSync, readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";

const ENTRY = "dist/server/server.js";
const ASSETS_DIR = "dist/client/assets";

const source = readFileSync(ENTRY, "utf8");

if (source.includes("var __wch_orig = server_default;")) {
  console.error(
    "Refusing to inject wrapper twice. Rebuild before running inject-headers.mjs again.",
  );
  process.exit(1);
}

const wrapper = `
var __wch_sec = {
  "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; script-src-elem 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; media-src 'self' data:; connect-src 'self' https://cloudflareinsights.com; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()"
};
var __wch_orig = server_default;
server_default = { fetch: async function(req, env, ctx) {
  try {
    var cache = null;
    try { cache = caches.default; } catch(_) {}
    var url = new URL(req.url);
    if (url.pathname.indexOf("/assets/") === 0) {
      var ah = new Headers(__wch_sec);
      ah.set("content-type", "text/javascript; charset=utf-8");
      ah.set("cache-control", "no-store");
      return new Response("/* asset not found */\\n", { status: 404, headers: ah });
    }
    if (url.pathname === "/" && cache && req.method === "GET") {
      var cacheUrl = new URL(req.url);
      cacheUrl.pathname = "/__ssr/wch-v9";
      cacheUrl.search = "";
      try {
        var cached = await cache.match(cacheUrl);
        if (cached) {
          var h2 = new Headers(cached.headers);
          var k2; for (k2 in __wch_sec) { if (!h2.has(k2)) h2.set(k2, __wch_sec[k2]); }
          h2.set("X-WCH-Cache", "HIT");
          h2.set("cache-control", "no-store");
          var fa = cached.headers.get("X-WCH-Fetched");
          if (fa) { h2.set("X-WCH-Fetched", fa); h2.set("X-WCH-Fetched-Age", String(Math.round((Date.now()-new Date(fa).getTime())/1000))); }
          console.log(JSON.stringify({event:"request",path:url.pathname,cache:"HIT",fetchedAt:fa||null,status:cached.status}));
          return new Response(cached.body,{status:cached.status,statusText:cached.statusText,headers:h2});
        }
      } catch(_) {}
    }
    var res = await __wch_orig.fetch(req, env, ctx);
    var h = new Headers(res.headers);
    var k; for (k in __wch_sec) { if (!h.has(k)) h.set(k, __wch_sec[k]); }
    var outcome = url.pathname === "/" ? "MISS" : "BYPASS";
    h.set("X-WCH-Cache", outcome);
    if (url.pathname === "/" && req.method === "GET") h.set("cache-control", "no-store");
    if (url.pathname === "/" && res.status < 400 && req.method === "GET") {
      var fetchedAt = new Date().toISOString();
      h.set("X-WCH-Fetched", fetchedAt);
      h.set("X-WCH-Fetched-Age", "0");
    }
    console.log(JSON.stringify({event:"request",path:url.pathname,cache:outcome,fetchedAt:h.get("X-WCH-Fetched"),status:res.status}));
    var out = new Response(res.body,{status:res.status,statusText:res.statusText,headers:h});
    if (url.pathname === "/" && cache && res.status < 400 && req.method === "GET") {
      var putUrl = new URL(req.url);
      putUrl.pathname = "/__ssr/wch-v9";
      putUrl.search = "";
      var cloned = out.clone();
      cloned.headers.set("cache-control", "public, max-age=1800, s-maxage=1800");
      var pp = cache.put(putUrl, cloned).catch(function(){});
      if (ctx && ctx.waitUntil) ctx.waitUntil(pp);
    }
    return out;
  } catch(e) {
    console.error("[wch]", String(e));
    var eh = new Headers(__wch_sec);
    eh.set("X-WCH-Cache", "BYPASS");
    return new Response("Internal server error",{status:500,statusText:"error",headers:eh});
  }
}};
`;

const pattern = /(var server_default = [^;]+;)/;
if (!pattern.test(source)) {
  console.error("Could not find server_default in build output");
  process.exit(1);
}

const result = source.replace(pattern, "$1" + wrapper);

writeFileSync(ENTRY, result, "utf8");
createAssetCompatibilityShims();
console.log("Injected headers + caching into", ENTRY);

function createAssetCompatibilityShims() {
  if (!existsSync(ASSETS_DIR)) return;

  const jsFiles = readdirSync(ASSETS_DIR).filter((file) => file.endsWith(".js"));
  const indexFile = jsFiles.find(
    (file) => file.startsWith("index-") && statSync(`${ASSETS_DIR}/${file}`).size > 100_000,
  );
  const routeFiles = jsFiles.filter((file) => file.startsWith("routes-"));
  const smallRoute = routeFiles.find((file) => statSync(`${ASSETS_DIR}/${file}`).size < 10_000);
  const bigRoute = routeFiles.find((file) => statSync(`${ASSETS_DIR}/${file}`).size > 10_000);

  const shims = [
    ["index-DIHCargV.js", indexFile],
    ["index-DOmJQ1D0.js", indexFile],
    ["index-maQaYiry.js", indexFile],
    ["routes-UiNiBaoz.js", smallRoute],
    ["routes-onnvc477.js", smallRoute],
    ["routes-df__tGSK.js", smallRoute],
    ["routes-BypM2G7f.js", bigRoute],
    ["routes-CFEzmyrN.js", bigRoute],
    ["routes-DYBQmf9C.js", bigRoute],
  ];

  for (const [oldName, currentName] of shims) {
    if (!currentName || oldName === currentName) continue;
    writeFileSync(
      `${ASSETS_DIR}/${oldName}`,
      `export * from "./${currentName}";\nimport "./${currentName}";\n`,
      "utf8",
    );
  }
}
