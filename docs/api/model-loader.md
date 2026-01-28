# Model Loader API

## 模型加载

### loadModel()

加载模型并准备推理。

```typescript
async function loadModel(
  url: string,
  options?: ModelLoaderOptions
): Promise<LoadedModel>
```

### loadModelData()

加载模型数据（ArrayBuffer），支持缓存和断点续传。

```typescript
async function loadModelData(
  url: string,
  options?: ModelLoaderOptions
): Promise<ArrayBuffer>
```

### ModelLoaderOptions

```typescript
interface ModelLoaderOptions {
  // 启用缓存（默认: true）
  cache?: boolean;
  
  // 强制重新下载
  forceDownload?: boolean;
  
  // 启用断点续传（默认: true）
  resumable?: boolean;
  
  // 分片大小（默认: 5MB）
  chunkSize?: number;
  
  // 并行下载连接数（默认: 4）
  parallelConnections?: number;
  
  // 超时时间（默认: 30000ms）
  timeout?: number;
  
  // 进度回调
  onProgress?: (progress: DownloadProgress) => void;
}
```

### DownloadProgress

```typescript
interface DownloadProgress {
  loaded: number;      // 已下载字节数
  total: number;       // 总字节数
  percent: number;     // 进度百分比 (0-100)
  speed: number;       // 下载速度 (bytes/sec)
  eta: number;         // 预计剩余时间 (ms)
  currentChunk?: number;  // 当前分片
  totalChunks?: number;   // 总分片数
}
```

### 示例

```typescript
import { loadModelData } from 'edgeflowjs';

const modelData = await loadModelData(
  'https://example.com/model.onnx',
  {
    resumable: true,
    chunkSize: 10 * 1024 * 1024, // 10MB
    parallelConnections: 4,
    onProgress: (p) => {
      console.log(`${p.percent.toFixed(1)}%`);
      console.log(`Speed: ${(p.speed / 1024 / 1024).toFixed(2)} MB/s`);
    }
  }
);
```

---

## 预加载

### preloadModel()

后台预加载单个模型。

```typescript
function preloadModel(
  url: string,
  options?: PreloadOptions
): Promise<ArrayBuffer>
```

### preloadModels()

预加载多个模型。

```typescript
function preloadModels(
  urls: Array<{ url: string; priority?: number }>,
  options?: Omit<PreloadOptions, 'priority'>
): Promise<ArrayBuffer[]>
```

### PreloadOptions

```typescript
interface PreloadOptions extends ModelLoaderOptions {
  // 优先级（越大越优先，默认: 0）
  priority?: number;
}
```

### 示例

```typescript
import { preloadModel, preloadModels } from 'edgeflowjs';

// 预加载单个模型
preloadModel('https://example.com/model1.onnx', { priority: 10 });

// 预加载多个模型
preloadModels([
  { url: 'https://example.com/model1.onnx', priority: 10 },
  { url: 'https://example.com/model2.onnx', priority: 5 },
]);
```

---

## 预加载状态

### getPreloadStatus()

获取预加载状态。

```typescript
function getPreloadStatus(
  url: string
): 'pending' | 'loading' | 'complete' | 'error' | 'not_found'
```

### getPreloadedModel()

获取预加载的模型数据。

```typescript
async function getPreloadedModel(
  url: string
): Promise<ArrayBuffer | null>
```

### cancelPreload()

取消预加载。

```typescript
function cancelPreload(url: string): void
```

---

## 缓存管理

### isModelCached()

检查模型是否已缓存。

```typescript
async function isModelCached(url: string): Promise<boolean>
```

### getCachedModel()

获取缓存的模型数据。

```typescript
async function getCachedModel(url: string): Promise<ArrayBuffer | null>
```

### deleteCachedModel()

删除指定的缓存模型。

```typescript
async function deleteCachedModel(url: string): Promise<void>
```

### clearModelCache()

清除所有缓存的模型。

```typescript
async function clearModelCache(): Promise<void>
```

### getModelCacheStats()

获取缓存统计。

```typescript
async function getModelCacheStats(): Promise<{
  models: number;     // 缓存的模型数量
  totalSize: number;  // 总大小（字节）
}>
```

### 示例

```typescript
import { 
  isModelCached, 
  getCachedModel, 
  clearModelCache,
  getModelCacheStats 
} from 'edgeflowjs';

// 检查缓存
if (await isModelCached(modelUrl)) {
  console.log('模型已缓存');
}

// 获取统计
const stats = await getModelCacheStats();
console.log(`${stats.models} 个模型，共 ${stats.totalSize} 字节`);

// 清除缓存
await clearModelCache();
```

---

## HuggingFace Hub

### fromHub()

从 HuggingFace Hub 加载模型包。

```typescript
async function fromHub(
  modelId: string,
  options?: { revision?: string; cache?: boolean }
): Promise<ModelBundle>
```

### fromTask()

按任务加载推荐模型。

```typescript
async function fromTask(
  task: PipelineTask,
  options?: { modelId?: string; revision?: string; cache?: boolean }
): Promise<ModelBundle>
```

### ModelBundle

```typescript
interface ModelBundle {
  modelUrl: string;
  tokenizer?: Tokenizer;
  preprocessor?: ImagePreprocessor | AudioPreprocessor;
  config?: Record<string, unknown>;
  modelId: string;
}
```

### 示例

```typescript
import { fromHub, fromTask } from 'edgeflowjs';

// 按模型 ID
const bundle = await fromHub('bert-base-uncased');
console.log(bundle.tokenizer);

// 按任务
const bundle = await fromTask('text-classification');
```

---

## 类型定义

```typescript
// 加载的模型
interface LoadedModel {
  id: string;
  url?: string;
  metadata: ModelMetadata;
  run(inputs: EdgeFlowTensor[]): Promise<EdgeFlowTensor[]>;
  dispose(): void;
}

// 模型元数据
interface ModelMetadata {
  name?: string;
  inputs: TensorInfo[];
  outputs: TensorInfo[];
  runtime?: string;
}

// 张量信息
interface TensorInfo {
  name: string;
  shape: number[];
  dtype: DataType;
}
```
