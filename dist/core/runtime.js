/**
 * edgeFlow.js - Runtime Management
 *
 * Manages runtime backends and automatic selection.
 * Provides unified interface for different compute backends.
 */
import { EdgeFlowError, ErrorCodes, } from './types.js';
import { getScheduler } from './scheduler.js';
import { getMemoryManager } from './memory.js';
// ============================================================================
// Runtime Registry
// ============================================================================
/**
 * Registered runtime factories
 */
const runtimeFactories = new Map();
/**
 * Cached runtime instances
 */
const runtimeInstances = new Map();
/**
 * Runtime priority order (higher priority first)
 */
const RUNTIME_PRIORITY = ['webgpu', 'webnn', 'wasm'];
// ============================================================================
// Runtime Manager
// ============================================================================
/**
 * RuntimeManager - Manages runtime selection and lifecycle
 *
 * Features:
 * - Automatic best runtime selection
 * - Runtime registration
 * - Capability detection
 * - Fallback handling
 */
export class RuntimeManager {
    static instance = null;
    listeners = new Map();
    defaultRuntime = 'auto';
    constructor() { }
    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!RuntimeManager.instance) {
            RuntimeManager.instance = new RuntimeManager();
        }
        return RuntimeManager.instance;
    }
    /**
     * Register a runtime factory
     */
    register(type, factory) {
        runtimeFactories.set(type, factory);
    }
    /**
     * Get a runtime instance
     */
    async getRuntime(type = 'auto') {
        if (type === 'auto') {
            return this.getBestRuntime();
        }
        // Check if already instantiated
        let runtime = runtimeInstances.get(type);
        if (runtime) {
            return runtime;
        }
        // Create new instance
        const factory = runtimeFactories.get(type);
        if (!factory) {
            throw new EdgeFlowError(`Runtime '${type}' is not registered`, ErrorCodes.RUNTIME_NOT_AVAILABLE, { runtime: type });
        }
        runtime = factory();
        // Check availability
        const available = await runtime.isAvailable();
        if (!available) {
            throw new EdgeFlowError(`Runtime '${type}' is not available in this environment`, ErrorCodes.RUNTIME_NOT_AVAILABLE, { runtime: type });
        }
        // Initialize
        try {
            await runtime.initialize();
        }
        catch (error) {
            throw new EdgeFlowError(`Failed to initialize runtime '${type}': ${error instanceof Error ? error.message : String(error)}`, ErrorCodes.RUNTIME_INIT_FAILED, { runtime: type, error });
        }
        runtimeInstances.set(type, runtime);
        this.emit('runtime:ready', { runtime: type });
        return runtime;
    }
    /**
     * Get the best available runtime
     */
    async getBestRuntime() {
        for (const type of RUNTIME_PRIORITY) {
            try {
                // Check if already available
                const existing = runtimeInstances.get(type);
                if (existing) {
                    return existing;
                }
                // Try to create and initialize
                const factory = runtimeFactories.get(type);
                if (!factory)
                    continue;
                const runtime = factory();
                const available = await runtime.isAvailable();
                if (available) {
                    await runtime.initialize();
                    runtimeInstances.set(type, runtime);
                    this.emit('runtime:ready', { runtime: type });
                    return runtime;
                }
            }
            catch {
                // Try next runtime
                continue;
            }
        }
        throw new EdgeFlowError('No runtime available. Please ensure WebGPU, WebNN, or WASM is supported.', ErrorCodes.RUNTIME_NOT_AVAILABLE, { triedRuntimes: RUNTIME_PRIORITY });
    }
    /**
     * Check which runtimes are available
     */
    async detectAvailableRuntimes() {
        const results = new Map();
        for (const type of RUNTIME_PRIORITY) {
            const factory = runtimeFactories.get(type);
            if (!factory) {
                results.set(type, false);
                continue;
            }
            try {
                const runtime = factory();
                results.set(type, await runtime.isAvailable());
            }
            catch {
                results.set(type, false);
            }
        }
        return results;
    }
    /**
     * Get capabilities of a runtime
     */
    async getCapabilities(type) {
        const runtime = await this.getRuntime(type);
        return runtime.capabilities;
    }
    /**
     * Set default runtime
     */
    setDefaultRuntime(type) {
        this.defaultRuntime = type;
    }
    /**
     * Get default runtime type
     */
    getDefaultRuntimeType() {
        return this.defaultRuntime;
    }
    /**
     * Dispose a specific runtime
     */
    disposeRuntime(type) {
        const runtime = runtimeInstances.get(type);
        if (runtime) {
            runtime.dispose();
            runtimeInstances.delete(type);
        }
    }
    /**
     * Dispose all runtimes
     */
    disposeAll() {
        for (const [type, runtime] of runtimeInstances) {
            runtime.dispose();
            runtimeInstances.delete(type);
        }
    }
    /**
     * Add event listener
     */
    on(event, listener) {
        let listeners = this.listeners.get(event);
        if (!listeners) {
            listeners = new Set();
            this.listeners.set(event, listeners);
        }
        listeners.add(listener);
    }
    /**
     * Remove event listener
     */
    off(event, listener) {
        const listeners = this.listeners.get(event);
        if (listeners) {
            listeners.delete(listener);
        }
    }
    /**
     * Emit event
     */
    emit(type, data) {
        const event = {
            type,
            timestamp: Date.now(),
            data,
        };
        const listeners = this.listeners.get(type);
        if (listeners) {
            for (const listener of listeners) {
                try {
                    listener(event);
                }
                catch (error) {
                    console.error('Error in event listener:', error);
                }
            }
        }
    }
}
// ============================================================================
// Model Loader
// ============================================================================
/**
 * Model instance counter
 */
let modelIdCounter = 0;
/**
 * Generate unique model ID
 */
function generateModelId() {
    return `model_${++modelIdCounter}_${Date.now().toString(36)}`;
}
/**
 * LoadedModelImpl - Implementation of LoadedModel interface
 */
export class LoadedModelImpl {
    id;
    metadata;
    runtime;
    _isLoaded = true;
    _dispose;
    constructor(metadata, runtime, dispose) {
        this.id = generateModelId();
        this.metadata = metadata;
        this.runtime = runtime;
        this._dispose = dispose;
    }
    get isLoaded() {
        return this._isLoaded;
    }
    dispose() {
        if (this._isLoaded) {
            this._isLoaded = false;
            this._dispose();
            getMemoryManager().untrack(this.id);
        }
    }
}
// ============================================================================
// Model Loading Functions
// ============================================================================
/**
 * Load model from URL with advanced loading support
 * (caching, sharding, resume download)
 */
export async function loadModel(url, options = {}) {
    const manager = RuntimeManager.getInstance();
    const runtime = await manager.getRuntime(options.runtime ?? 'auto');
    // Import model loader dynamically to avoid circular dependencies
    const { loadModelData } = await import('../utils/model-loader.js');
    // Use advanced model loader with caching and resume support
    const modelData = await loadModelData(url, {
        cache: options.cache ?? true,
        resumable: options.resumable ?? true,
        chunkSize: options.chunkSize,
        forceDownload: options.forceDownload,
        onProgress: options.onProgress ? (progress) => {
            options.onProgress(progress.percent / 100);
        } : undefined,
    });
    // Load into runtime
    const model = await runtime.loadModel(modelData, options);
    return model;
}
/**
 * Load model from ArrayBuffer
 */
export async function loadModelFromBuffer(data, options = {}) {
    const manager = RuntimeManager.getInstance();
    const runtime = await manager.getRuntime(options.runtime ?? 'auto');
    return runtime.loadModel(data, options);
}
// ============================================================================
// Inference Functions
// ============================================================================
/**
 * Run inference on a model
 */
export async function runInference(model, inputs) {
    if (!model.isLoaded) {
        throw new EdgeFlowError('Model has been disposed', ErrorCodes.MODEL_NOT_LOADED, { modelId: model.id });
    }
    const manager = RuntimeManager.getInstance();
    const runtime = await manager.getRuntime(model.runtime);
    // Use scheduler for execution
    const scheduler = getScheduler();
    const task = scheduler.schedule(model.id, () => runtime.run(model, inputs));
    return task.wait();
}
/**
 * Run inference with batch processing
 */
export async function runBatchInference(model, batches) {
    const scheduler = getScheduler();
    const manager = RuntimeManager.getInstance();
    const runtime = await manager.getRuntime(model.runtime);
    // Schedule all batches
    const tasks = batches.map(inputs => scheduler.schedule(model.id, () => runtime.run(model, inputs)));
    // Wait for all to complete
    return Promise.all(tasks.map(task => task.wait()));
}
// ============================================================================
// Convenience Functions
// ============================================================================
/**
 * Get runtime manager instance
 */
export function getRuntimeManager() {
    return RuntimeManager.getInstance();
}
/**
 * Register a runtime
 */
export function registerRuntime(type, factory) {
    RuntimeManager.getInstance().register(type, factory);
}
/**
 * Get the best available runtime
 */
export async function getBestRuntime() {
    return RuntimeManager.getInstance().getBestRuntime();
}
/**
 * Check available runtimes
 */
export async function getAvailableRuntimes() {
    return RuntimeManager.getInstance().detectAvailableRuntimes();
}
//# sourceMappingURL=runtime.js.map