# Tokenizer API

## Tokenizer

文本分词器，支持 BPE 和 WordPiece 算法。

### 静态方法

#### fromJSON()

从 JSON 配置创建分词器。

```typescript
static async fromJSON(
  json: HFTokenizerJSON | string
): Promise<Tokenizer>
```

#### fromUrl()

从 URL 加载分词器。

```typescript
static async fromUrl(url: string): Promise<Tokenizer>
```

#### fromHuggingFace()

从 HuggingFace Hub 加载分词器。

```typescript
static async fromHuggingFace(
  modelId: string,
  options?: { revision?: string }
): Promise<Tokenizer>
```

### 示例

```typescript
import { Tokenizer } from 'edgeflowjs';

// 从 HuggingFace
const tokenizer = await Tokenizer.fromHuggingFace('bert-base-uncased');

// 从 URL
const tokenizer = await Tokenizer.fromUrl(
  'https://huggingface.co/bert-base-uncased/raw/main/tokenizer.json'
);
```

---

## encode()

将文本编码为 token ID。

```typescript
encode(
  text: string,
  options?: TokenizerOptions
): TokenizedOutput
```

### TokenizerOptions

```typescript
interface TokenizerOptions {
  // 是否添加特殊 token（如 [CLS], [SEP]）
  addSpecialTokens?: boolean;
  
  // 最大长度
  maxLength?: number;
  
  // 填充策略
  padding?: 'max_length' | 'longest' | false;
  
  // 是否截断
  truncation?: boolean;
  
  // 是否返回 attention mask
  returnAttentionMask?: boolean;
  
  // 是否返回 token type IDs
  returnTokenTypeIds?: boolean;
}
```

### TokenizedOutput

```typescript
interface TokenizedOutput {
  inputIds: number[];
  attentionMask?: number[];
  tokenTypeIds?: number[];
}
```

### 示例

```typescript
const encoded = tokenizer.encode('Hello world', {
  addSpecialTokens: true,
  maxLength: 128,
  padding: 'max_length',
  returnAttentionMask: true,
});

console.log(encoded.inputIds);      // [101, 7592, 2088, 102, 0, ...]
console.log(encoded.attentionMask); // [1, 1, 1, 1, 0, ...]
```

---

## encodeBatch()

批量编码多个文本。

```typescript
encodeBatch(
  texts: string[],
  options?: TokenizerOptions
): TokenizedOutput[]
```

### 示例

```typescript
const batch = tokenizer.encodeBatch(['Hello', 'World'], {
  padding: 'longest',
});
// 两个编码结果长度相同
```

---

## decode()

将 token ID 解码为文本。

```typescript
decode(
  ids: number[],
  skipSpecialTokens?: boolean
): string
```

### 示例

```typescript
const text = tokenizer.decode([101, 7592, 2088, 102], true);
console.log(text); // "hello world"
```

---

## decodeBatch()

批量解码。

```typescript
decodeBatch(
  batchIds: number[][],
  skipSpecialTokens?: boolean
): string[]
```

---

## Token/ID 转换

### getTokenId()

获取 token 对应的 ID。

```typescript
getTokenId(token: string): number | undefined
```

### getToken()

获取 ID 对应的 token。

```typescript
getToken(id: number): string | undefined
```

### 示例

```typescript
tokenizer.getTokenId('hello');  // 7592
tokenizer.getToken(7592);       // 'hello'
```

---

## 特殊 Token

### isSpecialToken()

判断是否为特殊 token。

```typescript
isSpecialToken(token: string): boolean
```

### getSpecialTokenIds()

获取特殊 token ID 映射。

```typescript
getSpecialTokenIds(): {
  padTokenId: number;
  unkTokenId: number;
  clsTokenId?: number;
  sepTokenId?: number;
  maskTokenId?: number;
  bosTokenId?: number;
  eosTokenId?: number;
}
```

---

## 配置信息

### getConfig()

获取分词器配置。

```typescript
getConfig(): {
  vocabSize: number;
  maxLength: number;
  padToken?: string;
  unkToken?: string;
  // ...
}
```

### vocabSize

词汇表大小。

```typescript
readonly vocabSize: number
```

---

## 类型定义

```typescript
// HuggingFace tokenizer.json 格式
interface HFTokenizerJSON {
  version: string;
  truncation?: object;
  padding?: object;
  added_tokens: Array<{
    id: number;
    content: string;
    special: boolean;
  }>;
  normalizer?: object;
  pre_tokenizer?: object;
  post_processor?: object;
  decoder?: object;
  model: {
    type: 'WordPiece' | 'BPE' | 'Unigram';
    vocab: Record<string, number>;
    unk_token?: string;
    // ...
  };
}
```
