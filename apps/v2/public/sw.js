const CACHE = "fit-coach-static-v2";
const MAX_ENTRIES = 100;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = { title: "Coach", body: "" };
  try {
    const parsed = event.data.json();
    payload = { title: parsed.title ?? "Coach", body: parsed.body ?? "" };
  } catch {
    payload = { title: "Coach", body: event.data.text() };
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const focused = clients.some((client) => client.focused);
        if (focused) return;
        return self.registration.showNotification(payload.title, {
          body: payload.body,
          icon: "/icon.svg",
        });
      }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes("/coach") && "focus" in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow("/coach");
      }),
  );
});

async function trim(cache) {
  const keys = await cache.keys();
  await Promise.all(
    keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES)).map((key) => cache.delete(key)),
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith("/_next/static/")) {
    return;
  }
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.status !== 206) {
        event.waitUntil(cache.put(request, response.clone()).then(() => trim(cache)));
      }
      return response;
    }),
  );
});
