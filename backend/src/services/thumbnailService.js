import fs from 'fs/promises';
import path from 'path';

import cron from 'node-cron';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

import { config } from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Thumbnail Generation Service
 * Handles async thumbnail generation and management
 */
class ThumbnailService {
  constructor() {
    this.uploadDir = config.fileUpload.uploadPath;
    this.thumbnailDir = path.join(this.uploadDir, 'thumbnails');
    this.processingQueue = new Map(); // In-memory queue for thumbnail generation
    this.processingInProgress = new Set();
    this.fallbackIcons = {
      document: path.join(this.uploadDir, 'icons', 'document.png'),
      video: path.join(this.uploadDir, 'icons', 'video.png'),
      audio: path.join(this.uploadDir, 'icons', 'audio.png'),
      archive: path.join(this.uploadDir, 'icons', 'archive.png'),
      code: path.join(this.uploadDir, 'icons', 'code.png'),
      default: path.join(this.uploadDir, 'icons', 'generic.png'),
    };
  }

  /**
   * Initialize the thumbnail service
   */
  async initialize() {
    try {
      // Create thumbnail directory
      await fs.mkdir(this.thumbnailDir, { recursive: true });

      // Create icons directory
      const iconsDir = path.join(this.uploadDir, 'icons');
      await fs.mkdir(iconsDir, { recursive: true });

      // Generate fallback icons if they don't exist
      await this.generateFallbackIcons();

      // Schedule cleanup job (daily at 2 AM)
      this.scheduleCleanupJob();

      logger.info('Thumbnail service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize thumbnail service:', error);
      throw error;
    }
  }

  /**
   * Generate fallback icons for different file types
   */
  async generateFallbackIcons() {
    try {
      for (const [fileType, iconPath] of Object.entries(this.fallbackIcons)) {
        try {
          await fs.access(iconPath);
          logger.debug(`Fallback icon exists for ${fileType}:`, iconPath);
        } catch (error) {
          // Icon doesn't exist, generate a simple placeholder
          await this.generatePlaceholderIcon(iconPath, fileType);
          logger.info(`Generated fallback icon for ${fileType}:`, iconPath);
        }
      }
    } catch (error) {
      logger.error('Error generating fallback icons:', error);
    }
  }

  /**
   * Generate a simple placeholder icon
   */
  async generatePlaceholderIcon(iconPath, fileType) {
    try {
      // Create a simple colored square with text
      const size = 200;
      const colors = {
        document: '#4A90E2',
        video: '#50C878',
        audio: '#FF6B6B',
        archive: '#FFD93D',
        code: '#6C5CE7',
        default: '#95A5A6',
      };

      const color = colors[fileType] || colors.default;
      const text = fileType.charAt(0).toUpperCase();

      // Create SVG icon
      const svgContent = `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="${color}"/>
          <text x="50%" y="55%" font-family="Arial, sans-serif" font-size="80" font-weight="bold"
                text-anchor="middle" fill="white">${text}</text>
        </svg>
      `;

      await fs.mkdir(path.dirname(iconPath), { recursive: true });
      await fs.writeFile(iconPath.replace('.png', '.svg'), svgContent);

      logger.debug(`Generated placeholder icon for ${fileType}`);
    } catch (error) {
      logger.error(`Error generating placeholder icon for ${fileType}:`, error);
    }
  }

  /**
   * Schedule daily cleanup job for orphaned thumbnails
   */
  scheduleCleanupJob() {
    // Run daily at 2:00 AM
    cron.schedule(
      '0 2 * * *',
      async () => {
        logger.info('Starting scheduled thumbnail cleanup');
        await this.cleanupOrphanedThumbnails();
      },
      {
        scheduled: false,
        timezone: process.env.TZ || 'UTC',
      }
    );

    logger.info('Daily thumbnail cleanup scheduled for 2:00 AM');
  }

  /**
   * Generate thumbnail for a file (async)
   */
  async generateThumbnail(fileId, filePath, fileType, mimeType) {
    try {
      if (this.processingQueue.has(fileId)) {
        logger.debug(`Thumbnail generation already queued for file ${fileId}`);
        return;
      }

      // Add to processing queue
      this.processingQueue.set(fileId, {
        fileId,
        filePath,
        fileType,
        mimeType,
        queuedAt: new Date(),
        status: 'queued',
      });

      // Process thumbnail in background
      this.processThumbnailQueue();

      logger.info('Thumbnail generation queued', { fileId, fileType, mimeType });
    } catch (error) {
      logger.error('Error queueing thumbnail generation:', error);
      throw error;
    }
  }

  /**
   * Process thumbnail generation queue
   */
  async processThumbnailQueue() {
    if (this.processingInProgress.size >= 5) {
      // Max 5 concurrent thumbnail generations
      logger.debug('Thumbnail processing queue is full, skipping');
      return;
    }

    for (const [fileId, queueItem] of this.processingQueue.entries()) {
      if (this.processingInProgress.has(fileId)) {
        continue; // Already being processed
      }

      if (this.processingInProgress.size >= 5) {
        break; // Max concurrent limit reached
      }

      // Start processing this thumbnail
      this.processingInProgress.add(fileId);
      this.processingQueue.get(fileId).status = 'processing';

      // Process in background
      this.processSingleThumbnail(queueItem)
        .then(() => {
          this.processingQueue.delete(fileId);
          this.processingInProgress.delete(fileId);
        })
        .catch(error => {
          logger.error(`Thumbnail generation failed for file ${fileId}:`, error);
          this.processingQueue.delete(fileId);
          this.processingInProgress.delete(fileId);
        });
    }
  }

  /**
   * Process a single thumbnail
   */
  async processSingleThumbnail(queueItem) {
    const { fileId, filePath, fileType, mimeType } = queueItem;

    try {
      // Check if file exists
      await fs.access(filePath);

      let thumbnailPath = null;

      if (fileType === 'image') {
        // Generate image thumbnail
        thumbnailPath = await this.generateImageThumbnail(filePath, fileId);
      } else {
        // Use fallback icon for non-image files
        thumbnailPath = await this.getFallbackIcon(fileType);
      }

      // Update file record with thumbnail path
      await this.updateFileThumbnailPath(fileId, thumbnailPath);

      logger.info('Thumbnail generated successfully', {
        fileId,
        fileType,
        thumbnailPath,
      });
    } catch (error) {
      logger.error(`Error processing thumbnail for file ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Generate thumbnail for image files
   */
  async generateImageThumbnail(filePath, fileId) {
    try {
      const ext = path.extname(filePath);
      const thumbnailFilename = `${fileId}_thumb${ext}`;
      const thumbnailPath = path.join(this.thumbnailDir, thumbnailFilename);

      // Ensure thumbnail directory exists
      await fs.mkdir(this.thumbnailDir, { recursive: true });

      // Generate thumbnail using Sharp
      await sharp(filePath)
        .resize(200, 200, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      return thumbnailPath;
    } catch (error) {
      logger.error(`Error generating image thumbnail for ${fileId}:`, error);

      // Fallback to generic icon
      return await this.getFallbackIcon('document');
    }
  }

  /**
   * Get fallback icon for non-image files
   */
  async getFallbackIcon(fileType) {
    try {
      const iconPath = this.fallbackIcons[fileType] || this.fallbackIcons.default;

      // Check if icon exists
      await fs.access(iconPath);
      return iconPath;
    } catch (error) {
      logger.warn(`Fallback icon not found for ${fileType}, using default`);
      return this.fallbackIcons.default;
    }
  }

  /**
   * Update file record with thumbnail path
   */
  async updateFileThumbnailPath(fileId, thumbnailPath) {
    try {
      const { File } = await import('../models/index.js');
      const file = await File.findByPk(fileId);

      if (file) {
        await file.update({ thumbnailPath });
        logger.debug('File thumbnail path updated', { fileId, thumbnailPath });
      }
    } catch (error) {
      logger.error('Error updating file thumbnail path:', error);
    }
  }

  /**
   * Get thumbnail path for a file
   */
  async getThumbnailPath(fileId) {
    try {
      const { File } = await import('../models/index.js');
      const file = await File.findByPk(fileId);

      if (!file) {
        throw new Error('File not found');
      }

      if (file.thumbnailPath) {
        // Check if thumbnail file exists
        try {
          await fs.access(file.thumbnailPath);
          return file.thumbnailPath;
        } catch (error) {
          logger.warn(`Thumbnail file not found on disk: ${file.thumbnailPath}`);
        }
      }

      // Generate thumbnail if it doesn't exist
      if (file.filePath && file.fileType) {
        await this.generateThumbnail(fileId, file.filePath, file.fileType, file.mimeType);

        // Wait a bit for thumbnail generation to complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Fetch updated file record
        const updatedFile = await File.findByPk(fileId);
        return updatedFile?.thumbnailPath || null;
      }

      return null;
    } catch (error) {
      logger.error('Error getting thumbnail path:', error);
      return null;
    }
  }

  /**
   * Cleanup orphaned thumbnails (daily job)
   */
  async cleanupOrphanedThumbnails() {
    try {
      logger.info('Starting orphaned thumbnail cleanup');

      // Get all thumbnail files
      const thumbnailFiles = await fs.readdir(this.thumbnailDir);

      let deletedCount = 0;

      for (const thumbnailFile of thumbnailFiles) {
        const thumbnailPath = path.join(this.thumbnailDir, thumbnailFile);
        const stats = await fs.stat(thumbnailPath);

        // Skip if file is newer than 30 days (safety margin)
        const age = Date.now() - stats.mtime.getTime();
        if (age < 30 * 24 * 60 * 60 * 1000) {
          continue;
        }

        // Extract file ID from thumbnail filename (format: {fileId}_thumb.ext)
        const fileId = thumbnailFile.split('_thumb')[0];

        if (!fileId) {
          logger.warn(`Could not extract file ID from thumbnail: ${thumbnailFile}`);
          continue;
        }

        // Check if original file still exists
        const { File } = await import('../models/index.js');
        const file = await File.findByPk(fileId);

        if (!file || !file.filePath) {
          // Original file doesn't exist, delete thumbnail
          await fs.unlink(thumbnailPath);
          deletedCount++;
          logger.debug(`Deleted orphaned thumbnail: ${thumbnailFile}`);
        }
      }

      logger.info(`Orphaned thumbnail cleanup completed: ${deletedCount} files deleted`);
    } catch (error) {
      logger.error('Error during orphaned thumbnail cleanup:', error);
    }
  }

  /**
   * Delete thumbnail when original file is deleted
   */
  async deleteThumbnail(fileId) {
    try {
      const { File } = await import('../models/index.js');
      const file = await File.findByPk(fileId);

      if (file && file.thumbnailPath) {
        try {
          await fs.unlink(file.thumbnailPath);
          logger.debug('Thumbnail deleted', { fileId, thumbnailPath: file.thumbnailPath });
        } catch (error) {
          logger.warn('Error deleting thumbnail file:', error);
        }
      }
    } catch (error) {
      logger.error('Error deleting thumbnail:', error);
    }
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      queued: this.processingQueue.size,
      processing: this.processingInProgress.size,
      queueItems: Array.from(this.processingQueue.entries()).map(([fileId, item]) => ({
        fileId,
        status: item.status,
        queuedAt: item.queuedAt,
      })),
    };
  }
}

// Create and export singleton instance
const thumbnailService = new ThumbnailService();
export default thumbnailService;
