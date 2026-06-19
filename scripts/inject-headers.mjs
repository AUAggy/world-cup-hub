#!/usr/bin/env node
/**
 * Post-build: inject security headers and CF cache logic into the
 * default TanStack Worker entry.
 *
 * Reads dist/server/server.js, wraps the default export's fetch method
 * to add security headers, CF Cache API caching, cache status headers,
 * and structured logging.
 */
import { readFileSync, writeFileSync } from "node:fs";

const ENTRY = "dist/server/server.js";

const source = readFileSync(ENTRY, "utf8");

if (source.includes("var __wch_orig = server_default;")) {
  console.error(
    "Refusing to inject wrapper twice. Rebuild before running inject-headers.mjs again.",
  );
  process.exit(1);
}

// Find the server_default variable definition and inject a wrapper
// that replaces it.
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
    if (url.pathname === "/" && cache && req.method === "GET") {
      var cacheUrl = new URL(req.url);
      cacheUrl.pathname = "/__ssr/wch-v6";
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
      putUrl.pathname = "/__ssr/wch-v6";
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

// Find `var server_default = ...;` and append the wrapper after it.
const pattern = /(var server_default = [^;]+;)/;
if (!pattern.test(source)) {
  console.error("Could not find server_default in build output");
  process.exit(1);
}

const result = source.replace(pattern, "$1" + wrapper);

writeFileSync(ENTRY, result, "utf8");
console.log("Injected headers + caching into", ENTRY);
