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
export type { DataType, TypedArray, Shape, Tensor, RuntimeType, RuntimeCapabilities, Runtime, ModelFormat, QuantizationType, ModelMetadata, ModelIOSpec, ModelLoadOptions, LoadedModel, TaskPriority, TaskStatus, InferenceTask, SchedulerOptions, MemoryStats, MemoryPoolConfig, PipelineTask, PipelineConfig, PipelineOptions, TokenizerConfig, TokenizedOutput, EventType, EdgeFlowEvent, EventListener, ErrorCode, } from './core/types.js';
export { EdgeFlowError, ErrorCodes } from './core/types.js';
export { EdgeFlowTensor, tensor, zeros, ones, full, random, randn, arange, linspace, eye, add, sub, mul, div, matmul, softmax, relu, sigmoid, tanh, sum, mean, argmax, concat, } from './core/tensor.js';
export { InferenceScheduler, getScheduler, setScheduler, configureScheduler, } from './core/scheduler.js';
export { MemoryManager, MemoryScope, ModelCache, withMemoryScope, withMemoryScopeSync, getMemoryManager, getMemoryStats, release, gc, } from './core/memory.js';
export { RuntimeManager, LoadedModelImpl, loadModel, loadModelFromBuffer, runInference, runBatchInference, getRuntimeManager, registerRuntime, getBestRuntime, getAvailableRuntimes, } from './core/runtime.js';
export { WebGPURuntime, createWebGPURuntime, WebNNRuntime, createWebNNRuntime, WASMRuntime, createWASMRuntime, registerAllBackends, } from './backends/index.js';
export { pipeline, createPipelines, BasePipeline, registerPipeline, getPipelineFactory, SENTIMENT_LABELS, EMOTION_LABELS, IMAGENET_LABELS, type PipelineResult, type TextClassificationResult, type FeatureExtractionResult, type ImageClassificationResult, type ObjectDetectionResult, TextClassificationPipeline, SentimentAnalysisPipeline, FeatureExtractionPipeline, ImageClassificationPipeline, createTextClassificationPipeline, createSentimentAnalysisPipeline, createFeatureExtractionPipeline, createImageClassificationPipeline, type PipelineFactoryOptions, type TextClassificationOptions, type FeatureExtractionOptions, type ImageClassificationOptions, type ImageInput, } from './pipelines/index.js';
export { Tokenizer, createBasicTokenizer, loadTokenizer, loadTokenizerFromHub, type TokenizerModel, type TokenizerOptions, ImagePreprocessor, AudioPreprocessor, preprocessText, createImagePreprocessor, createAudioPreprocessor, type ImagePreprocessorOptions, type AudioPreprocessorOptions, type TextPreprocessorOptions, Cache, InferenceCache, ModelDownloadCache, createCache, type CacheStrategy, type CacheOptions, type CacheStats, loadModelData, preloadModel, preloadModels, isModelCached, getCachedModel, deleteCachedModel, clearModelCache, getModelCacheStats, getPreloadStatus, cancelPreload, getPreloadedModel, type DownloadProgress, type ModelLoaderOptions, type PreloadOptions, fromHub, fromTask, downloadModel, downloadTokenizer, downloadConfig, modelExists, getModelInfo, getDefaultModel, POPULAR_MODELS, type HubOptions, type HubDownloadProgress, type ModelConfig, type ModelBundle, type PopularModelTask, } from './utils/index.js';
export { quantize, type QuantizationOptions, type QuantizationResult, prune, type PruningOptions, type PruningResult, analyzeModel, type ModelAnalysis, benchmark, type BenchmarkOptions, type BenchmarkResult, exportModel, quantizeModel, quantizeTensor, dequantizeTensor, pruneModel, pruneTensor, analyzeModelDetailed, exportModelAdvanced, dequantizeInt8, dequantizeUint8, dequantizeFloat16, float16ToFloat32, type QuantizationMethod, type AdvancedQuantizationOptions, type QuantizationProgress, type AdvancedQuantizationResult, type LayerQuantizationStats, type QuantizationStats, type AdvancedPruningOptions, type AdvancedPruningResult, type DetailedModelAnalysis, type ExportFormat, type ExportOptions, EdgeFlowDebugger, getDebugger, enableDebugging, disableDebugging, inspectTensor, formatTensorInspection, createAsciiHistogram, createTensorHeatmap, visualizeModelArchitecture, type DebuggerConfig, type TensorInspection, type TensorStats, type HistogramData, type InferenceTrace, type OperationTrace, type DebugEvent, type DebugPerformanceMetrics, PerformanceMonitor, getMonitor, startMonitoring, stopMonitoring, generateDashboardHTML, generateAsciiDashboard, type MonitorConfig, type PerformanceSample, type InferenceMetrics, type MemoryMetrics, type SystemMetrics, type AlertConfig, type AlertEvent, type WidgetData, runBenchmark, compareBenchmarks, benchmarkSuite, benchmarkMemory, formatBenchmarkResult, formatComparisonResult, type DetailedBenchmarkOptions, type DetailedBenchmarkResult, type CompareBenchmarkResult, type MemoryBenchmarkResult, } from './tools/index.js';
/**
 * Check if edgeFlow is supported in the current environment
 */
export declare function isSupported(): Promise<boolean>;
/**
 * Get the best available runtime type
 */
export declare function getBestRuntimeType(): Promise<RuntimeType | null>;
/**
 * Preload models for faster subsequent loading
 */
export declare function preload(models: string[]): Promise<void>;
/**
 * edgeFlow.js version
 */
export declare const VERSION = "0.1.0";
/**
 * Get framework info
 */
export declare function getInfo(): Promise<{
    version: string;
    runtimes: Record<RuntimeType, boolean>;
    features: string[];
}>;
import { RuntimeType } from './core/types.js';
//# sourceMappingURL=index.d.ts.map