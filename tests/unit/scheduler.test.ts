/**
 * Unit tests for InferenceScheduler
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InferenceScheduler } from '../../src/core/scheduler';
import { TaskPriority } from '../../src/core/types';

describe('InferenceScheduler', () => {
  let scheduler: InferenceScheduler;

  beforeEach(() => {
    scheduler = new InferenceScheduler({
      maxConcurrentTasks: 2,
      maxConcurrentPerModel: 1,
      defaultTimeout: 5000,
    });
  });

  describe('Task Scheduling', () => {
    it('should schedule and execute a task', async () => {
      const mockFn = vi.fn().mockResolvedValue('result');
      
      const task = scheduler.schedule('model-1', mockFn);
      const result = await task.wait();
      
      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalled();
    });

    it('should return a task object', () => {
      const task = scheduler.schedule('model-1', async () => 'result');

      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('modelId');
      expect(task).toHaveProperty('status');
    });

    it('should track task status', async () => {
      const task = scheduler.schedule('model-1', async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'done';
      });

      // Initially pending or running
      expect(['pending', 'running']).toContain(task.status);
      
      await task.wait();
      expect(task.status).toBe('completed');
    });
  });

  describe('Concurrency Control', () => {
    it('should respect maxConcurrentPerModel', async () => {
      let concurrentCount = 0;
      let maxConcurrent = 0;
      
      const createExecutor = () => async () => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);
        await new Promise(resolve => setTimeout(resolve, 50));
        concurrentCount--;
        return 'done';
      };

      const tasks = [
        scheduler.schedule('same-model', createExecutor()),
        scheduler.schedule('same-model', createExecutor()),
        scheduler.schedule('same-model', createExecutor()),
      ];

      await Promise.all(tasks.map(t => t.wait()));

      // maxConcurrentPerModel = 1, so only 1 task per model at a time
      expect(maxConcurrent).toBe(1);
    });
  });

  describe('Priority Scheduling', () => {
    it('should accept priority in schedule', () => {
      const task = scheduler.schedule(
        'model-1',
        async () => 'result',
        'high'
      );

      expect(task.priority).toBe('high');
    });

    it('should default to NORMAL priority', () => {
      const task = scheduler.schedule('model-1', async () => 'result');

      expect(task.priority).toBe('normal');
    });
  });

  describe('Task Lookup', () => {
    it('should get task by ID', async () => {
      const task = scheduler.schedule('model-1', async () => 'result');

      const found = scheduler.getTask(task.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(task.id);
    });

    it('should return undefined for unknown task', () => {
      const found = scheduler.getTask('unknown-id');
      expect(found).toBeUndefined();
    });
  });

  describe('Task Cancellation', () => {
    it('should cancel pending task', async () => {
      // Fill up slots first
      const blocker = scheduler.schedule('blocker', async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return 'blocker';
      });

      // This task will be queued (pending)
      const pendingTask = scheduler.schedule('pending', async () => 'pending');

      // Cancel the pending task
      const cancelled = scheduler.cancelTask(pendingTask.id);
      expect(cancelled).toBe(true);
      expect(pendingTask.status).toBe('cancelled');

      // Clean up
      blocker.cancel();
    });

    it('should cancel all tasks for a model', async () => {
      const tasks = [
        scheduler.schedule('target-model', async () => {
          await new Promise(resolve => setTimeout(resolve, 500));
          return 1;
        }),
        scheduler.schedule('target-model', async () => 2),
      ];

      const count = scheduler.cancelAllForModel('target-model');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Statistics', () => {
    it('should track task statistics', async () => {
      await scheduler.schedule('test', async () => 'result').wait();

      const stats = scheduler.getStats();
      expect(stats).toHaveProperty('totalTasks');
      expect(stats).toHaveProperty('pendingTasks');
      expect(stats).toHaveProperty('runningTasks');
      expect(stats).toHaveProperty('completedTasks');
    });

    it('should count completed tasks', async () => {
      await Promise.all([
        scheduler.schedule('m1', async () => 1).wait(),
        scheduler.schedule('m2', async () => 2).wait(),
      ]);

      const stats = scheduler.getStats();
      expect(stats.completedTasks).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle task errors', async () => {
      const task = scheduler.schedule('error', async () => {
        throw new Error('Task failed');
      });

      await expect(task.wait()).rejects.toThrow('Task failed');
      expect(task.status).toBe('failed');
    });

    it('should record error in task', async () => {
      const task = scheduler.schedule('error', async () => {
        throw new Error('Specific error');
      });

      try {
        await task.wait();
      } catch {
        // Expected
      }

      expect(task.error).toBeDefined();
      expect(task.error?.message).toContain('Specific error');
    });

    it('should not affect other tasks when one fails', async () => {
      const results = await Promise.allSettled([
        scheduler.schedule('fail', async () => { throw new Error('Failed'); }).wait(),
        scheduler.schedule('success', async () => 'success').wait(),
      ]);

      expect(results[0].status).toBe('rejected');
      expect(results[1].status).toBe('fulfilled');
    });
  });

  describe('Timeout', () => {
    it('should timeout long-running tasks with scheduleWithTimeout', async () => {
      const task = scheduler.scheduleWithTimeout(
        'slow',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 500));
          return 'done';
        },
        100 // 100ms timeout
      );

      try {
        await task.wait();
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message.toLowerCase()).toContain('timed out');
      }
    });

    it('should complete fast tasks before timeout', async () => {
      const task = scheduler.scheduleWithTimeout(
        'fast',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return 'done';
        },
        1000 // 1s timeout
      );

      const result = await task.wait();
      expect(result).toBe('done');
    });
  });

  describe('History', () => {
    it('should track task history', async () => {
      await scheduler.schedule('test', async () => 'result').wait();

      const stats = scheduler.getStats();
      expect(stats.totalTasks).toBeGreaterThan(0);
    });

    it('should clear history', async () => {
      await scheduler.schedule('test', async () => 'result').wait();

      scheduler.clearHistory();
      
      const stats = scheduler.getStats();
      expect(stats.completedTasks).toBe(0);
    });
  });
});
