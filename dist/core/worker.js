/**
 * edgeFlow.js - Web Worker Support
 *
 * Run inference in a Web Worker to avoid blocking the main thread.
 */
// ============================================================================
// Tensor Serialization
// ============================================================================
/**
 * Serialize a tensor for transfer to worker
 */
export function serializeTensor(tensor) {
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
export function deserializeTensor(serialized) {
    const { EdgeFlowTensor } = require('./tensor.js');
    const data = new Float32Array(serialized.data);
    return new EdgeFlowTensor(data, serialized.shape, serialized.dtype);
}
// ============================================================================
// Worker Manager
// ============================================================================
/**
 * InferenceWorker - Wrapper for a single Web Worker
 */
export class InferenceWorker {
    worker = null;
    pendingRequests = new Map();
    isReady = false;
    readyPromise;
    readyResolve;
    constructor(workerUrl) {
        this.readyPromise = new Promise(resolve => {
            this.readyResolve = resolve;
        });
        this.initWorker(workerUrl);
    }
    /**
     * Initialize the worker
     */
    initWorker(workerUrl) {
        // Create worker from blob if no URL provided
        const url = workerUrl ?? this.createWorkerBlob();
        this.worker = new Worker(url, { type: 'module' });
        this.worker.onmessage = (event) => {
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
    createWorkerBlob() {
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
    handleMessage(message) {
        if (message.type === 'ready') {
            this.isReady = true;
            this.readyResolve();
            return;
        }
        const request = this.pendingRequests.get(message.id);
        if (!request)
            return;
        this.pendingRequests.delete(message.id);
        if (message.type === 'error') {
            const payload = message.payload;
            request.reject(new Error(payload.message));
        }
        else {
            request.resolve(message.payload);
        }
    }
    /**
     * Send a request to the worker
     */
    async sendRequest(type, payload) {
        if (!this.worker) {
            throw new Error('Worker not initialized');
        }
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve: resolve, reject });
            const message = { id, type, payload };
            // Transfer ArrayBuffers for efficiency
            const transfers = [];
            if (payload && typeof payload === 'object' && 'inputs' in payload) {
                const inputs = payload.inputs;
                for (const input of inputs) {
                    if (input.data instanceof ArrayBuffer) {
                        transfers.push(input.data);
                    }
                }
            }
            this.worker.postMessage(message, transfers);
        });
    }
    /**
     * Initialize the worker
     */
    async init() {
        if (this.isReady)
            return;
        await this.sendRequest('init');
        await this.readyPromise;
    }
    /**
     * Load a model
     */
    async loadModel(url, options) {
        await this.init();
        const result = await this.sendRequest('load_model', { url, options });
        return result.modelId;
    }
    /**
     * Run inference
     */
    async runInference(modelId, inputs) {
        const serializedInputs = inputs.map(serializeTensor);
        const result = await this.sendRequest('run_inference', { modelId, inputs: serializedInputs });
        return result.outputs.map(deserializeTensor);
    }
    /**
     * Dispose a model
     */
    async dispose(modelId) {
        await this.sendRequest('dispose', { modelId });
    }
    /**
     * Terminate the worker
     */
    terminate() {
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
    workers = [];
    currentIndex = 0;
    modelAssignments = new Map();
    constructor(options = {}) {
        const numWorkers = options.numWorkers ??
            (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 4) ?? 4;
        for (let i = 0; i < numWorkers; i++) {
            this.workers.push(new InferenceWorker(options.workerUrl));
        }
    }
    /**
     * Get next worker (round-robin)
     */
    getNextWorker() {
        const worker = this.workers[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.workers.length;
        return worker;
    }
    /**
     * Get worker for a specific model
     */
    getWorkerForModel(modelId) {
        const index = this.modelAssignments.get(modelId);
        if (index !== undefined) {
            return this.workers[index];
        }
        return this.getNextWorker();
    }
    /**
     * Initialize all workers
     */
    async init() {
        await Promise.all(this.workers.map(w => w.init()));
    }
    /**
     * Load a model on a worker
     */
    async loadModel(url, options) {
        const worker = this.getNextWorker();
        const modelId = await worker.loadModel(url, options);
        this.modelAssignments.set(modelId, this.workers.indexOf(worker));
        return modelId;
    }
    /**
     * Run inference
     */
    async runInference(modelId, inputs) {
        const worker = this.getWorkerForModel(modelId);
        return worker.runInference(modelId, inputs);
    }
    /**
     * Run inference on multiple inputs in parallel
     */
    async runBatch(modelId, batchInputs) {
        // Distribute across workers
        const results = await Promise.all(batchInputs.map((inputs, i) => {
            const worker = this.workers[i % this.workers.length];
            return worker.runInference(modelId, inputs);
        }));
        return results;
    }
    /**
     * Dispose a model
     */
    async dispose(modelId) {
        const worker = this.getWorkerForModel(modelId);
        await worker.dispose(modelId);
        this.modelAssignments.delete(modelId);
    }
    /**
     * Terminate all workers
     */
    terminate() {
        for (const worker of this.workers) {
            worker.terminate();
        }
        this.workers = [];
        this.modelAssignments.clear();
    }
    /**
     * Get number of workers
     */
    get size() {
        return this.workers.length;
    }
}
// ============================================================================
// Global Instance
// ============================================================================
let globalWorkerPool = null;
/**
 * Get or create global worker pool
 */
export function getWorkerPool(options) {
    if (!globalWorkerPool) {
        globalWorkerPool = new WorkerPool(options);
    }
    return globalWorkerPool;
}
/**
 * Run inference in a worker
 */
export async function runInWorker(modelUrl, inputs, options) {
    const pool = getWorkerPool();
    await pool.init();
    const modelId = await pool.loadModel(modelUrl, options);
    const outputs = await pool.runInference(modelId, inputs);
    return outputs;
}
/**
 * Check if Web Workers are supported
 */
export function isWorkerSupported() {
    return typeof Worker !== 'undefined';
}
//# sourceMappingURL=worker.js.map