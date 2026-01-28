# 快速入门

本指南将帮助你在 5 分钟内开始使用 edgeFlow.js。

## 基本用法

### 1. 创建 Pipeline

```typescript
import { pipeline } from 'edgeflowjs';

// 创建文本分类 Pipeline
const classifier = await pipeline('text-classification');
```

### 2. 运行推理

```typescript
const result = await classifier.run('I love this product!');
console.log(result);
// { label: 'positive', score: 0.98 }
```

### 3. 批量处理

```typescript
const results = await classifier.run([
  'Great product!',
  'Terrible experience.',
  'It was okay.',
]);
// 返回数组结果
```

## 支持的任务

| 任务 | Pipeline 名称 | 示例 |
|------|--------------|------|
| 文本分类 | `text-classification` | 情感分析 |
| 特征提取 | `feature-extraction` | 文本嵌入 |
| 图像分类 | `image-classification` | 图片识别 |
| 文本生成 | `text-generation` | 续写文本 |
| 目标检测 | `object-detection` | 检测物体 |
| 语音识别 | `automatic-speech-recognition` | 语音转文字 |
| 零样本分类 | `zero-shot-classification` | 无训练分类 |
| 问答 | `question-answering` | 阅读理解 |

## 使用自定义模型

```typescript
import { pipeline } from 'edgeflowjs';

// 从 HuggingFace 加载自定义模型
const classifier = await pipeline('text-classification', {
  modelId: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english'
});
```

## 直接从 HuggingFace Hub 加载

```typescript
import { fromHub } from 'edgeflowjs';

// 加载模型包（包含模型、分词器、配置）
const bundle = await fromHub('bert-base-uncased');
console.log(bundle.tokenizer); // Tokenizer 实例
console.log(bundle.config);    // 模型配置
```

## 张量操作

```typescript
import { tensor } from 'edgeflowjs';

// 创建张量
const a = tensor([1, 2, 3, 4], [2, 2]);
const b = tensor([5, 6, 7, 8], [2, 2]);

// 矩阵运算
const c = a.reshape([4]);
const d = a.transpose();

// 清理
a.dispose();
b.dispose();
```

## 内存管理

```typescript
import { pipeline, getMemoryStats } from 'edgeflowjs';

const model = await pipeline('text-classification');
await model.run('test');

// 检查内存使用
console.log(getMemoryStats());

// 清理
model.dispose();
```

## 下一步

- [核心概念](./concepts.md) - 深入了解框架架构
- [API 参考](../api/pipeline.md) - 完整 API 文档
- [教程](../tutorials/text-classification.md) - 更多示例
