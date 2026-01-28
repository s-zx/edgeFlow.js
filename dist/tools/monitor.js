/**
 * edgeFlow.js - Performance Monitoring Dashboard
 *
 * Real-time performance monitoring and metrics visualization.
 */
// ============================================================================
// Performance Monitor
// ============================================================================
/**
 * Performance monitor for edgeFlow.js
 */
export class PerformanceMonitor {
    config;
    samples = [];
    isRunning = false;
    intervalId = null;
    alerts = [];
    alertListeners = [];
    sampleListeners = [];
    // Inference tracking
    inferenceCount = 0;
    inferenceTimes = [];
    queueLength = 0;
    activeCount = 0;
    // FPS tracking
    frameCount = 0;
    lastFrameTime = 0;
    fps = 0;
    rafId = null;
    // Memory tracking
    tensorMemory = 0;
    cacheMemory = 0;
    constructor(config = {}) {
        this.config = {
            enabled: config.enabled ?? true,
            sampleInterval: config.sampleInterval ?? 1000,
            historySize: config.historySize ?? 60,
            monitorMemory: config.monitorMemory ?? true,
            monitorFPS: config.monitorFPS ?? true,
            collectors: config.collectors ?? [],
        };
    }
    /**
     * Start monitoring
     */
    start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        // Start sampling
        this.intervalId = setInterval(() => {
            this.collectSample();
        }, this.config.sampleInterval);
        // Start FPS monitoring
        if (this.config.monitorFPS && typeof requestAnimationFrame !== 'undefined') {
            this.lastFrameTime = performance.now();
            this.frameCount = 0;
            this.monitorFPS();
        }
    }
    /**
     * Stop monitoring
     */
    stop() {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }
    /**
     * Monitor FPS
     */
    monitorFPS() {
        if (!this.isRunning)
            return;
        this.frameCount++;
        const now = performance.now();
        const elapsed = now - this.lastFrameTime;
        if (elapsed >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / elapsed);
            this.frameCount = 0;
            this.lastFrameTime = now;
        }
        this.rafId = requestAnimationFrame(() => this.monitorFPS());
    }
    /**
     * Collect a performance sample
     */
    collectSample() {
        const now = Date.now();
        // Calculate inference metrics
        const avgTime = this.inferenceTimes.length > 0
            ? this.inferenceTimes.reduce((a, b) => a + b, 0) / this.inferenceTimes.length
            : 0;
        const minTime = this.inferenceTimes.length > 0
            ? Math.min(...this.inferenceTimes)
            : 0;
        const maxTime = this.inferenceTimes.length > 0
            ? Math.max(...this.inferenceTimes)
            : 0;
        const throughput = this.inferenceCount / (this.config.sampleInterval / 1000);
        const inference = {
            count: this.inferenceCount,
            avgTime,
            minTime,
            maxTime,
            throughput,
            queueLength: this.queueLength,
            activeCount: this.activeCount,
        };
        // Collect memory metrics
        const memory = this.collectMemoryMetrics();
        // Collect system metrics
        const system = this.collectSystemMetrics();
        // Collect custom metrics
        const custom = {};
        for (const collector of this.config.collectors) {
            try {
                Object.assign(custom, collector());
            }
            catch {
                // Ignore collector errors
            }
        }
        const sample = {
            timestamp: now,
            inference,
            memory,
            system,
            custom,
        };
        // Add to history
        this.samples.push(sample);
        if (this.samples.length > this.config.historySize) {
            this.samples.shift();
        }
        // Check alerts
        this.checkAlerts(sample);
        // Notify listeners
        for (const listener of this.sampleListeners) {
            listener(sample);
        }
        // Reset counters
        this.inferenceCount = 0;
        this.inferenceTimes = [];
    }
    /**
     * Collect memory metrics
     */
    collectMemoryMetrics() {
        let usedHeap = 0;
        let totalHeap = 0;
        let heapLimit = 0;
        if (typeof performance !== 'undefined' && 'memory' in performance) {
            const memory = performance.memory;
            usedHeap = memory.usedJSHeapSize;
            totalHeap = memory.totalJSHeapSize;
            heapLimit = memory.jsHeapSizeLimit;
        }
        return {
            usedHeap,
            totalHeap,
            heapLimit,
            heapUsage: heapLimit > 0 ? usedHeap / heapLimit : 0,
            tensorMemory: this.tensorMemory,
            cacheMemory: this.cacheMemory,
        };
    }
    /**
     * Collect system metrics
     */
    collectSystemMetrics() {
        const lastSample = this.samples[this.samples.length - 1];
        const deltaTime = lastSample
            ? Date.now() - lastSample.timestamp
            : this.config.sampleInterval;
        // Check WebGPU availability
        let webgpuAvailable = false;
        if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
            webgpuAvailable = true;
        }
        // Check WebNN availability
        let webnnAvailable = false;
        if (typeof navigator !== 'undefined' && 'ml' in navigator) {
            webnnAvailable = true;
        }
        return {
            fps: this.fps,
            cpuUsage: this.estimateCPUUsage(),
            deltaTime,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
            webgpuAvailable,
            webnnAvailable,
        };
    }
    /**
     * Estimate CPU usage based on inference times
     */
    estimateCPUUsage() {
        if (this.inferenceTimes.length === 0)
            return 0;
        const totalTime = this.inferenceTimes.reduce((a, b) => a + b, 0);
        return Math.min(1, totalTime / this.config.sampleInterval);
    }
    /**
     * Check alerts
     */
    checkAlerts(sample) {
        for (const alert of this.alerts) {
            const value = this.getMetricValue(sample, alert.metric);
            if (value === undefined)
                continue;
            let triggered = false;
            switch (alert.operator) {
                case '>':
                    triggered = value > alert.threshold;
                    break;
                case '<':
                    triggered = value < alert.threshold;
                    break;
                case '>=':
                    triggered = value >= alert.threshold;
                    break;
                case '<=':
                    triggered = value <= alert.threshold;
                    break;
                case '==':
                    triggered = value === alert.threshold;
                    break;
                case '!=':
                    triggered = value !== alert.threshold;
                    break;
            }
            if (triggered) {
                const event = {
                    config: alert,
                    value,
                    timestamp: sample.timestamp,
                };
                for (const listener of this.alertListeners) {
                    listener(event);
                }
            }
        }
    }
    /**
     * Get metric value from sample
     */
    getMetricValue(sample, metric) {
        const parts = metric.split('.');
        let value = sample;
        for (const part of parts) {
            if (value && typeof value === 'object' && part in value) {
                value = value[part];
            }
            else {
                return undefined;
            }
        }
        return typeof value === 'number' ? value : undefined;
    }
    /**
     * Record an inference
     */
    recordInference(duration) {
        this.inferenceCount++;
        this.inferenceTimes.push(duration);
    }
    /**
     * Update queue length
     */
    updateQueueLength(length) {
        this.queueLength = length;
    }
    /**
     * Update active count
     */
    updateActiveCount(count) {
        this.activeCount = count;
    }
    /**
     * Update tensor memory
     */
    updateTensorMemory(bytes) {
        this.tensorMemory = bytes;
    }
    /**
     * Update cache memory
     */
    updateCacheMemory(bytes) {
        this.cacheMemory = bytes;
    }
    /**
     * Add an alert
     */
    addAlert(config) {
        this.alerts.push(config);
    }
    /**
     * Remove an alert
     */
    removeAlert(metric) {
        this.alerts = this.alerts.filter(a => a.metric !== metric);
    }
    /**
     * Subscribe to alerts
     */
    onAlert(callback) {
        this.alertListeners.push(callback);
        return () => {
            const idx = this.alertListeners.indexOf(callback);
            if (idx !== -1)
                this.alertListeners.splice(idx, 1);
        };
    }
    /**
     * Subscribe to samples
     */
    onSample(callback) {
        this.sampleListeners.push(callback);
        return () => {
            const idx = this.sampleListeners.indexOf(callback);
            if (idx !== -1)
                this.sampleListeners.splice(idx, 1);
        };
    }
    /**
     * Get current sample
     */
    getCurrentSample() {
        return this.samples[this.samples.length - 1];
    }
    /**
     * Get all samples
     */
    getSamples() {
        return [...this.samples];
    }
    /**
     * Get samples in time range
     */
    getSamplesInRange(startTime, endTime) {
        return this.samples.filter(s => s.timestamp >= startTime && s.timestamp <= endTime);
    }
    /**
     * Get summary statistics
     */
    getSummary() {
        if (this.samples.length === 0) {
            return {
                avgInferenceTime: 0,
                avgThroughput: 0,
                avgMemoryUsage: 0,
                avgFPS: 0,
                totalInferences: 0,
                uptime: 0,
            };
        }
        const avgInferenceTime = this.samples.reduce((sum, s) => sum + s.inference.avgTime, 0) / this.samples.length;
        const avgThroughput = this.samples.reduce((sum, s) => sum + s.inference.throughput, 0) / this.samples.length;
        const avgMemoryUsage = this.samples.reduce((sum, s) => sum + s.memory.heapUsage, 0) / this.samples.length;
        const avgFPS = this.samples.reduce((sum, s) => sum + s.system.fps, 0) / this.samples.length;
        const totalInferences = this.samples.reduce((sum, s) => sum + s.inference.count, 0);
        const firstSample = this.samples[0];
        const lastSample = this.samples[this.samples.length - 1];
        const uptime = lastSample.timestamp - firstSample.timestamp;
        return {
            avgInferenceTime,
            avgThroughput,
            avgMemoryUsage,
            avgFPS,
            totalInferences,
            uptime,
        };
    }
    /**
     * Clear all data
     */
    clear() {
        this.samples = [];
        this.inferenceCount = 0;
        this.inferenceTimes = [];
        this.queueLength = 0;
        this.activeCount = 0;
        this.tensorMemory = 0;
        this.cacheMemory = 0;
    }
    /**
     * Export data
     */
    export() {
        return {
            samples: this.getSamples(),
            summary: this.getSummary(),
            config: this.config,
            timestamp: Date.now(),
        };
    }
}
// ============================================================================
// Dashboard Generator
// ============================================================================
/**
 * Generate HTML dashboard
 */
export function generateDashboardHTML(monitor) {
    const summary = monitor.getSummary();
    const samples = monitor.getSamples();
    const lastSample = samples[samples.length - 1];
    const formatBytes = (bytes) => {
        if (bytes < 1024)
            return `${bytes} B`;
        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024)
            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    };
    const formatDuration = (ms) => {
        if (ms < 1000)
            return `${ms.toFixed(0)}ms`;
        if (ms < 60000)
            return `${(ms / 1000).toFixed(1)}s`;
        return `${(ms / 60000).toFixed(1)}m`;
    };
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>edgeFlow.js Performance Dashboard</title>
  <style>
    :root {
      --bg-primary: #0d1117;
      --bg-secondary: #161b22;
      --bg-tertiary: #21262d;
      --text-primary: #f0f6fc;
      --text-secondary: #8b949e;
      --accent: #58a6ff;
      --success: #3fb950;
      --warning: #d29922;
      --error: #f85149;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
    }
    
    .dashboard {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
    }
    
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--bg-tertiary);
    }
    
    h1 {
      font-size: 24px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: var(--text-secondary);
    }
    
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--success);
    }
    
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }
    
    .card {
      background: var(--bg-secondary);
      border: 1px solid var(--bg-tertiary);
      border-radius: 12px;
      padding: 20px;
    }
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    
    .card-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .card-value {
      font-size: 36px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    
    .card-value.small {
      font-size: 24px;
    }
    
    .card-unit {
      font-size: 14px;
      color: var(--text-secondary);
      margin-left: 4px;
    }
    
    .card-change {
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 4px;
    }
    
    .card-change.up {
      background: rgba(63, 185, 80, 0.2);
      color: var(--success);
    }
    
    .card-change.down {
      background: rgba(248, 81, 73, 0.2);
      color: var(--error);
    }
    
    .progress-bar {
      height: 8px;
      background: var(--bg-tertiary);
      border-radius: 4px;
      overflow: hidden;
      margin-top: 12px;
    }
    
    .progress-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    
    .progress-fill.blue { background: var(--accent); }
    .progress-fill.green { background: var(--success); }
    .progress-fill.yellow { background: var(--warning); }
    .progress-fill.red { background: var(--error); }
    
    .chart-container {
      background: var(--bg-secondary);
      border: 1px solid var(--bg-tertiary);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }
    
    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    
    .chart-title {
      font-size: 16px;
      font-weight: 600;
    }
    
    .chart {
      height: 200px;
      position: relative;
    }
    
    .chart-line {
      stroke: var(--accent);
      stroke-width: 2;
      fill: none;
    }
    
    .chart-area {
      fill: url(#chartGradient);
      opacity: 0.3;
    }
    
    .chart-grid {
      stroke: var(--bg-tertiary);
      stroke-width: 1;
    }
    
    .table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .table th,
    .table td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid var(--bg-tertiary);
    }
    
    .table th {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .table td {
      font-variant-numeric: tabular-nums;
    }
    
    footer {
      text-align: center;
      padding: 24px;
      color: var(--text-secondary);
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="dashboard">
    <header>
      <h1>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="var(--accent)"/>
          <path d="M8 16L14 10L20 16L26 10" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M8 22L14 16L20 22L26 16" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>
        </svg>
        edgeFlow.js Performance Dashboard
      </h1>
      <div class="status">
        <div class="status-dot"></div>
        Running for ${formatDuration(summary.uptime)}
      </div>
    </header>
    
    <div class="grid">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Total Inferences</span>
        </div>
        <div class="card-value">${summary.totalInferences.toLocaleString()}</div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <span class="card-title">Avg Inference Time</span>
        </div>
        <div class="card-value">${summary.avgInferenceTime.toFixed(1)}<span class="card-unit">ms</span></div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <span class="card-title">Throughput</span>
        </div>
        <div class="card-value">${summary.avgThroughput.toFixed(1)}<span class="card-unit">ops/s</span></div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <span class="card-title">Avg FPS</span>
        </div>
        <div class="card-value">${Math.round(summary.avgFPS)}</div>
      </div>
    </div>
    
    <div class="grid">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Memory Usage</span>
        </div>
        <div class="card-value small">${formatBytes(lastSample?.memory.usedHeap ?? 0)}</div>
        <div class="progress-bar">
          <div class="progress-fill ${summary.avgMemoryUsage > 0.8 ? 'red' : summary.avgMemoryUsage > 0.6 ? 'yellow' : 'green'}" 
               style="width: ${(summary.avgMemoryUsage * 100).toFixed(0)}%"></div>
        </div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <span class="card-title">Tensor Memory</span>
        </div>
        <div class="card-value small">${formatBytes(lastSample?.memory.tensorMemory ?? 0)}</div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <span class="card-title">Cache Memory</span>
        </div>
        <div class="card-value small">${formatBytes(lastSample?.memory.cacheMemory ?? 0)}</div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <span class="card-title">Queue Length</span>
        </div>
        <div class="card-value small">${lastSample?.inference.queueLength ?? 0}</div>
      </div>
    </div>
    
    <div class="chart-container">
      <div class="chart-header">
        <span class="chart-title">Inference Time History</span>
      </div>
      <div class="chart">
        <svg width="100%" height="100%" viewBox="0 0 600 200" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.5"/>
              <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
            </linearGradient>
          </defs>
          ${generateChartPath(samples)}
        </svg>
      </div>
    </div>
    
    <div class="chart-container">
      <div class="chart-header">
        <span class="chart-title">Recent Samples</span>
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Inferences</th>
            <th>Avg Time</th>
            <th>Throughput</th>
            <th>Memory</th>
            <th>FPS</th>
          </tr>
        </thead>
        <tbody>
          ${samples.slice(-10).reverse().map(s => `
            <tr>
              <td>${new Date(s.timestamp).toLocaleTimeString()}</td>
              <td>${s.inference.count}</td>
              <td>${s.inference.avgTime.toFixed(2)}ms</td>
              <td>${s.inference.throughput.toFixed(1)}/s</td>
              <td>${formatBytes(s.memory.usedHeap)}</td>
              <td>${s.system.fps}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <footer>
      Generated at ${new Date().toLocaleString()} | edgeFlow.js Performance Monitor
    </footer>
  </div>
</body>
</html>
  `.trim();
}
/**
 * Generate SVG chart path
 */
function generateChartPath(samples) {
    if (samples.length < 2)
        return '';
    const width = 600;
    const height = 180;
    const padding = 10;
    const times = samples.map(s => s.inference.avgTime);
    const maxTime = Math.max(...times, 1);
    const points = samples.map((s, i) => {
        const x = padding + (i / (samples.length - 1)) * (width - 2 * padding);
        const y = height - padding - (s.inference.avgTime / maxTime) * (height - 2 * padding);
        return `${x},${y}`;
    });
    const linePath = `M ${points.join(' L ')}`;
    const areaPath = `M ${padding},${height - padding} L ${points.join(' L ')} L ${width - padding},${height - padding} Z`;
    // Grid lines
    const gridLines = [];
    for (let i = 0; i <= 4; i++) {
        const y = padding + (i / 4) * (height - 2 * padding);
        gridLines.push(`<line class="chart-grid" x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}"/>`);
    }
    return `
    ${gridLines.join('\n')}
    <path class="chart-area" d="${areaPath}"/>
    <path class="chart-line" d="${linePath}"/>
  `;
}
/**
 * Generate ASCII dashboard
 */
export function generateAsciiDashboard(monitor) {
    const summary = monitor.getSummary();
    const samples = monitor.getSamples();
    const lastSample = samples[samples.length - 1];
    const formatBytes = (bytes) => {
        if (bytes < 1024)
            return `${bytes} B`;
        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024)
            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    };
    const bar = (value, max, width = 20) => {
        const filled = Math.round((value / max) * width);
        return '█'.repeat(filled) + '░'.repeat(width - filled);
    };
    const lines = [
        '╔══════════════════════════════════════════════════════════════════════════╗',
        '║             edgeFlow.js Performance Monitor Dashboard                   ║',
        '╠══════════════════════════════════════════════════════════════════════════╣',
        '║                                                                          ║',
        `║  Total Inferences:  ${summary.totalInferences.toString().padStart(10)}                                      ║`,
        `║  Avg Inference:     ${summary.avgInferenceTime.toFixed(2).padStart(10)}ms                                     ║`,
        `║  Throughput:        ${summary.avgThroughput.toFixed(2).padStart(10)} ops/s                                 ║`,
        `║  Avg FPS:           ${Math.round(summary.avgFPS).toString().padStart(10)}                                      ║`,
        '║                                                                          ║',
        '╟──────────────────────────────────────────────────────────────────────────╢',
        '║ Memory Usage                                                             ║',
        `║  Heap:    ${bar(summary.avgMemoryUsage, 1)} ${(summary.avgMemoryUsage * 100).toFixed(0).padStart(3)}%            ║`,
        `║  Used:    ${formatBytes(lastSample?.memory.usedHeap ?? 0).padStart(10)}                                          ║`,
        `║  Tensor:  ${formatBytes(lastSample?.memory.tensorMemory ?? 0).padStart(10)}                                          ║`,
        `║  Cache:   ${formatBytes(lastSample?.memory.cacheMemory ?? 0).padStart(10)}                                          ║`,
        '║                                                                          ║',
        '╟──────────────────────────────────────────────────────────────────────────╢',
        '║ Inference Time History (last 30 samples)                                 ║',
        '║                                                                          ║',
    ];
    // Add mini chart
    const recentSamples = samples.slice(-30);
    if (recentSamples.length > 0) {
        const times = recentSamples.map(s => s.inference.avgTime);
        const maxTime = Math.max(...times, 1);
        const chartHeight = 5;
        for (let row = chartHeight; row > 0; row--) {
            let line = '║  ';
            for (const time of times) {
                const height = Math.ceil((time / maxTime) * chartHeight);
                line += height >= row ? '▓' : ' ';
            }
            lines.push(line.padEnd(76) + '║');
        }
        lines.push('║  ' + '─'.repeat(30) + '                                            ║');
    }
    lines.push('║                                                                          ║');
    lines.push(`║  Last updated: ${new Date().toLocaleString().padEnd(40)}             ║`);
    lines.push('╚══════════════════════════════════════════════════════════════════════════╝');
    return lines.join('\n');
}
// ============================================================================
// Global Instance
// ============================================================================
let globalMonitor = null;
/**
 * Get or create global monitor
 */
export function getMonitor(config) {
    if (!globalMonitor || config) {
        globalMonitor = new PerformanceMonitor(config);
    }
    return globalMonitor;
}
/**
 * Start monitoring
 */
export function startMonitoring(config) {
    const monitor = getMonitor(config);
    monitor.start();
    return monitor;
}
/**
 * Stop monitoring
 */
export function stopMonitoring() {
    globalMonitor?.stop();
}
// ============================================================================
// Exports
// ============================================================================
export default {
    PerformanceMonitor,
    getMonitor,
    startMonitoring,
    stopMonitoring,
    generateDashboardHTML,
    generateAsciiDashboard,
};
//# sourceMappingURL=monitor.js.map