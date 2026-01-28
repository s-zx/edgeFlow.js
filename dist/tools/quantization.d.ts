/**
 * edgeFlow.js - Model Compression & Quantization Tools
 *
 * In-browser model quantization and compression utilities.
 * Supports dynamic quantization (no calibration data needed).
 */
import { EdgeFlowTensor } from '../core/index.js';
/**
 * Quantization type
 */
export type QuantizationType = 'int8' | 'uint8' | 'int4' | 'float16' | 'dynamic';
/**
 * Quantization options
 */
export interface QuantizationOptions {
    /** Quantization type */
    type: QuantizationType;
    /** Layers/ops to skip quantization (by name pattern) */
    skipPatterns?: (string | RegExp)[];
    /** Per-channel quantization (more accurate, larger model) */
    perChannel?: boolean;
    /** Symmetric quantization (simpler, slightly less accurate) */
    symmetric?: boolean;
    /** Progress callback */
    onProgress?: (progress: QuantizationProgress) => void;
    /** Minimum tensor size to quantize (in elements) */
    minTensorSize?: number;
    /** Keep original weights for comparison */
    keepOriginal?: boolean;
}
/**
 * Quantization progress
 */
export interface QuantizationProgress {
    stage: 'analyzing' | 'quantizing' | 'packing' | 'complete';
    current: number;
    total: number;
    percent: number;
    layerName?: string;
}
/**
 * Quantization result
 */
export interface QuantizationResult {
    /** Quantized model data */
    data: ArrayBuffer;
    /** Original model size in bytes */
    originalSize: number;
    /** Quantized model size in bytes */
    quantizedSize: number;
    /** Compression ratio */
    compressionRatio: number;
    /** Number of tensors quantized */
    tensorsQuantized: number;
    /** Number of tensors skipped */
    tensorsSkipped: number;
    /** Quantization statistics per layer */
    layerStats: LayerQuantizationStats[];
    /** Overall statistics */
    stats: QuantizationStats;
}
/**
 * Layer quantization statistics
 */
export interface LayerQuantizationStats {
    name: string;
    originalDtype: string;
    quantizedDtype: string;
    originalSize: number;
    quantizedSize: number;
    scale: number | number[];
    zeroPoint: number | number[];
    minValue: number;
    maxValue: number;
    skipped: boolean;
    skipReason?: string;
}
/**
 * Overall quantization statistics
 */
export interface QuantizationStats {
    totalParameters: number;
    quantizedParameters: number;
    averageScale: number;
    minScale: number;
    maxScale: number;
    errorEstimate: number;
}
/**
 * Dequantize int8 data back to float32
 */
export declare function dequantizeInt8(data: Int8Array, scale: number | Float32Array, zeroPoint: number | Int32Array, perChannel?: boolean, channelSize?: number): Float32Array;
/**
 * Dequantize uint8 data back to float32
 */
export declare function dequantizeUint8(data: Uint8Array, scale: number | Float32Array, zeroPoint: number | Int32Array, perChannel?: boolean, channelSize?: number): Float32Array;
/**
 * Convert float16 bits back to float32
 */
export declare function float16ToFloat32(value: number): number;
/**
 * Dequantize float16 data back to float32
 */
export declare function dequantizeFloat16(data: Uint16Array): Float32Array;
/**
 * Quantize a model
 */
export declare function quantizeModel(modelData: ArrayBuffer, options: QuantizationOptions): Promise<QuantizationResult>;
/**
 * Quantize a single EdgeFlowTensor
 */
export declare function quantizeTensor(tensor: EdgeFlowTensor, type: QuantizationType, options?: {
    symmetric?: boolean;
    perChannel?: boolean;
}): {
    tensor: EdgeFlowTensor;
    scale: number | number[];
    zeroPoint: number | number[];
};
/**
 * Dequantize a tensor back to float32
 */
export declare function dequantizeTensor(tensor: EdgeFlowTensor, scale: number | number[], zeroPoint: number | number[], type: QuantizationType): EdgeFlowTensor;
/**
 * Pruning options
 */
export interface PruningOptions {
    /** Pruning ratio (0-1, default: 0.5 = 50% sparsity) */
    ratio?: number;
    /** Pruning method */
    method?: 'magnitude' | 'random' | 'structured';
    /** For structured pruning: dimension to prune along */
    dim?: number;
    /** Minimum absolute value to keep */
    threshold?: number;
    /** Progress callback */
    onProgress?: (progress: {
        current: number;
        total: number;
        percent: number;
    }) => void;
}
/**
 * Pruning result
 */
export interface PruningResult {
    /** Pruned model data */
    data: ArrayBuffer;
    /** Original size */
    originalSize: number;
    /** Pruned size (sparse representation) */
    prunedSize: number;
    /** Sparsity ratio achieved */
    sparsity: number;
    /** Number of parameters pruned */
    parametersPruned: number;
    /** Total parameters */
    totalParameters: number;
}
/**
 * Prune a tensor using magnitude-based pruning
 */
export declare function pruneTensor(tensor: EdgeFlowTensor, options?: PruningOptions): {
    tensor: EdgeFlowTensor;
    mask: EdgeFlowTensor;
    sparsity: number;
};
/**
 * Prune a model
 */
export declare function pruneModel(modelData: ArrayBuffer, options?: PruningOptions): Promise<PruningResult>;
/**
 * Model analysis result
 */
export interface ModelAnalysis {
    /** Total model size in bytes */
    totalSize: number;
    /** Number of tensors */
    tensorCount: number;
    /** Total number of parameters */
    totalParameters: number;
    /** Parameter breakdown by dtype */
    dtypeBreakdown: Record<string, {
        count: number;
        size: number;
    }>;
    /** Largest tensors */
    largestTensors: Array<{
        name: string;
        size: number;
        shape: number[];
    }>;
    /** Estimated memory usage at runtime */
    estimatedMemory: number;
    /** Recommended quantization type */
    recommendedQuantization: QuantizationType;
    /** Estimated size after quantization */
    estimatedQuantizedSizes: Record<QuantizationType, number>;
}
/**
 * Analyze a model
 */
export declare function analyzeModel(modelData: ArrayBuffer): Promise<ModelAnalysis>;
/**
 * Export format
 */
export type ExportFormat = 'onnx' | 'tflite' | 'edgeflow';
/**
 * Export options
 */
export interface ExportOptions {
    format: ExportFormat;
    optimize?: boolean;
    quantize?: QuantizationType;
}
/**
 * Export a model to different formats
 * Note: This is a placeholder - real implementation would require proper format conversion
 */
export declare function exportModel(modelData: ArrayBuffer, options: ExportOptions): Promise<ArrayBuffer>;
declare const _default: {
    quantizeModel: typeof quantizeModel;
    quantizeTensor: typeof quantizeTensor;
    dequantizeTensor: typeof dequantizeTensor;
    pruneModel: typeof pruneModel;
    pruneTensor: typeof pruneTensor;
    analyzeModel: typeof analyzeModel;
    exportModel: typeof exportModel;
    dequantizeInt8: typeof dequantizeInt8;
    dequantizeUint8: typeof dequantizeUint8;
    dequantizeFloat16: typeof dequantizeFloat16;
    float16ToFloat32: typeof float16ToFloat32;
};
export default _default;
//# sourceMappingURL=quantization.d.ts.map