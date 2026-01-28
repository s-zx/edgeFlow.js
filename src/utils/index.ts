/**
 * edgeFlow.js - Utilities Exports
 */

// Tokenizer
export {
  Tokenizer,
  createBasicTokenizer,
  loadTokenizer,
  loadTokenizerFromHub,
  type TokenizerModel,
  type TokenizerOptions,
} from './tokenizer.js';

// Preprocessor
export {
  ImagePreprocessor,
  AudioPreprocessor,
  preprocessText,
  createImagePreprocessor,
  createAudioPreprocessor,
  type ImagePreprocessorOptions,
  type AudioPreprocessorOptions,
  type TextPreprocessorOptions,
} from './preprocessor.js';

// Cache
export {
  Cache,
  InferenceCache,
  ModelDownloadCache,
  createCache,
  type CacheStrategy,
  type CacheOptions,
  type CacheStats,
} from './cache.js';

// Model Loader (Preloading, Sharding, Resume, Caching)
export {
  loadModelData,
  preloadModel,
  preloadModels,
  isModelCached,
  getCachedModel,
  deleteCachedModel,
  clearModelCache,
  getModelCacheStats,
  getPreloadStatus,
  cancelPreload,
  getPreloadedModel,
  type DownloadProgress,
  type ModelLoaderOptions,
  type PreloadOptions,
} from './model-loader.js';

// HuggingFace Hub Integration
export {
  fromHub,
  fromTask,
  downloadModel,
  downloadFile,
  downloadTokenizer,
  downloadConfig,
  modelExists,
  getModelInfo,
  getDefaultModel,
  POPULAR_MODELS,
  type HubOptions,
  type HubDownloadProgress,
  type ModelConfig,
  type ModelBundle,
  type PopularModelTask,
} from './hub.js';

// Offline/PWA Support
export {
  OfflineManager,
  getOfflineManager,
  initOffline,
  isOffline,
  isPWASupported,
  generateServiceWorker,
  generateManifest,
  type OfflineConfig,
  type OfflineStatus,
  type CachedModelInfo,
} from './offline.js';
