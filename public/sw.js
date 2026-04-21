// Service Worker para Web Push Notifications - FIRE
self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: "FIRE", body: event.data?.text() || "" }; }
  const title = data.title || "🔥 FIRE";
  const options = {
    body: data.body || "",
    icon: data.icon || "/brand/fire-icon.png",
    badge: data.badge || "/brand/fire-icon.png",
    image: data.image,
    tag: data.tag || "fire-notification",
    renotify: true,
    requireInteraction: data.requireInteraction ?? false,
    vibrate: data.vibrate || [200, 100, 200, 100, 400],
    data: { url: data.url || "/app", ...data.data },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/app";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) { if (c.url.includes(url) && "focus" in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
