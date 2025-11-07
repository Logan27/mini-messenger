import fs from 'fs/promises';
import path from 'path';

import NodeClam from 'clamscan';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

import { config } from '../config/index.js';
import { fileValidator } from '../utils/fileValidation.js';
import logger from '../utils/logger.js';
import { multerConfig } from '../utils/multerConfig.js';

import { getWebSocketService } from './websocket.js';

/**
 * File Upload Service
 * Handles secure file uploads with virus scanning and image processing
 */
class FileUploadService {
  constructor() {
    this.uploadDir = config.fileUpload.uploadPath;
    this.tempDir = config.fileUpload.tempDir;
    this.maxFileSize = config.fileUpload.maxFileSize || 25 * 1024 * 1024; // 25MB default
    this.allowedTypes = config.fileUpload.allowedTypes || fileValidator.allowedTypes;
    this.clamscan = null;
    this.initialized = false;
    this.multerInstance = null;
    this.wsService = null;
  }

  /**
   * Initialize the file upload service
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Setup upload directories
      await multerConfig.setupDirectories();

      // Create multer instance with memory storage
      this.multerInstance = multerConfig.createMulterInstance();

      // Initialize ClamAV scanner
      await this.initializeClamAV();

      // Get WebSocket service reference for progress updates
      try {
        this.wsService = getWebSocketService();
      } catch (error) {
        logger.warn('WebSocket service not available for file upload progress updates');
      }

      this.initialized = true;
      logger.info('File upload service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize file upload service:', error);
      throw error;
    }
  }

  /**
   * Get multer middleware for file uploads
   */
  getMulterMiddleware() {
    if (!this.initialized) {
      throw new Error('File upload service not initialized');
    }
    return this.multerInstance;
  }

  /**
   * Initialize ClamAV scanner
   */
  async initializeClamAV() {
    try {
      const ClamScan = await new NodeClam().init({
        removeInfected: config.clamav.removeInfected,
        quarantineInfected: false,
        scanLog: path.join(this.uploadDir, 'scan.log'),
        debugMode: config.isDevelopment,
        clamdscan: {
          socket: false,
          host: config.clamav.host,
          port: config.clamav.port,
          timeout: config.clamav.timeout,
          localFallback: false,
          active: true,
        },
        preference: 'clamdscan',
      });

      this.clamscan = ClamScan;
      logger.info('ClamAV scanner initialized via daemon connection', {
        host: config.clamav.host,
        port: config.clamav.port,
      });
    } catch (error) {
      logger.error('Failed to initialize ClamAV (virus scanning disabled):', error.message);
      this.clamscan = null;
    }
  }

  /**
   * Process uploaded file with security checks and image processing (for multer memory storage)
   */
  async processFile(file, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    // Extract options outside try block for error handling
    const {
      resizeImage = false,
      thumbnailSize = 200,
      generateThumbnail = true,
      userId = null,
      messageId = null,
      uploadId = null,
      recipientId = null,
      groupId = null,
    } = options;

    try {
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

      // Handle both memory storage (file.buffer) and disk storage (file.path)
      let sourceFilePath;
      if (file.path) {
        // File already on disk (multer diskStorage)
        sourceFilePath = file.path;
      } else if (file.buffer) {
        // File in memory (multer memoryStorage) - write to disk
        await fs.writeFile(filePath, file.buffer);
        sourceFilePath = filePath;
      } else {
        throw new Error('Invalid file object: no path or buffer provided');
      }

      // Emit progress update after file write
      if (this.wsService && uploadId) {
        this.wsService.updateFileUploadProgress(uploadId, file.size * 0.5, 'processing');
      }

      // If file was on disk and different from final path, move it
      if (sourceFilePath !== filePath) {
        await fs.copyFile(sourceFilePath, filePath);
        // Clean up temp file if it exists
        if (file.path) {
          await fs.unlink(sourceFilePath).catch(() => {});
        }
      }

      // FIX BUG-F002: Scan for viruses BEFORE saving to database
      // This ensures files are only saved if they pass virus scan
      const scanResult = await this.scanFile(filePath, null, userId, uploadId); // Scan without file ID first

      // Emit progress update for virus scanning completion
      if (this.wsService && uploadId) {
        this.wsService.updateFileUploadProgress(uploadId, file.size * 0.8, 'scanning');
      }

      // Get image dimensions if it's an image
      let width = null;
      let height = null;
      if (fileValidator.isImageFile(validatedMimeType)) {
        try {
          // Verify file exists before processing
          const fileExists = await fs
            .access(filePath)
            .then(() => true)
            .catch(() => false);
          if (!fileExists) {
            logger.warn(`File not found for image processing: ${filePath}`);
          } else {
            const metadata = await sharp(filePath).metadata();
            width = metadata.width;
            height = metadata.height;
            logger.info(`Image dimensions: ${width}x${height}`);
          }
        } catch (error) {
          logger.warn('Failed to get image dimensions:', error.message);
          // Don't fail upload if we can't get dimensions
        }
      }

      // FIX BUG-F002: Include virus scan status in processed file data
      const processedFile = {
        filename: secureFilename,
        originalName: file.originalname,
        filePath,
        fileSize: file.size || 0,
        mimeType: validatedMimeType,
        fileType: this.getFileTypeFromMime(validatedMimeType),
        isImage: fileValidator.isImageFile(validatedMimeType),
        width: width || 0,
        height: height || 0,
        uploaderId: userId,
        messageId,
        downloadCount: 0,
        virusScanStatus: scanResult?.status || 'clean', // Use scan result
        virusScanResult: scanResult || null,
      };

      // Emit completion notification
      if (this.wsService && uploadId) {
        this.wsService.completeFileUpload(uploadId, [processedFile.id], recipientId, groupId);
      }

      logger.info('File processed successfully', {
        originalName: file.originalname,
        secureFilename,
        size: file.size,
        mimeType: validatedMimeType,
        userId,
        messageId,
      });

      return processedFile;
    } catch (error) {
      // Emit error notification
      if (this.wsService && uploadId) {
        this.wsService.handleFileUploadError(uploadId, error, recipientId, groupId);
      }

      logger.error('File processing error:', error);
      throw error;
    }
  }

  /**
   * Process multiple files for upload
   */
  async processMultipleFiles(files, options = {}) {
    const processedFiles = [];

    for (const file of files) {
      const processedFile = await this.processFile(file, options);
      processedFiles.push(processedFile);
    }

    return processedFiles;
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
   * Validate uploaded file
   */
  validateFile(file) {
    // Check file size
    if (file.size > this.maxFileSize) {
      throw new Error(`File size exceeds limit of ${this.maxFileSize} bytes`);
    }

    // Check MIME type
    if (!this.allowedTypes.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} is not allowed`);
    }

    // Check file extension matches MIME type
    const extension = path.extname(file.name).toLowerCase();
    const expectedExtensions = this.getExtensionsForMimeType(file.mimetype);

    if (!expectedExtensions.includes(extension)) {
      throw new Error(`File extension ${extension} does not match MIME type ${file.mimetype}`);
    }
  }

  /**
   * Get expected file extensions for MIME type
   */
  getExtensionsForMimeType(mimetype) {
    const extensionMap = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'application/pdf': ['.pdf'],
    };

    return extensionMap[mimetype] || [];
  }

  /**
   * Check if file is an image
   */
  isImageFile(mimetype) {
    return mimetype.startsWith('image/');
  }

  /**
   * Scan file for viruses with timeout and quarantine handling
   */
  async scanFile(filePath, fileId = null, userId = null, uploadId = null) {
    try {
      // FIX BUG-FILE-001: Add ZIP bomb protection
      const MAX_SCAN_SIZE = 100 * 1024 * 1024; // 100MB uncompressed limit
      const stats = await fs.stat(filePath);

      // Check if file is an archive
      const isArchive = /\.(zip|rar|7z|tar|gz|tgz|bz2|xz)$/i.test(filePath);

      if (isArchive && stats.size > MAX_SCAN_SIZE) {
        logger.warn('Archive file exceeds safe scanning limit (potential ZIP bomb)', {
          filePath,
          fileSize: stats.size,
          limit: MAX_SCAN_SIZE,
        });

        // Quarantine suspicious archive
        await this.quarantineInfectedFile(
          filePath,
          ['Potential ZIP bomb - file too large'],
          fileId,
          userId
        );

        throw new Error(
          'Compressed file exceeds safe scanning limit (100MB). File quarantined for manual review.'
        );
      }

      if (!this.clamscan) {
        logger.warn('ClamAV not initialized, skipping virus scan (file will be marked as clean)');
        // Only update status if fileId exists (file already saved to DB)
        if (fileId) {
          await this.updateFileScanStatus(fileId, 'clean', {
            reason: 'Scanner not available - defaulting to clean',
            scanDate: new Date().toISOString(),
          });
        }
        // FIX BUG-F002: Return 'clean' status for files not yet in database (Windows dev environment)
        return { status: 'clean', reason: 'Scanner not available - defaulting to clean' };
      }

      // Update scan status to scanning
      await this.updateFileScanStatus(fileId, 'scanning');

      // Emit scan progress via WebSocket
      if (this.wsService && fileId) {
        this.wsService.updateVirusScanProgress(fileId, 'scanning', 0);
      }

      // Set up scan timeout (30 seconds)
      const scanPromise = this.clamscan.scanFile(filePath);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Virus scan timeout after 30 seconds')), 30000);
      });

      const { isInfected, viruses } = await Promise.race([scanPromise, timeoutPromise]);

      if (isInfected) {
        // Quarantine infected file instead of deleting immediately
        await this.quarantineInfectedFile(filePath, viruses, fileId, userId);

        await this.updateFileScanStatus(fileId, 'infected', {
          viruses,
          quarantined: true,
          scanDate: new Date().toISOString(),
        });

        // Emit infection notification
        if (this.wsService && fileId) {
          this.wsService.notifyVirusDetection(fileId, viruses, userId);
        }

        // Send admin notification for virus detection
        await this.notifyAdminOfVirusDetection(fileId, filePath, viruses, userId);

        throw new Error(`File is infected with: ${viruses.join(', ')}`);
      }

      // Update scan status to clean
      await this.updateFileScanStatus(fileId, 'clean', {
        scanDate: new Date().toISOString(),
        scanTime: Date.now(),
      });

      // Emit scan completion
      if (this.wsService && fileId) {
        this.wsService.updateVirusScanProgress(fileId, 'completed', 100);
      }

      logger.info('Virus scan completed successfully', { filePath, fileId, isInfected: false });

      // FIX BUG-F002: Return scan status for files not yet in database
      return { status: 'clean', scanDate: new Date().toISOString() };
    } catch (error) {
      if (error.message.includes('infected')) {
        throw error;
      }

      if (error.message.includes('timeout')) {
        logger.error('Virus scan timeout:', { filePath, fileId });
        await this.handleScanTimeout(filePath, fileId, userId);
        throw new Error('Virus scan timed out and file was quarantined for manual review');
      }

      logger.error('Virus scan failed:', error);
      await this.updateFileScanStatus(fileId, 'error', { error: error.message });

      // Continue processing if scan fails but file exists
      if (error.code === 'ENOENT') {
        throw new Error('File not found during virus scan');
      }

      // For development or when ClamAV is misconfigured, skip quarantine
      if (config.isDevelopment || error.message.includes('ClamAV Error Code')) {
        logger.warn('Skipping quarantine in development or due to ClamAV configuration issue');
        // FIX BUG-F002: Return scan status for files not yet in database
        return { status: 'error', error: error.message, allowedInDev: true };
      }

      // For other scan errors in production, quarantine for manual review
      await this.handleScanError(filePath, error, fileId, userId);

      // After quarantine, throw error to prevent file from being saved
      throw new Error('File scan failed and has been quarantined for manual review');
    }
  }

  /**
   * Update file virus scan status in database
   */
  async updateFileScanStatus(fileId, status, result = null) {
    if (!fileId) {
      return;
    }

    try {
      const { File } = await import('../models/index.js');
      const file = await File.findByPk(fileId);

      if (file) {
        await file.markAsScanned(status, result);
        logger.debug('File scan status updated', { fileId, status });
      }
    } catch (error) {
      logger.error('Error updating file scan status:', error);
    }
  }

  /**
   * Quarantine infected file for manual review
   */
  async quarantineInfectedFile(filePath, viruses, fileId, userId) {
    try {
      const quarantineDir = path.join(this.uploadDir, 'quarantine');
      await fs.mkdir(quarantineDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const originalName = path.basename(filePath);
      const quarantinedPath = path.join(quarantineDir, `${timestamp}_${originalName}`);

      // Move file to quarantine
      await fs.rename(filePath, quarantinedPath);

      // Log quarantine action
      logger.warn('File quarantined due to virus infection', {
        originalPath: filePath,
        quarantinedPath,
        viruses,
        fileId,
        userId,
      });

      // Store quarantine info for admin review
      const quarantineInfo = {
        originalPath: filePath,
        quarantinedPath,
        viruses,
        fileId,
        userId,
        quarantinedAt: new Date().toISOString(),
        reason: 'virus_infection',
      };

      // Save quarantine info to a JSON file for admin review
      const quarantineLogPath = path.join(quarantineDir, 'quarantine_log.json');
      let quarantineLog = [];

      try {
        const logData = await fs.readFile(quarantineLogPath, 'utf8');
        quarantineLog = JSON.parse(logData);
      } catch (error) {
        // File doesn't exist yet, start with empty array
      }

      quarantineLog.push(quarantineInfo);
      await fs.writeFile(quarantineLogPath, JSON.stringify(quarantineLog, null, 2));
    } catch (error) {
      logger.error('Error quarantining infected file:', error);
      // If quarantine fails, try to delete the file as fallback
      try {
        await fs.unlink(filePath);
      } catch (deleteError) {
        logger.error('Failed to delete infected file after quarantine failure:', deleteError);
      }
    }
  }

  /**
   * Handle scan timeout by quarantining file
   */
  async handleScanTimeout(filePath, fileId, userId) {
    await this.updateFileScanStatus(fileId, 'error', {
      error: 'Scan timeout',
      quarantined: true,
      scanDate: new Date().toISOString(),
    });

    // Emit timeout notification
    if (this.wsService && fileId) {
      this.wsService.notifyScanTimeout(fileId, userId);
    }

    // Quarantine file for manual review
    await this.quarantineInfectedFile(filePath, ['scan_timeout'], fileId, userId);

    // Notify admin of timeout
    await this.notifyAdminOfVirusDetection(fileId, filePath, ['scan_timeout'], userId, true);
  }

  /**
   * Handle scan errors by quarantining file
   */
  async handleScanError(filePath, error, fileId, userId) {
    await this.updateFileScanStatus(fileId, 'error', {
      error: error.message,
      quarantined: true,
      scanDate: new Date().toISOString(),
    });

    // Quarantine file for manual review
    await this.quarantineInfectedFile(filePath, [`scan_error: ${error.message}`], fileId, userId);

    // Notify admin of scan error
    await this.notifyAdminOfVirusDetection(
      fileId,
      filePath,
      [`scan_error: ${error.message}`],
      userId,
      false,
      true
    );
  }

  /**
   * Notify admin of virus detection or scan issues
   */
  async notifyAdminOfVirusDetection(
    fileId,
    filePath,
    viruses,
    userId,
    isTimeout = false,
    isError = false
  ) {
    try {
      // Get admin users
      const { User } = await import('../models/index.js');
      const adminUsers = await User.findAdmins();

      if (adminUsers.length === 0) {
        logger.warn('No admin users found for virus detection notification');
        return;
      }

      // Create notification message
      let message = '';
      if (isTimeout) {
        message = `Virus scan timed out for file ${fileId}. File has been quarantined for manual review.`;
      } else if (isError) {
        message = `Virus scan error for file ${fileId}: ${viruses[0]}. File has been quarantined for manual review.`;
      } else {
        message = `Virus detected in file ${fileId} uploaded by user ${userId}. Viruses: ${viruses.join(', ')}. File has been quarantined.`;
      }

      // Send notifications to all admins (you can extend this to use email service)
      for (const admin of adminUsers) {
        logger.warn('VIRUS DETECTION NOTIFICATION', {
          adminId: admin.id,
          adminEmail: admin.email,
          message,
          fileId,
          filePath,
          viruses,
          userId,
          timestamp: new Date().toISOString(),
        });

        // Here you could integrate with email service to send actual notifications
        // await emailService.sendVirusAlert(admin.email, { message, fileId, viruses, userId });
      }
    } catch (error) {
      logger.error('Error sending admin virus notification:', error);
    }
  }

  /**
   * Process image file with Sharp
   */
  async processImage(filePath, options) {
    const { resizeImage, thumbnailSize, generateThumbnail } = options;

    try {
      const processedFiles = {};
      const image = sharp(filePath);
      const metadata = await image.metadata();

      // Generate thumbnail if requested
      if (generateThumbnail) {
        const thumbnailFilename = this.generateThumbnailName(filePath);
        const thumbnailPath = path.join(this.uploadDir, thumbnailFilename);

        await image
          .resize(thumbnailSize, thumbnailSize, {
            fit: 'cover',
            position: 'center',
          })
          .jpeg({ quality: 80 })
          .toFile(thumbnailPath);

        processedFiles.thumbnail = {
          filename: thumbnailFilename,
          path: thumbnailPath,
          size: thumbnailSize,
        };

        logger.debug('Thumbnail generated', { thumbnailPath, size: thumbnailSize });
      }

      // Resize original if requested
      if (resizeImage && (metadata.width > 1920 || metadata.height > 1080)) {
        const resizedFilename = this.generateResizedName(filePath);
        const resizedPath = path.join(this.uploadDir, resizedFilename);

        await image
          .resize(1920, 1080, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: 85 })
          .toFile(resizedPath);

        processedFiles.resized = {
          filename: resizedFilename,
          path: resizedPath,
          originalWidth: metadata.width,
          originalHeight: metadata.height,
        };

        logger.debug('Image resized', {
          resizedPath,
          originalSize: `${metadata.width}x${metadata.height}`,
        });
      }

      return processedFiles;
    } catch (error) {
      logger.error('Image processing error:', error);
      throw new Error(`Failed to process image: ${error.message}`);
    }
  }

  /**
   * Generate thumbnail filename
   */
  generateThumbnailName(filePath) {
    const ext = path.extname(filePath);
    const name = path.basename(filePath, ext);
    return `${name}_thumb${ext}`;
  }

  /**
   * Generate resized filename
   */
  generateResizedName(filePath) {
    const ext = path.extname(filePath);
    const name = path.basename(filePath, ext);
    return `${name}_resized${ext}`;
  }

  /**
   * Delete uploaded files
   */
  async deleteFiles(files) {
    try {
      const deletions = [];

      if (typeof files === 'string') {
        files = [files];
      }

      for (const file of files) {
        if (typeof file === 'object' && file.path) {
          deletions.push(fs.unlink(file.path));
        } else if (typeof file === 'string') {
          // Assume it's a filename in upload directory
          const filePath = path.join(this.uploadDir, file);
          deletions.push(fs.unlink(filePath));
        }
      }

      await Promise.all(deletions);

      logger.info('Files deleted successfully', { count: deletions.length });
    } catch (error) {
      logger.error('Error deleting files:', error);
      // Don't throw error for cleanup operations
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
    } catch (error) {
      logger.error('Error during temp file cleanup:', error);
    }
  }
}

// Create and export singleton instance
const fileUploadService = new FileUploadService();
export default fileUploadService;
