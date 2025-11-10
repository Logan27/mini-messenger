import fs from 'fs/promises';
import path from 'path';

import mime from 'mime-types';

import logger from './logger.js';

/**
 * File validation utilities with magic number verification
 */
export class FileValidator {
  constructor() {
    this.maxFileSize = 25 * 1024 * 1024; // 25MB default
    this.allowedTypes = [
      // Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
      // Videos
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/webm',
      // Audio
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/mp4',
    ];
  }

  /**
   * Validate file size
   */
  validateFileSize(file) {
    if (file.size > this.maxFileSize) {
      throw new Error(`File size ${file.size} exceeds maximum allowed size ${this.maxFileSize}`);
    }
  }

  /**
   * Validate MIME type from buffer (magic number verification)
   */
  async validateMagicNumber(buffer, originalMimeType) {
    try {
      // Basic magic number verification for common file types
      const detectedMimeType = this.detectMimeTypeFromBuffer(buffer);

      if (!detectedMimeType) {
        throw new Error('Unable to determine file type from content');
      }

      // Check if detected MIME type is in allowed list
      if (!this.allowedTypes.includes(detectedMimeType)) {
        throw new Error(`File type ${detectedMimeType} is not allowed`);
      }

      // For additional security, warn if MIME types don't match
      if (originalMimeType !== detectedMimeType) {
        logger.warn('MIME type mismatch detected', {
          original: originalMimeType,
          detected: detectedMimeType,
        });
      }

      return detectedMimeType;
    } catch (error) {
      if (error.message.includes('not allowed') || error.message.includes('determine file type')) {
        throw error;
      }

      logger.error('Magic number validation error:', error);
      throw new Error('File validation failed');
    }
  }

  /**
   * Detect MIME type from buffer using magic numbers
   */
  detectMimeTypeFromBuffer(buffer) {
    if (buffer.length < 12) {
      return null;
    }

    // JPEG
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }

    // PNG
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return 'image/png';
    }

    // GIF
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      return 'image/gif';
    }

    // WebP
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
      // Check for WEBP after RIFF
      if (
        buffer.length >= 12 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
      ) {
        return 'image/webp';
      }
    }

    // PDF
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      return 'application/pdf';
    }

    // MP4/MOV
    if (buffer.length >= 8) {
      // MP4 signature (ftyp box)
      if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
        return 'video/mp4';
      }

      // MOV signature (could be moov, mdat, etc.)
      const first8Bytes = buffer.slice(0, 8).toString('hex');
      if (
        first8Bytes.includes('6d6f6f76') ||
        first8Bytes.includes('6d646174') ||
        first8Bytes.includes('77696465')
      ) {
        return 'video/mov';
      }
    }

    // MP3
    if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
      return 'audio/mpeg';
    }

    // WAV
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
      // Check for WAVE after RIFF
      if (
        buffer.length >= 12 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x41 &&
        buffer[10] === 0x56 &&
        buffer[11] === 0x45
      ) {
        return 'audio/wav';
      }
    }

    // Office Open XML formats (DOCX, XLSX) - ZIP-based
    // Check for ZIP signature (PK..)
    if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
      // This is a ZIP file, check if it's an Office document
      const bufferString = buffer.toString('binary', 0, Math.min(buffer.length, 4096));

      // DOCX contains word/ directory
      if (bufferString.includes('word/')) {
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      }

      // XLSX contains xl/ directory
      if (bufferString.includes('xl/')) {
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      }

      // If it's a ZIP but we can't determine the specific Office format,
      // return null to fall back to MIME type validation
      return null;
    }

    // Check if content is plain text (all printable ASCII or UTF-8)
    // For text files, check if most bytes are printable characters
    let textBytes = 0;
    const sampleSize = Math.min(buffer.length, 512); // Check first 512 bytes
    for (let i = 0; i < sampleSize; i++) {
      const byte = buffer[i];
      // Printable ASCII (32-126) plus common whitespace (9, 10, 13)
      if (
        (byte >= 32 && byte <= 126) ||
        byte === 9 ||
        byte === 10 ||
        byte === 13 ||
        byte >= 128 // UTF-8 multibyte characters
      ) {
        textBytes++;
      }
    }

    // If more than 95% of sampled bytes are text-like, consider it text/plain
    if (textBytes / sampleSize > 0.95) {
      return 'text/plain';
    }

    return null;
  }

  /**
   * Validate file extension matches MIME type
   */
  validateFileExtension(filename, mimeType) {
    const extension = path.extname(filename).toLowerCase();
    const expectedExtensions = this.getExtensionsForMimeType(mimeType);

    if (expectedExtensions.length > 0 && !expectedExtensions.includes(extension)) {
      throw new Error(`File extension ${extension} does not match MIME type ${mimeType}`);
    }
  }

  /**
   * Get expected file extensions for MIME type
   */
  getExtensionsForMimeType(mimeType) {
    const extensionMap = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'video/mp4': ['.mp4'],
      'video/avi': ['.avi'],
      'video/mov': ['.mov'],
      'video/wmv': ['.wmv'],
      'video/webm': ['.webm'],
      'audio/mpeg': ['.mp3'],
      'audio/wav': ['.wav'],
      'audio/ogg': ['.ogg'],
      'audio/mp4': ['.m4a'],
    };

    return extensionMap[mimeType] || [];
  }

  /**
   * Check if file is an image
   */
  isImageFile(mimeType) {
    return mimeType.startsWith('image/');
  }

  /**
   * Check if file is a video
   */
  isVideoFile(mimeType) {
    return mimeType.startsWith('video/');
  }

  /**
   * Check if file is an audio file
   */
  isAudioFile(mimeType) {
    return mimeType.startsWith('audio/');
  }

  /**
   * Check if file is a document
   */
  isDocumentFile(mimeType) {
    return mimeType.startsWith('application/') || mimeType.startsWith('text/');
  }

  /**
   * Sanitize filename to prevent path traversal
   */
  sanitizeFilename(filename) {
    return filename
      .replace(/[/\\?%*:|"<>]/g, '_') // Replace dangerous characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 255); // Limit length
  }

  /**
   * Generate secure UUID-based filename
   */
  generateSecureFilename(originalFilename, mimeType) {
    const extension = path.extname(originalFilename) || this.getExtensionForMimeType(mimeType);
    const sanitizedName = this.sanitizeFilename(path.basename(originalFilename, extension));
    const timestamp = Date.now();
    const uuid = Math.random().toString(36).substring(2, 15);

    return `${timestamp}_${uuid}_${sanitizedName}${extension}`.substring(0, 255);
  }

  /**
   * Get file extension for MIME type
   */
  getExtensionForMimeType(mimeType) {
    const extensionMap = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'text/plain': '.txt',
      'text/csv': '.csv',
      'video/mp4': '.mp4',
      'video/avi': '.avi',
      'video/mov': '.mov',
      'video/wmv': '.wmv',
      'video/webm': '.webm',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'audio/ogg': '.ogg',
      'audio/mp4': '.m4a',
    };

    return extensionMap[mimeType] || '.bin';
  }

  /**
   * Validate complete file with all checks
   */
  async validateFile(file) {
    // Basic size validation
    this.validateFileSize(file);

    // Magic number validation (requires buffer)
    if (file.buffer) {
      const detectedMimeType = await this.validateMagicNumber(file.buffer, file.mimetype);

      // Extension validation
      this.validateFileExtension(file.originalname, detectedMimeType);

      return detectedMimeType;
    } else {
      // Fallback to basic MIME type check if no buffer
      if (!this.allowedTypes.includes(file.mimetype)) {
        throw new Error(`File type ${file.mimetype} is not allowed`);
      }

      this.validateFileExtension(file.originalname, file.mimetype);
      return file.mimetype;
    }
  }
}

// Export singleton instance
export const fileValidator = new FileValidator();
export default fileValidator;
