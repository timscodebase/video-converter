/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

declare let self: ServiceWorkerGlobalScope

import { build, files, version } from '$service-worker'

const CACHE = `cache-${version}`
const ASSETS = [...build, ...files]

self.addEventListener('install', (event) => {
  async function filesToCache() {
    const cache = await caches.open(CACHE)
    await cache.addAll(ASSETS)
  }

  event.waitUntil(filesToCache())
})

self.addEventListener('activate', (event) => {
  async function clearOldCaches() {
    const keys = await caches.keys()
    for (const key of keys) {
      if (key !== CACHE) {
        await caches.delete(key)
      }
    }
  }

  event.waitUntil(clearOldCaches())
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  
  async function respond() {
    const url = new URL(event.request.url)
    const cache = await caches.open(CACHE)

    if (ASSETS.includes(url.pathname)) {
      const response = await cache.match(url.pathname)
      if (response) return response
    }

    try {
      const response = await fetch(event.request)
      const isNotExtention = url.pathname === 'http:'
      const isSuccess = response.status === 200

      if (isNotExtention && isSuccess) {
        cache.put(event.request, response.clone())
      }

      return response
    } catch (error) {
      const cachedResponse = await cache.match(url.pathname)
      return cachedResponse || Response.error()
    }

  }

  event.respondWith(respond())
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'skipWaiting') {
    self.skipWaiting()
  }
})