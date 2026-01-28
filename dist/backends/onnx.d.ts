/**
 * edgeFlow.js - ONNX Runtime Backend
 *
 * Uses onnxruntime-web for real ONNX model inference.
 */
import { Runtime, RuntimeType, RuntimeCapabilities, LoadedModel, ModelLoadOptions, Tensor } from '../core/types.js';
/**
 * ONNXRuntime - Real ONNX model inference using onnxruntime-web
 */
export declare class ONNXRuntime implements Runtime {
    readonly name: RuntimeType;
    private initialized;
    private executionProvider;
    get capabilities(): RuntimeCapabilities;
    /**
     * Check if ONNX Runtime is available
     */
    isAvailable(): Promise<boolean>;
    /**
     * Initialize the ONNX runtime
     */
    initialize(): Promise<void>;
    /**
     * Load a model from ArrayBuffer
     */
    loadModel(modelData: ArrayBuffer, options?: ModelLoadOptions): Promise<LoadedModel>;
    /**
     * Run inference
     */
    run(model: LoadedModel, inputs: Tensor[]): Promise<Tensor[]>;
    /**
     * Unload a model
     */
    private unloadModel;
    /**
     * Dispose the runtime
     */
    dispose(): void;
}
/**
 * Create ONNX runtime factory
 */
export declare function createONNXRuntime(): Runtime;
//# sourceMappingURL=onnx.d.ts.map