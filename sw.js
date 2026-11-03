// Si disattiva da solo: era stato caricato per errore nella radice del sito.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith("spasticita-")) await caches.delete(k);
  await self.registration.unregister();
})()));
