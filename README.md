# edgeFlow.js

<div align="center">

**Browser ML inference framework with task scheduling and smart caching.**

[![npm version](https://img.shields.io/npm/v/edgeflowjs.svg)](https://www.npmjs.com/package/edgeflowjs)
[![install size](https://packagephobia.com/badge?p=edgeflowjs)](https://packagephobia.com/result?p=edgeflowjs)
[![license](https://img.shields.io/npm/l/edgeflowjs)](LICENSE)

[Documentation](https://edgeflow.js.org) · [Examples](examples/) · [API Reference](https://edgeflow.js.org/api) · [English](README.md) | [中文](README_CN.md)

</div>

---

## ✨ Features

- 📋 **Task Scheduler** - Priority queue, concurrency control, task cancellation
- 🔄 **Batch Processing** - Efficient batch inference out of the box
- 💾 **Memory Management** - Automatic memory tracking and cleanup with scopes
- 📥 **Smart Model Loading** - Preloading, sharding, resume download support
- 💿 **Offline Caching** - IndexedDB-based model caching for offline use
- ⚡ **Multi-Backend** - WebGPU, WebNN, WASM with automatic fallback
- 🤗 **HuggingFace Hub** - Direct model download with one line
- 🔤 **Real Tokenizers** - BPE & WordPiece tokenizers, load tokenizer.json directly
- 👷 **Web Worker Support** - Run inference in background threads
- 📦 **Batteries Included** - ONNX Runtime bundled, zero configuration needed
- 🎯 **TypeScript First** - Full type support with intuitive APIs

## 📦 Installation

```bash
npm install edgeflowjs
```

```bash
yarn add edgeflowjs
```

```bash
pnpm add edgeflowjs
```

> **Note**: ONNX Runtime is included as a dependency. No additional setup required.

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
   - ⚡ **Task Scheduling** - Test priority-based scheduling
   - 📋 **Task Scheduler** - Test priority-based task scheduling
   - 💾 **Memory Management** - Test allocation and cleanup

### Basic Usage

```typescript
import { pipeline } from 'edgeflowjs';

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

### Multiple Pipelines

```typescript
import { pipeline } from 'edgeflowjs';

// Create multiple pipelines
const classifier = await pipeline('text-classification');
const extractor = await pipeline('feature-extraction');

// Run in parallel with Promise.all
const [classification, features] = await Promise.all([
  classifier.run('Sample text'),
  extractor.run('Sample text')
]);
```

### Image Classification

```typescript
import { pipeline } from 'edgeflowjs';

const classifier = await pipeline('image-classification');

// From URL
const result = await classifier.run('https://example.com/image.jpg');

// From HTMLImageElement
const img = document.getElementById('myImage');
const result = await classifier.run(img);

// Batch
const results = await classifier.run([img1, img2, img3]);
```

### Text Generation (Streaming)

```typescript
import { pipeline } from 'edgeflowjs';

const generator = await pipeline('text-generation');

// Simple generation
const result = await generator.run('Once upon a time', {
  maxNewTokens: 50,
  temperature: 0.8,
});
console.log(result.generatedText);

// Streaming output
for await (const event of generator.stream('Hello, ')) {
  process.stdout.write(event.token);
  if (event.done) break;
}
```

### Zero-shot Classification

```typescript
import { pipeline } from 'edgeflowjs';

const classifier = await pipeline('zero-shot-classification');

const result = await classifier.classify(
  'I love playing soccer on weekends',
  ['sports', 'politics', 'technology', 'entertainment']
);

console.log(result.labels[0], result.scores[0]);
// 'sports', 0.92
```

### Question Answering

```typescript
import { pipeline } from 'edgeflowjs';

const qa = await pipeline('question-answering');

const result = await qa.run({
  question: 'What is the capital of France?',
  context: 'Paris is the capital and largest city of France.'
});

console.log(result.answer); // 'Paris'
```

### Load from HuggingFace Hub

```typescript
import { fromHub, fromTask } from 'edgeflowjs';

// Load by model ID (auto-downloads model, tokenizer, config)
const bundle = await fromHub('Xenova/distilbert-base-uncased-finetuned-sst-2-english');
console.log(bundle.tokenizer); // Tokenizer instance
console.log(bundle.config);    // Model config

// Load by task name (uses recommended model)
const sentimentBundle = await fromTask('sentiment-analysis');
```

### Web Workers (Background Inference)

```typescript
import { runInWorker, WorkerPool, isWorkerSupported } from 'edgeflowjs';

// Simple: run inference in background thread
if (isWorkerSupported()) {
  const outputs = await runInWorker(modelUrl, inputs);
}

// Advanced: use worker pool for parallel processing
const pool = new WorkerPool({ numWorkers: 4 });
await pool.init();

const modelId = await pool.loadModel(modelUrl);
const results = await pool.runBatch(modelId, batchInputs);

pool.terminate();
```

## 🎯 Supported Tasks

| Task | Pipeline | Status |
|------|----------|--------|
| Text Classification | `text-classification` | ✅ |
| Sentiment Analysis | `sentiment-analysis` | ✅ |
| Feature Extraction | `feature-extraction` | ✅ |
| Image Classification | `image-classification` | ✅ |
| Text Generation | `text-generation` | ✅ |
| Object Detection | `object-detection` | ✅ |
| Speech Recognition | `automatic-speech-recognition` | ✅ |
| Zero-shot Classification | `zero-shot-classification` | ✅ |
| Question Answering | `question-answering` | ✅ |

## ⚡ Key Differentiators

### Comparison with transformers.js

| Feature | transformers.js | edgeFlow.js |
|---------|-----------------|-------------|
| Task Scheduler | ❌ None | ✅ Priority queue with limits |
| Task Cancellation | ❌ None | ✅ Cancel pending tasks |
| Batch Processing | ⚠️ Manual | ✅ Built-in batching |
| Memory Scopes | ❌ None | ✅ Auto cleanup with scopes |
| Model Preloading | ❌ None | ✅ Background loading |
| Resume Download | ❌ None | ✅ Chunked with resume |
| Model Caching | ⚠️ Basic | ✅ IndexedDB with stats |
| TypeScript | ✅ Full | ✅ Full |

## 🔧 Configuration

### Runtime Selection

```typescript
import { pipeline } from 'edgeflowjs';

// Automatic (recommended)
const model = await pipeline('text-classification');

// Specify runtime
const model = await pipeline('text-classification', {
  runtime: 'webgpu' // or 'webnn', 'wasm', 'auto'
});
```

### Memory Management

```typescript
import { pipeline, getMemoryStats, gc } from 'edgeflowjs';

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
import { configureScheduler } from 'edgeflowjs';

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
import { pipeline, Cache } from 'edgeflowjs';

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
import { loadModel, runInference } from 'edgeflowjs';

// Load from URL with caching, sharding, and resume support
const model = await loadModel('https://example.com/model.bin', {
  runtime: 'webgpu',
  quantization: 'int8',
  cache: true,           // Enable IndexedDB caching (default: true)
  resumable: true,       // Enable resume download (default: true)
  chunkSize: 5 * 1024 * 1024, // 5MB chunks for large models
  onProgress: (progress) => console.log(`Loading: ${progress * 100}%`)
});

// Run inference
const outputs = await runInference(model, inputs);

// Cleanup
model.dispose();
```

### Preloading Models

```typescript
import { preloadModel, preloadModels, getPreloadStatus } from 'edgeflowjs';

// Preload a single model in background (with priority)
preloadModel('https://example.com/model1.onnx', { priority: 10 });

// Preload multiple models
preloadModels([
  { url: 'https://example.com/model1.onnx', priority: 10 },
  { url: 'https://example.com/model2.onnx', priority: 5 },
]);

// Check preload status
const status = getPreloadStatus('https://example.com/model1.onnx');
// 'pending' | 'loading' | 'complete' | 'error' | 'not_found'
```

### Model Caching

```typescript
import { 
  isModelCached, 
  getCachedModel, 
  deleteCachedModel, 
  clearModelCache,
  getModelCacheStats 
} from 'edgeflowjs';

// Check if model is cached
if (await isModelCached('https://example.com/model.onnx')) {
  console.log('Model is cached!');
}

// Get cached model data directly
const modelData = await getCachedModel('https://example.com/model.onnx');

// Delete a specific cached model
await deleteCachedModel('https://example.com/model.onnx');

// Clear all cached models
await clearModelCache();

// Get cache statistics
const stats = await getModelCacheStats();
console.log(`${stats.models} models cached, ${stats.totalSize} bytes total`);
```

### Resume Downloads

Large model downloads automatically support resuming from where they left off:

```typescript
import { loadModelData } from 'edgeflowjs';

// Download with progress and resume support
const modelData = await loadModelData('https://example.com/large-model.onnx', {
  resumable: true,
  chunkSize: 10 * 1024 * 1024, // 10MB chunks
  parallelConnections: 4,      // Download 4 chunks in parallel
  onProgress: (progress) => {
    console.log(`${progress.percent.toFixed(1)}% downloaded`);
    console.log(`Speed: ${(progress.speed / 1024 / 1024).toFixed(2)} MB/s`);
    console.log(`ETA: ${(progress.eta / 1000).toFixed(0)}s`);
    console.log(`Chunk ${progress.currentChunk}/${progress.totalChunks}`);
  }
});
```

### Model Quantization

```typescript
import { quantize } from 'edgeflowjs/tools';

const quantized = await quantize(model, {
  method: 'int8',
  calibrationData: samples,
});

console.log(`Compression: ${quantized.compressionRatio}x`);
// Compression: 3.8x
```

### Benchmarking

```typescript
import { benchmark } from 'edgeflowjs/tools';

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
import { withMemoryScope, tensor } from 'edgeflowjs';

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
import { tensor, zeros, ones, matmul, softmax, relu } from 'edgeflowjs';

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
- `runInWorker(url, inputs)` - Run inference in a Web Worker
- `WorkerPool` - Manage multiple workers for parallel inference

### Pipelines

- `TextClassificationPipeline` - Text/sentiment classification
- `SentimentAnalysisPipeline` - Sentiment analysis
- `FeatureExtractionPipeline` - Text embeddings
- `ImageClassificationPipeline` - Image classification
- `TextGenerationPipeline` - Text generation with streaming
- `ObjectDetectionPipeline` - Object detection with bounding boxes
- `AutomaticSpeechRecognitionPipeline` - Speech to text
- `ZeroShotClassificationPipeline` - Classify without training
- `QuestionAnsweringPipeline` - Extractive QA

### HuggingFace Hub

- `fromHub(modelId, options?)` - Load model bundle from HuggingFace
- `fromTask(task, options?)` - Load recommended model for task
- `downloadTokenizer(modelId)` - Download tokenizer only
- `downloadConfig(modelId)` - Download config only
- `POPULAR_MODELS` - Registry of popular models by task

### Utilities

- `Tokenizer` - BPE/WordPiece tokenization with HuggingFace support
- `ImagePreprocessor` - Image preprocessing with HuggingFace config support
- `AudioPreprocessor` - Audio preprocessing for Whisper/wav2vec
- `Cache` - LRU caching utilities

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
