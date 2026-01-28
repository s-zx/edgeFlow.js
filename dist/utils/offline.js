/**
 * edgeFlow.js - Offline/PWA Support
 *
 * Utilities for offline-first ML inference.
 */
// ============================================================================
// Offline Manager
// ============================================================================
/**
 * Offline manager for PWA support
 */
export class OfflineManager {
    config;
    onlineListeners = new Set();
    isInitialized = false;
    constructor(config = {}) {
        this.config = {
            enabled: config.enabled ?? true,
            cacheModels: config.cacheModels ?? true,
            cacheConfig: config.cacheConfig ?? true,
            maxCacheSize: config.maxCacheSize ?? 500 * 1024 * 1024, // 500MB
            preloadModels: config.preloadModels ?? [],
            serviceWorkerPath: config.serviceWorkerPath ?? '/edgeflow-sw.js',
        };
    }
    /**
     * Initialize offline support
     */
    async initialize() {
        if (this.isInitialized)
            return;
        // Listen for online/offline events
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this.notifyOnlineStatus(true));
            window.addEventListener('offline', () => this.notifyOnlineStatus(false));
        }
        // Register service worker if available
        if (this.config.enabled && 'serviceWorker' in navigator) {
            try {
                await this.registerServiceWorker();
            }
            catch (error) {
                console.warn('Service worker registration failed:', error);
            }
        }
        // Preload models for offline use
        if (this.config.preloadModels.length > 0) {
            await this.preloadForOffline(this.config.preloadModels);
        }
        this.isInitialized = true;
    }
    /**
     * Register service worker
     */
    async registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            throw new Error('Service workers not supported');
        }
        try {
            const registration = await navigator.serviceWorker.register(this.config.serviceWorkerPath, { scope: '/' });
            console.log('edgeFlow.js service worker registered:', registration.scope);
            // Handle updates
            registration.onupdatefound = () => {
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.onstatechange = () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('New edgeFlow.js service worker available');
                        }
                    };
                }
            };
        }
        catch (error) {
            throw new Error(`Service worker registration failed: ${error}`);
        }
    }
    /**
     * Preload models for offline use
     */
    async preloadForOffline(modelUrls) {
        const { loadModelData } = await import('./model-loader.js');
        for (const url of modelUrls) {
            try {
                console.log(`Preloading for offline: ${url}`);
                await loadModelData(url, { cache: true });
                console.log(`✓ Cached: ${url}`);
            }
            catch (error) {
                console.warn(`Failed to cache ${url}:`, error);
            }
        }
    }
    /**
     * Get offline status
     */
    async getStatus() {
        const { getModelCacheStats } = await import('./model-loader.js');
        const stats = await getModelCacheStats();
        let swStatus = 'none';
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
                if (registration.active)
                    swStatus = 'active';
                else if (registration.installing)
                    swStatus = 'installing';
                else if (registration.waiting)
                    swStatus = 'waiting';
            }
        }
        return {
            isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
            offlineReady: stats.models > 0,
            cachedModels: stats.models,
            cacheSize: stats.totalSize,
            serviceWorker: swStatus,
        };
    }
    /**
     * Get list of cached models
     */
    async getCachedModels() {
        // Query IndexedDB for cached model metadata
        const db = await this.openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('meta', 'readonly');
            const store = tx.objectStore('meta');
            const request = store.getAll();
            request.onsuccess = () => {
                const models = (request.result || []).map((meta) => ({
                    url: meta['url'],
                    size: meta['size'],
                    cachedAt: new Date(meta['cachedAt']),
                    lastAccessed: new Date(meta['lastAccessed'] || meta['cachedAt']),
                    modelId: meta['modelId'],
                }));
                resolve(models);
            };
            request.onerror = () => reject(request.error);
        });
    }
    /**
     * Check if a model is available offline
     */
    async isModelAvailableOffline(url) {
        const { isModelCached } = await import('./model-loader.js');
        return isModelCached(url);
    }
    /**
     * Remove model from offline cache
     */
    async removeFromOffline(url) {
        const { deleteCachedModel } = await import('./model-loader.js');
        await deleteCachedModel(url);
    }
    /**
     * Clear all offline data
     */
    async clearOfflineData() {
        const { clearModelCache } = await import('./model-loader.js');
        await clearModelCache();
    }
    /**
     * Check available storage
     */
    async getStorageInfo() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            return {
                quota: estimate.quota ?? 0,
                usage: estimate.usage ?? 0,
                available: (estimate.quota ?? 0) - (estimate.usage ?? 0),
            };
        }
        return { quota: 0, usage: 0, available: 0 };
    }
    /**
     * Request persistent storage
     */
    async requestPersistentStorage() {
        if ('storage' in navigator && 'persist' in navigator.storage) {
            return await navigator.storage.persist();
        }
        return false;
    }
    /**
     * Add online status listener
     */
    onOnlineStatusChange(listener) {
        this.onlineListeners.add(listener);
        return () => this.onlineListeners.delete(listener);
    }
    /**
     * Check if currently online
     */
    isOnline() {
        return typeof navigator !== 'undefined' ? navigator.onLine : true;
    }
    /**
     * Notify listeners of online status change
     */
    notifyOnlineStatus(online) {
        this.onlineListeners.forEach(listener => listener(online));
    }
    /**
     * Open IndexedDB
     */
    async openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('edgeflow-model-cache', 1);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}
// ============================================================================
// Service Worker Template
// ============================================================================
/**
 * Generate service worker code
 */
export function generateServiceWorker(options = {}) {
    const { cacheName = 'edgeflow-v1', modelUrls = [], cacheFirst = true, } = options;
    return `
// edgeFlow.js Service Worker
// Auto-generated - customize as needed

const CACHE_NAME = '${cacheName}';
const MODEL_URLS = ${JSON.stringify(modelUrls)};

// Install event - cache core files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[edgeFlow SW] Caching core files');
        return cache.addAll([
          '/',
          '/edgeflow.browser.min.js',
          ...MODEL_URLS,
        ]);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - ${cacheFirst ? 'cache first' : 'network first'} strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only handle same-origin and model requests
  if (url.origin !== location.origin && !isModelRequest(url)) {
    return;
  }
  
  ${cacheFirst ? `
  // Cache first strategy
  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(event.request)
          .then((response) => {
            if (response.ok && shouldCache(event.request)) {
              const clone = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => cache.put(event.request, clone));
            }
            return response;
          });
      })
  );
  ` : `
  // Network first strategy
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && shouldCache(event.request)) {
          const clone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
  `}
});

// Check if request is for a model file
function isModelRequest(url) {
  return url.pathname.endsWith('.onnx') ||
         url.pathname.endsWith('.bin') ||
         url.hostname.includes('huggingface.co');
}

// Check if response should be cached
function shouldCache(request) {
  const url = new URL(request.url);
  return request.method === 'GET' && (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.onnx') ||
    url.pathname.endsWith('.bin') ||
    url.pathname.endsWith('.json')
  );
}

// Handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data.type === 'CACHE_MODEL') {
    cacheModel(event.data.url);
  }
});

// Cache a model URL
async function cacheModel(url) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(url);
    if (response.ok) {
      await cache.put(url, response);
      console.log('[edgeFlow SW] Cached model:', url);
    }
  } catch (error) {
    console.error('[edgeFlow SW] Failed to cache model:', url, error);
  }
}
  `.trim();
}
/**
 * Generate PWA manifest
 */
export function generateManifest(options = { name: 'edgeFlow.js App' }) {
    return {
        name: options.name,
        short_name: options.shortName ?? options.name,
        description: options.description ?? 'ML-powered application built with edgeFlow.js',
        start_url: '/',
        display: 'standalone',
        theme_color: options.themeColor ?? '#4F46E5',
        background_color: options.backgroundColor ?? '#FFFFFF',
        icons: options.icons ?? [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
        categories: ['utilities', 'productivity'],
    };
}
// ============================================================================
// Singleton Instance
// ============================================================================
let offlineManager = null;
/**
 * Get the global offline manager instance
 */
export function getOfflineManager(config) {
    if (!offlineManager) {
        offlineManager = new OfflineManager(config);
    }
    return offlineManager;
}
/**
 * Initialize offline support
 */
export async function initOffline(config) {
    const manager = getOfflineManager(config);
    await manager.initialize();
    return manager.getStatus();
}
/**
 * Check if running in offline mode
 */
export function isOffline() {
    return typeof navigator !== 'undefined' ? !navigator.onLine : false;
}
/**
 * Check if PWA features are supported
 */
export function isPWASupported() {
    return typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'caches' in window;
}
//# sourceMappingURL=offline.js.map