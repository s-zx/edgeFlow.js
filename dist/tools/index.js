/**
 * edgeFlow.js - Tools and Utilities
 *
 * Model optimization, quantization, and analysis tools.
 */
/**
 * Quantize a model
 *
 * @example
 * ```typescript
 * const quantized = await quantize(model, {
 *   method: 'int8',
 *   calibrationData: samples,
 * });
 * ```
 */
export async function quantize(model, options) {
    // Get model data
    const modelData = model instanceof ArrayBuffer
        ? model
        : await getModelData(model);
    const originalSize = modelData.byteLength;
    // Apply quantization based on method
    let quantizedData;
    let layersQuantized = 0;
    let layersSkipped = 0;
    switch (options.method) {
        case 'int8':
            ({ data: quantizedData, layersQuantized, layersSkipped } =
                quantizeInt8(modelData, options));
            break;
        case 'uint8':
            ({ data: quantizedData, layersQuantized, layersSkipped } =
                quantizeUint8(modelData, options));
            break;
        case 'float16':
            ({ data: quantizedData, layersQuantized, layersSkipped } =
                quantizeFloat16(modelData, options));
            break;
        case 'int4':
            ({ data: quantizedData, layersQuantized, layersSkipped } =
                quantizeInt4(modelData, options));
            break;
        default:
            quantizedData = modelData;
    }
    return {
        modelData: quantizedData,
        originalSize,
        quantizedSize: quantizedData.byteLength,
        compressionRatio: originalSize / quantizedData.byteLength,
        stats: {
            layersQuantized,
            layersSkipped,
        },
    };
}
/**
 * Placeholder for getting model data
 */
async function getModelData(_model) {
    // In production, this would extract the model weights
    return new ArrayBuffer(0);
}
/**
 * INT8 quantization
 */
function quantizeInt8(data, _options) {
    // Simplified INT8 quantization
    const input = new Float32Array(data);
    const output = new Int8Array(input.length);
    // Find scale
    let max = 0;
    for (let i = 0; i < input.length; i++) {
        const abs = Math.abs(input[i] ?? 0);
        if (abs > max)
            max = abs;
    }
    const scale = max / 127;
    // Quantize
    for (let i = 0; i < input.length; i++) {
        output[i] = Math.round((input[i] ?? 0) / scale);
    }
    return {
        data: output.buffer,
        layersQuantized: 1,
        layersSkipped: 0,
    };
}
/**
 * UINT8 quantization
 */
function quantizeUint8(data, _options) {
    const input = new Float32Array(data);
    const output = new Uint8Array(input.length);
    // Find min/max
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < input.length; i++) {
        const val = input[i] ?? 0;
        if (val < min)
            min = val;
        if (val > max)
            max = val;
    }
    const scale = (max - min) / 255;
    // Quantize
    for (let i = 0; i < input.length; i++) {
        output[i] = Math.round(((input[i] ?? 0) - min) / scale);
    }
    return {
        data: output.buffer,
        layersQuantized: 1,
        layersSkipped: 0,
    };
}
/**
 * Float16 quantization
 */
function quantizeFloat16(data, _options) {
    const input = new Float32Array(data);
    const output = new Uint16Array(input.length);
    // Convert float32 to float16
    for (let i = 0; i < input.length; i++) {
        output[i] = float32ToFloat16(input[i] ?? 0);
    }
    return {
        data: output.buffer,
        layersQuantized: 1,
        layersSkipped: 0,
    };
}
/**
 * INT4 quantization
 */
function quantizeInt4(data, _options) {
    const input = new Float32Array(data);
    // Pack two INT4 values per byte
    const output = new Uint8Array(Math.ceil(input.length / 2));
    // Find scale
    let max = 0;
    for (let i = 0; i < input.length; i++) {
        const abs = Math.abs(input[i] ?? 0);
        if (abs > max)
            max = abs;
    }
    const scale = max / 7; // INT4 range: -8 to 7
    // Quantize and pack
    for (let i = 0; i < input.length; i += 2) {
        const val1 = Math.round((input[i] ?? 0) / scale) + 8;
        const val2 = Math.round((input[i + 1] ?? 0) / scale) + 8;
        output[i / 2] = ((val1 & 0xF) << 4) | (val2 & 0xF);
    }
    return {
        data: output.buffer,
        layersQuantized: 1,
        layersSkipped: 0,
    };
}
/**
 * Convert float32 to float16
 */
function float32ToFloat16(value) {
    const floatView = new Float32Array(1);
    const int32View = new Int32Array(floatView.buffer);
    floatView[0] = value;
    const x = int32View[0] ?? 0;
    let bits = (x >> 16) & 0x8000; // sign
    let m = (x >> 12) & 0x07ff; // mantissa
    const e = (x >> 23) & 0xff; // exponent
    if (e < 103) {
        // Too small, return zero
        return bits;
    }
    if (e > 142) {
        // Too large, return infinity
        bits |= 0x7c00;
        bits |= ((e === 255) ? 0 : 1) && (x & 0x007fffff);
        return bits;
    }
    if (e < 113) {
        // Denormalized
        m |= 0x0800;
        bits |= (m >> (114 - e)) + ((m >> (113 - e)) & 1);
        return bits;
    }
    bits |= ((e - 112) << 10) | (m >> 1);
    bits += m & 1;
    return bits;
}
/**
 * Prune model weights
 */
export async function prune(model, options) {
    const modelData = model instanceof ArrayBuffer
        ? model
        : await getModelData(model);
    const weights = new Float32Array(modelData);
    const total = weights.length;
    // Calculate threshold for magnitude pruning
    const magnitudes = weights.map(Math.abs);
    const sorted = [...magnitudes].sort((a, b) => a - b);
    const thresholdIdx = Math.floor(options.sparsity * sorted.length);
    const threshold = sorted[thresholdIdx] ?? 0;
    // Prune weights
    let pruned = 0;
    for (let i = 0; i < weights.length; i++) {
        if (Math.abs(weights[i] ?? 0) < threshold) {
            weights[i] = 0;
            pruned++;
        }
    }
    return {
        modelData: weights.buffer,
        actualSparsity: pruned / total,
        parametersPruned: pruned,
        totalParameters: total,
    };
}
/**
 * Analyze a model
 */
export async function analyzeModel(model) {
    // Simplified analysis
    const size = model instanceof ArrayBuffer
        ? model.byteLength
        : model.metadata.sizeBytes;
    const estimatedParams = Math.floor(size / 4); // Assume float32
    return {
        totalParameters: estimatedParams,
        sizeBytes: size,
        layers: [],
        estimatedFlops: estimatedParams * 2, // Rough estimate
        memoryRequirements: {
            weights: size,
            activations: size * 0.1, // Rough estimate
            total: size * 1.1,
        },
    };
}
/**
 * Benchmark model inference
 */
export async function benchmark(runFn, options = {}) {
    const { warmupRuns = 3, runs = 10, } = options;
    // Warmup
    for (let i = 0; i < warmupRuns; i++) {
        await runFn();
    }
    // Benchmark
    const times = [];
    for (let i = 0; i < runs; i++) {
        const start = performance.now();
        await runFn();
        times.push(performance.now() - start);
    }
    // Calculate statistics
    const sum = times.reduce((a, b) => a + b, 0);
    const avgTime = sum / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const squaredDiffs = times.map(t => Math.pow(t - avgTime, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / times.length;
    const stdDev = Math.sqrt(avgSquaredDiff);
    return {
        avgTime,
        minTime,
        maxTime,
        stdDev,
        throughput: 1000 / avgTime,
        times,
    };
}
// ============================================================================
// Re-export benchmark utilities
// ============================================================================
export { benchmark as runBenchmark, compareBenchmarks, benchmarkSuite, benchmarkMemory, formatBenchmarkResult, formatComparisonResult, } from './benchmark.js';
// ============================================================================
// Re-export advanced quantization tools
// ============================================================================
export { quantizeModel, quantizeTensor, dequantizeTensor, pruneModel, pruneTensor, analyzeModel as analyzeModelDetailed, exportModel as exportModelAdvanced, dequantizeInt8, dequantizeUint8, dequantizeFloat16, float16ToFloat32, } from './quantization.js';
// ============================================================================
// Re-export debugging tools
// ============================================================================
export { EdgeFlowDebugger, getDebugger, enableDebugging, disableDebugging, inspectTensor, formatTensorInspection, createAsciiHistogram, createTensorHeatmap, visualizeModelArchitecture, } from './debugger.js';
// ============================================================================
// Re-export monitoring tools
// ============================================================================
export { PerformanceMonitor, getMonitor, startMonitoring, stopMonitoring, generateDashboardHTML, generateAsciiDashboard, } from './monitor.js';
// ============================================================================
// Export Utilities
// ============================================================================
/**
 * Export model to different formats
 */
export async function exportModel(model, format) {
    const modelData = model instanceof ArrayBuffer
        ? model
        : await getModelData(model);
    switch (format) {
        case 'json':
            // Export as JSON (for small models)
            const array = new Float32Array(modelData);
            return JSON.stringify(Array.from(array));
        case 'binary':
        case 'onnx':
        default:
            return modelData;
    }
}
//# sourceMappingURL=index.js.map