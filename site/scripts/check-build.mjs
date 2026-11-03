import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const output = path.resolve(".output/public");
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(output, file), "utf8"));
const index = readJson("search-index.json");
const cards = readJson("cards.json");
const manifest = readJson("manifest.webmanifest");
const base = manifest.scope.replace(/\/+$/, "");
assert.equal(manifest.start_url, `${base}/`);
assert.ok(index.length > 0, "Search index is empty");
assert.equal(new Set(index.map((entry) => entry.id)).size, index.length, "Lesson IDs collide");
assert.deepEqual(new Set(cards.map((card) => card.id)), new Set(index.map((entry) => entry.id)), "Cards and lessons differ");

const routes = new Set(["/", "/review/", "/settings/", "/stats/", "/sandbox/", "/offline/"]);
for (const entry of index) {
  const parts = entry.href.split("/").filter(Boolean);
  for (let i = 2; i <= parts.length; i++) routes.add(`/${parts.slice(0, i).join("/")}/`);
}

for (const route of routes) {
  const dir = route.slice(1);
  const html = fs.readFileSync(path.join(output, dir, "index.html"), "utf8");
  readJson(`${dir}_payload.json`);
  assert.ok(html.includes("__NUXT_DATA__"), `Missing Nuxt payload: ${route}`);
  for (const match of html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"#]+)"/g)) {
    if (!match[1].startsWith("/") || match[1].startsWith("//")) continue;
    const url = new URL(match[1], "https://example.test");
    assert.ok(url.pathname.startsWith(`${base}/`), `Wrong asset base: ${match[1]}`);
    const file = path.join(output, decodeURIComponent(url.pathname.slice(base.length + 1)));
    assert.ok(fs.existsSync(file), `Missing asset: ${match[1]}`);
  }
}

for (const file of ["sw.js", "404.html", ".nojekyll"]) assert.ok(fs.existsSync(path.join(output, file)), `Missing ${file}`);
console.log(`Static build verified: ${index.length} lessons, ${routes.size} pages with payloads; base ${base || "/"}.`);
