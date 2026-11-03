// Atlante ecoguidato della spasticità, area riservata — service worker 0e3d7d63e8
// La pagina di accesso resta in cache per l'uso offline; i file dell'app arrivano cifrati,
// vengono decifrati nel browser dopo la password e serviti da qui.
const SHELL = "spasticita-shell-0e3d7d63e8";
const BASE = new URL("./", self.location).pathname;
const APP = BASE + "app/";
const SHELL_FILES = ["./", "index.html", "icons/icon-64.png", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("spasticita-shell-") && k !== SHELL).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
async function dallApp(req) {
  const u = new URL(req.url); u.search = ""; u.hash = "";
  if (u.pathname === APP || u.pathname === APP.slice(0, -1)) u.pathname = APP + "index.html";
  const ks = (await caches.keys()).filter(k => k.startsWith("spasticita-app-"));
  for (const k of ks) { const r = await (await caches.open(k)).match(u.href); if (r) return r; }
  if (req.mode === "navigate") return Response.redirect(BASE, 302);
  return new Response("", { status: 404 });
}
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || !u.pathname.startsWith(BASE)) return;
  if (u.pathname.startsWith(APP) || u.pathname === APP.slice(0, -1)) { e.respondWith(dallApp(e.request)); return; }
  if (u.pathname.startsWith(BASE + "dati/")) return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const c = r.clone(); caches.open(SHELL).then(s => s.put(e.request, c)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match(BASE + "index.html"))));
});
