# edgeFlow.js

<div align="center">

**浏览器端机器学习推理框架，内置任务调度和智能缓存**

[![npm version](https://img.shields.io/npm/v/edgeflowjs.svg)](https://www.npmjs.com/package/edgeflowjs)
[![install size](https://packagephobia.com/badge?p=edgeflowjs)](https://packagephobia.com/result?p=edgeflowjs)
[![license](https://img.shields.io/npm/l/edgeflowjs)](LICENSE)

[文档](https://edgeflow.js.org) · [示例](examples/) · [API 参考](https://edgeflow.js.org/api) · [English](README.md) | [中文](README_CN.md)

</div>

---

## ✨ 特性

- 📋 **任务调度器** - 优先级队列、并发控制、任务取消
- 🔄 **批量处理** - 开箱即用的高效批量推理
- 💾 **内存管理** - 自动内存追踪和作用域清理
- 📥 **智能模型加载** - 支持预加载、分片下载、断点续传
- 💿 **离线缓存** - 基于 IndexedDB 的模型缓存，支持离线使用
- ⚡ **多后端支持** - WebGPU、WebNN、WASM 自动降级
- 🤗 **HuggingFace Hub** - 一行代码从 HuggingFace 下载模型
- 🔤 **真实分词器** - BPE 和 WordPiece 分词器，直接加载 tokenizer.json
- 👷 **Web Worker 支持** - 在后台线程运行推理
- 📦 **开箱即用** - 内置 ONNX Runtime，零配置直接使用
- 🎯 **TypeScript 优先** - 完整的类型支持和直观的 API

## 📦 安装

```bash
npm install edgeflowjs
```

```bash
yarn add edgeflowjs
```

```bash
pnpm add edgeflowjs
```

> **注意**: ONNX Runtime 已作为依赖包含，无需额外配置。

## 🚀 快速开始

### 体验 Demo

在本地运行交互式 Demo 测试所有功能：

```bash
# 克隆并安装
git clone https://github.com/user/edgeflow.js.git
cd edgeflow.js
npm install

# 构建并启动 Demo 服务器
npm run demo
```

在浏览器中打开 **http://localhost:3000**：

1. **加载模型** - 输入 Hugging Face ONNX 模型 URL 并点击 "Load Model"
   ```
   https://huggingface.co/Xenova/distilbert-base-uncased-finetuned-sst-2-english/resolve/main/onnx/model_quantized.onnx
   ```

2. **测试功能**：
   - 🧮 **张量运算** - 测试张量创建、数学运算、softmax、relu
   - 📝 **文本分类** - 对文本进行情感分析
   - 🔍 **特征提取** - 从文本中提取嵌入向量
   - ⚡ **任务调度** - 测试优先级调度
   - 📋 **任务调度** - 测试基于优先级的任务调度
   - 💾 **内存管理** - 测试内存分配和清理

### 基础用法

```typescript
import { pipeline } from 'edgeflowjs';

// 创建情感分析流水线
const sentiment = await pipeline('sentiment-analysis');

// 运行推理
const result = await sentiment.run('I love this product!');
console.log(result);
// { label: 'positive', score: 0.98, processingTime: 12.5 }
```

### 批量处理

```typescript
// 原生批处理支持
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

### 多流水线

```typescript
import { pipeline } from 'edgeflowjs';

// 创建多个流水线
const classifier = await pipeline('text-classification');
const extractor = await pipeline('feature-extraction');

// 使用 Promise.all 并行运行
const [classification, features] = await Promise.all([
  classifier.run('Sample text'),
  extractor.run('Sample text')
]);
```

### 图像分类

```typescript
import { pipeline } from 'edgeflowjs';

const classifier = await pipeline('image-classification');

// 从 URL 加载
const result = await classifier.run('https://example.com/image.jpg');

// 从 HTMLImageElement 加载
const img = document.getElementById('myImage');
const result = await classifier.run(img);

// 批量处理
const results = await classifier.run([img1, img2, img3]);
```

### 文本生成（流式输出）

```typescript
import { pipeline } from 'edgeflowjs';

const generator = await pipeline('text-generation');

// 简单生成
const result = await generator.run('从前有座山', {
  maxNewTokens: 50,
  temperature: 0.8,
});
console.log(result.generatedText);

// 流式输出
for await (const event of generator.stream('你好，')) {
  process.stdout.write(event.token);
  if (event.done) break;
}
```

### 零样本分类

```typescript
import { pipeline } from 'edgeflowjs';

const classifier = await pipeline('zero-shot-classification');

const result = await classifier.classify(
  '周末我喜欢踢足球',
  ['体育', '政治', '科技', '娱乐']
);

console.log(result.labels[0], result.scores[0]);
// '体育', 0.92
```

### 问答系统

```typescript
import { pipeline } from 'edgeflowjs';

const qa = await pipeline('question-answering');

const result = await qa.run({
  question: '法国的首都是什么？',
  context: '巴黎是法国的首都和最大城市。'
});

console.log(result.answer); // '巴黎'
```

### 从 HuggingFace Hub 加载

```typescript
import { fromHub, fromTask } from 'edgeflowjs';

// 通过模型 ID 加载（自动下载模型、分词器、配置）
const bundle = await fromHub('Xenova/distilbert-base-uncased-finetuned-sst-2-english');
console.log(bundle.tokenizer); // Tokenizer 实例
console.log(bundle.config);    // 模型配置

// 通过任务名称加载（使用推荐模型）
const sentimentBundle = await fromTask('sentiment-analysis');
```

### Web Workers（后台推理）

```typescript
import { runInWorker, WorkerPool, isWorkerSupported } from 'edgeflowjs';

// 简单：在后台线程运行推理
if (isWorkerSupported()) {
  const outputs = await runInWorker(modelUrl, inputs);
}

// 高级：使用 Worker 池进行并行处理
const pool = new WorkerPool({ numWorkers: 4 });
await pool.init();

const modelId = await pool.loadModel(modelUrl);
const results = await pool.runBatch(modelId, batchInputs);

pool.terminate();
```

## 🎯 支持的任务

| 任务 | 流水线 | 状态 |
|------|--------|------|
| 文本分类 | `text-classification` | ✅ |
| 情感分析 | `sentiment-analysis` | ✅ |
| 特征提取 | `feature-extraction` | ✅ |
| 图像分类 | `image-classification` | ✅ |
| 文本生成 | `text-generation` | ✅ |
| 目标检测 | `object-detection` | ✅ |
| 语音识别 | `automatic-speech-recognition` | ✅ |
| 零样本分类 | `zero-shot-classification` | ✅ |
| 问答系统 | `question-answering` | ✅ |

## ⚡ 核心差异

### 与 transformers.js 对比

| 特性 | transformers.js | edgeFlow.js |
|------|-----------------|-------------|
| 任务调度器 | ❌ 无 | ✅ 优先级队列 + 并发限制 |
| 任务取消 | ❌ 无 | ✅ 支持取消排队任务 |
| 批量处理 | ⚠️ 手动 | ✅ 内置批处理 |
| 内存作用域 | ❌ 无 | ✅ 作用域自动清理 |
| 模型预加载 | ❌ 无 | ✅ 后台加载 |
| 断点续传 | ❌ 无 | ✅ 分片 + 续传 |
| 模型缓存 | ⚠️ 基础 | ✅ IndexedDB + 统计 |
| TypeScript | ✅ 完整 | ✅ 完整 |

## 🔧 配置

### 运行时选择

```typescript
import { pipeline } from 'edgeflowjs';

// 自动选择（推荐）
const model = await pipeline('text-classification');

// 指定运行时
const model = await pipeline('text-classification', {
  runtime: 'webgpu' // 或 'webnn', 'wasm', 'auto'
});
```

### 内存管理

```typescript
import { pipeline, getMemoryStats, gc } from 'edgeflowjs';

const model = await pipeline('text-classification');

// 使用模型
await model.run('text');

// 检查内存使用
console.log(getMemoryStats());
// { allocated: 50MB, used: 45MB, peak: 52MB, tensorCount: 12 }

// 显式清理
model.dispose();

// 强制垃圾回收
gc();
```

### 调度器配置

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

### 缓存

```typescript
import { pipeline, Cache } from 'edgeflowjs';

// 创建缓存
const cache = new Cache({
  strategy: 'lru',
  maxSize: 100 * 1024 * 1024, // 100MB
  persistent: true, // 使用 IndexedDB
});

const model = await pipeline('text-classification', {
  cache: true
});
```

## 🛠️ 高级用法

### 自定义模型加载

```typescript
import { loadModel, runInference } from 'edgeflowjs';

// 从 URL 加载，支持缓存、分片和断点续传
const model = await loadModel('https://example.com/model.bin', {
  runtime: 'webgpu',
  quantization: 'int8',
  cache: true,           // 启用 IndexedDB 缓存（默认: true）
  resumable: true,       // 启用断点续传（默认: true）
  chunkSize: 5 * 1024 * 1024, // 大模型使用 5MB 分片
  onProgress: (progress) => console.log(`加载中: ${progress * 100}%`)
});

// 运行推理
const outputs = await runInference(model, inputs);

// 清理
model.dispose();
```

### 模型预加载

```typescript
import { preloadModel, preloadModels, getPreloadStatus } from 'edgeflowjs';

// 后台预加载单个模型（支持优先级）
preloadModel('https://example.com/model1.onnx', { priority: 10 });

// 预加载多个模型
preloadModels([
  { url: 'https://example.com/model1.onnx', priority: 10 },
  { url: 'https://example.com/model2.onnx', priority: 5 },
]);

// 检查预加载状态
const status = getPreloadStatus('https://example.com/model1.onnx');
// 'pending' | 'loading' | 'complete' | 'error' | 'not_found'
```

### 模型缓存

```typescript
import { 
  isModelCached, 
  getCachedModel, 
  deleteCachedModel, 
  clearModelCache,
  getModelCacheStats 
} from 'edgeflowjs';

// 检查模型是否已缓存
if (await isModelCached('https://example.com/model.onnx')) {
  console.log('模型已缓存！');
}

// 直接获取缓存的模型数据
const modelData = await getCachedModel('https://example.com/model.onnx');

// 删除特定缓存的模型
await deleteCachedModel('https://example.com/model.onnx');

// 清空所有缓存的模型
await clearModelCache();

// 获取缓存统计
const stats = await getModelCacheStats();
console.log(`${stats.models} 个模型已缓存，共 ${stats.totalSize} 字节`);
```

### 断点续传下载

大模型下载自动支持从断点处继续：

```typescript
import { loadModelData } from 'edgeflowjs';

// 带进度和断点续传的下载
const modelData = await loadModelData('https://example.com/large-model.onnx', {
  resumable: true,
  chunkSize: 10 * 1024 * 1024, // 10MB 分片
  parallelConnections: 4,      // 并行下载 4 个分片
  onProgress: (progress) => {
    console.log(`${progress.percent.toFixed(1)}% 已下载`);
    console.log(`速度: ${(progress.speed / 1024 / 1024).toFixed(2)} MB/s`);
    console.log(`预计剩余: ${(progress.eta / 1000).toFixed(0)}秒`);
    console.log(`分片 ${progress.currentChunk}/${progress.totalChunks}`);
  }
});
```

### 模型量化

```typescript
import { quantize } from 'edgeflowjs/tools';

const quantized = await quantize(model, {
  method: 'int8',
  calibrationData: samples,
});

console.log(`压缩比: ${quantized.compressionRatio}x`);
// 压缩比: 3.8x
```

### 性能测试

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
//   throughput: 80 // 推理次数/秒
// }
```

### 内存作用域

```typescript
import { withMemoryScope, tensor } from 'edgeflowjs';

const result = await withMemoryScope(async (scope) => {
  // 在作用域中追踪张量
  const a = scope.track(tensor([1, 2, 3]));
  const b = scope.track(tensor([4, 5, 6]));
  
  // 处理...
  const output = process(a, b);
  
  // 保留结果，释放其他
  return scope.keep(output);
});
// a 和 b 自动释放
```

## 🔌 张量操作

```typescript
import { tensor, zeros, ones, matmul, softmax, relu } from 'edgeflowjs';

// 创建张量
const a = tensor([[1, 2], [3, 4]]);
const b = zeros([2, 2]);
const c = ones([2, 2]);

// 运算
const d = matmul(a, c);
const probs = softmax(d);
const activated = relu(d);

// 清理
a.dispose();
b.dispose();
c.dispose();
```

## 🌐 浏览器支持

| 浏览器 | WebGPU | WebNN | WASM |
|--------|--------|-------|------|
| Chrome 113+ | ✅ | ✅ | ✅ |
| Edge 113+ | ✅ | ✅ | ✅ |
| Firefox 118+ | ⚠️ 需开启 | ❌ | ✅ |
| Safari 17+ | ⚠️ 预览版 | ❌ | ✅ |

## 📖 API 参考

### 核心

- `pipeline(task, options?)` - 为任务创建流水线
- `loadModel(url, options?)` - 从 URL 加载模型
- `runInference(model, inputs)` - 运行模型推理
- `getScheduler()` - 获取全局调度器
- `getMemoryManager()` - 获取内存管理器
- `runInWorker(url, inputs)` - 在 Web Worker 中运行推理
- `WorkerPool` - 管理多个 Worker 进行并行推理

### 流水线

- `TextClassificationPipeline` - 文本/情感分类
- `SentimentAnalysisPipeline` - 情感分析
- `FeatureExtractionPipeline` - 文本嵌入
- `ImageClassificationPipeline` - 图像分类
- `TextGenerationPipeline` - 文本生成（支持流式输出）
- `ObjectDetectionPipeline` - 目标检测（带边界框）
- `AutomaticSpeechRecognitionPipeline` - 语音转文字
- `ZeroShotClassificationPipeline` - 零样本分类
- `QuestionAnsweringPipeline` - 抽取式问答

### HuggingFace Hub

- `fromHub(modelId, options?)` - 从 HuggingFace 加载模型包
- `fromTask(task, options?)` - 按任务加载推荐模型
- `downloadTokenizer(modelId)` - 仅下载分词器
- `downloadConfig(modelId)` - 仅下载配置
- `POPULAR_MODELS` - 按任务分类的热门模型注册表

### 工具类

- `Tokenizer` - BPE/WordPiece 分词器，支持 HuggingFace 格式
- `ImagePreprocessor` - 图像预处理器，支持 HuggingFace 配置
- `AudioPreprocessor` - 音频预处理器，支持 Whisper/wav2vec
- `Cache` - LRU 缓存工具

### 工具

- `quantize(model, options)` - 模型量化
- `prune(model, options)` - 模型剪枝
- `benchmark(fn, options)` - 性能基准测试
- `analyzeModel(model)` - 分析模型结构

## 🤝 贡献

欢迎贡献！请查看我们的 [贡献指南](CONTRIBUTING.md) 了解详情。

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 发起 Pull Request

## 📄 许可证

MIT © edgeFlow.js Contributors

---

<div align="center">

**[快速开始](https://edgeflow.js.org/getting-started) · [API 文档](https://edgeflow.js.org/api) · [示例](examples/)**

用 ❤️ 为边缘 AI 社区打造

</div>
