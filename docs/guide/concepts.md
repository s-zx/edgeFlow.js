# 核心概念

## 架构概述

edgeFlow.js 采用分层架构设计：

```
┌─────────────────────────────────────────┐
│          Application Layer              │
│  (Pipelines: text-classification, etc.) │
├─────────────────────────────────────────┤
│            Core Engine                  │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ │
│  │Scheduler│ │  Memory  │ │  Tensor  │ │
│  │         │ │ Manager  │ │          │ │
│  └─────────┘ └──────────┘ └──────────┘ │
├─────────────────────────────────────────┤
│         Backend Abstraction             │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  │WebGPU│ │WebNN │ │ WASM │ │ ONNX │  │
│  └──────┘ └──────┘ └──────┘ └──────┘  │
└─────────────────────────────────────────┘
```

## Pipeline

Pipeline 是使用 edgeFlow.js 的主要方式。每个 Pipeline 封装了：

- **模型加载** - 自动从 HuggingFace 或本地加载模型
- **预处理** - 将输入转换为模型所需格式
- **推理执行** - 运行模型推理
- **后处理** - 将输出转换为易用的格式

```typescript
const pipeline = await pipeline('text-classification');
// pipeline 内部处理了所有复杂性
const result = await pipeline.run('Hello world');
```

## Tensor

Tensor（张量）是多维数组，是机器学习的基础数据结构。

```typescript
import { tensor, EdgeFlowTensor } from 'edgeflowjs';

// 创建 1D 张量
const t1 = new EdgeFlowTensor([1, 2, 3, 4], [4]);

// 创建 2D 张量
const t2 = new EdgeFlowTensor([1, 2, 3, 4], [2, 2]);

// 支持的数据类型
const float32 = new EdgeFlowTensor([1.5, 2.5], [2], 'float32');
const int64 = new EdgeFlowTensor([1, 2], [2], 'int64');
const uint8 = new EdgeFlowTensor([0, 255], [2], 'uint8');
```

## Scheduler（调度器）

调度器管理并发推理任务：

- **优先级队列** - 高优先级任务先执行
- **并发控制** - 限制同时运行的任务数
- **模型隔离** - 每个模型独立的并发限制

```typescript
import { getScheduler, TaskPriority } from 'edgeflowjs';

const scheduler = getScheduler();

// 高优先级任务
const task = scheduler.schedule('model-id', async () => {
  return await runInference();
}, TaskPriority.HIGH);

await task.wait();
```

## Memory Manager（内存管理器）

自动跟踪和管理 GPU/CPU 内存：

```typescript
import { getMemoryManager } from 'edgeflowjs';

const mm = getMemoryManager();

// 查看统计
console.log(mm.getStats());
// {
//   allocated: 50000000,  // 50MB
//   used: 45000000,       // 45MB
//   peak: 52000000,       // 52MB
//   tensorCount: 12
// }

// 手动触发垃圾回收
mm.gc();

// 检测可能的内存泄漏
const leaks = mm.detectLeaks(60000); // 超过 1 分钟的资源
```

## Backend（后端）

edgeFlow.js 支持多种执行后端：

| 后端 | 描述 | 性能 | 兼容性 |
|------|------|------|--------|
| WebGPU | GPU 加速 | ⭐⭐⭐ | Chrome 113+ |
| WebNN | 硬件加速 | ⭐⭐⭐ | Chrome 113+ |
| WASM | WebAssembly | ⭐⭐ | 所有浏览器 |
| ONNX | ONNX Runtime | ⭐⭐⭐ | 所有浏览器 |

后端自动选择最佳可用选项：

```typescript
const pipeline = await pipeline('text-classification', {
  runtime: 'auto' // 默认：自动选择
});

// 或指定后端
const pipeline = await pipeline('text-classification', {
  runtime: 'webgpu'
});
```

## Model Cache（模型缓存）

模型自动缓存到 IndexedDB：

```typescript
import { isModelCached, getCachedModel, clearModelCache } from 'edgeflowjs';

// 检查是否已缓存
if (await isModelCached('https://example.com/model.onnx')) {
  console.log('模型已缓存');
}

// 清除缓存
await clearModelCache();
```

## Tokenizer（分词器）

分词器将文本转换为模型可处理的数字：

```typescript
import { Tokenizer } from 'edgeflowjs';

// 从 HuggingFace 加载
const tokenizer = await Tokenizer.fromHuggingFace('bert-base-uncased');

// 编码
const encoded = tokenizer.encode('Hello world', {
  addSpecialTokens: true,
  maxLength: 128,
  padding: 'max_length',
});
// { inputIds: [101, 7592, 2088, 102, 0, 0, ...], attentionMask: [...] }

// 解码
const text = tokenizer.decode(encoded.inputIds);
```

## 下一步

- [Pipeline API](../api/pipeline.md)
- [性能优化](../advanced/performance.md)
