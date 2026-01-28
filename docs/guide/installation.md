# 安装

## 通过包管理器安装

### npm

```bash
npm install edgeflowjs
```

### yarn

```bash
yarn add edgeflowjs
```

### pnpm

```bash
pnpm add edgeflowjs
```

## 通过 CDN 使用

```html
<script type="module">
  import * as edgeFlow from 'https://cdn.jsdelivr.net/npm/edgeflowjs/dist/edgeflow.browser.min.js';
  
  // 使用 edgeFlow
  const pipeline = await edgeFlow.pipeline('text-classification');
</script>
```

## 浏览器兼容性

| 浏览器 | WebGPU | WebNN | WASM |
|--------|--------|-------|------|
| Chrome 113+ | ✅ | ✅ | ✅ |
| Edge 113+ | ✅ | ✅ | ✅ |
| Firefox 118+ | ⚠️ | ❌ | ✅ |
| Safari 17+ | ⚠️ | ❌ | ✅ |

## TypeScript 支持

edgeFlow.js 使用 TypeScript 编写，提供完整的类型定义：

```typescript
import { pipeline, EdgeFlowTensor, Tokenizer } from 'edgeflowjs';
import type { PipelineOptions, TextClassificationResult } from 'edgeflowjs';
```

## 下一步

- [快速入门](./quickstart.md)
- [核心概念](./concepts.md)
