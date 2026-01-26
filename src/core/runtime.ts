/**
 * edgeFlow.js - Runtime Management
 * 
 * Manages runtime backends and automatic selection.
 * Provides unified interface for different compute backends.
 */

import {
  Runtime,
  RuntimeType,
  RuntimeCapabilities,
  LoadedModel,
  ModelLoadOptions,
  ModelMetadata,
  Tensor,
  EdgeFlowError,
  ErrorCodes,
  EventType,
  EventListener,
  EdgeFlowEvent,
} from './types.js';
import { getScheduler } from './scheduler.js';
import { getMemoryManager } from './memory.js';

// ============================================================================
// Runtime Registry
// ============================================================================

/**
 * Registered runtime factories
 */
const runtimeFactories: Map<RuntimeType, () => Runtime> = new Map();

/**
 * Cached runtime instances
 */
const runtimeInstances: Map<RuntimeType, Runtime> = new Map();

/**
 * Runtime priority order (higher priority first)
 */
const RUNTIME_PRIORITY: RuntimeType[] = ['webgpu', 'webnn', 'wasm'];

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
  private static instance: RuntimeManager | null = null;
  
  private readonly listeners: Map<EventType, Set<EventListener>> = new Map();
  private defaultRuntime: RuntimeType = 'auto';

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): RuntimeManager {
    if (!RuntimeManager.instance) {
      RuntimeManager.instance = new RuntimeManager();
    }
    return RuntimeManager.instance;
  }

  /**
   * Register a runtime factory
   */
  register(type: RuntimeType, factory: () => Runtime): void {
    runtimeFactories.set(type, factory);
  }

  /**
   * Get a runtime instance
   */
  async getRuntime(type: RuntimeType = 'auto'): Promise<Runtime> {
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
      throw new EdgeFlowError(
        `Runtime '${type}' is not registered`,
        ErrorCodes.RUNTIME_NOT_AVAILABLE,
        { runtime: type }
      );
    }

    runtime = factory();
    
    // Check availability
    const available = await runtime.isAvailable();
    if (!available) {
      throw new EdgeFlowError(
        `Runtime '${type}' is not available in this environment`,
        ErrorCodes.RUNTIME_NOT_AVAILABLE,
        { runtime: type }
      );
    }

    // Initialize
    try {
      await runtime.initialize();
    } catch (error) {
      throw new EdgeFlowError(
        `Failed to initialize runtime '${type}': ${error instanceof Error ? error.message : String(error)}`,
        ErrorCodes.RUNTIME_INIT_FAILED,
        { runtime: type, error }
      );
    }

    runtimeInstances.set(type, runtime);
    this.emit('runtime:ready', { runtime: type });

    return runtime;
  }

  /**
   * Get the best available runtime
   */
  async getBestRuntime(): Promise<Runtime> {
    for (const type of RUNTIME_PRIORITY) {
      try {
        // Check if already available
        const existing = runtimeInstances.get(type);
        if (existing) {
          return existing;
        }

        // Try to create and initialize
        const factory = runtimeFactories.get(type);
        if (!factory) continue;

        const runtime = factory();
        const available = await runtime.isAvailable();
        
        if (available) {
          await runtime.initialize();
          runtimeInstances.set(type, runtime);
          this.emit('runtime:ready', { runtime: type });
          return runtime;
        }
      } catch {
        // Try next runtime
        continue;
      }
    }

    throw new EdgeFlowError(
      'No runtime available. Please ensure WebGPU, WebNN, or WASM is supported.',
      ErrorCodes.RUNTIME_NOT_AVAILABLE,
      { triedRuntimes: RUNTIME_PRIORITY }
    );
  }

  /**
   * Check which runtimes are available
   */
  async detectAvailableRuntimes(): Promise<Map<RuntimeType, boolean>> {
    const results = new Map<RuntimeType, boolean>();

    for (const type of RUNTIME_PRIORITY) {
      const factory = runtimeFactories.get(type);
      if (!factory) {
        results.set(type, false);
        continue;
      }

      try {
        const runtime = factory();
        results.set(type, await runtime.isAvailable());
      } catch {
        results.set(type, false);
      }
    }

    return results;
  }

  /**
   * Get capabilities of a runtime
   */
  async getCapabilities(type: RuntimeType): Promise<RuntimeCapabilities> {
    const runtime = await this.getRuntime(type);
    return runtime.capabilities;
  }

  /**
   * Set default runtime
   */
  setDefaultRuntime(type: RuntimeType): void {
    this.defaultRuntime = type;
  }

  /**
   * Get default runtime type
   */
  getDefaultRuntimeType(): RuntimeType {
    return this.defaultRuntime;
  }

  /**
   * Dispose a specific runtime
   */
  disposeRuntime(type: RuntimeType): void {
    const runtime = runtimeInstances.get(type);
    if (runtime) {
      runtime.dispose();
      runtimeInstances.delete(type);
    }
  }

  /**
   * Dispose all runtimes
   */
  disposeAll(): void {
    for (const [type, runtime] of runtimeInstances) {
      runtime.dispose();
      runtimeInstances.delete(type);
    }
  }

  /**
   * Add event listener
   */
  on<T = unknown>(event: EventType, listener: EventListener<T>): void {
    let listeners = this.listeners.get(event);
    if (!listeners) {
      listeners = new Set();
      this.listeners.set(event, listeners);
    }
    listeners.add(listener as EventListener);
  }

  /**
   * Remove event listener
   */
  off<T = unknown>(event: EventType, listener: EventListener<T>): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(listener as EventListener);
    }
  }

  /**
   * Emit event
   */
  private emit<T>(type: EventType, data: T): void {
    const event: EdgeFlowEvent<T> = {
      type,
      timestamp: Date.now(),
      data,
    };

    const listeners = this.listeners.get(type);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
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
function generateModelId(): string {
  return `model_${++modelIdCounter}_${Date.now().toString(36)}`;
}

/**
 * LoadedModelImpl - Implementation of LoadedModel interface
 */
export class LoadedModelImpl implements LoadedModel {
  readonly id: string;
  readonly metadata: ModelMetadata;
  readonly runtime: RuntimeType;
  
  private _isLoaded = true;
  private readonly _dispose: () => void;

  constructor(
    metadata: ModelMetadata,
    runtime: RuntimeType,
    dispose: () => void
  ) {
    this.id = generateModelId();
    this.metadata = metadata;
    this.runtime = runtime;
    this._dispose = dispose;
  }

  get isLoaded(): boolean {
    return this._isLoaded;
  }

  dispose(): void {
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
export async function loadModel(
  url: string,
  options: ModelLoadOptions & { 
    runtime?: RuntimeType;
    cache?: boolean;
    resumable?: boolean;
    chunkSize?: number;
    forceDownload?: boolean;
  } = {}
): Promise<LoadedModel> {
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
      options.onProgress!(progress.percent / 100);
    } : undefined,
  });

  // Load into runtime
  const model = await runtime.loadModel(modelData, options);

  return model;
}

/**
 * Load model from ArrayBuffer
 */
export async function loadModelFromBuffer(
  data: ArrayBuffer,
  options: ModelLoadOptions & { runtime?: RuntimeType } = {}
): Promise<LoadedModel> {
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
export async function runInference(
  model: LoadedModel,
  inputs: Tensor[]
): Promise<Tensor[]> {
  if (!model.isLoaded) {
    throw new EdgeFlowError(
      'Model has been disposed',
      ErrorCodes.MODEL_NOT_LOADED,
      { modelId: model.id }
    );
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
export async function runBatchInference(
  model: LoadedModel,
  batches: Tensor[][]
): Promise<Tensor[][]> {
  const scheduler = getScheduler();
  const manager = RuntimeManager.getInstance();
  const runtime = await manager.getRuntime(model.runtime);

  // Schedule all batches
  const tasks = batches.map(inputs =>
    scheduler.schedule(model.id, () => runtime.run(model, inputs))
  );

  // Wait for all to complete
  return Promise.all(tasks.map(task => task.wait()));
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get runtime manager instance
 */
export function getRuntimeManager(): RuntimeManager {
  return RuntimeManager.getInstance();
}

/**
 * Register a runtime
 */
export function registerRuntime(type: RuntimeType, factory: () => Runtime): void {
  RuntimeManager.getInstance().register(type, factory);
}

/**
 * Get the best available runtime
 */
export async function getBestRuntime(): Promise<Runtime> {
  return RuntimeManager.getInstance().getBestRuntime();
}

/**
 * Check available runtimes
 */
export async function getAvailableRuntimes(): Promise<Map<RuntimeType, boolean>> {
  return RuntimeManager.getInstance().detectAvailableRuntimes();
}
