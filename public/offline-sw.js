const CACHE = 'pista-offline-v1'
const scopeUrl = new URL(self.registration.scope)

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(async cache => {
    const response = await fetch(scopeUrl.pathname)
    const html = await response.clone().text()
    await cache.put(scopeUrl.pathname, response)
    const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => new URL(match[1], scopeUrl).href)
    await Promise.all(assets.map(url => cache.add(url).catch(() => undefined)))
  }))
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))))
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone()
    caches.open(CACHE).then(cache => cache.put(event.request, copy))
    return response
  }).catch(async () => {
    const cached = await caches.match(event.request)
    if (cached) return cached
    if (event.request.mode === 'navigate') return caches.match(scopeUrl.pathname)
    return Response.error()
  }))
})
