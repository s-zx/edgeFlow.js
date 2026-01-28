/**
 * edgeFlow.js - Model Compression & Quantization Tools
 * 
 * In-browser model quantization and compression utilities.
 * Supports dynamic quantization (no calibration data needed).
 */

import { EdgeFlowTensor, DataType } from '../core/index.js';

// ============================================================================
// Types
// ============================================================================

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
 * Quantization parameters for a tensor
 */
interface QuantizationParams {
  scale: number | Float32Array;
  zeroPoint: number | Int32Array;
  min: number;
  max: number;
}

// ============================================================================
// Quantization Core
// ============================================================================

/**
 * Calculate quantization parameters for a tensor
 */
function calculateQuantParams(
  data: Float32Array,
  bits: number,
  symmetric: boolean,
  perChannel: boolean,
  channelAxis: number = 0,
  shape: number[] = []
): QuantizationParams {
  const qmin = symmetric ? -(1 << (bits - 1)) : 0;
  const qmax = symmetric ? (1 << (bits - 1)) - 1 : (1 << bits) - 1;
  
  if (perChannel && shape.length > 1) {
    // Per-channel quantization
    const numChannels = shape[channelAxis] ?? 1;
    const scales = new Float32Array(numChannels);
    const zeroPoints = new Int32Array(numChannels);
    
    const channelSize = data.length / numChannels;
    let globalMin = Infinity;
    let globalMax = -Infinity;
    
    for (let c = 0; c < numChannels; c++) {
      let min = Infinity;
      let max = -Infinity;
      
      for (let i = 0; i < channelSize; i++) {
        const idx = c * channelSize + i;
        const val = data[idx] ?? 0;
        min = Math.min(min, val);
        max = Math.max(max, val);
      }
      
      globalMin = Math.min(globalMin, min);
      globalMax = Math.max(globalMax, max);
      
      if (symmetric) {
        const absMax = Math.max(Math.abs(min), Math.abs(max));
        scales[c] = absMax / qmax;
        zeroPoints[c] = 0;
      } else {
        scales[c] = (max - min) / (qmax - qmin);
        zeroPoints[c] = Math.round(qmin - min / (scales[c] || 1));
      }
      
      // Avoid division by zero
      if (scales[c] === 0) scales[c] = 1;
    }
    
    return { scale: scales, zeroPoint: zeroPoints, min: globalMin, max: globalMax };
  } else {
    // Per-tensor quantization
    let min = Infinity;
    let max = -Infinity;
    
    for (let i = 0; i < data.length; i++) {
      const val = data[i] ?? 0;
      min = Math.min(min, val);
      max = Math.max(max, val);
    }
    
    let scale: number;
    let zeroPoint: number;
    
    if (symmetric) {
      const absMax = Math.max(Math.abs(min), Math.abs(max));
      scale = absMax / qmax;
      zeroPoint = 0;
    } else {
      scale = (max - min) / (qmax - qmin);
      zeroPoint = Math.round(qmin - min / (scale || 1));
    }
    
    // Avoid division by zero
    if (scale === 0) scale = 1;
    
    return { scale, zeroPoint, min, max };
  }
}

/**
 * Quantize float32 data to int8
 */
function quantizeToInt8(
  data: Float32Array,
  scale: number | Float32Array,
  zeroPoint: number | Int32Array,
  perChannel: boolean,
  channelSize: number = data.length
): Int8Array {
  const result = new Int8Array(data.length);
  
  if (perChannel && scale instanceof Float32Array) {
    const numChannels = scale.length;
    for (let c = 0; c < numChannels; c++) {
      const s = scale[c] ?? 1;
      const zp = (zeroPoint as Int32Array)[c] ?? 0;
      for (let i = 0; i < channelSize; i++) {
        const idx = c * channelSize + i;
        const val = data[idx] ?? 0;
        result[idx] = Math.max(-128, Math.min(127, Math.round(val / s + zp)));
      }
    }
  } else {
    const s = scale as number;
    const zp = zeroPoint as number;
    for (let i = 0; i < data.length; i++) {
      const val = data[i] ?? 0;
      result[i] = Math.max(-128, Math.min(127, Math.round(val / s + zp)));
    }
  }
  
  return result;
}

/**
 * Quantize float32 data to uint8
 */
function quantizeToUint8(
  data: Float32Array,
  scale: number | Float32Array,
  zeroPoint: number | Int32Array,
  perChannel: boolean,
  channelSize: number = data.length
): Uint8Array {
  const result = new Uint8Array(data.length);
  
  if (perChannel && scale instanceof Float32Array) {
    const numChannels = scale.length;
    for (let c = 0; c < numChannels; c++) {
      const s = scale[c] ?? 1;
      const zp = (zeroPoint as Int32Array)[c] ?? 0;
      for (let i = 0; i < channelSize; i++) {
        const idx = c * channelSize + i;
        const val = data[idx] ?? 0;
        result[idx] = Math.max(0, Math.min(255, Math.round(val / s + zp)));
      }
    }
  } else {
    const s = scale as number;
    const zp = zeroPoint as number;
    for (let i = 0; i < data.length; i++) {
      const val = data[i] ?? 0;
      result[i] = Math.max(0, Math.min(255, Math.round(val / s + zp)));
    }
  }
  
  return result;
}

/**
 * Quantize float32 data to int4 (packed as uint8, 2 values per byte)
 */
function quantizeToInt4(
  data: Float32Array,
  scale: number,
  zeroPoint: number
): Uint8Array {
  const packedLength = Math.ceil(data.length / 2);
  const result = new Uint8Array(packedLength);
  
  for (let i = 0; i < data.length; i += 2) {
    const val1 = data[i] ?? 0;
    const val2 = data[i + 1] ?? 0;
    
    // Quantize to range [-8, 7] then shift to [0, 15]
    const q1 = Math.max(0, Math.min(15, Math.round(val1 / scale + zeroPoint + 8)));
    const q2 = Math.max(0, Math.min(15, Math.round(val2 / scale + zeroPoint + 8)));
    
    // Pack two 4-bit values into one byte
    result[i >> 1] = (q1 << 4) | q2;
  }
  
  return result;
}

/**
 * Convert float32 to float16 (stored in Uint16Array)
 */
function quantizeToFloat16(data: Float32Array): Uint16Array {
  const result = new Uint16Array(data.length);
  
  for (let i = 0; i < data.length; i++) {
    result[i] = float32ToFloat16(data[i] ?? 0);
  }
  
  return result;
}

/**
 * Convert a single float32 value to float16 bits
 */
function float32ToFloat16(value: number): number {
  const float32View = new Float32Array(1);
  const int32View = new Int32Array(float32View.buffer);
  
  float32View[0] = value;
  const f = int32View[0]!;
  
  const sign = (f >> 16) & 0x8000;
  const exponent = ((f >> 23) & 0xff) - 127 + 15;
  const mantissa = f & 0x7fffff;
  
  if (exponent <= 0) {
    // Denormalized or zero
    if (exponent < -10) {
      return sign;
    }
    const m = (mantissa | 0x800000) >> (1 - exponent);
    return sign | (m >> 13);
  } else if (exponent >= 31) {
    // Overflow to infinity
    return sign | 0x7c00;
  }
  
  return sign | (exponent << 10) | (mantissa >> 13);
}

/**
 * Dequantize int8 data back to float32
 */
export function dequantizeInt8(
  data: Int8Array,
  scale: number | Float32Array,
  zeroPoint: number | Int32Array,
  perChannel: boolean = false,
  channelSize: number = data.length
): Float32Array {
  const result = new Float32Array(data.length);
  
  if (perChannel && scale instanceof Float32Array) {
    const numChannels = scale.length;
    for (let c = 0; c < numChannels; c++) {
      const s = scale[c] ?? 1;
      const zp = (zeroPoint as Int32Array)[c] ?? 0;
      for (let i = 0; i < channelSize; i++) {
        const idx = c * channelSize + i;
        result[idx] = ((data[idx] ?? 0) - zp) * s;
      }
    }
  } else {
    const s = scale as number;
    const zp = zeroPoint as number;
    for (let i = 0; i < data.length; i++) {
      result[i] = ((data[i] ?? 0) - zp) * s;
    }
  }
  
  return result;
}

/**
 * Dequantize uint8 data back to float32
 */
export function dequantizeUint8(
  data: Uint8Array,
  scale: number | Float32Array,
  zeroPoint: number | Int32Array,
  perChannel: boolean = false,
  channelSize: number = data.length
): Float32Array {
  const result = new Float32Array(data.length);
  
  if (perChannel && scale instanceof Float32Array) {
    const numChannels = scale.length;
    for (let c = 0; c < numChannels; c++) {
      const s = scale[c] ?? 1;
      const zp = (zeroPoint as Int32Array)[c] ?? 0;
      for (let i = 0; i < channelSize; i++) {
        const idx = c * channelSize + i;
        result[idx] = ((data[idx] ?? 0) - zp) * s;
      }
    }
  } else {
    const s = scale as number;
    const zp = zeroPoint as number;
    for (let i = 0; i < data.length; i++) {
      result[i] = ((data[i] ?? 0) - zp) * s;
    }
  }
  
  return result;
}

/**
 * Convert float16 bits back to float32
 */
export function float16ToFloat32(value: number): number {
  const sign = (value & 0x8000) >> 15;
  const exponent = (value & 0x7c00) >> 10;
  const mantissa = value & 0x03ff;
  
  if (exponent === 0) {
    if (mantissa === 0) {
      return sign === 0 ? 0 : -0;
    }
    // Denormalized
    return (sign === 0 ? 1 : -1) * Math.pow(2, -14) * (mantissa / 1024);
  } else if (exponent === 31) {
    if (mantissa === 0) {
      return sign === 0 ? Infinity : -Infinity;
    }
    return NaN;
  }
  
  return (sign === 0 ? 1 : -1) * Math.pow(2, exponent - 15) * (1 + mantissa / 1024);
}

/**
 * Dequantize float16 data back to float32
 */
export function dequantizeFloat16(data: Uint16Array): Float32Array {
  const result = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = float16ToFloat32(data[i] ?? 0);
  }
  return result;
}

// ============================================================================
// Model Quantization
// ============================================================================

/**
 * Simple ONNX-like model representation for quantization
 */
interface ModelWeights {
  name: string;
  data: Float32Array;
  shape: number[];
  dtype: string;
}

/**
 * Quantized model format
 */
interface QuantizedModel {
  version: number;
  quantizationType: QuantizationType;
  originalSize: number;
  weights: Array<{
    name: string;
    data: ArrayBuffer;
    shape: number[];
    dtype: string;
    originalDtype: string;
    scale?: number | number[];
    zeroPoint?: number | number[];
  }>;
}

/**
 * Parse ONNX model to extract weights
 * Note: This is a simplified parser for demonstration
 */
function parseModelWeights(modelData: ArrayBuffer): ModelWeights[] {
  // Check if it's an ONNX model by magic number
  // const view = new DataView(modelData); // Reserved for future ONNX header parsing
  const weights: ModelWeights[] = [];
  
  // Simple heuristic: look for float32 arrays in the buffer
  // In a real implementation, we'd use proper ONNX parsing
  const float32Array = new Float32Array(modelData);
  
  // Create a single weight tensor from the model data
  // This is a placeholder - real implementation would parse ONNX properly
  weights.push({
    name: 'model_weights',
    data: float32Array,
    shape: [float32Array.length],
    dtype: 'float32',
  });
  
  return weights;
}

/**
 * Serialize quantized model to ArrayBuffer
 */
function serializeQuantizedModel(model: QuantizedModel): ArrayBuffer {
  // Create a simple binary format:
  // Header: version (4 bytes) + type (4 bytes) + originalSize (8 bytes) + numWeights (4 bytes)
  // For each weight: nameLen (4) + name + shapeLen (4) + shape + dtypeLen (4) + dtype + 
  //                  origDtypeLen (4) + origDtype + hasScale (1) + scale + hasZP (1) + zp + dataLen (8) + data
  
  const encoder = new TextEncoder();
  
  // Calculate total size
  let totalSize = 20; // Header
  
  for (const weight of model.weights) {
    const nameBytes = encoder.encode(weight.name);
    const dtypeBytes = encoder.encode(weight.dtype);
    const origDtypeBytes = encoder.encode(weight.originalDtype);
    
    totalSize += 4 + nameBytes.length; // name
    totalSize += 4 + weight.shape.length * 4; // shape
    totalSize += 4 + dtypeBytes.length; // dtype
    totalSize += 4 + origDtypeBytes.length; // originalDtype
    totalSize += 1; // hasScale
    if (weight.scale !== undefined) {
      totalSize += Array.isArray(weight.scale) ? 4 + weight.scale.length * 4 : 4;
    }
    totalSize += 1; // hasZeroPoint
    if (weight.zeroPoint !== undefined) {
      totalSize += Array.isArray(weight.zeroPoint) ? 4 + weight.zeroPoint.length * 4 : 4;
    }
    totalSize += 8 + weight.data.byteLength; // data
  }
  
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const uint8 = new Uint8Array(buffer);
  let offset = 0;
  
  // Write header
  view.setUint32(offset, model.version, true); offset += 4;
  view.setUint32(offset, ['int8', 'uint8', 'int4', 'float16', 'dynamic'].indexOf(model.quantizationType), true); offset += 4;
  // Write originalSize as two 32-bit integers (for 64-bit compatibility)
  view.setUint32(offset, model.originalSize & 0xFFFFFFFF, true); offset += 4;
  view.setUint32(offset, (model.originalSize / 0x100000000) >>> 0, true); offset += 4;
  view.setUint32(offset, model.weights.length, true); offset += 4;
  
  // Write weights
  for (const weight of model.weights) {
    const nameBytes = encoder.encode(weight.name);
    const dtypeBytes = encoder.encode(weight.dtype);
    const origDtypeBytes = encoder.encode(weight.originalDtype);
    
    // Name
    view.setUint32(offset, nameBytes.length, true); offset += 4;
    uint8.set(nameBytes, offset); offset += nameBytes.length;
    
    // Shape
    view.setUint32(offset, weight.shape.length, true); offset += 4;
    for (const dim of weight.shape) {
      view.setInt32(offset, dim, true); offset += 4;
    }
    
    // Dtype
    view.setUint32(offset, dtypeBytes.length, true); offset += 4;
    uint8.set(dtypeBytes, offset); offset += dtypeBytes.length;
    
    // Original dtype
    view.setUint32(offset, origDtypeBytes.length, true); offset += 4;
    uint8.set(origDtypeBytes, offset); offset += origDtypeBytes.length;
    
    // Scale
    if (weight.scale !== undefined) {
      view.setUint8(offset, 1); offset += 1;
      if (Array.isArray(weight.scale)) {
        view.setUint32(offset, weight.scale.length, true); offset += 4;
        for (const s of weight.scale) {
          view.setFloat32(offset, s, true); offset += 4;
        }
      } else {
        view.setUint32(offset, 1, true); offset += 4;
        view.setFloat32(offset, weight.scale, true); offset += 4;
      }
    } else {
      view.setUint8(offset, 0); offset += 1;
    }
    
    // Zero point
    if (weight.zeroPoint !== undefined) {
      view.setUint8(offset, 1); offset += 1;
      if (Array.isArray(weight.zeroPoint)) {
        view.setUint32(offset, weight.zeroPoint.length, true); offset += 4;
        for (const zp of weight.zeroPoint) {
          view.setInt32(offset, zp, true); offset += 4;
        }
      } else {
        view.setUint32(offset, 1, true); offset += 4;
        view.setInt32(offset, weight.zeroPoint, true); offset += 4;
      }
    } else {
      view.setUint8(offset, 0); offset += 1;
    }
    
    // Data
    const dataLow = weight.data.byteLength & 0xFFFFFFFF;
    const dataHigh = (weight.data.byteLength / 0x100000000) >>> 0;
    view.setUint32(offset, dataLow, true); offset += 4;
    view.setUint32(offset, dataHigh, true); offset += 4;
    uint8.set(new Uint8Array(weight.data), offset); offset += weight.data.byteLength;
  }
  
  return buffer;
}

/**
 * Quantize a model
 */
export async function quantizeModel(
  modelData: ArrayBuffer,
  options: QuantizationOptions
): Promise<QuantizationResult> {
  const {
    type,
    skipPatterns = [],
    perChannel = false,
    symmetric = true,
    onProgress,
    minTensorSize = 100,
  } = options;
  
  const originalSize = modelData.byteLength;
  const layerStats: LayerQuantizationStats[] = [];
  let tensorsQuantized = 0;
  let tensorsSkipped = 0;
  
  // Parse model weights
  onProgress?.({ stage: 'analyzing', current: 0, total: 1, percent: 0 });
  const weights = parseModelWeights(modelData);
  
  const quantizedWeights: QuantizedModel['weights'] = [];
  let totalParams = 0;
  let quantizedParams = 0;
  const scales: number[] = [];
  
  // Quantize each weight tensor
  for (let i = 0; i < weights.length; i++) {
    const weight = weights[i]!;
    const percent = ((i + 1) / weights.length) * 100;
    
    onProgress?.({
      stage: 'quantizing',
      current: i + 1,
      total: weights.length,
      percent,
      layerName: weight.name,
    });
    
    totalParams += weight.data.length;
    
    // Check if should skip
    const shouldSkip = 
      weight.data.length < minTensorSize ||
      skipPatterns.some(pattern => {
        if (typeof pattern === 'string') {
          return weight.name.includes(pattern);
        }
        return pattern.test(weight.name);
      });
    
    if (shouldSkip) {
      tensorsSkipped++;
      layerStats.push({
        name: weight.name,
        originalDtype: weight.dtype,
        quantizedDtype: weight.dtype,
        originalSize: weight.data.byteLength,
        quantizedSize: weight.data.byteLength,
        scale: 1,
        zeroPoint: 0,
        minValue: Math.min(...weight.data),
        maxValue: Math.max(...weight.data),
        skipped: true,
        skipReason: weight.data.length < minTensorSize 
          ? 'Tensor too small' 
          : 'Matched skip pattern',
      });
      
      quantizedWeights.push({
        name: weight.name,
        data: weight.data.buffer.slice(0) as ArrayBuffer,
        shape: weight.shape,
        dtype: weight.dtype,
        originalDtype: weight.dtype,
      });
      continue;
    }
    
    // Calculate quantization parameters
    const bits = type === 'int4' ? 4 : 8;
    const params = calculateQuantParams(
      weight.data,
      bits,
      symmetric,
      perChannel,
      0,
      weight.shape
    );
    
    // Quantize data
    let quantizedData: ArrayBuffer;
    let quantizedDtype: string;
    
    switch (type) {
      case 'int8':
        const int8Data = quantizeToInt8(
          weight.data,
          params.scale,
          params.zeroPoint,
          perChannel,
          perChannel ? weight.data.length / (weight.shape[0] ?? 1) : weight.data.length
        );
        quantizedData = int8Data.buffer.slice(0) as ArrayBuffer;
        quantizedDtype = 'int8';
        break;
        
      case 'uint8':
        const uint8Data = quantizeToUint8(
          weight.data,
          params.scale,
          params.zeroPoint,
          perChannel,
          perChannel ? weight.data.length / (weight.shape[0] ?? 1) : weight.data.length
        );
        quantizedData = uint8Data.buffer.slice(0) as ArrayBuffer;
        quantizedDtype = 'uint8';
        break;
        
      case 'int4':
        const int4Data = quantizeToInt4(
          weight.data,
          params.scale as number,
          params.zeroPoint as number
        );
        quantizedData = int4Data.buffer.slice(0) as ArrayBuffer;
        quantizedDtype = 'int4';
        break;
        
      case 'float16':
        const fp16Data = quantizeToFloat16(weight.data);
        quantizedData = fp16Data.buffer.slice(0) as ArrayBuffer;
        quantizedDtype = 'float16';
        break;
        
      case 'dynamic':
      default:
        // Dynamic quantization: use int8 for weights
        const dynData = quantizeToInt8(
          weight.data,
          params.scale,
          params.zeroPoint,
          perChannel,
          perChannel ? weight.data.length / (weight.shape[0] ?? 1) : weight.data.length
        );
        quantizedData = dynData.buffer.slice(0) as ArrayBuffer;
        quantizedDtype = 'int8';
        break;
    }
    
    tensorsQuantized++;
    quantizedParams += weight.data.length;
    
    const scaleValue = params.scale instanceof Float32Array 
      ? Array.from(params.scale)
      : params.scale;
    const zpValue = params.zeroPoint instanceof Int32Array
      ? Array.from(params.zeroPoint)
      : params.zeroPoint;
    
    if (typeof scaleValue === 'number') {
      scales.push(scaleValue);
    } else {
      scales.push(...scaleValue);
    }
    
    layerStats.push({
      name: weight.name,
      originalDtype: weight.dtype,
      quantizedDtype,
      originalSize: weight.data.byteLength,
      quantizedSize: quantizedData.byteLength,
      scale: scaleValue,
      zeroPoint: zpValue,
      minValue: params.min,
      maxValue: params.max,
      skipped: false,
    });
    
    quantizedWeights.push({
      name: weight.name,
      data: quantizedData,
      shape: weight.shape,
      dtype: quantizedDtype,
      originalDtype: weight.dtype,
      scale: scaleValue,
      zeroPoint: zpValue,
    });
  }
  
  // Pack into final format
  onProgress?.({ stage: 'packing', current: 0, total: 1, percent: 0 });
  
  const quantizedModel: QuantizedModel = {
    version: 1,
    quantizationType: type,
    originalSize,
    weights: quantizedWeights,
  };
  
  const quantizedData = serializeQuantizedModel(quantizedModel);
  
  onProgress?.({ stage: 'complete', current: 1, total: 1, percent: 100 });
  
  // Calculate statistics
  const avgScale = scales.length > 0 
    ? scales.reduce((a, b) => a + b, 0) / scales.length 
    : 1;
  const minScale = scales.length > 0 ? Math.min(...scales) : 1;
  const maxScale = scales.length > 0 ? Math.max(...scales) : 1;
  
  // Estimate quantization error (very rough approximation)
  const bitsReduction = type === 'int4' ? 8 : type === 'float16' ? 2 : 4;
  const errorEstimate = avgScale / bitsReduction;
  
  return {
    data: quantizedData,
    originalSize,
    quantizedSize: quantizedData.byteLength,
    compressionRatio: originalSize / quantizedData.byteLength,
    tensorsQuantized,
    tensorsSkipped,
    layerStats,
    stats: {
      totalParameters: totalParams,
      quantizedParameters: quantizedParams,
      averageScale: avgScale,
      minScale,
      maxScale,
      errorEstimate,
    },
  };
}

// ============================================================================
// Tensor Quantization (for individual tensors)
// ============================================================================

/**
 * Quantize a single EdgeFlowTensor
 */
export function quantizeTensor(
  tensor: EdgeFlowTensor,
  type: QuantizationType,
  options: { symmetric?: boolean; perChannel?: boolean } = {}
): {
  tensor: EdgeFlowTensor;
  scale: number | number[];
  zeroPoint: number | number[];
} {
  const { symmetric = true, perChannel = false } = options;
  const data = tensor.toFloat32Array();
  const shape = tensor.shape as number[];
  
  const bits = type === 'int4' ? 4 : 8;
  const params = calculateQuantParams(
    data,
    bits,
    symmetric,
    perChannel,
    0,
    shape
  );
  
  let quantizedData: Int8Array | Uint8Array | Uint16Array;
  let dtype: DataType;
  
  switch (type) {
    case 'int8':
      quantizedData = quantizeToInt8(
        data,
        params.scale,
        params.zeroPoint,
        perChannel
      );
      dtype = 'int32'; // Store as int32 since we don't have int8 dtype
      break;
      
    case 'uint8':
      quantizedData = quantizeToUint8(
        data,
        params.scale,
        params.zeroPoint,
        perChannel
      );
      dtype = 'int32';
      break;
      
    case 'float16':
      quantizedData = quantizeToFloat16(data);
      dtype = 'float32'; // Will be stored differently
      break;
      
    default:
      quantizedData = quantizeToInt8(
        data,
        params.scale,
        params.zeroPoint,
        perChannel
      );
      dtype = 'int32';
  }
  
  const scaleValue = params.scale instanceof Float32Array
    ? Array.from(params.scale)
    : params.scale;
  const zpValue = params.zeroPoint instanceof Int32Array
    ? Array.from(params.zeroPoint)
    : params.zeroPoint;
  
  return {
    tensor: new EdgeFlowTensor(Array.from(quantizedData), shape, dtype),
    scale: scaleValue,
    zeroPoint: zpValue,
  };
}

/**
 * Dequantize a tensor back to float32
 */
export function dequantizeTensor(
  tensor: EdgeFlowTensor,
  scale: number | number[],
  zeroPoint: number | number[],
  type: QuantizationType
): EdgeFlowTensor {
  const data = tensor.toArray();
  const shape = tensor.shape as number[];
  
  let dequantizedData: Float32Array;
  
  const scaleArr = Array.isArray(scale) ? new Float32Array(scale) : scale;
  const zpArr = Array.isArray(zeroPoint) ? new Int32Array(zeroPoint) : zeroPoint;
  const perChannel = Array.isArray(scale);
  
  switch (type) {
    case 'int8':
      dequantizedData = dequantizeInt8(
        new Int8Array(data.map(Number)),
        scaleArr,
        zpArr,
        perChannel
      );
      break;
      
    case 'uint8':
      dequantizedData = dequantizeUint8(
        new Uint8Array(data.map(Number)),
        scaleArr,
        zpArr,
        perChannel
      );
      break;
      
    case 'float16':
      dequantizedData = dequantizeFloat16(new Uint16Array(data.map(Number)));
      break;
      
    default:
      dequantizedData = dequantizeInt8(
        new Int8Array(data.map(Number)),
        scaleArr,
        zpArr,
        perChannel
      );
  }
  
  return new EdgeFlowTensor(Array.from(dequantizedData), shape, 'float32');
}

// ============================================================================
// Pruning
// ============================================================================

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
  onProgress?: (progress: { current: number; total: number; percent: number }) => void;
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
export function pruneTensor(
  tensor: EdgeFlowTensor,
  options: PruningOptions = {}
): {
  tensor: EdgeFlowTensor;
  mask: EdgeFlowTensor;
  sparsity: number;
} {
  const { ratio = 0.5, method = 'magnitude', threshold } = options;
  const data = tensor.toFloat32Array();
  const shape = tensor.shape as number[];
  
  const mask = new Float32Array(data.length);
  const prunedData = new Float32Array(data.length);
  let prunedCount = 0;
  
  if (method === 'magnitude') {
    // Get threshold based on ratio
    const absValues = Array.from(data).map(Math.abs).sort((a, b) => a - b);
    const thresholdIndex = Math.floor(absValues.length * ratio);
    const computedThreshold = threshold ?? (absValues[thresholdIndex] ?? 0);
    
    for (let i = 0; i < data.length; i++) {
      if (Math.abs(data[i] ?? 0) > computedThreshold) {
        mask[i] = 1;
        prunedData[i] = data[i] ?? 0;
      } else {
        mask[i] = 0;
        prunedData[i] = 0;
        prunedCount++;
      }
    }
  } else if (method === 'random') {
    for (let i = 0; i < data.length; i++) {
      if (Math.random() > ratio) {
        mask[i] = 1;
        prunedData[i] = data[i] ?? 0;
      } else {
        mask[i] = 0;
        prunedData[i] = 0;
        prunedCount++;
      }
    }
  }
  
  return {
    tensor: new EdgeFlowTensor(Array.from(prunedData), shape, 'float32'),
    mask: new EdgeFlowTensor(Array.from(mask), shape, 'float32'),
    sparsity: prunedCount / data.length,
  };
}

/**
 * Prune a model
 */
export async function pruneModel(
  modelData: ArrayBuffer,
  options: PruningOptions = {}
): Promise<PruningResult> {
  const { onProgress } = options;
  
  onProgress?.({ current: 0, total: 1, percent: 0 });
  
  // This is a simplified implementation
  // Real implementation would parse the model properly
  const weights = parseModelWeights(modelData);
  let totalParams = 0;
  let prunedParams = 0;
  
  for (const weight of weights) {
    totalParams += weight.data.length;
    
    const tensor = new EdgeFlowTensor(
      Array.from(weight.data),
      weight.shape,
      'float32'
    );
    
    const { sparsity } = pruneTensor(tensor, options);
    prunedParams += Math.floor(weight.data.length * sparsity);
  }
  
  onProgress?.({ current: 1, total: 1, percent: 100 });
  
  return {
    data: modelData, // In a real implementation, we'd create a sparse format
    originalSize: modelData.byteLength,
    prunedSize: modelData.byteLength, // Would be smaller with sparse format
    sparsity: prunedParams / totalParams,
    parametersPruned: prunedParams,
    totalParameters: totalParams,
  };
}

// ============================================================================
// Model Analysis
// ============================================================================

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
  dtypeBreakdown: Record<string, { count: number; size: number }>;
  
  /** Largest tensors */
  largestTensors: Array<{ name: string; size: number; shape: number[] }>;
  
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
export async function analyzeModel(modelData: ArrayBuffer): Promise<ModelAnalysis> {
  const weights = parseModelWeights(modelData);
  const totalSize = modelData.byteLength;
  
  const dtypeBreakdown: Record<string, { count: number; size: number }> = {};
  let totalParams = 0;
  
  const tensorInfos: Array<{ name: string; size: number; shape: number[] }> = [];
  
  for (const weight of weights) {
    totalParams += weight.data.length;
    
    const bytesPerElement = weight.dtype === 'float32' ? 4 
      : weight.dtype === 'float16' ? 2 
      : weight.dtype === 'int8' ? 1 
      : 4;
    const size = weight.data.length * bytesPerElement;
    
    if (!dtypeBreakdown[weight.dtype]) {
      dtypeBreakdown[weight.dtype] = { count: 0, size: 0 };
    }
    dtypeBreakdown[weight.dtype]!.count++;
    dtypeBreakdown[weight.dtype]!.size += size;
    
    tensorInfos.push({
      name: weight.name,
      size,
      shape: weight.shape,
    });
  }
  
  // Sort by size and get top 10
  tensorInfos.sort((a, b) => b.size - a.size);
  const largestTensors = tensorInfos.slice(0, 10);
  
  // Estimate quantized sizes
  const estimatedQuantizedSizes: Record<QuantizationType, number> = {
    int8: Math.ceil(totalSize / 4),
    uint8: Math.ceil(totalSize / 4),
    int4: Math.ceil(totalSize / 8),
    float16: Math.ceil(totalSize / 2),
    dynamic: Math.ceil(totalSize / 4),
  };
  
  // Recommend quantization based on model size
  let recommendedQuantization: QuantizationType = 'dynamic';
  if (totalSize > 500 * 1024 * 1024) {
    recommendedQuantization = 'int4';
  } else if (totalSize > 100 * 1024 * 1024) {
    recommendedQuantization = 'int8';
  } else if (totalSize > 50 * 1024 * 1024) {
    recommendedQuantization = 'float16';
  }
  
  return {
    totalSize,
    tensorCount: weights.length,
    totalParameters: totalParams,
    dtypeBreakdown,
    largestTensors,
    estimatedMemory: totalParams * 4, // Assuming float32 at runtime
    recommendedQuantization,
    estimatedQuantizedSizes,
  };
}

// ============================================================================
// Export Model
// ============================================================================

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
export async function exportModel(
  modelData: ArrayBuffer,
  options: ExportOptions
): Promise<ArrayBuffer> {
  const { format, quantize } = options;
  
  // Apply quantization if requested
  let data = modelData;
  if (quantize) {
    const result = await quantizeModel(modelData, { type: quantize });
    data = result.data;
  }
  
  // Format conversion would happen here
  // For now, we just return the (possibly quantized) data
  switch (format) {
    case 'edgeflow':
      return data;
    case 'onnx':
      // Would convert to ONNX format
      return data;
    case 'tflite':
      // Would convert to TFLite format
      return data;
    default:
      return data;
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  quantizeModel,
  quantizeTensor,
  dequantizeTensor,
  pruneModel,
  pruneTensor,
  analyzeModel,
  exportModel,
  dequantizeInt8,
  dequantizeUint8,
  dequantizeFloat16,
  float16ToFloat32,
};
