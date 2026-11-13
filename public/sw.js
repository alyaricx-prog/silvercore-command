/**
 * SilverCore Command — Service Worker
 * Strategy:
 *  - App shell (JS/CSS/fonts/images): Cache-first (install-time precache + runtime)
 *  - Page navigations: Network-first → cache fallback → /offline
 *  - Supabase API (supabase.co): Network-only (never cache auth/data)
 */

const CACHE_VERSION = 'sc-v1'
const OFFLINE_URL   = '/offline'

// Assets to precache on install (the app shell)
const PRECACHE_URLS = [
  '/',
  '/offline',
  '/manifest.json',
]

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION)
          .map(key => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // 1. Skip non-GET requests (POST/PATCH for Supabase mutations)
  if (request.method !== 'GET') return

  // 2. Skip Supabase API calls entirely — always network-only
  if (url.hostname.includes('supabase.co')) return

  // 3. Skip chrome-extension, ws:// etc.
  if (!url.protocol.startsWith('http')) return

  // 4. Next.js internal routes (_next/webpack-hmr, etc.) — skip in dev
  if (url.pathname.startsWith('/_next/webpack-hmr')) return

  // 5. Static assets (_next/static/**) — cache-first, long-lived
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request))
    return
  }

  // 6. Static files in /public (icons, manifest, images)
  if (
    url.pathname.startsWith('/icon') ||
    url.pathname.endsWith('.png')    ||
    url.pathname.endsWith('.svg')    ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(cacheFirst(request))
    return
  }

  // 7. Page navigations — network-first, offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNav(request))
    return
  }

  // 8. Everything else — network-first with cache fallback
  event.respondWith(networkFirst(request))
})

// ─── Strategies ───────────────────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return cached || new Response('Offline', { status: 503 })
  }
}

async function networkFirstNav(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    // Try the cache for this exact URL
    const cached = await caches.match(request)
    if (cached) return cached

    // Try the cached version of the same path without query params
    const urlNoQuery = new URL(request.url)
    urlNoQuery.search = ''
    const cachedClean = await caches.match(urlNoQuery.toString())
    if (cachedClean) return cachedClean

    // Fall back to the offline page
    const offline = await caches.match(OFFLINE_URL)
    return offline || new Response('You are offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
  }
}
