import fs from 'fs/promises';
import path from 'path';

import cron from 'node-cron';
import { Op } from 'sequelize';

import { config } from '../config/index.js';
import logger from '../utils/logger.js';

import thumbnailService from './thumbnailService.js';

/**
 * File Cleanup Service
 * Handles file deletion, disk space monitoring, and cleanup operations
 */
class FileCleanupService {
  constructor() {
    this.uploadDir = config.fileUpload.uploadPath;
    this.quarantineDir = path.join(this.uploadDir, 'quarantine');
    this.tempDir = config.fileUpload.tempDir;
    this.maxDiskUsage = 0.85; // 85% disk usage threshold
    this.cleanupInProgress = false;
    this.recoveryWindow = 24 * 60 * 60 * 1000; // 24 hours for file recovery
  }

  /**
   * Initialize the file cleanup service
   */
  async initialize() {
    try {
      // Create necessary directories
      await fs.mkdir(this.quarantineDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });

      // Schedule cleanup jobs
      this.scheduleCleanupJobs();

      // Perform initial disk space check
      await this.checkDiskSpace();

      logger.info('File cleanup service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize file cleanup service:', error);
      throw error;
    }
  }

  /**
   * Schedule cleanup jobs
   */
  scheduleCleanupJobs() {
    // Clean up expired files every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      logger.info('Starting scheduled expired file cleanup');
      await this.cleanupExpiredFiles();
    });

    // Clean up orphaned files daily at 1 AM
    cron.schedule('0 1 * * *', async () => {
      logger.info('Starting scheduled orphaned file cleanup');
      await this.cleanupOrphanedFiles();
    });

    // Check disk space every hour
    cron.schedule('0 * * * *', async () => {
      await this.checkDiskSpace();
    });

    // Clean up temporary files every 12 hours
    cron.schedule('0 */12 * * *', async () => {
      logger.info('Starting temporary file cleanup');
      await this.cleanupTempFiles();
    });

    logger.info('File cleanup jobs scheduled');
  }

  /**
   * Mark file for deletion (soft delete with recovery window)
   */
  async markFileForDeletion(fileId, reason = 'user_deleted') {
    try {
      const { File } = await import('../models/index.js');
      const file = await File.findByPk(fileId);

      if (!file) {
        throw new Error('File not found');
      }

      // Set deletion metadata
      const deletionInfo = {
        markedForDeletion: true,
        deletionReason: reason,
        markedAt: new Date(),
        actualDeletionTime: new Date(Date.now() + this.recoveryWindow),
      };

      // Update file record with deletion info in virusScanResult
      await file.update({
        virusScanResult: {
          ...file.virusScanResult,
          deletionInfo,
        },
      });

      // Log file deletion marking
      logger.info('File marked for deletion', {
        fileId,
        filename: file.filename,
        reason,
        actualDeletionTime: deletionInfo.actualDeletionTime,
      });

      return deletionInfo;
    } catch (error) {
      logger.error('Error marking file for deletion:', error);
      throw error;
    }
  }

  /**
   * Clean up expired files (run every 6 hours)
   */
  async cleanupExpiredFiles() {
    if (this.cleanupInProgress) {
      logger.info('Cleanup already in progress, skipping');
      return;
    }

    this.cleanupInProgress = true;

    try {
      logger.info('Starting expired file cleanup');

      const { File } = await import('../models/index.js');

      // Find files that are expired or marked for deletion past recovery window
      const expiredFiles = await File.findAll({
        where: {
          [Op.or]: [
            {
              expiresAt: {
                [Op.lt]: new Date(),
              },
            },
            {
              virusScanStatus: 'deleted',
              '$virusScanResult.markedAt$': {
                [Op.lt]: new Date(Date.now() - this.recoveryWindow),
              },
            },
          ],
        },
      });

      let deletedCount = 0;
      const errors = [];

      for (const file of expiredFiles) {
        try {
          await this.deleteFilePermanently(file);
          deletedCount++;
        } catch (error) {
          logger.error(`Error deleting expired file ${file.id}:`, error);
          errors.push({ fileId: file.id, error: error.message });
        }
      }

      logger.info(`Expired file cleanup completed: ${deletedCount} files deleted`);

      if (errors.length > 0) {
        logger.warn('Errors during expired file cleanup:', errors);
      }
    } catch (error) {
      logger.error('Error during expired file cleanup:', error);
    } finally {
      this.cleanupInProgress = false;
    }
  }

  /**
   * Clean up orphaned files (files on disk but not in database)
   */
  async cleanupOrphanedFiles() {
    try {
      logger.info('Starting orphaned file cleanup');

      const { File } = await import('../models/index.js');

      // Get all files from database
      const dbFiles = await File.findAll({
        attributes: ['id', 'filePath', 'thumbnailPath'],
        where: {
          filePath: {
            [Op.ne]: null,
          },
        },
      });

      const dbFilePaths = new Set();
      const dbThumbnailPaths = new Set();

      // Collect all valid file paths from database
      for (const file of dbFiles) {
        if (file.filePath) {
          dbFilePaths.add(file.filePath);
        }
        if (file.thumbnailPath) {
          dbThumbnailPaths.add(file.thumbnailPath);
        }
      }

      // Scan upload directory for files
      await this.scanAndDeleteOrphanedFiles(this.uploadDir, dbFilePaths, 'file');
      await this.scanAndDeleteOrphanedFiles(this.quarantineDir, new Set(), 'quarantine');

      logger.info('Orphaned file cleanup completed');
    } catch (error) {
      logger.error('Error during orphaned file cleanup:', error);
    }
  }

  /**
   * Scan directory and delete orphaned files
   */
  async scanAndDeleteOrphanedFiles(dirPath, validPaths, fileType) {
    try {
      const files = await fs.readdir(dirPath);
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(dirPath, file);

        // Skip directories and log files
        const stats = await fs.stat(filePath);
        if (stats.isDirectory()) {
          continue;
        }

        // Skip log files and system files
        if (file.endsWith('.log') || file.startsWith('.')) {
          continue;
        }

        // Check if file is in valid paths set
        if (!validPaths.has(filePath)) {
          try {
            await fs.unlink(filePath);
            deletedCount++;
            logger.debug(`Deleted orphaned ${fileType}:`, filePath);
          } catch (error) {
            logger.error(`Error deleting orphaned ${fileType} ${filePath}:`, error);
          }
        }
      }

      if (deletedCount > 0) {
        logger.info(`Deleted ${deletedCount} orphaned ${fileType}s from ${dirPath}`);
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error(`Error scanning directory ${dirPath}:`, error);
      }
    }
  }

  /**
   * Delete file permanently from disk and database
   */
  async deleteFilePermanently(file) {
    try {
      // Delete thumbnail first
      if (file.thumbnailPath) {
        await thumbnailService.deleteThumbnail(file.id);
      }

      // Delete main file
      if (file.filePath) {
        try {
          await fs.unlink(file.filePath);
          logger.debug('Main file deleted from disk:', file.filePath);
        } catch (error) {
          if (error.code !== 'ENOENT') {
            throw error;
          }
          logger.warn('Main file not found on disk:', file.filePath);
        }
      }

      // Remove from database
      await file.destroy();

      logger.info('File permanently deleted', {
        fileId: file.id,
        filename: file.filename,
        filePath: file.filePath,
      });
    } catch (error) {
      logger.error(`Error permanently deleting file ${file.id}:`, error);
      throw error;
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles() {
    try {
      logger.info('Starting temporary file cleanup');

      const files = await fs.readdir(this.tempDir);
      const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours old

      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath);

        // Delete files older than 24 hours
        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      logger.info(`Temporary file cleanup completed: ${deletedCount} files deleted`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error('Error during temporary file cleanup:', error);
      }
    }
  }

  /**
   * Check disk space usage and trigger cleanup if needed
   */
  async checkDiskSpace() {
    try {
      const stats = (await fs.statvfs)
        ? await fs.statvfs(this.uploadDir)
        : await this.getDiskUsageFallback();

      const usage = 1 - stats.f_bavail / stats.f_blocks;

      logger.debug('Disk usage check', {
        usage: `${(usage * 100).toFixed(2)}%`,
        available: stats.f_bavail,
        total: stats.f_blocks,
      });

      if (usage > this.maxDiskUsage) {
        logger.warn(`Disk usage high: ${(usage * 100).toFixed(2)}%, triggering cleanup`);
        await this.performEmergencyCleanup();
      }

      return {
        usage,
        available: stats.f_bavail,
        total: stats.f_blocks,
        threshold: this.maxDiskUsage,
      };
    } catch (error) {
      logger.error('Error checking disk space:', error);

      // If we can't check disk space, assume it's okay
      return {
        usage: 0,
        available: 0,
        total: 0,
        threshold: this.maxDiskUsage,
      };
    }
  }

  /**
   * Fallback disk usage check for systems without statvfs
   */
  async getDiskUsageFallback() {
    // This is a simplified fallback - in production you might use a system command
    return {
      f_blocks: 1000000,
      f_bavail: 800000,
    };
  }

  /**
   * Perform emergency cleanup when disk space is low
   */
  async performEmergencyCleanup() {
    try {
      logger.info('Starting emergency cleanup due to low disk space');

      // First, clean up temporary files
      await this.cleanupTempFiles();

      // Then clean up old quarantined files
      await this.cleanupOldQuarantinedFiles();

      // Finally, clean up expired files
      await this.cleanupExpiredFiles();

      // Check disk space again after cleanup
      const diskStatus = await this.checkDiskSpace();
      logger.info('Emergency cleanup completed', diskStatus);
    } catch (error) {
      logger.error('Error during emergency cleanup:', error);
    }
  }

  /**
   * Clean up old quarantined files (older than 7 days)
   */
  async cleanupOldQuarantinedFiles() {
    try {
      const files = await fs.readdir(this.quarantineDir);
      const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days

      let deletedCount = 0;

      for (const file of files) {
        if (file.endsWith('.json') || file.startsWith('.')) {
          continue; // Skip log files and hidden files
        }

        const filePath = path.join(this.quarantineDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        logger.info(`Old quarantined files cleanup: ${deletedCount} files deleted`);
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error('Error during old quarantined files cleanup:', error);
      }
    }
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats() {
    try {
      const { File } = await import('../models/index.js');

      // Get file counts by status
      const expiredCount = await File.count({
        where: {
          expiresAt: {
            [Op.lt]: new Date(),
          },
        },
      });

      const infectedCount = await File.count({
        where: {
          virusScanStatus: 'infected',
        },
      });

      const deletedCount = await File.count({
        where: {
          virusScanStatus: 'deleted',
        },
      });

      // Get disk usage
      const diskStats = await this.checkDiskSpace();

      // Get directory sizes
      const uploadDirSize = await this.getDirectorySize(this.uploadDir);
      const quarantineDirSize = await this.getDirectorySize(this.quarantineDir);
      const tempDirSize = await this.getDirectorySize(this.tempDir);

      return {
        files: {
          expired: expiredCount,
          infected: infectedCount,
          deleted: deletedCount,
        },
        disk: diskStats,
        directories: {
          uploads: uploadDirSize,
          quarantine: quarantineDirSize,
          temp: tempDirSize,
        },
        recoveryWindow: this.recoveryWindow,
      };
    } catch (error) {
      logger.error('Error getting cleanup stats:', error);
      throw error;
    }
  }

  /**
   * Get directory size recursively
   */
  async getDirectorySize(dirPath) {
    try {
      let totalSize = 0;

      async function calculateSize(filePath) {
        const stats = await fs.stat(filePath);

        if (stats.isDirectory()) {
          const files = await fs.readdir(filePath);
          for (const file of files) {
            await calculateSize(path.join(filePath, file));
          }
        } else {
          totalSize += stats.size;
        }
      }

      await calculateSize(dirPath);
      return totalSize;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return 0;
      }
      logger.error(`Error calculating directory size for ${dirPath}:`, error);
      return 0;
    }
  }
}

// Create and export singleton instance
const fileCleanupService = new FileCleanupService();
export default fileCleanupService;
