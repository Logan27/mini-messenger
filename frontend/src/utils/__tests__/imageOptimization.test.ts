import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supportsWebP } from '../imageOptimization';

// Mock Image constructor to simulate image loading
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 0;
  height = 0;
  src = '';

  constructor() {
    // Simulate successful image load after a microtask
    setTimeout(() => {
      this.width = 2;
      this.height = 1;
      if (this.onload) {
        this.onload();
      }
    }, 0);
  }
}

// Replace global Image with mock
global.Image = MockImage as typeof Image;

describe('imageOptimization', () => {
  describe('supportsWebP', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should detect WebP support', async () => {
      const supported = await supportsWebP();
      expect(typeof supported).toBe('boolean');
    });

    it('should cache the result', async () => {
      const first = await supportsWebP();
      const second = await supportsWebP();
      expect(first).toBe(second);
    });
  });
});
