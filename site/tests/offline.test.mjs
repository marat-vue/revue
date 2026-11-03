import assert from "node:assert/strict";
import test from "node:test";
import { cachedHrefs, downloadPages, PAGES_CACHE, PAYLOAD_CACHE } from "../app/utils/offline.ts";

function setup(t) {
  const stores = new Map();
  for (const [key, value] of Object.entries({ window: globalThis, location: { origin: "https://example.test" }, navigator: { serviceWorker: {} }, caches: { open: async (name) => {
    if (!stores.has(name)) {
      const entries = new Map();
      stores.set(name, { entries, keys: async () => [...entries.keys()].map((url) => new Request(url)), put: async (url, response) => entries.set(String(url), response) });
    }
    return stores.get(name);
  } } })) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => descriptor ? Object.defineProperty(globalThis, key, descriptor) : delete globalThis[key]);
  }
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    requests.push(String(url));
    return new Response(String(url).endsWith(".json") ? "[]" : "<html></html>", { headers: { "content-type": String(url).endsWith(".json") ? "application/json" : "text/html" } });
  });
  return { stores, requests };
}

test("download saves HTML and payload under the GitHub Pages base path", async (t) => {
  const { stores, requests } = setup(t);
  assert.deepEqual(await downloadPages(["/l/01/"], { base: "/revue/" }), { failed: 0 });
  assert.deepEqual(requests.sort(), ["https://example.test/revue/l/01/", "https://example.test/revue/l/01/_payload.json"]);
  assert.equal(stores.get(PAGES_CACHE).entries.size, 1);
  assert.equal(stores.get(PAYLOAD_CACHE).entries.size, 1);
  assert.deepEqual(await cachedHrefs("/revue"), new Set(["/l/01/"]));
  await downloadPages(["/l/01/"], { base: "/revue" });
  assert.equal(requests.length, 2, "complete downloads are skipped");
});

test("HTML without a payload is incomplete and repaired on retry", async (t) => {
  setup(t);
  const pages = await caches.open(PAGES_CACHE);
  await pages.put("https://example.test/revue/l/01/", new Response("html"));
  assert.equal((await cachedHrefs("/revue")).size, 0);
  assert.deepEqual(await downloadPages(["/l/01/"], { base: "/revue" }), { failed: 0 });
  assert.equal((await cachedHrefs("/revue")).size, 1);
});

test("a missing payload or HTML fallback is reported as a failed page", async (t) => {
  setup(t);
  t.mock.method(globalThis, "fetch", async () => new Response("offline fallback", { headers: { "content-type": "text/html" } }));
  assert.deepEqual(await downloadPages(["/l/01/"]), { failed: 1 });
  assert.equal((await cachedHrefs()).size, 0);
});

test("failed downloads can be retried instead of being marked saved", async (t) => {
  setup(t);
  const fetchMock = t.mock.method(globalThis, "fetch", async () => { throw new Error("offline"); });
  assert.deepEqual(await downloadPages(["/l/01/"]), { failed: 1 });
  fetchMock.mock.restore();
  assert.deepEqual(await downloadPages(["/l/01/"]), { failed: 0 });
  assert.deepEqual(await cachedHrefs(), new Set(["/l/01/"]));
});

test("cache listing keeps different deployment paths separate", async (t) => {
  setup(t);
  await downloadPages(["/l/01/"], { base: "/revue-other" });
  assert.deepEqual(await cachedHrefs("/revue"), new Set());
});

test("abort stops requests and duplicate lesson URLs are downloaded once", async (t) => {
  const { requests } = setup(t);
  await downloadPages(["/l/01/", "/l/01/"]);
  assert.equal(requests.length, 2);
  const controller = new AbortController();
  controller.abort();
  await downloadPages(["/l/02/"], { signal: controller.signal });
  assert.equal(requests.length, 2);
});
