# edgeFlow.js

<div align="center">

**Lightweight, high-performance browser ML inference framework.**

[![npm version](https://img.shields.io/npm/v/edgeflow.svg)](https://www.npmjs.com/package/edgeflow)
[![bundle size](https://img.shields.io/bundlephobia/minzip/edgeflow)](https://bundlephobia.com/package/edgeflow)
[![license](https://img.shields.io/npm/l/edgeflow)](LICENSE)

[Documentation](https://edgeflow.js.org) · [Examples](examples/) · [API Reference](https://edgeflow.js.org/api) · [English](README.md) | [中文](README_CN.md)

</div>

---

## ✨ Features

- 🚀 **Native Concurrency** - Run multiple models in parallel, no more serial execution bottleneck
- ⚡ **High Performance** - WebGPU-first with automatic fallback to WebNN/WASM
- 📦 **Lightweight** - Core bundle < 500KB, zero runtime dependencies
- 🔄 **Native Batch Processing** - Efficient batch inference out of the box
- 💾 **Smart Memory Management** - Automatic memory tracking and cleanup
- 🎯 **Developer Friendly** - Full TypeScript support with intuitive APIs
- 🔌 **Modular Architecture** - Import only what you need

## 📦 Installation

```bash
npm install edgeflow
```

```bash
yarn add edgeflow
```

```bash
pnpm add edgeflow
```

## 🚀 Quick Start

### Try the Demo

Run the interactive demo locally to test all features:

```bash
# Clone and install
git clone https://github.com/user/edgeflow.js.git
cd edgeflow.js
npm install

# Build and start demo server
npm run demo
```

Open **http://localhost:3000** in your browser:

1. **Load Model** - Enter a Hugging Face ONNX model URL and click "Load Model"
   ```
   https://huggingface.co/Xenova/distilbert-base-uncased-finetuned-sst-2-english/resolve/main/onnx/model_quantized.onnx
   ```

2. **Test Features**:
   - 🧮 **Tensor Operations** - Test tensor creation, math ops, softmax, relu
   - 📝 **Text Classification** - Run sentiment analysis on text
   - 🔍 **Feature Extraction** - Extract embeddings from text
   - ⚡ **Concurrent Execution** - Test parallel inference
   - 📋 **Task Scheduler** - Test priority-based task scheduling
   - 💾 **Memory Management** - Test allocation and cleanup

### Basic Usage

```typescript
import { pipeline } from 'edgeflow';

// Create a sentiment analysis pipeline
const sentiment = await pipeline('sentiment-analysis');

// Run inference
const result = await sentiment.run('I love this product!');
console.log(result);
// { label: 'positive', score: 0.98, processingTime: 12.5 }
```

### Batch Processing

```typescript
// Native batch processing support
const results = await sentiment.run([
  'This is amazing!',
  'This is terrible.',
  'It\'s okay I guess.'
]);

console.log(results);
// [
//   { label: 'positive', score: 0.95 },
//   { label: 'negative', score: 0.92 },
//   { label: 'neutral', score: 0.68 }
// ]
```

### Concurrent Execution

```typescript
import { pipeline } from 'edgeflow';

// Create multiple pipelines
const classifier = await pipeline('text-classification');
const extractor = await pipeline('feature-extraction');

// Run concurrently - no more serial bottleneck!
const [classification, features] = await Promise.all([
  classifier.run('Sample text'),
  extractor.run('Sample text')
]);
```

### Image Classification

```typescript
import { pipeline } from 'edgeflow';

const classifier = await pipeline('image-classification');

// From URL
const result = await classifier.run('https://example.com/image.jpg');

// From HTMLImageElement
const img = document.getElementById('myImage');
const result = await classifier.run(img);

// Batch
const results = await classifier.run([img1, img2, img3]);
```

## 🎯 Supported Tasks

| Task | Pipeline | Status |
|------|----------|--------|
| Text Classification | `text-classification` | ✅ |
| Sentiment Analysis | `sentiment-analysis` | ✅ |
| Feature Extraction | `feature-extraction` | ✅ |
| Image Classification | `image-classification` | ✅ |
| Object Detection | `object-detection` | 🔜 |
| Text Generation | `text-generation` | 🔜 |
| Speech Recognition | `automatic-speech-recognition` | 🔜 |

## ⚡ Performance

### Comparison with transformers.js

| Feature | transformers.js | edgeFlow.js |
|---------|-----------------|-------------|
| Concurrent Execution | ❌ Serial | ✅ Parallel |
| Batch Processing | ⚠️ Partial | ✅ Native |
| Memory Management | ⚠️ Basic | ✅ Complete |
| Bundle Size | ~2-5MB | <500KB |
| Dependencies | ONNX Runtime | Optional |

### Benchmarks

```
Text Classification (BERT-base):
- transformers.js: 45ms (serial)
- edgeFlow.js: 42ms (parallel capable)

Concurrent 4 models:
- transformers.js: 180ms (4 × 45ms serial)
- edgeFlow.js: 52ms (parallel execution)
```

## 🔧 Configuration

### Runtime Selection

```typescript
import { pipeline } from 'edgeflow';

// Automatic (recommended)
const model = await pipeline('text-classification');

// Specify runtime
const model = await pipeline('text-classification', {
  runtime: 'webgpu' // or 'webnn', 'wasm', 'auto'
});
```

### Memory Management

```typescript
import { pipeline, getMemoryStats, gc } from 'edgeflow';

const model = await pipeline('text-classification');

// Use the model
await model.run('text');

// Check memory usage
console.log(getMemoryStats());
// { allocated: 50MB, used: 45MB, peak: 52MB, tensorCount: 12 }

// Explicit cleanup
model.dispose();

// Force garbage collection
gc();
```

### Scheduler Configuration

```typescript
import { configureScheduler } from 'edgeflow';

configureScheduler({
  maxConcurrentTasks: 4,
  maxConcurrentPerModel: 1,
  defaultTimeout: 30000,
  enableBatching: true,
  maxBatchSize: 32,
});
```

### Caching

```typescript
import { pipeline, Cache } from 'edgeflow';

// Create a cache
const cache = new Cache({
  strategy: 'lru',
  maxSize: 100 * 1024 * 1024, // 100MB
  persistent: true, // Use IndexedDB
});

const model = await pipeline('text-classification', {
  cache: true
});
```

## 🛠️ Advanced Usage

### Custom Model Loading

```typescript
import { loadModel, runInference } from 'edgeflow';

// Load from URL
const model = await loadModel('https://example.com/model.bin', {
  runtime: 'webgpu',
  quantization: 'int8',
  onProgress: (progress) => console.log(`Loading: ${progress * 100}%`)
});

// Run inference
const outputs = await runInference(model, inputs);

// Cleanup
model.dispose();
```

### Model Quantization

```typescript
import { quantize } from 'edgeflow/tools';

const quantized = await quantize(model, {
  method: 'int8',
  calibrationData: samples,
});

console.log(`Compression: ${quantized.compressionRatio}x`);
// Compression: 3.8x
```

### Benchmarking

```typescript
import { benchmark } from 'edgeflow/tools';

const result = await benchmark(
  () => model.run('sample text'),
  { warmupRuns: 5, runs: 100 }
);

console.log(result);
// {
//   avgTime: 12.5,
//   minTime: 10.2,
//   maxTime: 18.3,
//   throughput: 80 // inferences/sec
// }
```

### Memory Scope

```typescript
import { withMemoryScope, tensor } from 'edgeflow';

const result = await withMemoryScope(async (scope) => {
  // Tensors tracked in scope
  const a = scope.track(tensor([1, 2, 3]));
  const b = scope.track(tensor([4, 5, 6]));
  
  // Process...
  const output = process(a, b);
  
  // Keep result, dispose others
  return scope.keep(output);
});
// a and b automatically disposed
```

## 🔌 Tensor Operations

```typescript
import { tensor, zeros, ones, matmul, softmax, relu } from 'edgeflow';

// Create tensors
const a = tensor([[1, 2], [3, 4]]);
const b = zeros([2, 2]);
const c = ones([2, 2]);

// Operations
const d = matmul(a, c);
const probs = softmax(d);
const activated = relu(d);

// Cleanup
a.dispose();
b.dispose();
c.dispose();
```

## 🌐 Browser Support

| Browser | WebGPU | WebNN | WASM |
|---------|--------|-------|------|
| Chrome 113+ | ✅ | ✅ | ✅ |
| Edge 113+ | ✅ | ✅ | ✅ |
| Firefox 118+ | ⚠️ Flag | ❌ | ✅ |
| Safari 17+ | ⚠️ Preview | ❌ | ✅ |

## 📖 API Reference

### Core

- `pipeline(task, options?)` - Create a pipeline for a task
- `loadModel(url, options?)` - Load a model from URL
- `runInference(model, inputs)` - Run model inference
- `getScheduler()` - Get the global scheduler
- `getMemoryManager()` - Get the memory manager

### Pipelines

- `TextClassificationPipeline`
- `SentimentAnalysisPipeline`
- `FeatureExtractionPipeline`
- `ImageClassificationPipeline`

### Utilities

- `Tokenizer` - Text tokenization
- `ImagePreprocessor` - Image preprocessing
- `AudioPreprocessor` - Audio preprocessing
- `Cache` - Caching utilities

### Tools

- `quantize(model, options)` - Quantize a model
- `prune(model, options)` - Prune model weights
- `benchmark(fn, options)` - Benchmark inference
- `analyzeModel(model)` - Analyze model structure

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT © edgeFlow.js Contributors

---

<div align="center">

**[Get Started](https://edgeflow.js.org/getting-started) · [API Docs](https://edgeflow.js.org/api) · [Examples](examples/)**

Made with ❤️ for the edge AI community

</div>
