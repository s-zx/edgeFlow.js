/**
 * edgeFlow.js
 * 
 * Lightweight, high-performance browser ML inference framework
 * with native concurrency support.
 * 
 * @example
 * ```typescript
 * import { pipeline } from 'edgeflow';
 * 
 * // Create a sentiment analysis pipeline
 * const sentiment = await pipeline('sentiment-analysis');
 * 
 * // Run inference
 * const result = await sentiment.run('I love this product!');
 * console.log(result); // { label: 'positive', score: 0.98 }
 * 
 * // Batch processing
 * const results = await sentiment.run([
 *   'This is amazing!',
 *   'This is terrible.'
 * ]);
 * 
 * // Concurrent execution with different models
 * const classifier = await pipeline('text-classification');
 * const extractor = await pipeline('feature-extraction');
 * 
 * const [classification, features] = await Promise.all([
 *   classifier.run('Sample text'),
 *   extractor.run('Sample text')
 * ]);
 * ```
 * 
 * @packageDocumentation
 */

// ============================================================================
// Core Exports
// ============================================================================

// Types
export type {
  // Tensor types
  DataType,
  TypedArray,
  Shape,
  Tensor,
  
  // Runtime types
  RuntimeType,
  RuntimeCapabilities,
  Runtime,
  
  // Model types
  ModelFormat,
  QuantizationType,
  ModelMetadata,
  ModelIOSpec,
  ModelLoadOptions,
  LoadedModel,
  
  // Scheduler types
  TaskPriority,
  TaskStatus,
  InferenceTask,
  SchedulerOptions,
  
  // Memory types
  MemoryStats,
  MemoryPoolConfig,
  
  // Pipeline types
  PipelineTask,
  PipelineConfig,
  PipelineOptions,
  
  // Tokenizer types
  TokenizerConfig,
  TokenizedOutput,
  
  // Event types
  EventType,
  EdgeFlowEvent,
  EventListener,
  
  // Error types
  ErrorCode,
} from './core/types.js';

// Error class
export { EdgeFlowError, ErrorCodes } from './core/types.js';

// Tensor operations
export {
  EdgeFlowTensor,
  tensor,
  zeros,
  ones,
  full,
  random,
  randn,
  arange,
  linspace,
  eye,
  add,
  sub,
  mul,
  div,
  matmul,
  softmax,
  relu,
  sigmoid,
  tanh,
  sum,
  mean,
  argmax,
  concat,
} from './core/tensor.js';

// Scheduler
export {
  InferenceScheduler,
  getScheduler,
  setScheduler,
  configureScheduler,
} from './core/scheduler.js';

// Memory management
export {
  MemoryManager,
  MemoryScope,
  ModelCache,
  withMemoryScope,
  withMemoryScopeSync,
  getMemoryManager,
  getMemoryStats,
  release,
  gc,
} from './core/memory.js';

// Runtime management
export {
  RuntimeManager,
  LoadedModelImpl,
  loadModel,
  loadModelFromBuffer,
  runInference,
  runBatchInference,
  getRuntimeManager,
  registerRuntime,
  getBestRuntime,
  getAvailableRuntimes,
} from './core/runtime.js';

// ============================================================================
// Backend Exports
// ============================================================================

export {
  WebGPURuntime,
  createWebGPURuntime,
  WebNNRuntime,
  createWebNNRuntime,
  WASMRuntime,
  createWASMRuntime,
  registerAllBackends,
} from './backends/index.js';

// ============================================================================
// Pipeline Exports
// ============================================================================

export {
  // Factory function
  pipeline,
  createPipelines,
  
  // Base classes
  BasePipeline,
  registerPipeline,
  getPipelineFactory,
  
  // Labels
  SENTIMENT_LABELS,
  EMOTION_LABELS,
  IMAGENET_LABELS,
  
  // Result types
  type PipelineResult,
  type TextClassificationResult,
  type FeatureExtractionResult,
  type ImageClassificationResult,
  type ObjectDetectionResult,
  
  // Pipelines
  TextClassificationPipeline,
  SentimentAnalysisPipeline,
  FeatureExtractionPipeline,
  ImageClassificationPipeline,
  
  // Factory functions
  createTextClassificationPipeline,
  createSentimentAnalysisPipeline,
  createFeatureExtractionPipeline,
  createImageClassificationPipeline,
  
  // Options types
  type PipelineFactoryOptions,
  type TextClassificationOptions,
  type FeatureExtractionOptions,
  type ImageClassificationOptions,
  type ImageInput,
} from './pipelines/index.js';

// ============================================================================
// Utility Exports
// ============================================================================

export {
  // Tokenizer
  Tokenizer,
  createBasicTokenizer,
  loadTokenizer,
  loadTokenizerFromHub,
  type TokenizerModel,
  type TokenizerOptions,
  
  // Preprocessor
  ImagePreprocessor,
  AudioPreprocessor,
  preprocessText,
  createImagePreprocessor,
  createAudioPreprocessor,
  type ImagePreprocessorOptions,
  type AudioPreprocessorOptions,
  type TextPreprocessorOptions,
  
  // Cache
  Cache,
  InferenceCache,
  ModelDownloadCache,
  createCache,
  type CacheStrategy,
  type CacheOptions,
  type CacheStats,
  
  // Model Loader (Preloading, Sharding, Resume, Caching)
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
  
  // HuggingFace Hub Integration
  fromHub,
  fromTask,
  downloadModel,
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
} from './utils/index.js';

// ============================================================================
// Tools Exports
// ============================================================================

export {
  // Quantization
  quantize,
  type QuantizationOptions,
  type QuantizationResult,
  
  // Pruning
  prune,
  type PruningOptions,
  type PruningResult,
  
  // Analysis
  analyzeModel,
  type ModelAnalysis,
  
  // Benchmarking
  benchmark,
  type BenchmarkOptions,
  type BenchmarkResult,
  
  // Export
  exportModel,
} from './tools/index.js';

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Check if edgeFlow is supported in the current environment
 */
export async function isSupported(): Promise<boolean> {
  const runtimes = await getAvailableRuntimes();
  return Array.from(runtimes.values()).some(v => v);
}

/**
 * Get the best available runtime type
 */
export async function getBestRuntimeType(): Promise<RuntimeType | null> {
  const runtimes = await getAvailableRuntimes();
  
  if (runtimes.get('webgpu')) return 'webgpu';
  if (runtimes.get('webnn')) return 'webnn';
  if (runtimes.get('wasm')) return 'wasm';
  
  return null;
}

/**
 * Preload models for faster subsequent loading
 */
export async function preload(
  models: string[]
): Promise<void> {
  const cache = new ModelDownloadCache();
  
  await Promise.all(models.map(async (url) => {
    if (!(await cache.get(url))) {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
      }
    }
  }));
}

// ============================================================================
// Version Info
// ============================================================================

/**
 * edgeFlow.js version
 */
export const VERSION = '0.1.0';

/**
 * Get framework info
 */
export async function getInfo(): Promise<{
  version: string;
  runtimes: Record<RuntimeType, boolean>;
  features: string[];
}> {
  const runtimes = await getAvailableRuntimes();
  
  return {
    version: VERSION,
    runtimes: {
      webgpu: runtimes.get('webgpu') ?? false,
      webnn: runtimes.get('webnn') ?? false,
      wasm: runtimes.get('wasm') ?? false,
      auto: true,
    },
    features: [
      'concurrent-execution',
      'batch-processing',
      'memory-management',
      'model-caching',
      'quantization',
    ],
  };
}

// Re-export RuntimeType for convenience
import { RuntimeType } from './core/types.js';
import { getAvailableRuntimes } from './core/runtime.js';
import { ModelDownloadCache } from './utils/cache.js';
