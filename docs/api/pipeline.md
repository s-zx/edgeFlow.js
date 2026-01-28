# Pipeline API

## pipeline()

创建指定任务的 Pipeline。

```typescript
function pipeline(
  task: PipelineTask,
  options?: PipelineOptions
): Promise<BasePipeline>
```

### 参数

| 参数 | 类型 | 描述 |
|------|------|------|
| task | `PipelineTask` | 任务类型 |
| options | `PipelineOptions` | 配置选项 |

### PipelineTask

```typescript
type PipelineTask = 
  | 'text-classification'
  | 'sentiment-analysis'
  | 'feature-extraction'
  | 'image-classification'
  | 'text-generation'
  | 'object-detection'
  | 'automatic-speech-recognition'
  | 'zero-shot-classification'
  | 'question-answering';
```

### PipelineOptions

```typescript
interface PipelineOptions {
  // 模型 ID（HuggingFace Hub）
  modelId?: string;
  
  // 模型 URL
  modelUrl?: string;
  
  // 执行后端
  runtime?: 'auto' | 'webgpu' | 'webnn' | 'wasm' | 'onnx';
  
  // 是否启用缓存
  cache?: boolean;
  
  // 加载进度回调
  onProgress?: (progress: number) => void;
}
```

### 示例

```typescript
// 基本用法
const classifier = await pipeline('text-classification');

// 自定义模型
const classifier = await pipeline('text-classification', {
  modelId: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english'
});

// 指定后端
const classifier = await pipeline('text-classification', {
  runtime: 'webgpu'
});
```

---

## TextClassificationPipeline

文本分类 Pipeline。

### run()

```typescript
async run(
  input: string | string[],
  options?: TextClassificationOptions
): Promise<TextClassificationResult | TextClassificationResult[]>
```

#### TextClassificationOptions

```typescript
interface TextClassificationOptions {
  // 返回前 K 个结果
  topK?: number;
  
  // 置信度阈值
  threshold?: number;
}
```

#### TextClassificationResult

```typescript
interface TextClassificationResult {
  label: string;
  score: number;
}
```

### 示例

```typescript
const classifier = await pipeline('text-classification');

// 单个输入
const result = await classifier.run('I love this!');
// { label: 'positive', score: 0.98 }

// 批量输入
const results = await classifier.run(['Good', 'Bad']);
// [{ label: 'positive', ... }, { label: 'negative', ... }]

// 返回多个结果
const results = await classifier.run('Interesting', { topK: 3 });
```

---

## TextGenerationPipeline

文本生成 Pipeline。

### run()

```typescript
async run(
  input: string,
  options?: TextGenerationOptions
): Promise<TextGenerationResult>
```

### stream()

流式生成文本。

```typescript
async *stream(
  input: string,
  options?: TextGenerationOptions
): AsyncGenerator<GenerationStreamEvent>
```

#### TextGenerationOptions

```typescript
interface TextGenerationOptions {
  // 最大生成 token 数
  maxNewTokens?: number;
  
  // 温度（越高越随机）
  temperature?: number;
  
  // Top-K 采样
  topK?: number;
  
  // Top-P (nucleus) 采样
  topP?: number;
  
  // 重复惩罚
  repetitionPenalty?: number;
  
  // 停止词
  stopSequences?: string[];
  
  // 是否使用采样
  doSample?: boolean;
}
```

### 示例

```typescript
const generator = await pipeline('text-generation');

// 基本生成
const result = await generator.run('Once upon a time', {
  maxNewTokens: 50
});
console.log(result.generatedText);

// 流式生成
for await (const event of generator.stream('Hello, ')) {
  process.stdout.write(event.token);
  if (event.done) break;
}
```

---

## FeatureExtractionPipeline

特征提取 Pipeline。

### run()

```typescript
async run(
  input: string | string[],
  options?: FeatureExtractionOptions
): Promise<FeatureExtractionResult | FeatureExtractionResult[]>
```

#### FeatureExtractionOptions

```typescript
interface FeatureExtractionOptions {
  // 池化策略
  pooling?: 'mean' | 'cls' | 'none';
  
  // 是否归一化
  normalize?: boolean;
}
```

### 示例

```typescript
const extractor = await pipeline('feature-extraction');

const result = await extractor.run('Hello world', {
  pooling: 'mean',
  normalize: true
});
console.log(result.embeddings); // Float32Array
```

---

## ImageClassificationPipeline

图像分类 Pipeline。

### run()

```typescript
async run(
  input: ImageInput | ImageInput[],
  options?: ImageClassificationOptions
): Promise<ImageClassificationResult | ImageClassificationResult[]>

type ImageInput = string | HTMLImageElement | HTMLCanvasElement | ImageData;
```

### 示例

```typescript
const classifier = await pipeline('image-classification');

// 从 URL
const result = await classifier.run('https://example.com/cat.jpg');

// 从 HTMLImageElement
const img = document.getElementById('myImage');
const result = await classifier.run(img);
```

---

## QuestionAnsweringPipeline

问答 Pipeline。

### run()

```typescript
async run(
  input: { question: string; context: string },
  options?: QuestionAnsweringOptions
): Promise<QuestionAnsweringResult>
```

### 示例

```typescript
const qa = await pipeline('question-answering');

const result = await qa.run({
  question: 'What is the capital of France?',
  context: 'Paris is the capital and largest city of France.'
});
console.log(result.answer); // 'Paris'
```

---

## ZeroShotClassificationPipeline

零样本分类 Pipeline。

### classify()

```typescript
async classify(
  text: string,
  candidateLabels: string[],
  options?: ZeroShotOptions
): Promise<ZeroShotClassificationResult>
```

### 示例

```typescript
const classifier = await pipeline('zero-shot-classification');

const result = await classifier.classify(
  'I love playing soccer',
  ['sports', 'music', 'technology']
);
console.log(result.labels);  // ['sports', 'music', 'technology']
console.log(result.scores);  // [0.92, 0.05, 0.03]
```

---

## Pipeline 共有方法

### dispose()

释放 Pipeline 占用的资源。

```typescript
pipeline.dispose(): void
```

### initialize()

手动初始化 Pipeline（通常由 `pipeline()` 自动调用）。

```typescript
await pipeline.initialize(): Promise<void>
```
