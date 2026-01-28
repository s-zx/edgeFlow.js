/**
 * E2E Browser Tests
 * 
 * These tests verify that edgeFlow.js works correctly in a browser environment.
 * Run with: npm run test:e2e
 * 
 * Note: These tests require a browser environment (Playwright)
 * For now, they serve as documentation for browser behavior
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

// Skip these tests in non-browser environment
const isBrowser = typeof window !== 'undefined';
const describeIf = isBrowser ? describe : describe.skip;

describeIf('Browser E2E Tests', () => {
  describe('Global API', () => {
    it('should expose edgeFlow global', () => {
      // @ts-ignore
      expect(window.edgeFlow).toBeDefined();
    });

    it('should have pipeline function', () => {
      // @ts-ignore
      expect(typeof window.edgeFlow.pipeline).toBe('function');
    });

    it('should have tensor function', () => {
      // @ts-ignore
      expect(typeof window.edgeFlow.tensor).toBe('function');
    });
  });

  describe('Tensor Operations in Browser', () => {
    it('should create tensors', () => {
      // @ts-ignore
      const tensor = window.edgeFlow.tensor([1, 2, 3, 4], [2, 2]);
      expect(tensor.shape).toEqual([2, 2]);
    });

    it('should perform math operations', () => {
      // @ts-ignore
      const a = window.edgeFlow.tensor([1, 2], [2]);
      // @ts-ignore
      const b = window.edgeFlow.tensor([3, 4], [2]);
      const result = a.add(b);
      expect(result.toArray()).toEqual([4, 6]);
    });

    it('should compute softmax', () => {
      // @ts-ignore
      const tensor = window.edgeFlow.tensor([1, 2, 3], [3]);
      const result = tensor.softmax();
      const sum = result.sum();
      expect(Math.abs(sum - 1)).toBeLessThan(0.001);
    });
  });

  describe('Runtime Detection', () => {
    it('should detect available runtimes', async () => {
      // @ts-ignore
      const capabilities = await window.edgeFlow.detectCapabilities();
      
      expect(capabilities).toHaveProperty('webgpu');
      expect(capabilities).toHaveProperty('webnn');
      expect(capabilities).toHaveProperty('wasm');
    });

    it('should have WASM support', async () => {
      // @ts-ignore
      const capabilities = await window.edgeFlow.detectCapabilities();
      expect(capabilities.wasm).toBe(true);
    });
  });

  describe('Memory Management', () => {
    it('should track memory usage', () => {
      // @ts-ignore
      const stats = window.edgeFlow.getMemoryStats();
      
      expect(stats).toHaveProperty('allocated');
      expect(stats).toHaveProperty('tensorCount');
    });

    it('should dispose tensors', () => {
      // @ts-ignore
      const tensor = window.edgeFlow.tensor([1, 2, 3], [3]);
      tensor.dispose();
      
      expect(tensor.isDisposed).toBe(true);
    });
  });

  describe('IndexedDB Caching', () => {
    it('should cache models in IndexedDB', async () => {
      // @ts-ignore
      const stats = await window.edgeFlow.getModelCacheStats();
      
      expect(stats).toHaveProperty('models');
      expect(stats).toHaveProperty('totalSize');
    });

    it('should check if model is cached', async () => {
      // @ts-ignore
      const isCached = await window.edgeFlow.isModelCached('https://example.com/model.onnx');
      
      expect(typeof isCached).toBe('boolean');
    });
  });
});

/**
 * Tests that require actual model loading
 * These should be run manually or in CI with proper setup
 */
describe.skip('Model Loading E2E', () => {
  const MODEL_URL = 'https://huggingface.co/Xenova/distilbert-base-uncased-finetuned-sst-2-english/resolve/main/onnx/model_quantized.onnx';

  it('should load model from HuggingFace', async () => {
    // @ts-ignore
    const model = await window.edgeFlow.loadModel(MODEL_URL);
    
    expect(model).toHaveProperty('id');
    expect(model).toHaveProperty('metadata');
    
    model.dispose();
  }, 60000);

  it('should run inference', async () => {
    // @ts-ignore
    const pipeline = await window.edgeFlow.pipeline('text-classification');
    
    const result = await pipeline.run('I love this product!');
    
    expect(result).toHaveProperty('label');
    expect(result).toHaveProperty('score');
    
    pipeline.dispose();
  }, 60000);

  it('should handle batch processing', async () => {
    // @ts-ignore
    const pipeline = await window.edgeFlow.pipeline('text-classification');
    
    const results = await pipeline.run([
      'Great product!',
      'Terrible service.',
      'Just okay.',
    ]);
    
    expect(results.length).toBe(3);
    
    pipeline.dispose();
  }, 60000);
});

/**
 * Performance Tests
 */
describe.skip('Performance E2E', () => {
  it('should complete inference within time limit', async () => {
    // @ts-ignore
    const pipeline = await window.edgeFlow.pipeline('text-classification');
    
    const start = performance.now();
    await pipeline.run('Test text');
    const duration = performance.now() - start;
    
    // Should complete within 1 second after warm-up
    expect(duration).toBeLessThan(1000);
    
    pipeline.dispose();
  }, 60000);

  it('should handle concurrent inference', async () => {
    // @ts-ignore
    const pipeline = await window.edgeFlow.pipeline('text-classification');
    
    const start = performance.now();
    await Promise.all([
      pipeline.run('Text 1'),
      pipeline.run('Text 2'),
      pipeline.run('Text 3'),
      pipeline.run('Text 4'),
    ]);
    const duration = performance.now() - start;
    
    // Concurrent should be faster than 4x serial
    console.log(`Concurrent inference: ${duration}ms`);
    
    pipeline.dispose();
  }, 60000);
});
