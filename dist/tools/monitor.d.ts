/**
 * edgeFlow.js - Performance Monitoring Dashboard
 *
 * Real-time performance monitoring and metrics visualization.
 */
/**
 * Monitor configuration
 */
export interface MonitorConfig {
    /** Enable monitoring (default: true) */
    enabled?: boolean;
    /** Sampling interval in ms (default: 1000) */
    sampleInterval?: number;
    /** History size (number of samples to keep) */
    historySize?: number;
    /** Enable memory monitoring (default: true) */
    monitorMemory?: boolean;
    /** Enable FPS monitoring (default: true) */
    monitorFPS?: boolean;
    /** Custom metric collectors */
    collectors?: Array<() => Record<string, number>>;
}
/**
 * Performance sample
 */
export interface PerformanceSample {
    timestamp: number;
    inference: InferenceMetrics;
    memory: MemoryMetrics;
    system: SystemMetrics;
    custom: Record<string, number>;
}
/**
 * Inference metrics
 */
export interface InferenceMetrics {
    /** Inferences in the last interval */
    count: number;
    /** Average inference time (ms) */
    avgTime: number;
    /** Min inference time (ms) */
    minTime: number;
    /** Max inference time (ms) */
    maxTime: number;
    /** Throughput (inferences per second) */
    throughput: number;
    /** Queue length */
    queueLength: number;
    /** Active inferences */
    activeCount: number;
}
/**
 * Memory metrics
 */
export interface MemoryMetrics {
    /** Used JS heap size (bytes) */
    usedHeap: number;
    /** Total JS heap size (bytes) */
    totalHeap: number;
    /** Heap limit (bytes) */
    heapLimit: number;
    /** Heap usage percentage */
    heapUsage: number;
    /** Tensor memory (bytes) */
    tensorMemory: number;
    /** Cache memory (bytes) */
    cacheMemory: number;
}
/**
 * System metrics
 */
export interface SystemMetrics {
    /** Frames per second */
    fps: number;
    /** CPU usage estimate (0-1) */
    cpuUsage: number;
    /** Time since last sample (ms) */
    deltaTime: number;
    /** Browser info */
    userAgent: string;
    /** WebGPU available */
    webgpuAvailable: boolean;
    /** WebNN available */
    webnnAvailable: boolean;
}
/**
 * Alert configuration
 */
export interface AlertConfig {
    /** Metric name */
    metric: string;
    /** Threshold value */
    threshold: number;
    /** Comparison operator */
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
    /** Alert message */
    message: string;
    /** Alert level */
    level: 'info' | 'warn' | 'error';
}
/**
 * Alert event
 */
export interface AlertEvent {
    config: AlertConfig;
    value: number;
    timestamp: number;
}
/**
 * Dashboard widget data
 */
export interface WidgetData {
    type: 'chart' | 'gauge' | 'counter' | 'text';
    title: string;
    data: unknown;
}
/**
 * Performance monitor for edgeFlow.js
 */
export declare class PerformanceMonitor {
    private config;
    private samples;
    private isRunning;
    private intervalId;
    private alerts;
    private alertListeners;
    private sampleListeners;
    private inferenceCount;
    private inferenceTimes;
    private queueLength;
    private activeCount;
    private frameCount;
    private lastFrameTime;
    private fps;
    private rafId;
    private tensorMemory;
    private cacheMemory;
    constructor(config?: MonitorConfig);
    /**
     * Start monitoring
     */
    start(): void;
    /**
     * Stop monitoring
     */
    stop(): void;
    /**
     * Monitor FPS
     */
    private monitorFPS;
    /**
     * Collect a performance sample
     */
    private collectSample;
    /**
     * Collect memory metrics
     */
    private collectMemoryMetrics;
    /**
     * Collect system metrics
     */
    private collectSystemMetrics;
    /**
     * Estimate CPU usage based on inference times
     */
    private estimateCPUUsage;
    /**
     * Check alerts
     */
    private checkAlerts;
    /**
     * Get metric value from sample
     */
    private getMetricValue;
    /**
     * Record an inference
     */
    recordInference(duration: number): void;
    /**
     * Update queue length
     */
    updateQueueLength(length: number): void;
    /**
     * Update active count
     */
    updateActiveCount(count: number): void;
    /**
     * Update tensor memory
     */
    updateTensorMemory(bytes: number): void;
    /**
     * Update cache memory
     */
    updateCacheMemory(bytes: number): void;
    /**
     * Add an alert
     */
    addAlert(config: AlertConfig): void;
    /**
     * Remove an alert
     */
    removeAlert(metric: string): void;
    /**
     * Subscribe to alerts
     */
    onAlert(callback: (alert: AlertEvent) => void): () => void;
    /**
     * Subscribe to samples
     */
    onSample(callback: (sample: PerformanceSample) => void): () => void;
    /**
     * Get current sample
     */
    getCurrentSample(): PerformanceSample | undefined;
    /**
     * Get all samples
     */
    getSamples(): PerformanceSample[];
    /**
     * Get samples in time range
     */
    getSamplesInRange(startTime: number, endTime: number): PerformanceSample[];
    /**
     * Get summary statistics
     */
    getSummary(): {
        avgInferenceTime: number;
        avgThroughput: number;
        avgMemoryUsage: number;
        avgFPS: number;
        totalInferences: number;
        uptime: number;
    };
    /**
     * Clear all data
     */
    clear(): void;
    /**
     * Export data
     */
    export(): {
        samples: PerformanceSample[];
        summary: {
            avgInferenceTime: number;
            avgThroughput: number;
            avgMemoryUsage: number;
            avgFPS: number;
            totalInferences: number;
            uptime: number;
        };
        config: MonitorConfig;
        timestamp: number;
    };
}
/**
 * Generate HTML dashboard
 */
export declare function generateDashboardHTML(monitor: PerformanceMonitor): string;
/**
 * Generate ASCII dashboard
 */
export declare function generateAsciiDashboard(monitor: PerformanceMonitor): string;
/**
 * Get or create global monitor
 */
export declare function getMonitor(config?: MonitorConfig): PerformanceMonitor;
/**
 * Start monitoring
 */
export declare function startMonitoring(config?: MonitorConfig): PerformanceMonitor;
/**
 * Stop monitoring
 */
export declare function stopMonitoring(): void;
declare const _default: {
    PerformanceMonitor: typeof PerformanceMonitor;
    getMonitor: typeof getMonitor;
    startMonitoring: typeof startMonitoring;
    stopMonitoring: typeof stopMonitoring;
    generateDashboardHTML: typeof generateDashboardHTML;
    generateAsciiDashboard: typeof generateAsciiDashboard;
};
export default _default;
//# sourceMappingURL=monitor.d.ts.map