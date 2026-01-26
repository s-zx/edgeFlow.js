/**
 * edgeFlow.js - Advanced Model Loader
 *
 * Features:
 * - Preloading: Background model loading
 * - Sharding: Split large files into chunks for download
 * - Resume Download: Continue download from where it left off
 * - Model Caching: IndexedDB storage for large models
 */
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
 * Load model data with caching, sharding, and resume support
 */
export declare function loadModelData(url: string, options?: ModelLoaderOptions): Promise<ArrayBuffer>;
/**
 * Preload a model in the background
 */
export declare function preloadModel(url: string, options?: PreloadOptions): Promise<ArrayBuffer>;
/**
 * Preload multiple models
 */
export declare function preloadModels(urls: Array<{
    url: string;
    priority?: number;
}>, options?: Omit<PreloadOptions, 'priority'>): Promise<ArrayBuffer[]>;
/**
 * Check if a model is cached
 */
export declare function isModelCached(url: string): Promise<boolean>;
/**
 * Get cached model data
 */
export declare function getCachedModel(url: string): Promise<ArrayBuffer | null>;
/**
 * Delete a cached model
 */
export declare function deleteCachedModel(url: string): Promise<void>;
/**
 * Clear all cached models
 */
export declare function clearModelCache(): Promise<void>;
/**
 * Get model cache statistics
 */
export declare function getModelCacheStats(): Promise<{
    models: number;
    totalSize: number;
}>;
/**
 * Get preload status
 */
export declare function getPreloadStatus(url: string): 'pending' | 'loading' | 'complete' | 'error' | 'not_found';
/**
 * Cancel a preload
 */
export declare function cancelPreload(url: string): void;
/**
 * Get preloaded model (or wait for preload to complete)
 */
export declare function getPreloadedModel(url: string): Promise<ArrayBuffer | null>;
//# sourceMappingURL=model-loader.d.ts.map