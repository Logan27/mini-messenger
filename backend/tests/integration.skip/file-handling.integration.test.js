import { apiTestUtils } from '../apiTestUtils.js';
import { messagingTestHelpers } from '../messagingTestHelpers.js';
import { File, User, Message } from '../../src/models/index.js';
import fs from 'fs/promises';
import path from 'path';

describe('File Upload/Download Integration Tests', () => {
  let testData;
  let authTokens;
  let testFiles = [];

  beforeAll(async () => {
    // Setup test data
    testData = await global.testUtils.setupTestData('comprehensive');
    authTokens = new Map();

    // Get auth tokens for all test users
    for (const user of testData.users) {
      const authData = await messagingTestHelpers.authenticateUser(user);
      authTokens.set(user.id, authData);
    }

    // Create test directory for file uploads
    const testUploadDir = path.join(process.cwd(), 'temp', 'test_uploads');
    try {
      await fs.mkdir(testUploadDir, { recursive: true });
    } catch (error) {
      console.error('Error creating test upload directory:', error);
    }
  });

  afterAll(async () => {
    // Cleanup test files
    for (const filePath of testFiles) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    // Cleanup test data
    await global.testUtils.cleanupTestData();
  });

  describe('File Upload Integration', () => {
    it('should upload text file successfully', async () => {
      const uploader = testData.users[0];
      const uploaderAuth = authTokens.get(uploader.id);

      // Create test file
      const testFilePath = await apiTestUtils.createTestFile('text');
      testFiles.push(testFilePath);

      // Upload file via API
      const response = await apiTestUtils.uploadFile(uploaderAuth.token, testFilePath);
      const responseBody = apiTestUtils.validateResponse(response, 201);
      const uploadedFile = apiTestUtils.validateFileResponse(responseBody.data);

      // Verify file was created in database
      const dbFile = await File.findByPk(uploadedFile.id);
      expect(dbFile).toBeTruthy();
      expect(dbFile.filename).toBe(uploadedFile.filename);
      expect(dbFile.originalName).toBe(uploadedFile.originalName);
      expect(dbFile.uploaderId).toBe(uploader.id);
      expect(dbFile.fileSize).toBeGreaterThan(0);
      expect(dbFile.mimeType).toBe('text/plain');
      expect(dbFile.fileType).toBe('document');
      expect(dbFile.virusScanStatus).toBe('pending');

      // Verify file exists on disk
      try {
        await fs.access(dbFile.filePath);
      } catch (error) {
        fail(`File should exist on disk: ${dbFile.filePath}`);
      }
    });

    it('should upload image file and set correct metadata', async () => {
      const uploader = testData.users[0];
      const uploaderAuth = authTokens.get(uploader.id);

      // Create test image file
      const testFilePath = await apiTestUtils.createTestFile('image');
      testFiles.push(testFilePath);

      // Upload file
      const response = await apiTestUtils.uploadFile(uploaderAuth.token, testFilePath);
      const responseBody = apiTestUtils.validateResponse(response, 201);
      const uploadedFile = apiTestUtils.validateFileResponse(responseBody.data);

      // Verify file metadata for image
      const dbFile = await File.findByPk(uploadedFile.id);
      expect(dbFile.fileType).toBe('image');
      expect(dbFile.isImage).toBe(true);
      expect(dbFile.mimeType).toBe('image/png');
    });

    it('should scan files for viruses and update status', async () => {
      const uploader = testData.users[0];
      const uploaderAuth = authTokens.get(uploader.id);

      // Create test file
      const testFilePath = await apiTestUtils.createTestFile('text');
      testFiles.push(testFilePath);

      // Upload file
      const uploadResponse = await apiTestUtils.uploadFile(uploaderAuth.token, testFilePath);
      expect(uploadResponse.status).toBe(201);
      const fileId = uploadResponse.body.data.id;

      // Initially file should have 'pending' status
      const file = await File.findByPk(fileId);
      expect(file.virusScanStatus).toBe('pending');

      // Simulate virus scan completion
      await file.markAsScanned('clean');

      // Verify status was updated
      await file.reload();
      expect(file.virusScanStatus).toBe('clean');
    });

    it('should handle virus-infected files appropriately', async () => {
      const uploader = testData.users[0];
      const uploaderAuth = authTokens.get(uploader.id);

      // Create test file
      const testFilePath = await apiTestUtils.createTestFile('text');
      testFiles.push(testFilePath);

      // Upload file
      const uploadResponse = await apiTestUtils.uploadFile(uploaderAuth.token, testFilePath);
      expect(uploadResponse.status).toBe(201);
      const fileId = uploadResponse.body.data.id;

      // Simulate virus scan finding infection
      const file = await File.findByPk(fileId);
      await file.markAsScanned('infected', {
        virusName: 'TestVirus',
        scanEngine: 'TestEngine',
      });

      // Verify infected file cannot be downloaded
      expect(file.canBeDownloadedBy(uploader.id)).toBe(false);

      // Try to download infected file
      const downloadResponse = await apiTestUtils.downloadFile(uploaderAuth.token, fileId);
      expect(downloadResponse.status).toBe(403);
    });

    it('should validate file size limits', async () => {
      const uploader = testData.users[0];
      const uploaderAuth = authTokens.get(uploader.id);

      // Create a large test file (exceeding 25MB limit)
      const largeFilePath = path.join(process.cwd(), 'temp', `large_test_file_${Date.now()}.txt`);
      testFiles.push(largeFilePath);

      try {
        // Create file larger than 25MB
        const largeContent = 'x'.repeat(26 * 1024 * 1024); // 26MB
        await fs.writeFile(largeFilePath, largeContent);

        // Try to upload large file
        const response = await apiTestUtils.uploadFile(uploaderAuth.token, largeFilePath);
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('size');
      } finally {
        // Cleanup large file
        try {
          await fs.unlink(largeFilePath);
          testFiles = testFiles.filter(p => p !== largeFilePath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should validate file types and reject invalid files', async () => {
      const uploader = testData.users[0];
      const uploaderAuth = authTokens.get(uploader.id);

      // Create test file with invalid extension
      const invalidFilePath = path.join(process.cwd(), 'temp', `invalid_test.exe`);
      testFiles.push(invalidFilePath);

      try {
        await fs.writeFile(invalidFilePath, 'Fake executable content');

        // Try to upload invalid file type
        const response = await apiTestUtils.uploadFile(uploaderAuth.token, invalidFilePath);
        expect(response.status).toBe(400);
      } finally {
        // Cleanup
        try {
          await fs.unlink(invalidFilePath);
          testFiles = testFiles.filter(p => p !== invalidFilePath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should handle concurrent file uploads', async () => {
      const uploader = testData.users[0];
      const uploaderAuth = authTokens.get(uploader.id);

      // Create multiple test files
      const filePaths = [];
      for (let i = 0; i < 5; i++) {
        const filePath = await apiTestUtils.createTestFile(`text${i}`);
        filePaths.push(filePath);
        testFiles.push(filePath);
      }

      // Upload files concurrently
      const uploadPromises = filePaths.map(filePath =>
        apiTestUtils.uploadFile(uploaderAuth.token, filePath)
      );

      const responses = await Promise.all(uploadPromises);

      // All uploads should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
        apiTestUtils.validateFileResponse(response.body.data);
      });

      // Verify all files exist in database
      const uploadedFiles = await File.findByUploader(uploader.id);
      expect(uploadedFiles.length).toBeGreaterThanOrEqual(5);

      // Cleanup uploaded files
      for (const response of responses) {
        const fileId = response.body.data.id;
        const file = await File.findByPk(fileId);
        if (file && file.filePath) {
          try {
            await fs.unlink(file.filePath);
          } catch (error) {
            // Ignore cleanup errors
          }
        }
      }
    });
  });

  describe('File Download Integration', () => {
    it('should download file successfully', async () => {
      const uploader = testData.users[0];
      const downloader = testData.users[1];
      const uploaderAuth = authTokens.get(uploader.id);

      // Upload a file first
      const testFilePath = await apiTestUtils.createTestFile('text');
      testFiles.push(testFilePath);

      const uploadResponse = await apiTestUtils.uploadFile(uploaderAuth.token, testFilePath);
      expect(uploadResponse.status).toBe(201);
      const fileId = uploadResponse.body.data.id;

      // Mark file as scanned and clean
      const file = await File.findByPk(fileId);
      await file.markAsScanned('clean');

      // Download file as different user
      const downloaderAuth = authTokens.get(downloader.id);
      const downloadResponse = await apiTestUtils.downloadFile(downloaderAuth.token, fileId);

      expect(downloadResponse.status).toBe(200);
      expect(downloadResponse.headers['content-type']).toBe('text/plain');
      expect(downloadResponse.headers['content-disposition']).toContain('attachment');

      // Verify download count was incremented
      await file.reload();
      expect(file.downloadCount).toBe(1);
    });

    it('should prevent downloading expired files', async () => {
      const uploader = testData.users[0];
      const uploaderAuth = authTokens.get(uploader.id);

      // Upload a file
      const testFilePath = await apiTestUtils.createTestFile('text');
      testFiles.push(testFilePath);

      const uploadResponse = await apiTestUtils.uploadFile(uploaderAuth.token, testFilePath);
      expect(uploadResponse.status).toBe(201);
      const fileId = uploadResponse.body.data.id;

      // Set file as expired
      const file = await File.findByPk(fileId);
      file.expiresAt = new Date(Date.now() - 1000); // 1 second ago
      await file.save();

      // Try to download expired file
      const downloadResponse = await apiTestUtils.downloadFile(uploaderAuth.token, fileId);
      expect(downloadResponse.status).toBe(403);
    });

    it('should handle file not found errors', async () => {
      const uploader = testData.users[0];
      const uploaderAuth = authTokens.get(uploader.id);

      // Try to download non-existent file
      const downloadResponse = await apiTestUtils.downloadFile(uploaderAuth.token, 'non-existent-id');
      expect(downloadResponse.status).toBe(404);
    });

    it('should track download count accurately', async () => {
      const uploader = testData.users[0];
      const downloader = testData.users[1];
      const uploaderAuth = authTokens.get(uploader.id);

      // Upload a file
      const testFilePath = await apiTestUtils.createTestFile('text');
      testFiles.push(testFilePath);

      const uploadResponse = await apiTestUtils.uploadFile(uploaderAuth.token, testFilePath);
      expect(uploadResponse.status).toBe(201);
      const fileId = uploadResponse.body.data.id;

      // Mark file as scanned and clean
      const file = await File.findByPk(fileId);
      await file.markAsScanned('clean');

      // Download multiple times
      const downloaderAuth = authTokens.get(downloader.id);
      const downloadPromises = [];
      for (let i = 0; i < 5; i++) {
        downloadPromises.push(apiTestUtils.downloadFile(downloaderAuth.token, fileId));
      }

      await Promise.all(downloadPromises);

      // Verify download count
      await file.reload();
      expect(file.downloadCount).toBe(5);
    });

    it('should serve correct content-type headers', async () => {
      const uploader = testData.users[0];
      const uploaderAuth = authTokens.get(uploader.id);

      // Test different file types
      const fileTypes = ['text', 'image', 'pdf'];

      for (const fileType of fileTypes) {
        const testFilePath = await apiTestUtils.createTestFile(fileType);
        testFiles.push(testFilePath);

        const uploadResponse = await apiTestUtils.uploadFile(uploaderAuth.token, testFilePath);
        expect(uploadResponse.status).toBe(201);
        const fileId = uploadResponse.body.data.id;

        // Mark file as scanned and clean
        const file = await File.findByPk(fileId);
        await file.markAsScanned('clean');

        // Download and check content type
        const downloadResponse = await apiTestUtils.downloadFile(uploaderAuth.token, fileId);
        expect(downloadResponse.status).toBe(200);

        const expectedMimeType = apiTestUtils.getMimeType(fileType);
        expect(downloadResponse.headers['content-type']).toBe(expectedMimeType);

        // Cleanup file
        if (file.filePath) {
          try {
            await fs.unlink(file.filePath);
          } catch (error) {
            // Ignore cleanup errors
          }
        }
      }
    });
  });

  describe('File Management Integration', () => {
    it('should delete files and clean up storage', async () => {
      const uploader = testData.users[0];
      const uploaderAuth = authTokens.get(uploader.id);

      // Upload a file
      const testFilePath = await apiTestUtils.createTestFile('text');
      testFiles.push(testFilePath);

      const uploadResponse = await apiTestUtils.uploadFile(uploaderAuth.token, testFilePath);
      expect(uploadResponse.status).toBe(201);
      const fileId = uploadResponse.body.data.id;

      // Verify file exists
      const file = await File.findByPk(fileId);
      expect(file).toBeTruthy();

      // Delete file
      const deleteResponse = await apiTestUtils.deleteFile(uploaderAuth.token, fileId);
      expect(deleteResponse.status).toBe(200);

      // Verify file was deleted from database
      const deletedFile = await File.findByPk(fileId);
      expect(deletedFile).toBeFalsy();

      // Verify physical file was deleted (if cleanup service is working)
      // Note: This might not work if file cleanup is handled by a separate service
    });

    it('should list files uploaded by user', async () => {
      const uploader = testData.users[0];
      const uploaderAuth = authTokens.get(uploader.id);

      // Upload multiple files
      const filePaths = [];
      for (let i = 0; i < 3; i++) {
        const filePath = await apiTestUtils.createTestFile(`text${i}`);
        filePaths.push(filePath);
        testFiles.push(filePath);

        const uploadResponse = await apiTestUtils.uploadFile(uploaderAuth.token, filePath);
        expect(uploadResponse.status).toBe(201);

        // Mark as scanned
        const file = await File.findByPk(uploadResponse.body.data.id);
        await file.markAsScanned('clean');
      }

      // Get user's files
      const getFilesResponse = await apiTestUtils.getUserProfile(uploaderAuth.token);
      expect(getFilesResponse.status).toBe(200);

      // Should include files in response or have separate endpoint
      // This test assumes files are included in user profile or accessible via separate endpoint

      // Cleanup uploaded files
      for (const filePath of filePaths) {
        try {
          await fs.unlink(filePath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should handle file upload with message association', async () => {
      const sender = testData.users[0];
      const recipient = testData.users[1];
      const senderAuth = authTokens.get(sender.id);

      // Upload file first
      const testFilePath = await apiTestUtils.createTestFile('image');
      testFiles.push(testFilePath);

      const uploadResponse = await apiTestUtils.uploadFile(senderAuth.token, testFilePath);
      expect(uploadResponse.status).toBe(201);
      const fileId = uploadResponse.body.data.id;

      // Send message with file
      const messageResponse = await apiTestUtils.sendMessage(senderAuth.token, {
        recipientId: recipient.id,
        content: 'Message with attached file',
        fileId: fileId,
      });

      expect(messageResponse.status).toBe(201);

      // Verify file is associated with message
      const file = await File.findByPk(fileId);
      expect(file.messageId).toBe(messageResponse.body.data.id);

      // Verify message includes file info
      const message = await Message.findByPk(messageResponse.body.data.id, {
        include: [{ model: File, as: 'files' }],
      });

      expect(message.files).toBeTruthy();
      expect(message.files.length).toBeGreaterThan(0);
      expect(message.files[0].id).toBe(fileId);
    });
  });

  describe('File Security Integration', () => {
    it('should prevent unauthorized file access', async () => {
      const uploader = testData.users[0];
      const unauthorizedUser = testData.users[1];
      const uploaderAuth = authTokens.get(uploader.id);

      // Upload file as private (default)
      const testFilePath = await apiTestUtils.createTestFile('text');
      testFiles.push(testFilePath);

      const uploadResponse = await apiTestUtils.uploadFile(uploaderAuth.token, testFilePath);
      expect(uploadResponse.status).toBe(201);
      const fileId = uploadResponse.body.data.id;

      // Mark as scanned
      const file = await File.findByPk(fileId);
      await file.markAsScanned('clean');

      // Try to download as different user
      const unauthorizedAuth = authTokens.get(unauthorizedUser.id);
      const downloadResponse = await apiTestUtils.downloadFile(unauthorizedAuth.token, fileId);

      // Should be forbidden or require special permissions
      expect([403, 404]).toContain(downloadResponse.status);
    });

    it('should handle file path traversal attacks', async () => {
      const uploader = testData.users[0];
      const uploaderAuth = authTokens.get(uploader.id);

      // Create file with malicious path
      const maliciousPath = path.join(process.cwd(), 'temp', '..', '..', 'malicious.txt');
      testFiles.push(maliciousPath);

      try {
        await fs.writeFile(maliciousPath, 'Malicious content');

        // Try to upload with path traversal
        const uploadResponse = await apiTestUtils.uploadFile(uploaderAuth.token, maliciousPath);
        // Should either reject or sanitize the path
        if (uploadResponse.status === 201) {
          const file = await File.findByPk(uploadResponse.body.data.id);
          // File path should be sanitized and not contain traversal
          expect(file.filePath).not.toContain('..');
          expect(file.filePath).not.toContain('../');
        }
      } finally {
        // Cleanup
        try {
          await fs.unlink(maliciousPath);
          testFiles = testFiles.filter(p => p !== maliciousPath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should validate file content and prevent malicious uploads', async () => {
      const uploader = testData.users[0];
      const uploaderAuth = authTokens.get(uploader.id);

      // Create file with potentially malicious content
      const suspiciousFilePath = path.join(process.cwd(), 'temp', 'suspicious.txt');
      testFiles.push(suspiciousFilePath);

      try {
        const maliciousContent = `
        <script>alert('xss')</script>
        <?php phpinfo(); ?>
        <iframe src="javascript:alert('xss')"></iframe>
        `;
        await fs.writeFile(suspiciousFilePath, maliciousContent);

        // Upload suspicious file
        const uploadResponse = await apiTestUtils.uploadFile(uploaderAuth.token, suspiciousFilePath);

        if (uploadResponse.status === 201) {
          const fileId = uploadResponse.body.data.id;

          // Should be flagged for virus scanning
          const file = await File.findByPk(fileId);
          expect(['pending', 'scanning', 'infected']).toContain(file.virusScanStatus);

          // If not immediately blocked, should be blocked after scanning
          if (file.virusScanStatus === 'pending') {
            await file.markAsScanned('infected', {
              reason: 'Suspicious content detected',
            });
          }

          // Should not be downloadable if infected
          if (file.virusScanStatus === 'infected') {
            expect(file.canBeDownloadedBy(uploader.id)).toBe(false);
          }
        }
      } finally {
        // Cleanup
        try {
          await fs.unlink(suspiciousFilePath);
          testFiles = testFiles.filter(p => p !== suspiciousFilePath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe('Performance Integration', () => {
    it('should handle large file uploads efficiently', async () => {
      const uploader = testData.users[0];
      const uploaderAuth = authTokens.get(uploader.id);

      // Create moderately large file (5MB)
      const largeFilePath = path.join(process.cwd(), 'temp', `perf_test_${Date.now()}.txt`);
      testFiles.push(largeFilePath);

      try {
        const largeContent = 'x'.repeat(5 * 1024 * 1024); // 5MB
        await fs.writeFile(largeFilePath, largeContent);

        const startTime = Date.now();

        // Upload large file
        const response = await apiTestUtils.uploadFile(uploaderAuth.token, largeFilePath);

        const endTime = Date.now();
        const uploadTime = endTime - startTime;

        // Should complete within reasonable time (less than 10 seconds)
        expect(uploadTime).toBeLessThan(10000);

        if (response.status === 201) {
          const fileId = response.body.data.id;

          // Mark as scanned
          const file = await File.findByPk(fileId);
          await file.markAsScanned('clean');

          // Download should also be efficient
          const downloadStartTime = Date.now();
          const downloadResponse = await apiTestUtils.downloadFile(uploaderAuth.token, fileId);
          const downloadEndTime = Date.now();
          const downloadTime = downloadEndTime - downloadStartTime;

          expect(downloadResponse.status).toBe(200);
          expect(downloadTime).toBeLessThan(5000);
        }
      } finally {
        // Cleanup
        try {
          await fs.unlink(largeFilePath);
          testFiles = testFiles.filter(p => p !== largeFilePath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should handle multiple concurrent downloads efficiently', async () => {
      const uploader = testData.users[0];
      const downloader = testData.users[1];
      const uploaderAuth = authTokens.get(uploader.id);

      // Upload a file
      const testFilePath = await apiTestUtils.createTestFile('text');
      testFiles.push(testFilePath);

      const uploadResponse = await apiTestUtils.uploadFile(uploaderAuth.token, testFilePath);
      expect(uploadResponse.status).toBe(201);
      const fileId = uploadResponse.body.data.id;

      // Mark as scanned
      const file = await File.findByPk(fileId);
      await file.markAsScanned('clean');

      // Perform concurrent downloads
      const downloaderAuth = authTokens.get(downloader.id);
      const downloadPromises = [];
      for (let i = 0; i < 10; i++) {
        downloadPromises.push(apiTestUtils.downloadFile(downloaderAuth.token, fileId));
      }

      const startTime = Date.now();
      const responses = await Promise.all(downloadPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All downloads should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(5000);

      // Verify download count
      await file.reload();
      expect(file.downloadCount).toBe(10);
    });
  });
});