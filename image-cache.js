/**
 * Envato Xperience - Image Cache
 * Stores product preview images in IndexedDB to avoid filling chrome.storage.local.
 */

(function () {
  const DB_NAME = 'envato-xperience-cache';
  const DB_VERSION = 1;
  const STORE_NAME = 'productImages';

  const TTL_MS = 7 * 24 * 60 * 60 * 1000;
  const MAX_ENTRIES = 80;
  const MAX_TOTAL_BYTES = 50 * 1024 * 1024;

  let dbPromise = null;

  function openDatabase() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = function () {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'itemId' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
          store.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
        }
      };

      request.onsuccess = function () {
        resolve(request.result);
      };

      request.onerror = function () {
        reject(request.error);
      };
    });

    return dbPromise;
  }

  function withStore(mode, callback) {
    return openDatabase().then((db) => new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode);
      const store = transaction.objectStore(STORE_NAME);
      const result = callback(store, transaction);

      transaction.oncomplete = function () {
        resolve(result);
      };

      transaction.onerror = function () {
        reject(transaction.error);
      };

      transaction.onabort = function () {
        reject(transaction.error);
      };
    }));
  }

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = function () {
        resolve(request.result);
      };
      request.onerror = function () {
        reject(request.error);
      };
    });
  }

  async function digestBlob(blob) {
    const buffer = await blob.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest))
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('');
  }

  function isFresh(entry) {
    return entry && typeof entry.expiresAt === 'number' && entry.expiresAt > Date.now();
  }

  async function getEntry(itemId) {
    const db = await openDatabase();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    return requestToPromise(store.get(itemId));
  }

  async function putEntry(entry) {
    const db = await openDatabase();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await requestToPromise(store.put(entry));
  }

  async function deleteEntry(itemId) {
    const db = await openDatabase();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await requestToPromise(store.delete(itemId));
  }

  async function getAllEntries() {
    const db = await openDatabase();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    return requestToPromise(store.getAll());
  }

  async function touchEntry(entry) {
    entry.lastAccessedAt = Date.now();
    await putEntry(entry);
  }

  async function fetchImageBlob(url) {
    const response = await fetch(url, { cache: 'force-cache', credentials: 'omit' });
    if (!response.ok) {
      throw new Error(`Image fetch failed with status ${response.status}`);
    }

    const blob = await response.blob();
    if (!blob || !blob.size) {
      throw new Error('Image fetch returned an empty blob');
    }

    return blob;
  }

  async function prune() {
    const entries = await getAllEntries();
    if (!entries || entries.length === 0) return;

    const now = Date.now();
    const expired = entries.filter((entry) => !isFresh(entry) || !entry.blob);
    for (const entry of expired) {
      await deleteEntry(entry.itemId);
    }

    const freshEntries = entries
      .filter((entry) => isFresh(entry) && entry.blob)
      .sort((a, b) => (a.lastAccessedAt || a.updatedAt || 0) - (b.lastAccessedAt || b.updatedAt || 0));

    let totalBytes = freshEntries.reduce((sum, entry) => sum + (entry.size || 0), 0);
    while (freshEntries.length > MAX_ENTRIES || totalBytes > MAX_TOTAL_BYTES) {
      const entry = freshEntries.shift();
      if (!entry) break;
      totalBytes -= entry.size || 0;
      await deleteEntry(entry.itemId);
    }
  }

  async function getImage(itemId, sourceUrl) {
    if (!itemId) return null;

    const entry = await getEntry(itemId);
    if (!entry || !isFresh(entry) || !entry.blob) {
      return null;
    }

    if (sourceUrl && entry.sourceUrl && entry.sourceUrl !== sourceUrl) {
      return null;
    }

    await touchEntry(entry);
    return {
      blob: entry.blob,
      checksum: entry.checksum,
      sourceUrl: entry.sourceUrl,
      updatedAt: entry.updatedAt
    };
  }

  async function cacheImage(itemId, sourceUrl) {
    if (!itemId || !sourceUrl) return null;

    const blob = await fetchImageBlob(sourceUrl);
    const checksum = await digestBlob(blob);
    const now = Date.now();

    const entry = {
      itemId,
      sourceUrl,
      blob,
      checksum,
      size: blob.size,
      contentType: blob.type || 'image/*',
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
      expiresAt: now + TTL_MS
    };

    const previous = await getEntry(itemId);
    if (previous && previous.checksum === checksum && previous.sourceUrl === sourceUrl && isFresh(previous)) {
      previous.lastAccessedAt = now;
      previous.updatedAt = now;
      previous.expiresAt = now + TTL_MS;
      await putEntry(previous);
      return {
        blob: previous.blob,
        checksum: previous.checksum,
        sourceUrl: previous.sourceUrl,
        updatedAt: previous.updatedAt
      };
    }

    await putEntry(entry);
    await prune();

    return {
      blob,
      checksum,
      sourceUrl,
      updatedAt: now
    };
  }

  window.EnvatoImageCache = {
    getImage,
    cacheImage,
    prune,
    config: {
      ttlMs: TTL_MS,
      maxEntries: MAX_ENTRIES,
      maxTotalBytes: MAX_TOTAL_BYTES
    }
  };
})();
