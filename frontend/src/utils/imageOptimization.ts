/**
 * Image Optimization Utility
 *
 * Provides comprehensive image optimization including:
 * - Client-side compression
 * - WebP conversion with fallback support
 * - Responsive image generation
 * - Thumbnail creation
 * - Lazy loading support
 */

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'auto';
  generateThumbnail?: boolean;
  thumbnailSize?: number;
}

export interface OptimizedImage {
  file: File;
  dataUrl: string;
  width: number;
  height: number;
  size: number;
  format: string;
  thumbnail?: {
    file: File;
    dataUrl: string;
  };
}

/**
 * Default optimization options
 */
const DEFAULT_OPTIONS: ImageOptimizationOptions = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.85,
  format: 'auto',
  generateThumbnail: false,
  thumbnailSize: 200,
};

/**
 * Check if browser supports WebP format
 */
export const supportsWebP = (() => {
  let supported: boolean | null = null;

  return (): Promise<boolean> => {
    if (supported !== null) {
      return Promise.resolve(supported);
    }

    return new Promise((resolve) => {
      const webpData = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoCAAEAAQAcJaQAA3AA/v3AgAA=';
      const img = new Image();

      img.onload = () => {
        supported = img.width === 2 && img.height === 1;
        resolve(supported);
      };

      img.onerror = () => {
        supported = false;
        resolve(false);
      };

      img.src = webpData;
    });
  };
})();

/**
 * Load an image from a File object
 */
const loadImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      if (!e.target?.result) {
        reject(new Error('Failed to read image file'));
        return;
      }

      img.onload = () => {
        resolve(img);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      // Use data URL instead of object URL (works in incognito mode)
      img.src = e.target.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read image file'));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
const calculateDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } => {
  let width = originalWidth;
  let height = originalHeight;

  // Calculate scaling factor
  const widthRatio = maxWidth / originalWidth;
  const heightRatio = maxHeight / originalHeight;
  const ratio = Math.min(widthRatio, heightRatio, 1); // Don't upscale

  width = Math.round(originalWidth * ratio);
  height = Math.round(originalHeight * ratio);

  return { width, height };
};

/**
 * Compress and resize an image
 */
const compressImage = async (
  img: HTMLImageElement,
  options: Required<ImageOptimizationOptions>
): Promise<{ blob: Blob; dataUrl: string }> => {
  const { width, height } = calculateDimensions(
    img.width,
    img.height,
    options.maxWidth,
    options.maxHeight
  );

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Enable image smoothing for better quality
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw image
  ctx.drawImage(img, 0, 0, width, height);

  // Determine output format
  let mimeType = 'image/jpeg';
  if (options.format === 'webp') {
    mimeType = 'image/webp';
  } else if (options.format === 'png') {
    mimeType = 'image/png';
  } else if (options.format === 'auto') {
    // Use WebP if supported, otherwise JPEG
    const webpSupported = await supportsWebP();
    mimeType = webpSupported ? 'image/webp' : 'image/jpeg';
  }

  // Convert to blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      },
      mimeType,
      options.quality
    );
  });

  // Create data URL
  const dataUrl = canvas.toDataURL(mimeType, options.quality);

  return { blob, dataUrl };
};

/**
 * Create a thumbnail from an image
 */
const createThumbnail = async (
  img: HTMLImageElement,
  size: number,
  quality: number
): Promise<{ blob: Blob; dataUrl: string }> => {
  const canvas = document.createElement('canvas');

  // Calculate square thumbnail dimensions
  const minDim = Math.min(img.width, img.height);
  const scale = size / minDim;

  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Calculate crop position for center crop
  const sx = (img.width - minDim) / 2;
  const sy = (img.height - minDim) / 2;

  // Draw cropped and scaled image
  ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

  // Determine format (prefer WebP for thumbnails)
  const webpSupported = await supportsWebP();
  const mimeType = webpSupported ? 'image/webp' : 'image/jpeg';

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create thumbnail blob'));
        }
      },
      mimeType,
      quality
    );
  });

  const dataUrl = canvas.toDataURL(mimeType, quality);

  return { blob, dataUrl };
};

/**
 * Optimize an image file
 */
export const optimizeImage = async (
  file: File,
  userOptions: ImageOptimizationOptions = {}
): Promise<OptimizedImage> => {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File is not an image');
  }

  // Merge options with defaults
  const options: Required<ImageOptimizationOptions> = {
    ...DEFAULT_OPTIONS,
    ...userOptions,
  } as Required<ImageOptimizationOptions>;

  // Load image
  const img = await loadImage(file);

  // Compress main image
  const { blob, dataUrl } = await compressImage(img, options);

  // Determine file extension
  const format = blob.type.split('/')[1];
  const extension = format === 'webp' ? 'webp' : format === 'png' ? 'png' : 'jpg';

  // Create new filename
  const originalName = file.name.replace(/\.[^/.]+$/, '');
  const optimizedFile = new File([blob], `${originalName}.${extension}`, {
    type: blob.type,
  });

  const result: OptimizedImage = {
    file: optimizedFile,
    dataUrl,
    width: img.width,
    height: img.height,
    size: blob.size,
    format: blob.type,
  };

  // Generate thumbnail if requested
  if (options.generateThumbnail) {
    const thumbnailResult = await createThumbnail(img, options.thumbnailSize, options.quality);

    const thumbnailFile = new File(
      [thumbnailResult.blob],
      `${originalName}_thumb.${extension}`,
      { type: thumbnailResult.blob.type }
    );

    result.thumbnail = {
      file: thumbnailFile,
      dataUrl: thumbnailResult.dataUrl,
    };
  }

  return result;
};

/**
 * Generate a blur placeholder for progressive image loading
 */
export const generateBlurPlaceholder = async (file: File): Promise<string> => {
  const img = await loadImage(file);

  const canvas = document.createElement('canvas');
  // Very small size for placeholder (e.g., 20px wide)
  const placeholderWidth = 20;
  const aspectRatio = img.height / img.width;
  const placeholderHeight = Math.round(placeholderWidth * aspectRatio);

  canvas.width = placeholderWidth;
  canvas.height = placeholderHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, 0, 0, placeholderWidth, placeholderHeight);

  // Return as very low quality JPEG data URL (tiny file size)
  return canvas.toDataURL('image/jpeg', 0.1);
};

/**
 * Generate srcset for responsive images
 */
export const generateResponsiveSizes = async (
  file: File,
  sizes: number[] = [320, 640, 960, 1280, 1920]
): Promise<Array<{ width: number; file: File; dataUrl: string }>> => {
  const img = await loadImage(file);
  const results: Array<{ width: number; file: File; dataUrl: string }> = [];

  // Only generate sizes smaller than original
  const validSizes = sizes.filter((size) => size <= img.width);

  for (const targetWidth of validSizes) {
    const targetHeight = Math.round((img.height / img.width) * targetWidth);

    const { blob, dataUrl } = await compressImage(img, {
      maxWidth: targetWidth,
      maxHeight: targetHeight,
      quality: 0.85,
      format: 'auto',
      generateThumbnail: false,
      thumbnailSize: 200,
    });

    const webpSupported = await supportsWebP();
    const extension = webpSupported ? 'webp' : 'jpg';
    const originalName = file.name.replace(/\.[^/.]+$/, '');

    const resizedFile = new File(
      [blob],
      `${originalName}_${targetWidth}w.${extension}`,
      { type: blob.type }
    );

    results.push({
      width: targetWidth,
      file: resizedFile,
      dataUrl,
    });
  }

  return results;
};

/**
 * Batch optimize multiple images
 */
export const batchOptimizeImages = async (
  files: File[],
  options: ImageOptimizationOptions = {},
  onProgress?: (current: number, total: number) => void
): Promise<OptimizedImage[]> => {
  const results: OptimizedImage[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    try {
      const optimized = await optimizeImage(file, options);
      results.push(optimized);

      if (onProgress) {
        onProgress(i + 1, files.length);
      }
    } catch (error) {
      console.error(`Failed to optimize ${file.name}:`, error);
      throw error;
    }
  }

  return results;
};

/**
 * Calculate compression ratio
 */
export const calculateCompressionRatio = (originalSize: number, compressedSize: number): number => {
  return Math.round((1 - compressedSize / originalSize) * 100);
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};
