// Offline functionality using IndexedDB
class OfflineManager {
  constructor() {
    this.dbName = "fragments-offline";
    this.dbVersion = 1;
    this.db = null;
  }

  // Initialize IndexedDB
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store for offline actions (create, update, delete)
        if (!db.objectStoreNames.contains("offlineActions")) {
          const actionStore = db.createObjectStore("offlineActions", {
            keyPath: "id",
          });
          actionStore.createIndex("timestamp", "timestamp");
          actionStore.createIndex("type", "type");
        }

        // Store for cached fragments
        if (!db.objectStoreNames.contains("cachedFragments")) {
          const fragmentStore = db.createObjectStore("cachedFragments", {
            keyPath: "id",
          });
          fragmentStore.createIndex("ownerId", "ownerId");
          fragmentStore.createIndex("timestamp", "timestamp");
        }

        // Store for fragment data
        if (!db.objectStoreNames.contains("fragmentData")) {
          const dataStore = db.createObjectStore("fragmentData", {
            keyPath: "id",
          });
          dataStore.createIndex("fragmentId", "fragmentId");
        }
      };
    });
  }

  // Save fragment to offline cache
  async cacheFragment(fragment, data = null) {
    if (!this.db) await this.init();

    const tx = this.db.transaction(
      ["cachedFragments", "fragmentData"],
      "readwrite"
    );

    // Cache fragment metadata
    const fragmentStore = tx.objectStore("cachedFragments");
    await fragmentStore.put({
      ...fragment,
      timestamp: Date.now(),
      cached: true,
    });

    // Cache fragment data if provided
    if (data) {
      const dataStore = tx.objectStore("fragmentData");
      await dataStore.put({
        id: `${fragment.id}-data`,
        fragmentId: fragment.id,
        data: data,
        timestamp: Date.now(),
      });
    }

    console.log("📱 Fragment cached offline:", fragment.id);
  }

  // Get cached fragments for a user
  async getCachedFragments(ownerId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(["cachedFragments"], "readonly");
      const store = tx.objectStore("cachedFragments");
      const index = store.index("ownerId");
      const request = index.getAll(ownerId);

      request.onsuccess = () => {
        const fragments = request.result.map((fragment) => ({
          ...fragment,
          fromCache: true,
        }));
        resolve(fragments);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Get cached fragment data
  async getCachedFragmentData(fragmentId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(["fragmentData"], "readonly");
      const store = tx.objectStore("fragmentData");
      const request = store.get(`${fragmentId}-data`);

      request.onsuccess = () => {
        resolve(request.result ? request.result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Queue an action for when online
  async queueOfflineAction(type, url, options, data = null) {
    if (!this.db) await this.init();

    const action = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: type,
      url: url,
      options: options,
      data: data,
      timestamp: Date.now(),
      retries: 0,
    };

    const tx = this.db.transaction(["offlineActions"], "readwrite");
    const store = tx.objectStore("offlineActions");
    await store.add(action);

    console.log("📱 Queued offline action:", type, action.id);

    // Register for background sync if available
    if (
      "serviceWorker" in navigator &&
      "sync" in window.ServiceWorkerRegistration.prototype
    ) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register("sync-fragments");
    }

    return action.id;
  }

  // Get pending offline actions
  async getPendingActions() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(["offlineActions"], "readonly");
      const store = tx.objectStore("offlineActions");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Clear completed actions
  async clearAction(actionId) {
    if (!this.db) await this.init();

    const tx = this.db.transaction(["offlineActions"], "readwrite");
    const store = tx.objectStore("offlineActions");
    await store.delete(actionId);
  }

  // Check if online
  isOnline() {
    return navigator.onLine;
  }

  // Show offline notification
  showOfflineNotification(message) {
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff9800;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 1000;
      font-family: Arial, sans-serif;
      max-width: 300px;
    `;
    notification.innerHTML = `
      <strong>📱 Offline Mode</strong><br>
      ${message}
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 5000);
  }

  // Show sync notification
  showSyncNotification(message) {
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4caf50;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 1000;
      font-family: Arial, sans-serif;
      max-width: 300px;
    `;
    notification.innerHTML = `
      <strong>✅ Back Online</strong><br>
      ${message}
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 3000);
  }
}

// Export singleton instance
export const offlineManager = new OfflineManager();

// Initialize when module loads
offlineManager.init().catch(console.error);
