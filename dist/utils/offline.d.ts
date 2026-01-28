/**
 * edgeFlow.js - Offline/PWA Support
 *
 * Utilities for offline-first ML inference.
 */
export interface OfflineConfig {
    /** Enable offline mode (default: true) */
    enabled?: boolean;
    /** Cache models for offline use (default: true) */
    cacheModels?: boolean;
    /** Cache model config/tokenizer (default: true) */
    cacheConfig?: boolean;
    /** Maximum cache size in bytes (default: 500MB) */
    maxCacheSize?: number;
    /** Models to preload for offline use */
    preloadModels?: string[];
    /** Service worker path (if using custom SW) */
    serviceWorkerPath?: string;
}
export interface OfflineStatus {
    /** Whether the browser is online */
    isOnline: boolean;
    /** Whether offline mode is available */
    offlineReady: boolean;
    /** Number of cached models */
    cachedModels: number;
    /** Total cache size in bytes */
    cacheSize: number;
    /** Service worker status */
    serviceWorker: 'active' | 'installing' | 'waiting' | 'none';
}
export interface CachedModelInfo {
    url: string;
    size: number;
    cachedAt: Date;
    lastAccessed: Date;
    modelId?: string;
}
/**
 * Offline manager for PWA support
 */
export declare class OfflineManager {
    private config;
    private onlineListeners;
    private isInitialized;
    constructor(config?: OfflineConfig);
    /**
     * Initialize offline support
     */
    initialize(): Promise<void>;
    /**
     * Register service worker
     */
    private registerServiceWorker;
    /**
     * Preload models for offline use
     */
    preloadForOffline(modelUrls: string[]): Promise<void>;
    /**
     * Get offline status
     */
    getStatus(): Promise<OfflineStatus>;
    /**
     * Get list of cached models
     */
    getCachedModels(): Promise<CachedModelInfo[]>;
    /**
     * Check if a model is available offline
     */
    isModelAvailableOffline(url: string): Promise<boolean>;
    /**
     * Remove model from offline cache
     */
    removeFromOffline(url: string): Promise<void>;
    /**
     * Clear all offline data
     */
    clearOfflineData(): Promise<void>;
    /**
     * Check available storage
     */
    getStorageInfo(): Promise<{
        quota: number;
        usage: number;
        available: number;
    }>;
    /**
     * Request persistent storage
     */
    requestPersistentStorage(): Promise<boolean>;
    /**
     * Add online status listener
     */
    onOnlineStatusChange(listener: (online: boolean) => void): () => void;
    /**
     * Check if currently online
     */
    isOnline(): boolean;
    /**
     * Notify listeners of online status change
     */
    private notifyOnlineStatus;
    /**
     * Open IndexedDB
     */
    private openDatabase;
}
/**
 * Generate service worker code
 */
export declare function generateServiceWorker(options?: {
    cacheName?: string;
    modelUrls?: string[];
    cacheFirst?: boolean;
}): string;
/**
 * Generate PWA manifest
 */
export declare function generateManifest(options?: {
    name: string;
    shortName?: string;
    description?: string;
    themeColor?: string;
    backgroundColor?: string;
    icons?: Array<{
        src: string;
        sizes: string;
        type: string;
    }>;
}): object;
/**
 * Get the global offline manager instance
 */
export declare function getOfflineManager(config?: OfflineConfig): OfflineManager;
/**
 * Initialize offline support
 */
export declare function initOffline(config?: OfflineConfig): Promise<OfflineStatus>;
/**
 * Check if running in offline mode
 */
export declare function isOffline(): boolean;
/**
 * Check if PWA features are supported
 */
export declare function isPWASupported(): boolean;
//# sourceMappingURL=offline.d.ts.map