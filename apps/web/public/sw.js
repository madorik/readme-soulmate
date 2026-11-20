// 웹 브라우저 알림(Web Push) 서비스 워커. 푸시가 오면 알림을 띄우고, 누르면 그 화면(path)으로 간다.
// 화면 캐시·오프라인은 하지 않는다(알림만).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    /* 모양이 다르면 빈 알림은 띄우지 않는다 */
  }
  if (!data.title) return;
  event.waitUntil(
    self.registration.showNotification(String(data.title), {
      body: typeof data.body === "string" ? data.body : "",
      icon: "/icon.png",
      data: { path: typeof data.path === "string" && /^\/(?!\/)/.test(data.path) ? data.path : "/home" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.path || "/home", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        if (c.url.startsWith(self.location.origin) && "focus" in c) {
          await c.focus();
          if ("navigate" in c) await c.navigate(url).catch(() => {});
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
