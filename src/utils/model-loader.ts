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
// Types
// ============================================================================

/**
 * Download progress information
 */
export interface DownloadProgress {
  /** Downloaded bytes */
  loaded: number;
  /** Total bytes (0 if unknown) */
  total: number;
  /** Progress percentage (0-100) */
  percent: number;
  /** Download speed in bytes/sec */
  speed: number;
  /** Estimated time remaining in ms */
  eta: number;
  /** Current chunk index (for sharded downloads) */
  currentChunk?: number;
  /** Total chunks (for sharded downloads) */
  totalChunks?: number;
}

/**
 * Model loader options
 */
export interface ModelLoaderOptions {
  /** Enable caching (default: true) */
  cache?: boolean;
  /** Cache name for IndexedDB (default: 'edgeflow-models') */
  cacheName?: string;
  /** Enable resume download (default: true) */
  resumable?: boolean;
  /** Chunk size for sharded downloads in bytes (default: 5MB) */
  chunkSize?: number;
  /** Progress callback */
  onProgress?: (progress: DownloadProgress) => void;
  /** Number of parallel download connections (default: 4) */
  parallelConnections?: number;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Force re-download even if cached */
  forceDownload?: boolean;
}

/**
 * Preload options
 */
export interface PreloadOptions extends ModelLoaderOptions {
  /** Priority (higher = more important, default: 0) */
  priority?: number;
}

/**
 * Cached model metadata
 */
interface CachedModelMeta {
  url: string;
  size: number;
  etag?: string;
  lastModified?: string;
  cachedAt: number;
  chunks?: number;
  complete: boolean;
}

/**
 * Download state for resume support
 */
interface DownloadState {
  url: string;
  totalSize: number;
  downloadedSize: number;
  chunks: ChunkState[];
  startedAt: number;
}

/**
 * Chunk state
 */
interface ChunkState {
  index: number;
  start: number;
  end: number;
  downloaded: boolean;
}

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
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * Open the database
   */
  private async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
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
  async getMeta(url: string): Promise<CachedModelMeta | null> {
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
  async saveMeta(meta: CachedModelMeta): Promise<void> {
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
  async saveChunk(url: string, index: number, data: ArrayBuffer): Promise<void> {
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
  async getChunks(url: string): Promise<ArrayBuffer[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CHUNKS, 'readonly');
      const store = tx.objectStore(STORE_CHUNKS);
      const index = store.index('url');
      const request = index.getAll(url);
      
      request.onsuccess = () => {
        const results = request.result as Array<{ url: string; index: number; data: ArrayBuffer }>;
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
  async getModel(url: string): Promise<ArrayBuffer | null> {
    const meta = await this.getMeta(url);
    if (!meta || !meta.complete) return null;

    const chunks = await this.getChunks(url);
    if (chunks.length === 0) return null;

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
  async saveDownloadState(state: DownloadState): Promise<void> {
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
  async getDownloadState(url: string): Promise<DownloadState | null> {
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
  async deleteDownloadState(url: string): Promise<void> {
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
  async deleteModel(url: string): Promise<void> {
    const db = await this.openDB();
    
    // Delete metadata
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readwrite');
      const store = tx.objectStore(STORE_META);
      store.delete(url);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // Delete chunks
    const chunks = await this.getChunks(url);
    if (chunks.length > 0) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_CHUNKS, 'readwrite');
        const store = tx.objectStore(STORE_CHUNKS);
        const index = store.index('url');
        const request = index.openCursor(IDBKeyRange.only(url));
        
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
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
  async clear(): Promise<void> {
    const db = await this.openDB();
    
    const stores = [STORE_META, STORE_CHUNKS, STORE_STATE];
    for (const storeName of stores) {
      await new Promise<void>((resolve, reject) => {
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
  async getStats(): Promise<{ models: number; totalSize: number }> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readonly');
      const store = tx.objectStore(STORE_META);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const metas = request.result as CachedModelMeta[];
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
async function supportsRangeRequests(url: string): Promise<{ supports: boolean; size: number; etag?: string }> {
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
  } catch {
    return { supports: false, size: 0 };
  }
}

/**
 * Download a single chunk using Range request
 */
async function downloadChunk(
  url: string,
  start: number,
  end: number,
  timeout: number
): Promise<ArrayBuffer> {
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
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Download model with sharding and resume support
 */
async function downloadWithResume(
  url: string,
  options: ModelLoaderOptions
): Promise<ArrayBuffer> {
  const {
    chunkSize = 5 * 1024 * 1024, // 5MB
    parallelConnections = 4,
    timeout = 30000,
    onProgress,
  } = options;

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
    const chunks: ChunkState[] = [];
    
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
    if (!onProgress) return;
    
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
      currentChunk: state!.chunks.filter(c => c.downloaded).length,
      totalChunks: state!.chunks.length,
    });

    lastProgressTime = now;
    lastDownloadedSize = downloadedSize;
  };

  // Download chunks in parallel
  const downloadQueue = [...pendingChunks];
  const inProgress = new Map<number, Promise<void>>();

  while (downloadQueue.length > 0 || inProgress.size > 0) {
    // Start new downloads up to parallelConnections limit
    while (downloadQueue.length > 0 && inProgress.size < parallelConnections) {
      const chunk = downloadQueue.shift()!;
      
      const downloadPromise = (async () => {
        try {
          const data = await downloadChunk(url, chunk.start, chunk.end, timeout);
          await modelCache.saveChunk(url, chunk.index, data);
          
          chunk.downloaded = true;
          downloadedSize += data.byteLength;
          
          // Update state periodically
          state!.downloadedSize = downloadedSize;
          await modelCache.saveDownloadState(state!);
          
          reportProgress();
        } finally {
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
async function downloadSimple(
  url: string,
  timeout: number,
  onProgress?: (progress: DownloadProgress) => void
): Promise<ArrayBuffer> {
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
    const chunks: Uint8Array[] = [];
    let loaded = 0;
    const startTime = Date.now();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

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
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// Preload Manager
// ============================================================================

interface PreloadTask {
  url: string;
  priority: number;
  options: ModelLoaderOptions;
  promise: Promise<ArrayBuffer>;
  resolve: (data: ArrayBuffer) => void;
  reject: (error: Error) => void;
  status: 'pending' | 'loading' | 'complete' | 'error';
}

/**
 * Preload manager for background model loading
 */
class PreloadManager {
  private tasks: Map<string, PreloadTask> = new Map();
  private queue: string[] = [];
  private maxConcurrent = 2;
  private activeCount = 0;

  /**
   * Preload a model in the background
   */
  preload(url: string, options: PreloadOptions = {}): Promise<ArrayBuffer> {
    // Check if already preloading
    const existing = this.tasks.get(url);
    if (existing) {
      return existing.promise;
    }

    // Create task
    let resolve!: (data: ArrayBuffer) => void;
    let reject!: (error: Error) => void;
    
    const promise = new Promise<ArrayBuffer>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    const task: PreloadTask = {
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
    } else {
      this.queue.splice(insertIndex, 0, url);
    }

    // Process queue
    this.processQueue();

    return promise;
  }

  /**
   * Process the preload queue
   */
  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 && this.activeCount < this.maxConcurrent) {
      const url = this.queue.shift();
      if (!url) break;

      const task = this.tasks.get(url);
      if (!task || task.status !== 'pending') continue;

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
  private async downloadTask(task: PreloadTask): Promise<void> {
    try {
      const data = await loadModelData(task.url, task.options);
      task.status = 'complete';
      task.resolve(data);
    } catch (error) {
      task.status = 'error';
      task.reject(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Check if a model is preloaded
   */
  isPreloaded(url: string): boolean {
    const task = this.tasks.get(url);
    return task?.status === 'complete';
  }

  /**
   * Get preload status
   */
  getStatus(url: string): 'pending' | 'loading' | 'complete' | 'error' | 'not_found' {
    const task = this.tasks.get(url);
    return task?.status ?? 'not_found';
  }

  /**
   * Get preloaded model data
   */
  async get(url: string): Promise<ArrayBuffer | null> {
    const task = this.tasks.get(url);
    if (!task) return null;
    
    if (task.status === 'complete' || task.status === 'loading') {
      return task.promise;
    }
    
    return null;
  }

  /**
   * Cancel preload
   */
  cancel(url: string): void {
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
  clear(): void {
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
export async function loadModelData(
  url: string,
  options: ModelLoaderOptions = {}
): Promise<ArrayBuffer> {
  const {
    cache = true,
    forceDownload = false,
    resumable = true,
  } = options;

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
  let data: ArrayBuffer;
  
  if (resumable) {
    data = await downloadWithResume(url, options);
  } else {
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
export function preloadModel(url: string, options: PreloadOptions = {}): Promise<ArrayBuffer> {
  return preloadManager.preload(url, options);
}

/**
 * Preload multiple models
 */
export function preloadModels(
  urls: Array<{ url: string; priority?: number }>,
  options: Omit<PreloadOptions, 'priority'> = {}
): Promise<ArrayBuffer[]> {
  return Promise.all(
    urls.map(({ url, priority }) => preloadManager.preload(url, { ...options, priority }))
  );
}

/**
 * Check if a model is cached
 */
export async function isModelCached(url: string): Promise<boolean> {
  const meta = await modelCache.getMeta(url);
  return meta?.complete ?? false;
}

/**
 * Get cached model data
 */
export async function getCachedModel(url: string): Promise<ArrayBuffer | null> {
  return modelCache.getModel(url);
}

/**
 * Delete a cached model
 */
export async function deleteCachedModel(url: string): Promise<void> {
  return modelCache.deleteModel(url);
}

/**
 * Clear all cached models
 */
export async function clearModelCache(): Promise<void> {
  return modelCache.clear();
}

/**
 * Get model cache statistics
 */
export async function getModelCacheStats(): Promise<{ models: number; totalSize: number }> {
  return modelCache.getStats();
}

/**
 * Get preload status
 */
export function getPreloadStatus(url: string): 'pending' | 'loading' | 'complete' | 'error' | 'not_found' {
  return preloadManager.getStatus(url);
}

/**
 * Cancel a preload
 */
export function cancelPreload(url: string): void {
  preloadManager.cancel(url);
}

/**
 * Get preloaded model (or wait for preload to complete)
 */
export async function getPreloadedModel(url: string): Promise<ArrayBuffer | null> {
  return preloadManager.get(url);
}
