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
// Error class
export { EdgeFlowError, ErrorCodes } from './core/types.js';
// Tensor operations
export { EdgeFlowTensor, tensor, zeros, ones, full, random, randn, arange, linspace, eye, add, sub, mul, div, matmul, softmax, relu, sigmoid, tanh, sum, mean, argmax, concat, } from './core/tensor.js';
// Scheduler
export { InferenceScheduler, getScheduler, setScheduler, configureScheduler, } from './core/scheduler.js';
// Memory management
export { MemoryManager, MemoryScope, ModelCache, withMemoryScope, withMemoryScopeSync, getMemoryManager, getMemoryStats, release, gc, } from './core/memory.js';
// Runtime management
export { RuntimeManager, LoadedModelImpl, loadModel, loadModelFromBuffer, runInference, runBatchInference, getRuntimeManager, registerRuntime, getBestRuntime, getAvailableRuntimes, } from './core/runtime.js';
// ============================================================================
// Backend Exports
// ============================================================================
export { WebGPURuntime, createWebGPURuntime, WebNNRuntime, createWebNNRuntime, WASMRuntime, createWASMRuntime, registerAllBackends, } from './backends/index.js';
// ============================================================================
// Pipeline Exports
// ============================================================================
export { 
// Factory function
pipeline, createPipelines, 
// Base classes
BasePipeline, registerPipeline, getPipelineFactory, 
// Labels
SENTIMENT_LABELS, EMOTION_LABELS, IMAGENET_LABELS, 
// Pipelines
TextClassificationPipeline, SentimentAnalysisPipeline, FeatureExtractionPipeline, ImageClassificationPipeline, 
// Factory functions
createTextClassificationPipeline, createSentimentAnalysisPipeline, createFeatureExtractionPipeline, createImageClassificationPipeline, } from './pipelines/index.js';
// ============================================================================
// Utility Exports
// ============================================================================
export { 
// Tokenizer
Tokenizer, createBasicTokenizer, loadTokenizer, loadTokenizerFromHub, 
// Preprocessor
ImagePreprocessor, AudioPreprocessor, preprocessText, createImagePreprocessor, createAudioPreprocessor, 
// Cache
Cache, InferenceCache, ModelDownloadCache, createCache, 
// Model Loader (Preloading, Sharding, Resume, Caching)
loadModelData, preloadModel, preloadModels, isModelCached, getCachedModel, deleteCachedModel, clearModelCache, getModelCacheStats, getPreloadStatus, cancelPreload, getPreloadedModel, 
// HuggingFace Hub Integration
fromHub, fromTask, downloadModel, downloadTokenizer, downloadConfig, modelExists, getModelInfo, getDefaultModel, POPULAR_MODELS, } from './utils/index.js';
// ============================================================================
// Tools Exports
// ============================================================================
export { 
// Quantization (basic)
quantize, 
// Pruning (basic)
prune, 
// Analysis (basic)
analyzeModel, 
// Benchmarking (basic)
benchmark, 
// Export
exportModel, 
// Advanced Quantization
quantizeModel, quantizeTensor, dequantizeTensor, pruneModel, pruneTensor, analyzeModelDetailed, exportModelAdvanced, dequantizeInt8, dequantizeUint8, dequantizeFloat16, float16ToFloat32, 
// Debugging Tools
EdgeFlowDebugger, getDebugger, enableDebugging, disableDebugging, inspectTensor, formatTensorInspection, createAsciiHistogram, createTensorHeatmap, visualizeModelArchitecture, 
// Performance Monitor
PerformanceMonitor, getMonitor, startMonitoring, stopMonitoring, generateDashboardHTML, generateAsciiDashboard, 
// Benchmark utilities
runBenchmark, compareBenchmarks, benchmarkSuite, benchmarkMemory, formatBenchmarkResult, formatComparisonResult, } from './tools/index.js';
// ============================================================================
// Convenience Functions
// ============================================================================
/**
 * Check if edgeFlow is supported in the current environment
 */
export async function isSupported() {
    const runtimes = await getAvailableRuntimes();
    return Array.from(runtimes.values()).some(v => v);
}
/**
 * Get the best available runtime type
 */
export async function getBestRuntimeType() {
    const runtimes = await getAvailableRuntimes();
    if (runtimes.get('webgpu'))
        return 'webgpu';
    if (runtimes.get('webnn'))
        return 'webnn';
    if (runtimes.get('wasm'))
        return 'wasm';
    return null;
}
/**
 * Preload models for faster subsequent loading
 */
export async function preload(models) {
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
export async function getInfo() {
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
import { getAvailableRuntimes } from './core/runtime.js';
import { ModelDownloadCache } from './utils/cache.js';
//# sourceMappingURL=index.js.map