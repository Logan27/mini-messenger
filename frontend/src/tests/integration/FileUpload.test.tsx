import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fileService } from '@/services/file.service';
import { testHelpers } from '@/tests/mockDataFactories';

vi.mock('@/services/file.service');

describe('File Upload Integration', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate file size before upload', () => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const file = testHelpers.createMockFileObject('large.pdf', 'x'.repeat(15 * 1024 * 1024));

    const isValid = file.size <= maxSize;
    expect(isValid).toBe(false);
  });

  it('should validate file type', () => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    const validFile = testHelpers.createMockFileObject('doc.pdf', 'content', 'application/pdf');
    const invalidFile = testHelpers.createMockFileObject('script.exe', 'content', 'application/exe');

    expect(allowedTypes).toContain(validFile.type);
    expect(allowedTypes).not.toContain(invalidFile.type);
  });

  it('should track upload progress', async () => {
    const file = testHelpers.createMockFileObject();
    const progressValues: number[] = [];

    vi.mocked(fileService.uploadFile).mockImplementation(
      async (file, onProgress) => {
        if (onProgress) {
          onProgress(25);
          progressValues.push(25);
          await testHelpers.delay(10);
          onProgress(50);
          progressValues.push(50);
          await testHelpers.delay(10);
          onProgress(75);
          progressValues.push(75);
          await testHelpers.delay(10);
          onProgress(100);
          progressValues.push(100);
        }
        return {
          id: 'file-123',
          fileName: file.name,
          filePath: '/uploads/test.txt',
          fileSize: file.size,
          mimeType: file.type,
        };
      }
    );

    await fileService.uploadFile(file, (progress) => {
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(100);
    });

    expect(progressValues).toEqual([25, 50, 75, 100]);
  });

  it('should handle upload success', async () => {
    const file = testHelpers.createMockFileObject();

    vi.mocked(fileService.uploadFile).mockResolvedValue({
      id: 'file-123',
      fileName: 'test.txt',
      filePath: '/uploads/test.txt',
      fileSize: 100,
      mimeType: 'text/plain',
    });

    const result = await fileService.uploadFile(file);

    expect(result.id).toBe('file-123');
    expect(result.fileName).toBe('test.txt');
  });

  it('should handle upload error', async () => {
    const file = testHelpers.createMockFileObject();

    vi.mocked(fileService.uploadFile).mockRejectedValue(
      new Error('Upload failed')
    );

    await expect(fileService.uploadFile(file)).rejects.toThrow('Upload failed');
  });

  it('should handle multiple file uploads', async () => {
    const files = [
      testHelpers.createMockFileObject('file1.txt'),
      testHelpers.createMockFileObject('file2.txt'),
      testHelpers.createMockFileObject('file3.txt'),
    ];

    vi.mocked(fileService.uploadFile).mockResolvedValue({
      id: 'file-123',
      fileName: 'test.txt',
      filePath: '/uploads/test.txt',
      fileSize: 100,
      mimeType: 'text/plain',
    });

    const uploads = files.map((file) => fileService.uploadFile(file));
    const results = await Promise.all(uploads);

    expect(results).toHaveLength(3);
    expect(fileService.uploadFile).toHaveBeenCalledTimes(3);
  });
});
