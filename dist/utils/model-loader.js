/**
 * edgeFlow.js - Advanced Model Loader
 *
 * Features:
 * - Preloading: Background model loading
 * - Sharding: Split large files into chunks for download
 * - Resume Download: Continue download from where it left off
 * - Model Caching: IndexedDB storage for large models
 */
// ============================================================================
// IndexedDB Model Cache
// ============================================================================
const DB_NAME = 'edgeflow-model-cache';
const DB_VERSION = 1;
const STORE_META = 'meta';
const STORE_CHUNKS = 'chunks';
const STORE_STATE = 'download-state';
/**
 * IndexedDB-based model cache for large files
 */
class ModelCache {
    db = null;
    dbPromise = null;
    /**
     * Open the database
     */
    async openDB() {
        if (this.db)
            return this.db;
        if (this.dbPromise)
            return this.dbPromise;
        this.dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                // Model metadata store
                if (!db.objectStoreNames.contains(STORE_META)) {
                    db.createObjectStore(STORE_META, { keyPath: 'url' });
                }
                // Chunk data store
                if (!db.objectStoreNames.contains(STORE_CHUNKS)) {
                    const chunkStore = db.createObjectStore(STORE_CHUNKS, { keyPath: ['url', 'index'] });
                    chunkStore.createIndex('url', 'url', { unique: false });
                }
                // Download state store (for resume)
                if (!db.objectStoreNames.contains(STORE_STATE)) {
                    db.createObjectStore(STORE_STATE, { keyPath: 'url' });
                }
            };
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            request.onerror = () => reject(request.error);
        });
        return this.dbPromise;
    }
    /**
     * Get cached model metadata
     */
    async getMeta(url) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_META, 'readonly');
            const store = tx.objectStore(STORE_META);
            const request = store.get(url);
            request.onsuccess = () => resolve(request.result ?? null);
            request.onerror = () => reject(request.error);
        });
    }
    /**
     * Save model metadata
     */
    async saveMeta(meta) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_META, 'readwrite');
            const store = tx.objectStore(STORE_META);
            store.put(meta);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
    /**
     * Save a chunk
     */
    async saveChunk(url, index, data) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_CHUNKS, 'readwrite');
            const store = tx.objectStore(STORE_CHUNKS);
            store.put({ url, index, data });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
    /**
     * Get all chunks for a URL
     */
    async getChunks(url) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_CHUNKS, 'readonly');
            const store = tx.objectStore(STORE_CHUNKS);
            const index = store.index('url');
            const request = index.getAll(url);
            request.onsuccess = () => {
                const results = request.result;
                // Sort by index and extract data
                results.sort((a, b) => a.index - b.index);
                resolve(results.map(r => r.data));
            };
            request.onerror = () => reject(request.error);
        });
    }
    /**
     * Get complete model data (merged chunks)
     */
    async getModel(url) {
        const meta = await this.getMeta(url);
        if (!meta || !meta.complete)
            return null;
        const chunks = await this.getChunks(url);
        if (chunks.length === 0)
            return null;
        // Merge chunks
        const totalSize = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
        const result = new Uint8Array(totalSize);
        let offset = 0;
        for (const chunk of chunks) {
            result.set(new Uint8Array(chunk), offset);
            offset += chunk.byteLength;
        }
        return result.buffer;
    }
    /**
     * Save download state (for resume)
     */
    async saveDownloadState(state) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_STATE, 'readwrite');
            const store = tx.objectStore(STORE_STATE);
            store.put(state);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
    /**
     * Get download state
     */
    async getDownloadState(url) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_STATE, 'readonly');
            const store = tx.objectStore(STORE_STATE);
            const request = store.get(url);
            request.onsuccess = () => resolve(request.result ?? null);
            request.onerror = () => reject(request.error);
        });
    }
    /**
     * Delete download state
     */
    async deleteDownloadState(url) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_STATE, 'readwrite');
            const store = tx.objectStore(STORE_STATE);
            store.delete(url);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
    /**
     * Delete cached model
     */
    async deleteModel(url) {
        const db = await this.openDB();
        // Delete metadata
        await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_META, 'readwrite');
            const store = tx.objectStore(STORE_META);
            store.delete(url);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        // Delete chunks
        const chunks = await this.getChunks(url);
        if (chunks.length > 0) {
            await new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_CHUNKS, 'readwrite');
                const store = tx.objectStore(STORE_CHUNKS);
                const index = store.index('url');
                const request = index.openCursor(IDBKeyRange.only(url));
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    }
                };
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        }
        // Delete download state
        await this.deleteDownloadState(url);
    }
    /**
     * Clear all cached models
     */
    async clear() {
        const db = await this.openDB();
        const stores = [STORE_META, STORE_CHUNKS, STORE_STATE];
        for (const storeName of stores) {
            await new Promise((resolve, reject) => {
                const tx = db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                store.clear();
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        }
    }
    /**
     * Get cache statistics
     */
    async getStats() {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_META, 'readonly');
            const store = tx.objectStore(STORE_META);
            const request = store.getAll();
            request.onsuccess = () => {
                const metas = request.result;
                resolve({
                    models: metas.filter(m => m.complete).length,
                    totalSize: metas.reduce((sum, m) => sum + (m.complete ? m.size : 0), 0),
                });
            };
            request.onerror = () => reject(request.error);
        });
    }
}
// Global cache instance
const modelCache = new ModelCache();
// ============================================================================
// Advanced Model Loader
// ============================================================================
/**
 * Check if server supports Range requests
 */
async function supportsRangeRequests(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        const acceptRanges = response.headers.get('Accept-Ranges');
        const contentLength = response.headers.get('Content-Length');
        const etag = response.headers.get('ETag') ?? undefined;
        return {
            supports: acceptRanges === 'bytes',
            size: contentLength ? parseInt(contentLength, 10) : 0,
            etag,
        };
    }
    catch {
        return { supports: false, size: 0 };
    }
}
/**
 * Download a single chunk using Range request
 */
async function downloadChunk(url, start, end, timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, {
            headers: { Range: `bytes=${start}-${end}` },
            signal: controller.signal,
        });
        if (response.status !== 206 && response.status !== 200) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.arrayBuffer();
    }
    finally {
        clearTimeout(timeoutId);
    }
}
/**
 * Download model with sharding and resume support
 */
async function downloadWithResume(url, options) {
    const { chunkSize = 5 * 1024 * 1024, // 5MB
    parallelConnections = 4, timeout = 30000, onProgress, } = options;
    // Check server capabilities
    const { supports: supportsRange, size: totalSize, etag } = await supportsRangeRequests(url);
    // If no Range support or small file, download normally
    if (!supportsRange || totalSize < chunkSize * 2) {
        return downloadSimple(url, timeout, onProgress);
    }
    // Check for existing download state
    let state = await modelCache.getDownloadState(url);
    // Initialize or reset state if needed
    if (!state || (etag && state.totalSize !== totalSize)) {
        const numChunks = Math.ceil(totalSize / chunkSize);
        const chunks = [];
        for (let i = 0; i < numChunks; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize - 1, totalSize - 1);
            chunks.push({ index: i, start, end, downloaded: false });
        }
        state = {
            url,
            totalSize,
            downloadedSize: 0,
            chunks,
            startedAt: Date.now(),
        };
        // Clear any existing chunks
        await modelCache.deleteModel(url);
    }
    // Download remaining chunks
    const pendingChunks = state.chunks.filter(c => !c.downloaded);
    let downloadedSize = state.downloadedSize;
    const startTime = Date.now();
    let lastProgressTime = startTime;
    let lastDownloadedSize = downloadedSize;
    // Progress tracking
    const reportProgress = () => {
        if (!onProgress)
            return;
        const now = Date.now();
        const elapsed = (now - lastProgressTime) / 1000;
        const bytesDownloaded = downloadedSize - lastDownloadedSize;
        const speed = elapsed > 0 ? bytesDownloaded / elapsed : 0;
        const remaining = totalSize - downloadedSize;
        const eta = speed > 0 ? (remaining / speed) * 1000 : 0;
        onProgress({
            loaded: downloadedSize,
            total: totalSize,
            percent: (downloadedSize / totalSize) * 100,
            speed,
            eta,
            currentChunk: state.chunks.filter(c => c.downloaded).length,
            totalChunks: state.chunks.length,
        });
        lastProgressTime = now;
        lastDownloadedSize = downloadedSize;
    };
    // Download chunks in parallel
    const downloadQueue = [...pendingChunks];
    const inProgress = new Map();
    while (downloadQueue.length > 0 || inProgress.size > 0) {
        // Start new downloads up to parallelConnections limit
        while (downloadQueue.length > 0 && inProgress.size < parallelConnections) {
            const chunk = downloadQueue.shift();
            const downloadPromise = (async () => {
                try {
                    const data = await downloadChunk(url, chunk.start, chunk.end, timeout);
                    await modelCache.saveChunk(url, chunk.index, data);
                    chunk.downloaded = true;
                    downloadedSize += data.byteLength;
                    // Update state periodically
                    state.downloadedSize = downloadedSize;
                    await modelCache.saveDownloadState(state);
                    reportProgress();
                }
                finally {
                    inProgress.delete(chunk.index);
                }
            })();
            inProgress.set(chunk.index, downloadPromise);
        }
        // Wait for at least one to complete
        if (inProgress.size > 0) {
            await Promise.race(inProgress.values());
        }
    }
    // All chunks downloaded, merge them
    const chunks = await modelCache.getChunks(url);
    const result = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
    }
    // Save metadata and cleanup state
    await modelCache.saveMeta({
        url,
        size: totalSize,
        etag,
        cachedAt: Date.now(),
        chunks: chunks.length,
        complete: true,
    });
    await modelCache.deleteDownloadState(url);
    return result.buffer;
}
/**
 * Simple download without sharding
 */
async function downloadSimple(url, timeout, onProgress) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const contentLength = response.headers.get('Content-Length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        if (!response.body || !onProgress || total === 0) {
            return await response.arrayBuffer();
        }
        // Stream with progress
        const reader = response.body.getReader();
        const chunks = [];
        let loaded = 0;
        const startTime = Date.now();
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            chunks.push(value);
            loaded += value.length;
            const elapsed = (Date.now() - startTime) / 1000;
            const speed = elapsed > 0 ? loaded / elapsed : 0;
            const remaining = total - loaded;
            const eta = speed > 0 ? (remaining / speed) * 1000 : 0;
            onProgress({
                loaded,
                total,
                percent: (loaded / total) * 100,
                speed,
                eta,
            });
        }
        // Merge chunks
        const result = new Uint8Array(loaded);
        let offset = 0;
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }
        return result.buffer;
    }
    finally {
        clearTimeout(timeoutId);
    }
}
/**
 * Preload manager for background model loading
 */
class PreloadManager {
    tasks = new Map();
    queue = [];
    maxConcurrent = 2;
    activeCount = 0;
    /**
     * Preload a model in the background
     */
    preload(url, options = {}) {
        // Check if already preloading
        const existing = this.tasks.get(url);
        if (existing) {
            return existing.promise;
        }
        // Create task
        let resolve;
        let reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        const task = {
            url,
            priority: options.priority ?? 0,
            options,
            promise,
            resolve,
            reject,
            status: 'pending',
        };
        this.tasks.set(url, task);
        // Insert into queue based on priority
        const insertIndex = this.queue.findIndex(u => {
            const t = this.tasks.get(u);
            return t && t.priority < task.priority;
        });
        if (insertIndex === -1) {
            this.queue.push(url);
        }
        else {
            this.queue.splice(insertIndex, 0, url);
        }
        // Process queue
        this.processQueue();
        return promise;
    }
    /**
     * Process the preload queue
     */
    async processQueue() {
        while (this.queue.length > 0 && this.activeCount < this.maxConcurrent) {
            const url = this.queue.shift();
            if (!url)
                break;
            const task = this.tasks.get(url);
            if (!task || task.status !== 'pending')
                continue;
            this.activeCount++;
            task.status = 'loading';
            this.downloadTask(task).finally(() => {
                this.activeCount--;
                this.processQueue();
            });
        }
    }
    /**
     * Download a preload task
     */
    async downloadTask(task) {
        try {
            const data = await loadModelData(task.url, task.options);
            task.status = 'complete';
            task.resolve(data);
        }
        catch (error) {
            task.status = 'error';
            task.reject(error instanceof Error ? error : new Error(String(error)));
        }
    }
    /**
     * Check if a model is preloaded
     */
    isPreloaded(url) {
        const task = this.tasks.get(url);
        return task?.status === 'complete';
    }
    /**
     * Get preload status
     */
    getStatus(url) {
        const task = this.tasks.get(url);
        return task?.status ?? 'not_found';
    }
    /**
     * Get preloaded model data
     */
    async get(url) {
        const task = this.tasks.get(url);
        if (!task)
            return null;
        if (task.status === 'complete' || task.status === 'loading') {
            return task.promise;
        }
        return null;
    }
    /**
     * Cancel preload
     */
    cancel(url) {
        const task = this.tasks.get(url);
        if (task && task.status === 'pending') {
            this.tasks.delete(url);
            this.queue = this.queue.filter(u => u !== url);
            task.reject(new Error('Preload cancelled'));
        }
    }
    /**
     * Clear all preloads
     */
    clear() {
        for (const [, task] of this.tasks) {
            if (task.status === 'pending') {
                task.reject(new Error('Preload cleared'));
            }
        }
        this.tasks.clear();
        this.queue = [];
    }
}
// Global preload manager
const preloadManager = new PreloadManager();
// ============================================================================
// Public API
// ============================================================================
/**
 * Load model data with caching, sharding, and resume support
 */
export async function loadModelData(url, options = {}) {
    const { cache = true, forceDownload = false, resumable = true, } = options;
    // Check cache first
    if (cache && !forceDownload) {
        const cached = await modelCache.getModel(url);
        if (cached) {
            console.log(`✓ Model loaded from cache: ${url}`);
            options.onProgress?.({
                loaded: cached.byteLength,
                total: cached.byteLength,
                percent: 100,
                speed: 0,
                eta: 0,
            });
            return cached;
        }
    }
    // Download with resume support
    let data;
    if (resumable) {
        data = await downloadWithResume(url, options);
    }
    else {
        data = await downloadSimple(url, options.timeout ?? 30000, options.onProgress);
    }
    // Cache the result
    if (cache) {
        // For simple downloads, save as single chunk
        if (!resumable) {
            await modelCache.saveChunk(url, 0, data);
            await modelCache.saveMeta({
                url,
                size: data.byteLength,
                cachedAt: Date.now(),
                chunks: 1,
                complete: true,
            });
        }
    }
    return data;
}
/**
 * Preload a model in the background
 */
export function preloadModel(url, options = {}) {
    return preloadManager.preload(url, options);
}
/**
 * Preload multiple models
 */
export function preloadModels(urls, options = {}) {
    return Promise.all(urls.map(({ url, priority }) => preloadManager.preload(url, { ...options, priority })));
}
/**
 * Check if a model is cached
 */
export async function isModelCached(url) {
    const meta = await modelCache.getMeta(url);
    return meta?.complete ?? false;
}
/**
 * Get cached model data
 */
export async function getCachedModel(url) {
    return modelCache.getModel(url);
}
/**
 * Delete a cached model
 */
export async function deleteCachedModel(url) {
    return modelCache.deleteModel(url);
}
/**
 * Clear all cached models
 */
export async function clearModelCache() {
    return modelCache.clear();
}
/**
 * Get model cache statistics
 */
export async function getModelCacheStats() {
    return modelCache.getStats();
}
/**
 * Get preload status
 */
export function getPreloadStatus(url) {
    return preloadManager.getStatus(url);
}
/**
 * Cancel a preload
 */
export function cancelPreload(url) {
    preloadManager.cancel(url);
}
/**
 * Get preloaded model (or wait for preload to complete)
 */
export async function getPreloadedModel(url) {
    return preloadManager.get(url);
}
//# sourceMappingURL=model-loader.js.map