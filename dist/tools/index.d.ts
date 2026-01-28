/**
 * edgeFlow.js - Tools and Utilities
 *
 * Model optimization, quantization, and analysis tools.
 */
import { LoadedModel, QuantizationType } from '../core/types.js';
/**
 * Quantization options
 */
export interface QuantizationOptions {
    /** Quantization method */
    method: QuantizationType;
    /** Calibration data for calibrated quantization */
    calibrationData?: Float32Array[];
    /** Whether to quantize weights only */
    weightsOnly?: boolean;
    /** Layers to exclude from quantization */
    excludeLayers?: string[];
}
/**
 * Quantization result
 */
export interface QuantizationResult {
    /** Quantized model data */
    modelData: ArrayBuffer;
    /** Original size in bytes */
    originalSize: number;
    /** Quantized size in bytes */
    quantizedSize: number;
    /** Compression ratio */
    compressionRatio: number;
    /** Quantization statistics */
    stats: {
        layersQuantized: number;
        layersSkipped: number;
    };
}
/**
 * Quantize a model
 *
 * @example
 * ```typescript
 * const quantized = await quantize(model, {
 *   method: 'int8',
 *   calibrationData: samples,
 * });
 * ```
 */
export declare function quantize(model: LoadedModel | ArrayBuffer, options: QuantizationOptions): Promise<QuantizationResult>;
/**
 * Pruning options
 */
export interface PruningOptions {
    /** Target sparsity (0-1) */
    sparsity: number;
    /** Pruning method */
    method?: 'magnitude' | 'random' | 'structured';
    /** Layers to exclude */
    excludeLayers?: string[];
}
/**
 * Pruning result
 */
export interface PruningResult {
    /** Pruned model data */
    modelData: ArrayBuffer;
    /** Achieved sparsity */
    actualSparsity: number;
    /** Number of parameters pruned */
    parametersPruned: number;
    /** Total parameters */
    totalParameters: number;
}
/**
 * Prune model weights
 */
export declare function prune(model: LoadedModel | ArrayBuffer, options: PruningOptions): Promise<PruningResult>;
/**
 * Model analysis result
 */
export interface ModelAnalysis {
    /** Total number of parameters */
    totalParameters: number;
    /** Model size in bytes */
    sizeBytes: number;
    /** Layer information */
    layers: Array<{
        name: string;
        type: string;
        parameters: number;
        inputShape: number[];
        outputShape: number[];
    }>;
    /** Estimated FLOPs */
    estimatedFlops: number;
    /** Memory requirements */
    memoryRequirements: {
        weights: number;
        activations: number;
        total: number;
    };
}
/**
 * Analyze a model
 */
export declare function analyzeModel(model: LoadedModel | ArrayBuffer): Promise<ModelAnalysis>;
/**
 * Benchmark options
 */
export interface BenchmarkOptions {
    /** Number of warmup runs */
    warmupRuns?: number;
    /** Number of benchmark runs */
    runs?: number;
    /** Input shape */
    inputShape?: number[];
}
/**
 * Benchmark result
 */
export interface BenchmarkResult {
    /** Average inference time in ms */
    avgTime: number;
    /** Minimum inference time in ms */
    minTime: number;
    /** Maximum inference time in ms */
    maxTime: number;
    /** Standard deviation */
    stdDev: number;
    /** Throughput (inferences per second) */
    throughput: number;
    /** All run times */
    times: number[];
}
/**
 * Benchmark model inference
 */
export declare function benchmark(runFn: () => Promise<void>, options?: BenchmarkOptions): Promise<BenchmarkResult>;
export { benchmark as runBenchmark, compareBenchmarks, benchmarkSuite, benchmarkMemory, formatBenchmarkResult, formatComparisonResult, } from './benchmark.js';
export type { BenchmarkOptions as DetailedBenchmarkOptions, BenchmarkResult as DetailedBenchmarkResult, CompareBenchmarkResult, MemoryBenchmarkResult, } from './benchmark.js';
export { quantizeModel, quantizeTensor, dequantizeTensor, pruneModel, pruneTensor, analyzeModel as analyzeModelDetailed, exportModel as exportModelAdvanced, dequantizeInt8, dequantizeUint8, dequantizeFloat16, float16ToFloat32, } from './quantization.js';
export type { QuantizationType as QuantizationMethod, QuantizationOptions as AdvancedQuantizationOptions, QuantizationProgress, QuantizationResult as AdvancedQuantizationResult, LayerQuantizationStats, QuantizationStats, PruningOptions as AdvancedPruningOptions, PruningResult as AdvancedPruningResult, ModelAnalysis as DetailedModelAnalysis, ExportFormat, ExportOptions, } from './quantization.js';
export { EdgeFlowDebugger, getDebugger, enableDebugging, disableDebugging, inspectTensor, formatTensorInspection, createAsciiHistogram, createTensorHeatmap, visualizeModelArchitecture, } from './debugger.js';
export type { DebuggerConfig, TensorInspection, TensorStats, HistogramData, InferenceTrace, OperationTrace, DebugEvent, PerformanceMetrics as DebugPerformanceMetrics, } from './debugger.js';
export { PerformanceMonitor, getMonitor, startMonitoring, stopMonitoring, generateDashboardHTML, generateAsciiDashboard, } from './monitor.js';
export type { MonitorConfig, PerformanceSample, InferenceMetrics, MemoryMetrics, SystemMetrics, AlertConfig, AlertEvent, WidgetData, } from './monitor.js';
/**
 * Export model to different formats
 */
export declare function exportModel(model: LoadedModel | ArrayBuffer, format: 'onnx' | 'json' | 'binary'): Promise<ArrayBuffer | string>;
//# sourceMappingURL=index.d.ts.map