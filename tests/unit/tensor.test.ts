/**
 * Unit tests for EdgeFlowTensor
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { EdgeFlowTensor } from '../../src/core/tensor';

describe('EdgeFlowTensor', () => {
  describe('Creation', () => {
    it('should create a tensor from 1D array', () => {
      const tensor = new EdgeFlowTensor([1, 2, 3, 4], [4]);
      expect(tensor.shape).toEqual([4]);
      expect(tensor.dtype).toBe('float32');
      expect(tensor.size).toBe(4);
    });

    it('should create a tensor from 2D array', () => {
      const tensor = new EdgeFlowTensor([1, 2, 3, 4, 5, 6], [2, 3]);
      expect(tensor.shape).toEqual([2, 3]);
      expect(tensor.size).toBe(6);
    });

    it('should create a tensor from Float32Array', () => {
      const data = new Float32Array([1, 2, 3]);
      const tensor = new EdgeFlowTensor(data, [3]);
      expect(tensor.dtype).toBe('float32');
    });

    it('should create a tensor with int64 dtype', () => {
      const tensor = new EdgeFlowTensor([1, 2, 3], [3], 'int64');
      expect(tensor.dtype).toBe('int64');
      const data = tensor.data;
      expect(data instanceof BigInt64Array).toBe(true);
    });

    it('should throw error for mismatched shape and data', () => {
      expect(() => new EdgeFlowTensor([1, 2, 3], [2, 2])).toThrow();
    });

    it('should have unique ID', () => {
      const t1 = new EdgeFlowTensor([1], [1]);
      const t2 = new EdgeFlowTensor([1], [1]);
      expect(t1.id).not.toBe(t2.id);
    });

    it('should create scalar tensor', () => {
      const tensor = new EdgeFlowTensor([42], []);
      expect(tensor.shape).toEqual([]);
      expect(tensor.size).toBe(1);
    });
  });

  describe('Data Access', () => {
    it('should access data property', () => {
      const tensor = new EdgeFlowTensor([1, 2, 3], [3]);
      expect(tensor.data).toBeInstanceOf(Float32Array);
      expect(tensor.data.length).toBe(3);
    });

    it('should convert to array', () => {
      const tensor = new EdgeFlowTensor([1, 2, 3], [3]);
      expect(tensor.toArray()).toEqual([1, 2, 3]);
    });
  });

  describe('Indexing', () => {
    let tensor: EdgeFlowTensor;

    beforeEach(() => {
      tensor = new EdgeFlowTensor([1, 2, 3, 4, 5, 6], [2, 3]);
    });

    it('should get element by index', () => {
      expect(tensor.get(0, 0)).toBe(1);
      expect(tensor.get(0, 2)).toBe(3);
      expect(tensor.get(1, 0)).toBe(4);
      expect(tensor.get(1, 2)).toBe(6);
    });

    it('should set element by index', () => {
      tensor.set(99, 0, 0);
      expect(tensor.get(0, 0)).toBe(99);
    });

    it('should throw for out of bounds access', () => {
      expect(() => tensor.get(5, 5)).toThrow();
    });
  });

  describe('Shape Operations', () => {
    it('should reshape tensor', () => {
      const tensor = new EdgeFlowTensor([1, 2, 3, 4, 5, 6], [2, 3]);
      const reshaped = tensor.reshape([3, 2]);
      expect(reshaped.shape).toEqual([3, 2]);
      expect(reshaped.size).toBe(6);
    });

    it('should transpose 2D tensor', () => {
      const tensor = new EdgeFlowTensor([1, 2, 3, 4, 5, 6], [2, 3]);
      const transposed = tensor.transpose();
      expect(transposed.shape).toEqual([3, 2]);
      // Check values are transposed correctly
      expect(transposed.get(0, 0)).toBe(1);
      expect(transposed.get(0, 1)).toBe(4);
      expect(transposed.get(1, 0)).toBe(2);
    });

    it('should throw for invalid reshape', () => {
      const tensor = new EdgeFlowTensor([1, 2, 3, 4], [4]);
      expect(() => tensor.reshape([2, 3])).toThrow();
    });
  });

  describe('Clone', () => {
    it('should clone tensor', () => {
      const original = new EdgeFlowTensor([1, 2, 3], [3]);
      const cloned = original.clone();
      
      // Same values
      expect(cloned.toArray()).toEqual([1, 2, 3]);
      expect(cloned.shape).toEqual([3]);
      
      // Different objects
      expect(cloned).not.toBe(original);
      expect(cloned.id).not.toBe(original.id);
    });

    it('should clone independently', () => {
      const original = new EdgeFlowTensor([1, 2, 3], [3]);
      const cloned = original.clone();
      
      original.set(99, 0);
      expect(cloned.get(0)).toBe(1); // Clone unchanged
    });
  });

  describe('Memory Management', () => {
    it('should report disposed status', () => {
      const tensor = new EdgeFlowTensor([1, 2, 3], [3]);
      expect(tensor.isDisposed).toBe(false);
    });

    it('should dispose tensor', () => {
      const tensor = new EdgeFlowTensor([1, 2, 3], [3]);
      tensor.dispose();
      expect(tensor.isDisposed).toBe(true);
    });

    it('should throw on operation after dispose', () => {
      const tensor = new EdgeFlowTensor([1, 2, 3], [3]);
      tensor.dispose();
      expect(() => tensor.toArray()).toThrow();
    });

    it('should throw on data access after dispose', () => {
      const tensor = new EdgeFlowTensor([1, 2, 3], [3]);
      tensor.dispose();
      expect(() => tensor.data).toThrow();
    });

    it('should allow multiple dispose calls', () => {
      const tensor = new EdgeFlowTensor([1, 2, 3], [3]);
      tensor.dispose();
      expect(() => tensor.dispose()).not.toThrow();
    });
  });

  describe('String Representation', () => {
    it('should have toString method', () => {
      const tensor = new EdgeFlowTensor([1, 2, 3], [3]);
      const str = tensor.toString();
      expect(str).toContain('Tensor');
      expect(str).toContain('3');
      expect(str).toContain('float32');
    });
  });

  describe('Different Data Types', () => {
    it('should create uint8 tensor', () => {
      const tensor = new EdgeFlowTensor([0, 128, 255], [3], 'uint8');
      expect(tensor.dtype).toBe('uint8');
      expect(tensor.data).toBeInstanceOf(Uint8Array);
    });

    it('should create int32 tensor', () => {
      const tensor = new EdgeFlowTensor([1, 2, 3], [3], 'int32');
      expect(tensor.dtype).toBe('int32');
      expect(tensor.data).toBeInstanceOf(Int32Array);
    });

    it('should create bool tensor', () => {
      const tensor = new EdgeFlowTensor([1, 0, 1], [3], 'bool');
      expect(tensor.dtype).toBe('bool');
    });
  });
});
