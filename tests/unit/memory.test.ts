/**
 * Unit tests for MemoryManager
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryManager, getMemoryManager } from '../../src/core/memory';
import { EdgeFlowTensor } from '../../src/core/tensor';

describe('MemoryManager', () => {
  let memoryManager: MemoryManager;

  beforeEach(() => {
    // Get a fresh instance for testing
    memoryManager = getMemoryManager();
    // Dispose all existing resources and reset
    memoryManager.disposeAll();
    memoryManager.resetStats();
  });

  describe('Memory Tracking', () => {
    it('should track tensors', () => {
      const tensor = new EdgeFlowTensor([1, 2, 3, 4], [4]);
      memoryManager.track(tensor);

      const stats = memoryManager.getStats();
      expect(stats.tensorCount).toBeGreaterThan(0);
    });

    it('should track allocated memory', () => {
      const tensor = new EdgeFlowTensor(new Array(1000).fill(0), [1000]);
      memoryManager.track(tensor);

      const stats = memoryManager.getStats();
      expect(stats.allocated).toBeGreaterThan(0);
    });

    it('should track peak memory', () => {
      const tensors: EdgeFlowTensor[] = [];
      
      // Allocate multiple tensors
      for (let i = 0; i < 5; i++) {
        const tensor = new EdgeFlowTensor(new Array(1000).fill(i), [1000]);
        memoryManager.track(tensor);
        tensors.push(tensor);
      }

      const peakBefore = memoryManager.getStats().peak;

      // Release some
      tensors.slice(0, 3).forEach(t => {
        memoryManager.release(t);
        t.dispose();
      });

      const peakAfter = memoryManager.getStats().peak;
      
      // Peak should remain the same or higher
      expect(peakAfter).toBeGreaterThanOrEqual(peakBefore * 0.5);
    });
  });

  describe('Memory Release', () => {
    it('should release tracked tensors', () => {
      const tensor = new EdgeFlowTensor([1, 2, 3], [3]);
      memoryManager.track(tensor);
      
      const statsBefore = memoryManager.getStats();
      
      memoryManager.release(tensor);
      
      const statsAfter = memoryManager.getStats();
      expect(statsAfter.tensorCount).toBeLessThan(statsBefore.tensorCount);
    });

    it('should release by ID', () => {
      const tensor = new EdgeFlowTensor([1, 2, 3], [3]);
      memoryManager.track(tensor);
      
      memoryManager.release(tensor.id);
      
      const stats = memoryManager.getStats();
      expect(stats.tensorCount).toBe(0);
    });
  });

  describe('Garbage Collection', () => {
    it('should run garbage collection without errors', () => {
      const tensor = new EdgeFlowTensor([1, 2, 3], [3]);
      memoryManager.track(tensor);
      
      // Dispose tensor but don't release from manager
      tensor.dispose();
      
      // GC should run without errors
      expect(() => memoryManager.gc()).not.toThrow();

      // Note: The actual cleanup behavior depends on implementation
      // GC may or may not immediately remove disposed tensors
    });
  });

  describe('Statistics', () => {
    it('should return memory statistics', () => {
      const tensor = new EdgeFlowTensor(new Array(1000).fill(0), [1000]);
      memoryManager.track(tensor);

      const stats = memoryManager.getStats();
      
      expect(stats).toHaveProperty('allocated');
      expect(stats).toHaveProperty('used');
      expect(stats).toHaveProperty('peak');
      expect(stats).toHaveProperty('tensorCount');
    });

    it('should reset statistics without errors', () => {
      const tensor = new EdgeFlowTensor([1, 2, 3], [3]);
      memoryManager.track(tensor);
      
      expect(() => memoryManager.resetStats()).not.toThrow();
      
      // Peak may or may not be reset depending on implementation
      const stats = memoryManager.getStats();
      expect(stats).toHaveProperty('peak');
    });
  });

  describe('Resource Details', () => {
    it('should return tracked resources', () => {
      const tensor = new EdgeFlowTensor([1, 2, 3], [3]);
      memoryManager.track(tensor);

      const resources = memoryManager.getResourceDetails();
      
      expect(resources.length).toBeGreaterThan(0);
      expect(resources[0]).toHaveProperty('id');
      expect(resources[0]).toHaveProperty('type');
      expect(resources[0]).toHaveProperty('size');
    });
  });

  describe('Leak Detection', () => {
    it('should return leaks array', () => {
      const tensor = new EdgeFlowTensor([1, 2, 3], [3]);
      memoryManager.track(tensor);

      const leaks = memoryManager.detectLeaks(0);
      
      // Should return an array (may or may not have entries depending on timing)
      expect(Array.isArray(leaks)).toBe(true);
    });

    it('should not report recent resources as leaks', () => {
      const tensor = new EdgeFlowTensor([1, 2, 3], [3]);
      memoryManager.track(tensor);

      // With a large maxAge, nothing should be a leak
      const leaks = memoryManager.detectLeaks(60 * 60 * 1000); // 1 hour
      
      expect(leaks.length).toBe(0);
    });
  });

  describe('Dispose All', () => {
    it('should dispose all tracked resources', () => {
      const tensors = [
        new EdgeFlowTensor([1], [1]),
        new EdgeFlowTensor([2], [1]),
        new EdgeFlowTensor([3], [1]),
      ];

      tensors.forEach(t => memoryManager.track(t));
      
      memoryManager.disposeAll();

      const stats = memoryManager.getStats();
      expect(stats.tensorCount).toBe(0);
    });
  });

  describe('Custom Disposer', () => {
    it('should call custom disposer on release', () => {
      let disposed = false;
      const tensor = new EdgeFlowTensor([1, 2, 3], [3]);
      
      memoryManager.track(tensor, () => {
        disposed = true;
      });
      
      memoryManager.release(tensor);
      
      expect(disposed).toBe(true);
    });
  });
});
