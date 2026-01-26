/**
 * edgeFlow.js - Runtime Management
 *
 * Manages runtime backends and automatic selection.
 * Provides unified interface for different compute backends.
 */
import { Runtime, RuntimeType, RuntimeCapabilities, LoadedModel, ModelLoadOptions, ModelMetadata, Tensor, EventType, EventListener } from './types.js';
/**
 * RuntimeManager - Manages runtime selection and lifecycle
 *
 * Features:
 * - Automatic best runtime selection
 * - Runtime registration
 * - Capability detection
 * - Fallback handling
 */
export declare class RuntimeManager {
    private static instance;
    private readonly listeners;
    private defaultRuntime;
    private constructor();
    /**
     * Get singleton instance
     */
    static getInstance(): RuntimeManager;
    /**
     * Register a runtime factory
     */
    register(type: RuntimeType, factory: () => Runtime): void;
    /**
     * Get a runtime instance
     */
    getRuntime(type?: RuntimeType): Promise<Runtime>;
    /**
     * Get the best available runtime
     */
    getBestRuntime(): Promise<Runtime>;
    /**
     * Check which runtimes are available
     */
    detectAvailableRuntimes(): Promise<Map<RuntimeType, boolean>>;
    /**
     * Get capabilities of a runtime
     */
    getCapabilities(type: RuntimeType): Promise<RuntimeCapabilities>;
    /**
     * Set default runtime
     */
    setDefaultRuntime(type: RuntimeType): void;
    /**
     * Get default runtime type
     */
    getDefaultRuntimeType(): RuntimeType;
    /**
     * Dispose a specific runtime
     */
    disposeRuntime(type: RuntimeType): void;
    /**
     * Dispose all runtimes
     */
    disposeAll(): void;
    /**
     * Add event listener
     */
    on<T = unknown>(event: EventType, listener: EventListener<T>): void;
    /**
     * Remove event listener
     */
    off<T = unknown>(event: EventType, listener: EventListener<T>): void;
    /**
     * Emit event
     */
    private emit;
}
/**
 * LoadedModelImpl - Implementation of LoadedModel interface
 */
export declare class LoadedModelImpl implements LoadedModel {
    readonly id: string;
    readonly metadata: ModelMetadata;
    readonly runtime: RuntimeType;
    private _isLoaded;
    private readonly _dispose;
    constructor(metadata: ModelMetadata, runtime: RuntimeType, dispose: () => void);
    get isLoaded(): boolean;
    dispose(): void;
}
/**
 * Load model from URL with advanced loading support
 * (caching, sharding, resume download)
 */
export declare function loadModel(url: string, options?: ModelLoadOptions & {
    runtime?: RuntimeType;
    cache?: boolean;
    resumable?: boolean;
    chunkSize?: number;
    forceDownload?: boolean;
}): Promise<LoadedModel>;
/**
 * Load model from ArrayBuffer
 */
export declare function loadModelFromBuffer(data: ArrayBuffer, options?: ModelLoadOptions & {
    runtime?: RuntimeType;
}): Promise<LoadedModel>;
/**
 * Run inference on a model
 */
export declare function runInference(model: LoadedModel, inputs: Tensor[]): Promise<Tensor[]>;
/**
 * Run inference with batch processing
 */
export declare function runBatchInference(model: LoadedModel, batches: Tensor[][]): Promise<Tensor[][]>;
/**
 * Get runtime manager instance
 */
export declare function getRuntimeManager(): RuntimeManager;
/**
 * Register a runtime
 */
export declare function registerRuntime(type: RuntimeType, factory: () => Runtime): void;
/**
 * Get the best available runtime
 */
export declare function getBestRuntime(): Promise<Runtime>;
/**
 * Check available runtimes
 */
export declare function getAvailableRuntimes(): Promise<Map<RuntimeType, boolean>>;
//# sourceMappingURL=runtime.d.ts.map