/**
 * edgeFlow.js - Visual Debugging Tools
 *
 * In-browser debugging and visualization utilities for ML models.
 */
import { EdgeFlowTensor } from '../core/index.js';
/**
 * Debugger configuration
 */
export interface DebuggerConfig {
    /** Enable logging */
    logging?: boolean;
    /** Log level */
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    /** Enable tensor inspection */
    inspectTensors?: boolean;
    /** Maximum values to display per tensor */
    maxDisplayValues?: number;
    /** Enable performance tracking */
    trackPerformance?: boolean;
    /** Custom logger function */
    logger?: (level: string, message: string, data?: unknown) => void;
}
/**
 * Tensor inspection result
 */
export interface TensorInspection {
    name: string;
    shape: number[];
    dtype: string;
    size: number;
    memoryBytes: number;
    stats: TensorStats;
    sample: number[];
    histogram?: HistogramData;
}
/**
 * Tensor statistics
 */
export interface TensorStats {
    min: number;
    max: number;
    mean: number;
    std: number;
    zeros: number;
    nans: number;
    infinities: number;
    sparsity: number;
}
/**
 * Histogram data
 */
export interface HistogramData {
    bins: number[];
    counts: number[];
    binEdges: number[];
}
/**
 * Inference trace
 */
export interface InferenceTrace {
    id: string;
    modelId: string;
    timestamp: number;
    inputs: TensorInspection[];
    outputs: TensorInspection[];
    duration: number;
    memoryUsed: number;
    operations: OperationTrace[];
}
/**
 * Operation trace
 */
export interface OperationTrace {
    name: string;
    type: string;
    duration: number;
    inputShapes: number[][];
    outputShapes: number[][];
    attributes?: Record<string, unknown>;
}
/**
 * Debug event
 */
export interface DebugEvent {
    type: 'tensor' | 'inference' | 'error' | 'warning' | 'info' | 'performance';
    timestamp: number;
    data: unknown;
    message: string;
}
/**
 * Performance metrics
 */
export interface PerformanceMetrics {
    inferenceCount: number;
    totalInferenceTime: number;
    averageInferenceTime: number;
    minInferenceTime: number;
    maxInferenceTime: number;
    peakMemoryUsage: number;
    currentMemoryUsage: number;
    tensorAllocations: number;
    tensorDeallocations: number;
}
/**
 * Inspect a tensor
 */
export declare function inspectTensor(tensor: EdgeFlowTensor, name?: string, options?: {
    histogram?: boolean;
    maxSample?: number;
}): TensorInspection;
/**
 * Format tensor inspection for display
 */
export declare function formatTensorInspection(inspection: TensorInspection): string;
/**
 * Visual debugger for edgeFlow.js
 */
export declare class EdgeFlowDebugger {
    private config;
    private events;
    private traces;
    private performanceMetrics;
    private listeners;
    private isEnabled;
    constructor(config?: DebuggerConfig);
    /**
     * Default logger
     */
    private defaultLogger;
    /**
     * Log a message
     */
    log(level: string, message: string, data?: unknown): void;
    /**
     * Add debug event
     */
    private addEvent;
    /**
     * Enable debugger
     */
    enable(): void;
    /**
     * Disable debugger
     */
    disable(): void;
    /**
     * Subscribe to events
     */
    on(type: string, callback: (event: DebugEvent) => void): () => void;
    /**
     * Inspect and log a tensor
     */
    inspectTensor(tensor: EdgeFlowTensor, name?: string): TensorInspection;
    /**
     * Start tracing an inference
     */
    startTrace(modelId: string): string;
    /**
     * Add input to trace
     */
    traceInput(traceId: string, tensor: EdgeFlowTensor, name: string): void;
    /**
     * Add output to trace
     */
    traceOutput(traceId: string, tensor: EdgeFlowTensor, name: string): void;
    /**
     * Add operation to trace
     */
    traceOperation(traceId: string, operation: OperationTrace): void;
    /**
     * End trace
     */
    endTrace(traceId: string): InferenceTrace | undefined;
    /**
     * Record tensor allocation
     */
    recordAllocation(tensor: EdgeFlowTensor): void;
    /**
     * Record tensor deallocation
     */
    recordDeallocation(tensor: EdgeFlowTensor): void;
    /**
     * Get performance metrics
     */
    getPerformanceMetrics(): PerformanceMetrics;
    /**
     * Get all events
     */
    getEvents(): DebugEvent[];
    /**
     * Get all traces
     */
    getTraces(): InferenceTrace[];
    /**
     * Get trace by ID
     */
    getTrace(traceId: string): InferenceTrace | undefined;
    /**
     * Clear all data
     */
    clear(): void;
    /**
     * Export debug data
     */
    export(): {
        events: DebugEvent[];
        traces: InferenceTrace[];
        metrics: PerformanceMetrics;
        timestamp: number;
    };
    /**
     * Generate summary report
     */
    generateReport(): string;
}
/**
 * Get or create the global debugger instance
 */
export declare function getDebugger(config?: DebuggerConfig): EdgeFlowDebugger;
/**
 * Enable debugging
 */
export declare function enableDebugging(config?: DebuggerConfig): EdgeFlowDebugger;
/**
 * Disable debugging
 */
export declare function disableDebugging(): void;
/**
 * Create ASCII histogram
 */
export declare function createAsciiHistogram(histogram: HistogramData, width?: number, height?: number): string;
/**
 * Create tensor heatmap (for 2D tensors)
 */
export declare function createTensorHeatmap(tensor: EdgeFlowTensor, width?: number): string;
/**
 * Create model architecture visualization
 */
export declare function visualizeModelArchitecture(layers: Array<{
    name: string;
    type: string;
    inputShape: number[];
    outputShape: number[];
}>): string;
declare const _default: {
    EdgeFlowDebugger: typeof EdgeFlowDebugger;
    getDebugger: typeof getDebugger;
    enableDebugging: typeof enableDebugging;
    disableDebugging: typeof disableDebugging;
    inspectTensor: typeof inspectTensor;
    formatTensorInspection: typeof formatTensorInspection;
    createAsciiHistogram: typeof createAsciiHistogram;
    createTensorHeatmap: typeof createTensorHeatmap;
    visualizeModelArchitecture: typeof visualizeModelArchitecture;
};
export default _default;
//# sourceMappingURL=debugger.d.ts.map