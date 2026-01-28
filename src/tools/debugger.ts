/**
 * edgeFlow.js - Visual Debugging Tools
 * 
 * In-browser debugging and visualization utilities for ML models.
 */

import { EdgeFlowTensor } from '../core/index.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Debugger configuration
 */
export interface DebuggerConfig {
  /** Enable logging */
  logging?: boolean;
  
  /** Log level */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  
  /** Enable tensor inspection */
  inspectTensors?: boolean;
  
  /** Maximum values to display per tensor */
  maxDisplayValues?: number;
  
  /** Enable performance tracking */
  trackPerformance?: boolean;
  
  /** Custom logger function */
  logger?: (level: string, message: string, data?: unknown) => void;
}

/**
 * Tensor inspection result
 */
export interface TensorInspection {
  name: string;
  shape: number[];
  dtype: string;
  size: number;
  memoryBytes: number;
  stats: TensorStats;
  sample: number[];
  histogram?: HistogramData;
}

/**
 * Tensor statistics
 */
export interface TensorStats {
  min: number;
  max: number;
  mean: number;
  std: number;
  zeros: number;
  nans: number;
  infinities: number;
  sparsity: number;
}

/**
 * Histogram data
 */
export interface HistogramData {
  bins: number[];
  counts: number[];
  binEdges: number[];
}

/**
 * Inference trace
 */
export interface InferenceTrace {
  id: string;
  modelId: string;
  timestamp: number;
  inputs: TensorInspection[];
  outputs: TensorInspection[];
  duration: number;
  memoryUsed: number;
  operations: OperationTrace[];
}

/**
 * Operation trace
 */
export interface OperationTrace {
  name: string;
  type: string;
  duration: number;
  inputShapes: number[][];
  outputShapes: number[][];
  attributes?: Record<string, unknown>;
}

/**
 * Debug event
 */
export interface DebugEvent {
  type: 'tensor' | 'inference' | 'error' | 'warning' | 'info' | 'performance';
  timestamp: number;
  data: unknown;
  message: string;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  inferenceCount: number;
  totalInferenceTime: number;
  averageInferenceTime: number;
  minInferenceTime: number;
  maxInferenceTime: number;
  peakMemoryUsage: number;
  currentMemoryUsage: number;
  tensorAllocations: number;
  tensorDeallocations: number;
}

// ============================================================================
// Tensor Inspection
// ============================================================================

/**
 * Calculate tensor statistics
 */
function calculateTensorStats(data: Float32Array | number[]): TensorStats {
  const arr = data instanceof Float32Array ? data : new Float32Array(data);
  
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let zeros = 0;
  let nans = 0;
  let infinities = 0;
  
  for (let i = 0; i < arr.length; i++) {
    const val = arr[i] ?? 0;
    
    if (isNaN(val)) {
      nans++;
      continue;
    }
    
    if (!isFinite(val)) {
      infinities++;
      continue;
    }
    
    min = Math.min(min, val);
    max = Math.max(max, val);
    sum += val;
    
    if (val === 0) zeros++;
  }
  
  const validCount = arr.length - nans - infinities;
  const mean = validCount > 0 ? sum / validCount : 0;
  
  // Calculate std
  let varianceSum = 0;
  for (let i = 0; i < arr.length; i++) {
    const val = arr[i] ?? 0;
    if (!isNaN(val) && isFinite(val)) {
      varianceSum += Math.pow(val - mean, 2);
    }
  }
  const std = validCount > 0 ? Math.sqrt(varianceSum / validCount) : 0;
  
  return {
    min: min === Infinity ? 0 : min,
    max: max === -Infinity ? 0 : max,
    mean,
    std,
    zeros,
    nans,
    infinities,
    sparsity: zeros / arr.length,
  };
}

/**
 * Create histogram from data
 */
function createHistogram(data: Float32Array | number[], bins: number = 50): HistogramData {
  const arr = data instanceof Float32Array ? data : new Float32Array(data);
  
  // Find min/max (excluding NaN/Inf)
  let min = Infinity;
  let max = -Infinity;
  
  for (let i = 0; i < arr.length; i++) {
    const val = arr[i] ?? 0;
    if (!isNaN(val) && isFinite(val)) {
      min = Math.min(min, val);
      max = Math.max(max, val);
    }
  }
  
  if (min === Infinity || max === -Infinity || min === max) {
    return { bins: [min || 0], counts: [arr.length], binEdges: [min || 0, max || 0] };
  }
  
  const binWidth = (max - min) / bins;
  const counts = new Array(bins).fill(0);
  const binEdges = new Array(bins + 1);
  
  for (let i = 0; i <= bins; i++) {
    binEdges[i] = min + i * binWidth;
  }
  
  for (let i = 0; i < arr.length; i++) {
    const val = arr[i] ?? 0;
    if (!isNaN(val) && isFinite(val)) {
      const binIndex = Math.min(Math.floor((val - min) / binWidth), bins - 1);
      counts[binIndex]++;
    }
  }
  
  return {
    bins: binEdges.slice(0, -1).map((e, i) => (e + binEdges[i + 1]!) / 2),
    counts,
    binEdges,
  };
}

/**
 * Inspect a tensor
 */
export function inspectTensor(
  tensor: EdgeFlowTensor,
  name: string = 'tensor',
  options: { histogram?: boolean; maxSample?: number } = {}
): TensorInspection {
  const { histogram = true, maxSample = 10 } = options;
  
  const data = tensor.toFloat32Array();
  const shape = tensor.shape as number[];
  const size = tensor.size;
  
  // Get sample of values
  const sampleIndices = [];
  const step = Math.max(1, Math.floor(size / maxSample));
  for (let i = 0; i < size && sampleIndices.length < maxSample; i += step) {
    sampleIndices.push(i);
  }
  const sample = sampleIndices.map(i => data[i] ?? 0);
  
  // Calculate memory (assuming float32)
  const bytesPerElement = tensor.dtype === 'float32' ? 4 
    : tensor.dtype === 'int32' ? 4 
    : tensor.dtype === 'int64' ? 8 
    : 4;
  const memoryBytes = size * bytesPerElement;
  
  return {
    name,
    shape,
    dtype: tensor.dtype,
    size,
    memoryBytes,
    stats: calculateTensorStats(data),
    sample,
    histogram: histogram ? createHistogram(data) : undefined,
  };
}

/**
 * Format tensor inspection for display
 */
export function formatTensorInspection(inspection: TensorInspection): string {
  const { name, shape, dtype, size, memoryBytes, stats, sample } = inspection;
  
  const lines = [
    `┌─ Tensor: ${name} ─────────────────────────────`,
    `│ Shape: [${shape.join(', ')}]`,
    `│ Dtype: ${dtype}`,
    `│ Size: ${size.toLocaleString()} elements`,
    `│ Memory: ${formatBytes(memoryBytes)}`,
    `├─ Statistics ─────────────────────────────────`,
    `│ Min: ${stats.min.toFixed(6)}`,
    `│ Max: ${stats.max.toFixed(6)}`,
    `│ Mean: ${stats.mean.toFixed(6)}`,
    `│ Std: ${stats.std.toFixed(6)}`,
    `│ Sparsity: ${(stats.sparsity * 100).toFixed(2)}%`,
  ];
  
  if (stats.nans > 0) {
    lines.push(`│ ⚠️ NaN values: ${stats.nans}`);
  }
  if (stats.infinities > 0) {
    lines.push(`│ ⚠️ Infinity values: ${stats.infinities}`);
  }
  
  lines.push(`├─ Sample Values ──────────────────────────────`);
  lines.push(`│ [${sample.map(v => v.toFixed(4)).join(', ')}]`);
  lines.push(`└──────────────────────────────────────────────`);
  
  return lines.join('\n');
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ============================================================================
// Visual Debugger Class
// ============================================================================

/**
 * Visual debugger for edgeFlow.js
 */
export class EdgeFlowDebugger {
  private config: Required<DebuggerConfig>;
  private events: DebugEvent[] = [];
  private traces: InferenceTrace[] = [];
  private performanceMetrics: PerformanceMetrics;
  private listeners: Map<string, Array<(event: DebugEvent) => void>> = new Map();
  private isEnabled: boolean = true;
  
  constructor(config: DebuggerConfig = {}) {
    this.config = {
      logging: config.logging ?? true,
      logLevel: config.logLevel ?? 'info',
      inspectTensors: config.inspectTensors ?? true,
      maxDisplayValues: config.maxDisplayValues ?? 10,
      trackPerformance: config.trackPerformance ?? true,
      logger: config.logger ?? this.defaultLogger.bind(this),
    };
    
    this.performanceMetrics = {
      inferenceCount: 0,
      totalInferenceTime: 0,
      averageInferenceTime: 0,
      minInferenceTime: Infinity,
      maxInferenceTime: 0,
      peakMemoryUsage: 0,
      currentMemoryUsage: 0,
      tensorAllocations: 0,
      tensorDeallocations: 0,
    };
  }
  
  /**
   * Default logger
   */
  private defaultLogger(level: string, message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    const prefix = `[edgeFlow.js ${timestamp}] [${level.toUpperCase()}]`;
    
    switch (level) {
      case 'debug':
        console.debug(prefix, message, data ?? '');
        break;
      case 'info':
        console.info(prefix, message, data ?? '');
        break;
      case 'warn':
        console.warn(prefix, message, data ?? '');
        break;
      case 'error':
        console.error(prefix, message, data ?? '');
        break;
      default:
        console.log(prefix, message, data ?? '');
    }
  }
  
  /**
   * Log a message
   */
  log(level: string, message: string, data?: unknown): void {
    if (!this.isEnabled || !this.config.logging) return;
    
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = levels.indexOf(this.config.logLevel);
    const msgLevel = levels.indexOf(level);
    
    if (msgLevel >= configLevel) {
      this.config.logger(level, message, data);
    }
  }
  
  /**
   * Add debug event
   */
  private addEvent(event: DebugEvent): void {
    this.events.push(event);
    
    // Notify listeners
    const listeners = this.listeners.get(event.type) ?? [];
    for (const listener of listeners) {
      listener(event);
    }
    
    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }
  
  /**
   * Enable debugger
   */
  enable(): void {
    this.isEnabled = true;
    this.log('info', 'Debugger enabled');
  }
  
  /**
   * Disable debugger
   */
  disable(): void {
    this.isEnabled = false;
  }
  
  /**
   * Subscribe to events
   */
  on(type: string, callback: (event: DebugEvent) => void): () => void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(callback);
    this.listeners.set(type, listeners);
    
    return () => {
      const idx = listeners.indexOf(callback);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }
  
  /**
   * Inspect and log a tensor
   */
  inspectTensor(tensor: EdgeFlowTensor, name: string = 'tensor'): TensorInspection {
    const inspection = inspectTensor(tensor, name, {
      histogram: true,
      maxSample: this.config.maxDisplayValues,
    });
    
    if (this.config.inspectTensors) {
      this.log('debug', `Tensor: ${name}`, inspection);
      
      this.addEvent({
        type: 'tensor',
        timestamp: Date.now(),
        message: `Inspected tensor: ${name}`,
        data: inspection,
      });
      
      // Check for issues
      if (inspection.stats.nans > 0) {
        this.log('warn', `Tensor "${name}" contains ${inspection.stats.nans} NaN values`);
      }
      if (inspection.stats.infinities > 0) {
        this.log('warn', `Tensor "${name}" contains ${inspection.stats.infinities} Infinity values`);
      }
    }
    
    return inspection;
  }
  
  /**
   * Start tracing an inference
   */
  startTrace(modelId: string): string {
    const id = `trace_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    const trace: InferenceTrace = {
      id,
      modelId,
      timestamp: Date.now(),
      inputs: [],
      outputs: [],
      duration: 0,
      memoryUsed: 0,
      operations: [],
    };
    
    this.traces.push(trace);
    
    this.log('debug', `Started trace: ${id} for model: ${modelId}`);
    
    return id;
  }
  
  /**
   * Add input to trace
   */
  traceInput(traceId: string, tensor: EdgeFlowTensor, name: string): void {
    const trace = this.traces.find(t => t.id === traceId);
    if (!trace) return;
    
    trace.inputs.push(inspectTensor(tensor, name));
  }
  
  /**
   * Add output to trace
   */
  traceOutput(traceId: string, tensor: EdgeFlowTensor, name: string): void {
    const trace = this.traces.find(t => t.id === traceId);
    if (!trace) return;
    
    trace.outputs.push(inspectTensor(tensor, name));
  }
  
  /**
   * Add operation to trace
   */
  traceOperation(traceId: string, operation: OperationTrace): void {
    const trace = this.traces.find(t => t.id === traceId);
    if (!trace) return;
    
    trace.operations.push(operation);
  }
  
  /**
   * End trace
   */
  endTrace(traceId: string): InferenceTrace | undefined {
    const trace = this.traces.find(t => t.id === traceId);
    if (!trace) return;
    
    trace.duration = Date.now() - trace.timestamp;
    
    // Update performance metrics
    this.performanceMetrics.inferenceCount++;
    this.performanceMetrics.totalInferenceTime += trace.duration;
    this.performanceMetrics.averageInferenceTime = 
      this.performanceMetrics.totalInferenceTime / this.performanceMetrics.inferenceCount;
    this.performanceMetrics.minInferenceTime = 
      Math.min(this.performanceMetrics.minInferenceTime, trace.duration);
    this.performanceMetrics.maxInferenceTime = 
      Math.max(this.performanceMetrics.maxInferenceTime, trace.duration);
    
    this.log('info', `Trace completed: ${traceId}`, {
      duration: `${trace.duration}ms`,
      inputs: trace.inputs.length,
      outputs: trace.outputs.length,
      operations: trace.operations.length,
    });
    
    this.addEvent({
      type: 'inference',
      timestamp: Date.now(),
      message: `Inference completed in ${trace.duration}ms`,
      data: trace,
    });
    
    return trace;
  }
  
  /**
   * Record tensor allocation
   */
  recordAllocation(tensor: EdgeFlowTensor): void {
    if (!this.config.trackPerformance) return;
    
    this.performanceMetrics.tensorAllocations++;
    const memory = tensor.size * 4; // Assume float32
    this.performanceMetrics.currentMemoryUsage += memory;
    this.performanceMetrics.peakMemoryUsage = Math.max(
      this.performanceMetrics.peakMemoryUsage,
      this.performanceMetrics.currentMemoryUsage
    );
  }
  
  /**
   * Record tensor deallocation
   */
  recordDeallocation(tensor: EdgeFlowTensor): void {
    if (!this.config.trackPerformance) return;
    
    this.performanceMetrics.tensorDeallocations++;
    const memory = tensor.size * 4;
    this.performanceMetrics.currentMemoryUsage -= memory;
  }
  
  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }
  
  /**
   * Get all events
   */
  getEvents(): DebugEvent[] {
    return [...this.events];
  }
  
  /**
   * Get all traces
   */
  getTraces(): InferenceTrace[] {
    return [...this.traces];
  }
  
  /**
   * Get trace by ID
   */
  getTrace(traceId: string): InferenceTrace | undefined {
    return this.traces.find(t => t.id === traceId);
  }
  
  /**
   * Clear all data
   */
  clear(): void {
    this.events = [];
    this.traces = [];
    this.performanceMetrics = {
      inferenceCount: 0,
      totalInferenceTime: 0,
      averageInferenceTime: 0,
      minInferenceTime: Infinity,
      maxInferenceTime: 0,
      peakMemoryUsage: 0,
      currentMemoryUsage: 0,
      tensorAllocations: 0,
      tensorDeallocations: 0,
    };
  }
  
  /**
   * Export debug data
   */
  export(): {
    events: DebugEvent[];
    traces: InferenceTrace[];
    metrics: PerformanceMetrics;
    timestamp: number;
  } {
    return {
      events: this.getEvents(),
      traces: this.getTraces(),
      metrics: this.getPerformanceMetrics(),
      timestamp: Date.now(),
    };
  }
  
  /**
   * Generate summary report
   */
  generateReport(): string {
    const metrics = this.getPerformanceMetrics();
    const traces = this.getTraces();
    
    const lines = [
      '╔══════════════════════════════════════════════════════════════════╗',
      '║               edgeFlow.js Debug Report                          ║',
      '╠══════════════════════════════════════════════════════════════════╣',
      '║ Performance Metrics                                             ║',
      '╟──────────────────────────────────────────────────────────────────╢',
      `║ Total Inferences:     ${metrics.inferenceCount.toString().padStart(10)}                          ║`,
      `║ Average Time:         ${metrics.averageInferenceTime.toFixed(2).padStart(10)}ms                       ║`,
      `║ Min Time:             ${(metrics.minInferenceTime === Infinity ? 0 : metrics.minInferenceTime).toFixed(2).padStart(10)}ms                       ║`,
      `║ Max Time:             ${metrics.maxInferenceTime.toFixed(2).padStart(10)}ms                       ║`,
      `║ Peak Memory:          ${formatBytes(metrics.peakMemoryUsage).padStart(10)}                          ║`,
      `║ Current Memory:       ${formatBytes(metrics.currentMemoryUsage).padStart(10)}                          ║`,
      `║ Tensor Allocations:   ${metrics.tensorAllocations.toString().padStart(10)}                          ║`,
      `║ Tensor Deallocations: ${metrics.tensorDeallocations.toString().padStart(10)}                          ║`,
      '╟──────────────────────────────────────────────────────────────────╢',
      '║ Recent Traces                                                   ║',
      '╟──────────────────────────────────────────────────────────────────╢',
    ];
    
    const recentTraces = traces.slice(-5);
    for (const trace of recentTraces) {
      lines.push(`║ ${trace.id.slice(0, 20).padEnd(20)} | ${trace.duration.toFixed(2).padStart(8)}ms | ${trace.modelId.slice(0, 20).padEnd(20)} ║`);
    }
    
    if (recentTraces.length === 0) {
      lines.push('║ No traces recorded                                              ║');
    }
    
    lines.push('╚══════════════════════════════════════════════════════════════════╝');
    
    return lines.join('\n');
  }
}

// ============================================================================
// Global Debugger Instance
// ============================================================================

let globalDebugger: EdgeFlowDebugger | null = null;

/**
 * Get or create the global debugger instance
 */
export function getDebugger(config?: DebuggerConfig): EdgeFlowDebugger {
  if (!globalDebugger || config) {
    globalDebugger = new EdgeFlowDebugger(config);
  }
  return globalDebugger;
}

/**
 * Enable debugging
 */
export function enableDebugging(config?: DebuggerConfig): EdgeFlowDebugger {
  const debugger_ = getDebugger(config);
  debugger_.enable();
  return debugger_;
}

/**
 * Disable debugging
 */
export function disableDebugging(): void {
  globalDebugger?.disable();
}

// ============================================================================
// Visualization Helpers
// ============================================================================

/**
 * Create ASCII histogram
 */
export function createAsciiHistogram(histogram: HistogramData, width: number = 50, height: number = 10): string {
  const { counts, binEdges } = histogram;
  const maxCount = Math.max(...counts);
  
  if (maxCount === 0) return 'No data to display';
  
  const lines: string[] = [];
  
  // Scale counts to height
  const scaled = counts.map(c => Math.round((c / maxCount) * height));
  
  // Create rows
  for (let row = height; row > 0; row--) {
    let line = row === height ? `${maxCount.toString().padStart(6)} │` : '       │';
    
    for (let col = 0; col < width && col < scaled.length; col++) {
      line += (scaled[col] ?? 0) >= row ? '█' : ' ';
    }
    
    lines.push(line);
  }
  
  // X axis
  lines.push('       └' + '─'.repeat(Math.min(width, scaled.length)));
  
  // Labels
  const minLabel = (binEdges[0] ?? 0).toFixed(2);
  const maxLabel = (binEdges[binEdges.length - 1] ?? 0).toFixed(2);
  lines.push(`        ${minLabel}${' '.repeat(Math.max(0, Math.min(width, scaled.length) - minLabel.length - maxLabel.length))}${maxLabel}`);
  
  return lines.join('\n');
}

/**
 * Create tensor heatmap (for 2D tensors)
 */
export function createTensorHeatmap(tensor: EdgeFlowTensor, width: number = 40): string {
  const shape = tensor.shape as number[];
  
  if (shape.length !== 2) {
    return 'Heatmap only supports 2D tensors';
  }
  
  const [rows, cols] = shape;
  if (rows === undefined || cols === undefined) {
    return 'Invalid tensor shape';
  }
  
  const data = tensor.toFloat32Array();
  
  // Find min/max
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < data.length; i++) {
    const val = data[i] ?? 0;
    if (!isNaN(val) && isFinite(val)) {
      min = Math.min(min, val);
      max = Math.max(max, val);
    }
  }
  
  const range = max - min;
  const chars = [' ', '░', '▒', '▓', '█'];
  
  const lines: string[] = [];
  const scaleX = Math.max(1, Math.ceil(cols / width));
  const displayCols = Math.min(cols, width);
  
  for (let r = 0; r < rows; r++) {
    let line = '';
    for (let c = 0; c < displayCols; c++) {
      const idx = r * cols + c * scaleX;
      const val = data[idx] ?? 0;
      const normalized = range > 0 ? (val - min) / range : 0;
      const charIdx = Math.floor(normalized * (chars.length - 1));
      line += chars[charIdx];
    }
    lines.push(line);
  }
  
  return lines.join('\n');
}

/**
 * Create model architecture visualization
 */
export function visualizeModelArchitecture(
  layers: Array<{ name: string; type: string; inputShape: number[]; outputShape: number[] }>
): string {
  const lines: string[] = [];
  
  lines.push('┌─────────────────────────────────────────────────────────────────────┐');
  lines.push('│                        Model Architecture                          │');
  lines.push('├─────────────────────────────────────────────────────────────────────┤');
  
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i]!;
    const inputStr = `[${layer.inputShape.join('×')}]`;
    const outputStr = `[${layer.outputShape.join('×')}]`;
    
    lines.push(`│ ${(i + 1).toString().padStart(2)}. ${layer.name.padEnd(20)} │ ${layer.type.padEnd(15)} │`);
    lines.push(`│     ${inputStr.padEnd(15)} → ${outputStr.padEnd(15)}                   │`);
    
    if (i < layers.length - 1) {
      lines.push('│                           ↓                                        │');
    }
  }
  
  lines.push('└─────────────────────────────────────────────────────────────────────┘');
  
  return lines.join('\n');
}

// ============================================================================
// Exports
// ============================================================================

export default {
  EdgeFlowDebugger,
  getDebugger,
  enableDebugging,
  disableDebugging,
  inspectTensor,
  formatTensorInspection,
  createAsciiHistogram,
  createTensorHeatmap,
  visualizeModelArchitecture,
};
