import { FileUpload, FileValidation } from '@/shared/lib/types'

// File compression utilities
export const compressImage = async (file: File, quality: number = 0.8): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const img = new Image()

    img.onload = () => {
      // Calculate new dimensions (max 1920px width)
      const maxWidth = 1920
      let { width, height } = img

      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }

      canvas.width = width
      canvas.height = height

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => {
        if (blob) {
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          })
          resolve(compressedFile)
        } else {
          resolve(file)
        }
      }, 'image/jpeg', quality)
    }

    img.src = URL.createObjectURL(file)
  })
}

// File chunking for large files
export const createFileChunks = (file: File, chunkSize: number = 1024 * 1024): Blob[] => {
  const chunks: Blob[] = []
  let start = 0

  while (start < file.size) {
    const end = Math.min(start + chunkSize, file.size)
    chunks.push(file.slice(start, end))
    start = end
  }

  return chunks
}

// Upload queue management
export class UploadQueue {
  private queue: FileUpload[] = []
  private activeUploads = new Set<string>()
  private maxConcurrent = 3
  private onProgress?: (upload: FileUpload) => void
  private onComplete?: (upload: FileUpload) => void
  private onError?: (upload: FileUpload, error: string) => void

  constructor(options?: {
    maxConcurrent?: number
    onProgress?: (upload: FileUpload) => void
    onComplete?: (upload: FileUpload) => void
    onError?: (upload: FileUpload, error: string) => void
  }) {
    if (options?.maxConcurrent) this.maxConcurrent = options.maxConcurrent
    if (options?.onProgress) this.onProgress = options.onProgress
    if (options?.onComplete) this.onComplete = options.onComplete
    if (options?.onError) this.onError = options.onError
  }

  add(upload: FileUpload) {
    this.queue.push(upload)
    this.processQueue()
  }

  addMultiple(uploads: FileUpload[]) {
    this.queue.push(...uploads)
    this.processQueue()
  }

  private async processQueue() {
    while (this.activeUploads.size < this.maxConcurrent && this.queue.length > 0) {
      const upload = this.queue.shift()!
      this.activeUploads.add(upload.id)
      this.uploadFile(upload)
    }
  }

  private async uploadFile(upload: FileUpload) {
    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        upload.progress = Math.min(upload.progress + Math.random() * 30, 90)
        this.onProgress?.(upload)
      }, 200)

      // Simulate upload completion
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000))

      clearInterval(progressInterval)
      upload.progress = 100
      upload.status = 'completed'
      upload.url = `https://example.com/files/${upload.id}`

      this.onProgress?.(upload)
      this.onComplete?.(upload)

    } catch (error) {
      upload.status = 'failed'
      upload.error = error instanceof Error ? error.message : 'Upload failed'
      this.onError?.(upload, upload.error)
    } finally {
      this.activeUploads.delete(upload.id)
      this.processQueue()
    }
  }

  cancel(uploadId: string) {
    const upload = this.queue.find(u => u.id === uploadId)
    if (upload) {
      upload.status = 'cancelled'
      this.queue = this.queue.filter(u => u.id !== uploadId)
    }
  }

  retry(uploadId: string) {
    const upload = this.queue.find(u => u.id === uploadId)
    if (upload) {
      upload.status = 'pending'
      upload.error = undefined
      upload.progress = 0
    }
  }

  getQueue(): FileUpload[] {
    return [...this.queue]
  }

  getActiveUploads(): string[] {
    return Array.from(this.activeUploads)
  }
}

// File validation utilities
export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  if (allowedTypes.length === 0) return true

  return allowedTypes.some(type => {
    if (type.startsWith('.')) {
      return file.name.toLowerCase().endsWith(type.toLowerCase())
    }
    return file.type.match(type)
  })
}

export const validateFileSize = (file: File, maxSizeMB: number): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  return file.size <= maxSizeBytes
}

export const validateImageDimensions = async (file: File, maxWidth: number = 4096, maxHeight: number = 4096): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(true)
      return
    }

    const img = new Image()
    img.onload = () => {
      resolve(img.width <= maxWidth && img.height <= maxHeight)
    }
    img.onerror = () => resolve(false)
    img.src = URL.createObjectURL(file)
  })
}

export const createFileValidator = (options: {
  maxSize?: number
  allowedTypes?: string[]
  maxDimensions?: { width: number; height: number }
}) => {
  return async (file: File): Promise<FileValidation> => {
    const errors: string[] = []
    const warnings: string[] = []

    // Size validation
    if (options.maxSize && !validateFileSize(file, options.maxSize)) {
      errors.push(`File size must be less than ${options.maxSize}MB`)
    }

    // Type validation
    if (options.allowedTypes && !validateFileType(file, options.allowedTypes)) {
      errors.push('File type not allowed')
    }

    // Dimension validation for images
    if (options.maxDimensions && file.type.startsWith('image/')) {
      const isValidDimensions = await validateImageDimensions(
        file,
        options.maxDimensions.width,
        options.maxDimensions.height
      )
      if (!isValidDimensions) {
        errors.push(`Image dimensions must not exceed ${options.maxDimensions.width}x${options.maxDimensions.height}`)
      }
    }

    // Warnings
    if (file.size > 10 * 1024 * 1024) {
      warnings.push('Large files may take longer to upload')
    }

    if (file.type.startsWith('image/') && file.size > 5 * 1024 * 1024) {
      warnings.push('Consider compressing this image for faster upload')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
}

// Batch file processing
export const processFilesBatch = async (
  files: File[],
  options: {
    compressImages?: boolean
    quality?: number
    validator?: (file: File) => Promise<FileValidation>
  } = {}
): Promise<FileUpload[]> => {
  const uploads: FileUpload[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    let processedFile = file

    // Compress images if requested
    if (options.compressImages && file.type.startsWith('image/')) {
      try {
        processedFile = await compressImage(file, options.quality)
      } catch (error) {
        console.warn('Failed to compress image:', error)
      }
    }

    // Validate file
    let validation: FileValidation = { isValid: true, errors: [], warnings: [] }
    if (options.validator) {
      validation = await options.validator(processedFile)
    }

    const upload: FileUpload = {
      id: `${Date.now()}-${i}`,
      file: processedFile,
      progress: 0,
      status: validation.isValid ? 'pending' : 'failed',
      error: validation.errors[0]
    }

    uploads.push(upload)
  }

  return uploads
}

// File type detection and categorization
export const categorizeFile = (file: File) => {
  const type = file.type
  const name = file.name.toLowerCase()

  if (type.startsWith('image/')) {
    return { category: 'image', icon: '🖼️', color: 'blue' }
  }
  if (type.startsWith('video/')) {
    return { category: 'video', icon: '🎥', color: 'purple' }
  }
  if (type.startsWith('audio/')) {
    return { category: 'audio', icon: '🎵', color: 'green' }
  }
  if (type.includes('pdf') || name.endsWith('.pdf')) {
    return { category: 'pdf', icon: '📄', color: 'red' }
  }
  if (type.includes('document') || name.match(/\.(doc|docx)$/)) {
    return { category: 'document', icon: '📝', color: 'blue' }
  }
  if (type.includes('spreadsheet') || name.match(/\.(xls|xlsx)$/)) {
    return { category: 'spreadsheet', icon: '📊', color: 'green' }
  }
  if (type.includes('presentation') || name.match(/\.(ppt|pptx)$/)) {
    return { category: 'presentation', icon: '📋', color: 'orange' }
  }
  if (type.includes('text') || name.match(/\.(txt|md|rtf)$/)) {
    return { category: 'text', icon: '📃', color: 'gray' }
  }
  if (name.match(/\.(zip|rar|7z|tar|gz)$/)) {
    return { category: 'archive', icon: '📦', color: 'yellow' }
  }

  return { category: 'other', icon: '📁', color: 'gray' }
}

// Generate thumbnail for images
export const generateThumbnail = (file: File, size: number = 150): Promise<string> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve('')
      return
    }

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const img = new Image()

    img.onload = () => {
      const { width, height } = img

      // Calculate thumbnail dimensions
      let thumbWidth = size
      let thumbHeight = size

      if (width > height) {
        thumbHeight = (height * size) / width
      } else {
        thumbWidth = (width * size) / height
      }

      canvas.width = thumbWidth
      canvas.height = thumbHeight

      // Draw thumbnail
      ctx.drawImage(img, 0, 0, thumbWidth, thumbHeight)

      resolve(canvas.toDataURL('image/jpeg', 0.7))
    }

    img.onerror = () => resolve('')
    img.src = URL.createObjectURL(file)
  })
}