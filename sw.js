/* Service worker do app Vórtex Pay (admin no celular).
   Só cuida de notificação push — não faz cache de páginas, então o painel
   sempre mostra dados atuais. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Vórtex Pay", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Vórtex Pay";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag,
    renotify: true,
    data: { url: data.url || "/admin/vendas" },
  };
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);
      // app aberto na tela → toca o som de venda (o push do iOS usa o som
      // padrão do sistema; o som personalizado só toca com o app aberto)
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const w of wins) w.postMessage({ type: "venda", title, body: options.body });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/admin/vendas";
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const w of wins) {
        if ("focus" in w) {
          await w.focus();
          if ("navigate" in w) await w.navigate(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});
