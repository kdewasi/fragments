// Service Worker for Fragments PWA
const CACHE_NAME = "fragments-pwa-v2";
const API_CACHE_NAME = "fragments-api-v2";

// Files to cache for offline use
const STATIC_CACHE_FILES = [
  "/",
  "/index.html",
  "/callback.html",
  "/silent-callback.html",
  "/src/app.js",
  "/src/auth-basic.js",
  "/src/api.js",
  "https://unpkg.com/bamboo.css",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Caching static files");
        return cache.addAll(STATIC_CACHE_FILES);
      })
      .then(() => {
        console.log("[SW] Installation complete");
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests with cache-first strategy for GET requests
  if (
    url.hostname.includes("fragments-alb") ||
    url.hostname.includes("amazonaws.com")
  ) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets with cache-first strategy
  if (request.method === "GET") {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          console.log("[SW] Serving from cache:", request.url);
          return cachedResponse;
        }

        return fetch(request)
          .then((response) => {
            // Cache successful responses
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (request.mode === "navigate") {
              return caches.match("/index.html");
            }
          });
      })
    );
  }
});

// Handle API requests with intelligent caching
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE_NAME);

  try {
    // Try network first
    const response = await fetch(request);

    // Cache successful GET requests (fragments data)
    if (request.method === "GET" && response.status === 200) {
      const responseClone = response.clone();
      await cache.put(request, responseClone);
      console.log("[SW] Cached API response:", request.url);
    }

    return response;
  } catch (error) {
    console.log("[SW] Network failed, trying cache:", request.url);

    // If network fails, try cache for GET requests
    if (request.method === "GET") {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        console.log("[SW] Serving API from cache:", request.url);
        // Add offline indicator header
        const headers = new Headers(cachedResponse.headers);
        headers.set("X-Served-From-Cache", "true");

        return new Response(cachedResponse.body, {
          status: cachedResponse.status,
          statusText: cachedResponse.statusText,
          headers: headers,
        });
      }
    }

    // Return offline response for failed requests
    return new Response(
      JSON.stringify({
        status: "error",
        error: "Network unavailable. Please check your connection.",
        offline: true,
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Handle background sync for offline actions
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync event:", event.tag);

  if (event.tag === "sync-fragments") {
    event.waitUntil(syncOfflineActions());
  }
});

// Sync offline actions when connection is restored
async function syncOfflineActions() {
  console.log("[SW] Syncing offline actions...");

  // Get offline actions from IndexedDB
  const db = await openIndexedDB();
  const tx = db.transaction(["offlineActions"], "readonly");
  const store = tx.objectStore("offlineActions");
  const actions = await store.getAll();

  for (const action of actions) {
    try {
      // Retry the failed action
      await fetch(action.url, action.options);

      // Remove from offline queue
      const deleteTx = db.transaction(["offlineActions"], "readwrite");
      const deleteStore = deleteTx.objectStore("offlineActions");
      await deleteStore.delete(action.id);

      console.log("[SW] Synced offline action:", action.id);
    } catch (error) {
      console.log("[SW] Failed to sync action:", action.id, error);
    }
  }
}

// Helper to open IndexedDB
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("fragments-offline", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains("offlineActions")) {
        const store = db.createObjectStore("offlineActions", { keyPath: "id" });
        store.createIndex("timestamp", "timestamp");
      }

      if (!db.objectStoreNames.contains("cachedFragments")) {
        const store = db.createObjectStore("cachedFragments", {
          keyPath: "id",
        });
        store.createIndex("ownerId", "ownerId");
        store.createIndex("timestamp", "timestamp");
      }
    };
  });
}
