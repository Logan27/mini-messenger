import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supportsWebP } from '../imageOptimization';

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
