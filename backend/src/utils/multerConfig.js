import fs from 'fs/promises';
import path from 'path';

import multer from 'multer';

import { fileValidator } from './fileValidation.js';
import logger from './logger.js';

/**
 * Multer configuration with memory storage for virus scanning
 */
export class MulterConfig {
  constructor(options = {}) {
    this.maxFileSize = options.maxFileSize || 25 * 1024 * 1024; // 25MB default
    this.uploadDir = options.uploadDir || './uploads';
    this.tempDir = options.tempDir || './uploads/temp';
    this.allowedTypes = options.allowedTypes || fileValidator.allowedTypes;
  }

  /**
   * Create multer instance with memory storage
   */
  createMulterInstance() {
    const storage = multer.memoryStorage();

    const fileFilter = (req, file, cb) => {
      try {
        // Basic validation
        if (!file.originalname || !file.mimetype) {
          return cb(new Error('Invalid file: missing name or MIME type'), false);
        }

        // Check if MIME type is in allowed list
        if (!this.allowedTypes.includes(file.mimetype)) {
          return cb(new Error(`File type ${file.mimetype} is not allowed`), false);
        }

        // Additional security: check file size early
        if (file.size > this.maxFileSize) {
          return cb(
            new Error(`File size ${file.size} exceeds maximum allowed size ${this.maxFileSize}`),
            false
          );
        }

        cb(null, true);
      } catch (error) {
        logger.error('File filter error:', error);
        cb(error, false);
      }
    };

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: this.maxFileSize,
        files: 10, // Maximum 10 files per upload
      },
    });
  }

  /**
   * Setup upload directories
   */
  async setupDirectories() {
    try {
      // Create main upload directory
      await fs.mkdir(this.uploadDir, { recursive: true });

      // Create subdirectories
      await fs.mkdir(path.join(this.uploadDir, 'files'), { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, 'thumbnails'), { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });

      logger.info('Upload directories created successfully', {
        uploadDir: this.uploadDir,
        tempDir: this.tempDir,
      });
    } catch (error) {
      logger.error('Failed to create upload directories:', error);
      throw error;
    }
  }

  /**
   * Process files after multer (virus scanning, storage, metadata)
   */
  async processUploadedFiles(files, options = {}) {
    const { userId, messageId } = options;
    const processedFiles = [];

    try {
      for (const file of files) {
        // Validate file with magic number verification
        const validatedMimeType = await fileValidator.validateFile(file);

        // Generate secure filename
        const secureFilename = fileValidator.generateSecureFilename(
          file.originalname,
          validatedMimeType
        );

        // Determine file path based on type
        const fileSubDir = fileValidator.isImageFile(validatedMimeType) ? 'files' : 'files';
        const filePath = path.join(this.uploadDir, fileSubDir, secureFilename);

        // Ensure directory exists
        await fs.mkdir(path.dirname(filePath), { recursive: true });

        // Write file to disk (after virus scanning in service)
        await fs.writeFile(filePath, file.buffer);

        // Create file metadata
        const fileMetadata = {
          filename: secureFilename,
          originalName: file.originalname,
          filePath,
          fileSize: file.size,
          mimeType: validatedMimeType,
          fileType: this.getFileTypeFromMime(validatedMimeType),
          isImage: fileValidator.isImageFile(validatedMimeType),
          uploaderId: userId,
          messageId: messageId || null,
        };

        processedFiles.push(fileMetadata);

        logger.info('File processed successfully', {
          originalName: file.originalname,
          secureFilename,
          size: file.size,
          mimeType: validatedMimeType,
          userId,
        });
      }

      return processedFiles;
    } catch (error) {
      logger.error('Error processing uploaded files:', error);

      // Clean up any files that were created
      for (const file of processedFiles) {
        try {
          if (file.filePath) {
            await fs.unlink(file.filePath);
          }
        } catch (cleanupError) {
          logger.error('Error cleaning up file after processing failure:', cleanupError);
        }
      }

      throw error;
    }
  }

  /**
   * Get file type category from MIME type
   */
  getFileTypeFromMime(mimeType) {
    if (fileValidator.isImageFile(mimeType)) {
      return 'image';
    } else if (fileValidator.isVideoFile(mimeType)) {
      return 'video';
    } else if (fileValidator.isAudioFile(mimeType)) {
      return 'audio';
    } else {
      return 'document';
    }
  }

  /**
   * Clean up temporary files older than specified hours
   */
  async cleanupTempFiles(hoursOld = 24) {
    try {
      const files = await fs.readdir(this.tempDir);
      const cutoffTime = Date.now() - hoursOld * 60 * 60 * 1000;

      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      logger.info('Temp file cleanup completed', { deletedCount, tempDir: this.tempDir });
      return deletedCount;
    } catch (error) {
      logger.error('Error during temp file cleanup:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const multerConfig = new MulterConfig();
export default multerConfig;
