# Tensor API

## EdgeFlowTensor

核心张量类，用于存储和操作多维数组。

### 构造函数

```typescript
new EdgeFlowTensor(
  data: TypedArray | number[],
  shape: number[],
  dtype?: DataType
)
```

#### 参数

| 参数 | 类型 | 描述 |
|------|------|------|
| data | `TypedArray \| number[]` | 数据 |
| shape | `number[]` | 形状 |
| dtype | `DataType` | 数据类型（默认: `'float32'`） |

#### DataType

```typescript
type DataType = 
  | 'float32' 
  | 'float16' 
  | 'int32' 
  | 'int64' 
  | 'uint8' 
  | 'int8' 
  | 'bool';
```

### 属性

| 属性 | 类型 | 描述 |
|------|------|------|
| `id` | `string` | 唯一标识符 |
| `shape` | `readonly number[]` | 张量形状 |
| `dtype` | `DataType` | 数据类型 |
| `size` | `number` | 元素总数 |
| `data` | `TypedArray` | 底层数据 |
| `isDisposed` | `boolean` | 是否已释放 |

### 示例

```typescript
import { EdgeFlowTensor } from 'edgeflowjs';

// 创建 1D 张量
const t1 = new EdgeFlowTensor([1, 2, 3, 4], [4]);

// 创建 2D 张量
const t2 = new EdgeFlowTensor([1, 2, 3, 4, 5, 6], [2, 3]);

// 指定数据类型
const int64Tensor = new EdgeFlowTensor([1, 2, 3], [3], 'int64');
```

---

## 数据访问

### get()

获取指定索引的元素。

```typescript
get(...indices: number[]): number
```

```typescript
const tensor = new EdgeFlowTensor([1, 2, 3, 4], [2, 2]);
tensor.get(0, 0); // 1
tensor.get(1, 1); // 4
```

### set()

设置指定索引的元素。

```typescript
set(value: number, ...indices: number[]): void
```

```typescript
tensor.set(99, 0, 0);
tensor.get(0, 0); // 99
```

### toArray()

转换为普通数组。

```typescript
toArray(): number[]
```

### toFloat32Array()

转换为 Float32Array。

```typescript
toFloat32Array(): Float32Array
```

---

## 形状操作

### reshape()

改变张量形状（不改变数据）。

```typescript
reshape(newShape: number[]): EdgeFlowTensor
```

```typescript
const t = new EdgeFlowTensor([1, 2, 3, 4, 5, 6], [2, 3]);
const reshaped = t.reshape([3, 2]);
// shape: [3, 2]
```

### transpose()

转置 2D 张量。

```typescript
transpose(): EdgeFlowTensor
```

```typescript
const t = new EdgeFlowTensor([1, 2, 3, 4], [2, 2]);
const transposed = t.transpose();
// [[1, 3], [2, 4]]
```

---

## 克隆与释放

### clone()

创建张量的深拷贝。

```typescript
clone(): EdgeFlowTensor
```

```typescript
const original = new EdgeFlowTensor([1, 2, 3], [3]);
const cloned = original.clone();
// 修改 original 不影响 cloned
```

### dispose()

释放张量占用的资源。

```typescript
dispose(): void
```

```typescript
const tensor = new EdgeFlowTensor([1, 2, 3], [3]);
tensor.dispose();
console.log(tensor.isDisposed); // true
```

::: warning
释放后的张量不能再使用，调用任何方法都会抛出错误。
:::

---

## 辅助函数

### tensor()

创建张量的便捷函数。

```typescript
import { tensor } from 'edgeflowjs';

const t = tensor([1, 2, 3, 4], [2, 2]);
```

### zeros()

创建全零张量。

```typescript
import { zeros } from 'edgeflowjs';

const t = zeros([3, 3]); // 3x3 全零矩阵
```

### ones()

创建全一张量。

```typescript
import { ones } from 'edgeflowjs';

const t = ones([2, 4]); // 2x4 全一矩阵
```

---

## 类型定义

```typescript
// 张量接口
interface Tensor {
  readonly id: string;
  readonly shape: Shape;
  readonly dtype: DataType;
  readonly size: number;
  readonly data: TypedArray;
  readonly isDisposed: boolean;
  
  get(...indices: number[]): number;
  set(value: number, ...indices: number[]): void;
  reshape(newShape: Shape): Tensor;
  transpose(): Tensor;
  clone(): Tensor;
  dispose(): void;
  toArray(): number[];
}

// 形状类型
type Shape = readonly number[];

// TypedArray 类型
type TypedArray = 
  | Float32Array 
  | Int32Array 
  | BigInt64Array 
  | Uint8Array 
  | Int8Array;
```
