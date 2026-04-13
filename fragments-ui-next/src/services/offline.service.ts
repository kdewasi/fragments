// ────────────────────────────────────────────────────────────────────────────
// Offline service — IndexedDB caching for fragments, service worker registration
// ────────────────────────────────────────────────────────────────────────────

import type { Fragment } from '../types';

const DB_NAME = 'fragments-offline';
const DB_VERSION = 1;
const STORE_FRAGMENTS = 'fragments';
const STORE_DATA = 'fragment-data';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_FRAGMENTS)) {
        db.createObjectStore(STORE_FRAGMENTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_DATA)) {
        db.createObjectStore(STORE_DATA);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Cache fragment metadata list to IndexedDB */
export async function cacheFragments(fragments: Fragment[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_FRAGMENTS, 'readwrite');
    const store = tx.objectStore(STORE_FRAGMENTS);
    // Clear old and write new
    store.clear();
    for (const fragment of fragments) {
      store.put(fragment);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Silently fail — offline caching is best-effort
  }
}

/** Retrieve cached fragments from IndexedDB */
export async function getCachedFragments(): Promise<Fragment[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_FRAGMENTS, 'readonly');
    const store = tx.objectStore(STORE_FRAGMENTS);
    const request = store.getAll();
    const result = await new Promise<Fragment[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as Fragment[]);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return result;
  } catch {
    return [];
  }
}

/** Cache fragment binary/text data by ID */
export async function cacheFragmentData(id: string, data: string | ArrayBuffer): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_DATA, 'readwrite');
    const store = tx.objectStore(STORE_DATA);
    store.put(data, id);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // best-effort
  }
}

/** Retrieve cached fragment data by ID */
export async function getCachedFragmentData(id: string): Promise<string | ArrayBuffer | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_DATA, 'readonly');
    const store = tx.objectStore(STORE_DATA);
    const request = store.get(id);
    const result = await new Promise<string | ArrayBuffer | null>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return result;
  } catch {
    return null;
  }
}

/** Remove cached fragment data by ID */
export async function removeCachedFragmentData(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_DATA, 'readwrite');
    const store = tx.objectStore(STORE_DATA);
    store.delete(id);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // best-effort
  }
}

/** Register the service worker */
export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[SW] Registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('[SW] Registration failed:', err);
        });
    });
  }
}

/** Check if the browser is currently offline */
export function isOffline(): boolean {
  return !navigator.onLine;
}
