/**
 * edgeFlow.js - Web Worker Support
 * 
 * Run inference in a Web Worker to avoid blocking the main thread.
 */

import type { Tensor, RuntimeType } from './types.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Worker message types
 */
export type WorkerMessageType =
  | 'init'
  | 'load_model'
  | 'run_inference'
  | 'dispose'
  | 'ready'
  | 'result'
  | 'error'
  | 'progress';

/**
 * Worker message structure
 */
export interface WorkerMessage {
  id: string;
  type: WorkerMessageType;
  payload?: unknown;
}

/**
 * Worker request for loading a model
 */
export interface LoadModelRequest {
  url: string;
  options?: {
    runtime?: RuntimeType;
    cache?: boolean;
  };
}

/**
 * Worker request for running inference
 */
export interface InferenceRequest {
  modelId: string;
  inputs: SerializedTensor[];
}

/**
 * Serialized tensor for transfer
 */
export interface SerializedTensor {
  data: ArrayBuffer;
  shape: number[];
  dtype: string;
}

/**
 * Worker pool options
 */
export interface WorkerPoolOptions {
  /** Number of workers (default: navigator.hardwareConcurrency or 4) */
  numWorkers?: number;
  /** Worker script URL (default: auto-detect) */
  workerUrl?: string;
}

// ============================================================================
// Tensor Serialization
// ============================================================================

/**
 * Serialize a tensor for transfer to worker
 */
export function serializeTensor(tensor: Tensor): SerializedTensor {
  const data = tensor.toFloat32Array();
  // Create a copy of the ArrayBuffer
  const buffer = new ArrayBuffer(data.byteLength);
  new Float32Array(buffer).set(data);
  return {
    data: buffer,
    shape: [...tensor.shape],
    dtype: tensor.dtype,
  };
}

/**
 * Deserialize a tensor from worker
 */
export function deserializeTensor(serialized: SerializedTensor): Tensor {
  const { EdgeFlowTensor } = require('./tensor.js');
  const data = new Float32Array(serialized.data);
  return new EdgeFlowTensor(data, serialized.shape, serialized.dtype as 'float32');
}

// ============================================================================
// Worker Manager
// ============================================================================

/**
 * InferenceWorker - Wrapper for a single Web Worker
 */
export class InferenceWorker {
  private worker: Worker | null = null;
  private pendingRequests: Map<string, {
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
  }> = new Map();
  private isReady = false;
  private readyPromise: Promise<void>;
  private readyResolve!: () => void;

  constructor(workerUrl?: string) {
    this.readyPromise = new Promise(resolve => {
      this.readyResolve = resolve;
    });
    
    this.initWorker(workerUrl);
  }

  /**
   * Initialize the worker
   */
  private initWorker(workerUrl?: string): void {
    // Create worker from blob if no URL provided
    const url = workerUrl ?? this.createWorkerBlob();
    
    this.worker = new Worker(url, { type: 'module' });
    
    this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      this.handleMessage(event.data);
    };
    
    this.worker.onerror = (error) => {
      console.error('Worker error:', error);
      // Reject all pending requests
      for (const [, { reject }] of this.pendingRequests) {
        reject(new Error('Worker error'));
      }
      this.pendingRequests.clear();
    };
  }

  /**
   * Create worker code as blob URL
   */
  private createWorkerBlob(): string {
    const workerCode = `
      // edgeFlow.js Worker
      let models = new Map();
      let ort = null;
      
      // Load ONNX Runtime
      async function loadOrt() {
        if (ort) return ort;
        ort = await import('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.0/dist/esm/ort.min.js');
        return ort;
      }
      
      // Handle messages
      self.onmessage = async (event) => {
        const { id, type, payload } = event.data;
        
        try {
          switch (type) {
            case 'init': {
              await loadOrt();
              self.postMessage({ id, type: 'ready' });
              break;
            }
            
            case 'load_model': {
              await loadOrt();
              const { url, options } = payload;
              const response = await fetch(url);
              const arrayBuffer = await response.arrayBuffer();
              const session = await ort.InferenceSession.create(
                new Uint8Array(arrayBuffer),
                { executionProviders: ['wasm'] }
              );
              const modelId = 'model_' + Date.now();
              models.set(modelId, session);
              self.postMessage({
                id,
                type: 'result',
                payload: { modelId }
              });
              break;
            }
            
            case 'run_inference': {
              const { modelId, inputs } = payload;
              const session = models.get(modelId);
              if (!session) {
                throw new Error('Model not found: ' + modelId);
              }
              
              // Prepare inputs
              const feeds = {};
              const inputNames = session.inputNames;
              for (let i = 0; i < inputs.length && i < inputNames.length; i++) {
                const input = inputs[i];
                const data = new Float32Array(input.data);
                feeds[inputNames[i]] = new ort.Tensor(input.dtype, data, input.shape);
              }
              
              // Run inference
              const results = await session.run(feeds);
              
              // Serialize outputs
              const outputs = [];
              for (const name of session.outputNames) {
                const tensor = results[name];
                outputs.push({
                  data: tensor.data.buffer.slice(0),
                  shape: tensor.dims,
                  dtype: tensor.type
                });
              }
              
              self.postMessage(
                { id, type: 'result', payload: { outputs } },
                outputs.map(o => o.data)
              );
              break;
            }
            
            case 'dispose': {
              const { modelId } = payload;
              const session = models.get(modelId);
              if (session) {
                // session.release(); // Not available in all versions
                models.delete(modelId);
              }
              self.postMessage({ id, type: 'result', payload: { success: true } });
              break;
            }
          }
        } catch (error) {
          self.postMessage({
            id,
            type: 'error',
            payload: { message: error.message }
          });
        }
      };
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    return URL.createObjectURL(blob);
  }

  /**
   * Handle worker message
   */
  private handleMessage(message: WorkerMessage): void {
    if (message.type === 'ready') {
      this.isReady = true;
      this.readyResolve();
      return;
    }

    const request = this.pendingRequests.get(message.id);
    if (!request) return;

    this.pendingRequests.delete(message.id);

    if (message.type === 'error') {
      const payload = message.payload as { message: string };
      request.reject(new Error(payload.message));
    } else {
      request.resolve(message.payload);
    }
  }

  /**
   * Send a request to the worker
   */
  private async sendRequest<T>(type: WorkerMessageType, payload?: unknown): Promise<T> {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve: resolve as (r: unknown) => void, reject });
      
      const message: WorkerMessage = { id, type, payload };
      
      // Transfer ArrayBuffers for efficiency
      const transfers: Transferable[] = [];
      if (payload && typeof payload === 'object' && 'inputs' in payload) {
        const inputs = (payload as InferenceRequest).inputs;
        for (const input of inputs) {
          if (input.data instanceof ArrayBuffer) {
            transfers.push(input.data);
          }
        }
      }
      
      this.worker!.postMessage(message, transfers);
    });
  }

  /**
   * Initialize the worker
   */
  async init(): Promise<void> {
    if (this.isReady) return;
    await this.sendRequest('init');
    await this.readyPromise;
  }

  /**
   * Load a model
   */
  async loadModel(url: string, options?: { runtime?: RuntimeType; cache?: boolean }): Promise<string> {
    await this.init();
    const result = await this.sendRequest<{ modelId: string }>('load_model', { url, options });
    return result.modelId;
  }

  /**
   * Run inference
   */
  async runInference(modelId: string, inputs: Tensor[]): Promise<Tensor[]> {
    const serializedInputs = inputs.map(serializeTensor);
    const result = await this.sendRequest<{ outputs: SerializedTensor[] }>(
      'run_inference',
      { modelId, inputs: serializedInputs }
    );
    return result.outputs.map(deserializeTensor);
  }

  /**
   * Dispose a model
   */
  async dispose(modelId: string): Promise<void> {
    await this.sendRequest('dispose', { modelId });
  }

  /**
   * Terminate the worker
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.clear();
  }
}

// ============================================================================
// Worker Pool
// ============================================================================

/**
 * WorkerPool - Manage multiple workers for parallel inference
 */
export class WorkerPool {
  private workers: InferenceWorker[] = [];
  private currentIndex = 0;
  private modelAssignments: Map<string, number> = new Map();

  constructor(options: WorkerPoolOptions = {}) {
    const numWorkers = options.numWorkers ??
      (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 4) ?? 4;
    
    for (let i = 0; i < numWorkers; i++) {
      this.workers.push(new InferenceWorker(options.workerUrl));
    }
  }

  /**
   * Get next worker (round-robin)
   */
  private getNextWorker(): InferenceWorker {
    const worker = this.workers[this.currentIndex]!;
    this.currentIndex = (this.currentIndex + 1) % this.workers.length;
    return worker;
  }

  /**
   * Get worker for a specific model
   */
  private getWorkerForModel(modelId: string): InferenceWorker {
    const index = this.modelAssignments.get(modelId);
    if (index !== undefined) {
      return this.workers[index]!;
    }
    return this.getNextWorker();
  }

  /**
   * Initialize all workers
   */
  async init(): Promise<void> {
    await Promise.all(this.workers.map(w => w.init()));
  }

  /**
   * Load a model on a worker
   */
  async loadModel(
    url: string,
    options?: { runtime?: RuntimeType; cache?: boolean }
  ): Promise<string> {
    const worker = this.getNextWorker();
    const modelId = await worker.loadModel(url, options);
    this.modelAssignments.set(modelId, this.workers.indexOf(worker));
    return modelId;
  }

  /**
   * Run inference
   */
  async runInference(modelId: string, inputs: Tensor[]): Promise<Tensor[]> {
    const worker = this.getWorkerForModel(modelId);
    return worker.runInference(modelId, inputs);
  }

  /**
   * Run inference on multiple inputs in parallel
   */
  async runBatch(
    modelId: string,
    batchInputs: Tensor[][]
  ): Promise<Tensor[][]> {
    // Distribute across workers
    const results = await Promise.all(
      batchInputs.map((inputs, i) => {
        const worker = this.workers[i % this.workers.length]!;
        return worker.runInference(modelId, inputs);
      })
    );
    return results;
  }

  /**
   * Dispose a model
   */
  async dispose(modelId: string): Promise<void> {
    const worker = this.getWorkerForModel(modelId);
    await worker.dispose(modelId);
    this.modelAssignments.delete(modelId);
  }

  /**
   * Terminate all workers
   */
  terminate(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.modelAssignments.clear();
  }

  /**
   * Get number of workers
   */
  get size(): number {
    return this.workers.length;
  }
}

// ============================================================================
// Global Instance
// ============================================================================

let globalWorkerPool: WorkerPool | null = null;

/**
 * Get or create global worker pool
 */
export function getWorkerPool(options?: WorkerPoolOptions): WorkerPool {
  if (!globalWorkerPool) {
    globalWorkerPool = new WorkerPool(options);
  }
  return globalWorkerPool;
}

/**
 * Run inference in a worker
 */
export async function runInWorker(
  modelUrl: string,
  inputs: Tensor[],
  options?: { cache?: boolean }
): Promise<Tensor[]> {
  const pool = getWorkerPool();
  await pool.init();
  
  const modelId = await pool.loadModel(modelUrl, options);
  const outputs = await pool.runInference(modelId, inputs);
  
  return outputs;
}

/**
 * Check if Web Workers are supported
 */
export function isWorkerSupported(): boolean {
  return typeof Worker !== 'undefined';
}
