import { useState, useCallback, useRef } from 'react'
import { FileUpload } from '@/shared/lib/types'
import {
  UploadQueue,
  processFilesBatch,
  createFileValidator,
  generateThumbnail,
  categorizeFile
} from '../lib/fileManagement'

interface UseFileUploadOptions {
  maxFiles?: number
  maxSize?: number
  allowedTypes?: string[]
  autoUpload?: boolean
  compressImages?: boolean
  generateThumbnails?: boolean
  onUploadComplete?: (upload: FileUpload) => void
  onUploadError?: (upload: FileUpload, error: string) => void
  onProgress?: (upload: FileUpload) => void
}

export const useFileUpload = (options: UseFileUploadOptions = {}) => {
  const {
    maxFiles = 10,
    maxSize = 50,
    allowedTypes = [],
    autoUpload = false,
    compressImages = true,
    generateThumbnails = true,
    onUploadComplete,
    onUploadError,
    onProgress
  } = options

  const [uploads, setUploads] = useState<FileUpload[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const uploadQueueRef = useRef<UploadQueue>()

  // Initialize upload queue
  if (!uploadQueueRef.current) {
    uploadQueueRef.current = new UploadQueue({
      maxConcurrent: 3,
      onProgress: (upload) => {
        setUploads(prev => prev.map(u => u.id === upload.id ? upload : u))
        onProgress?.(upload)
      },
      onComplete: (upload) => {
        setUploads(prev => prev.map(u => u.id === upload.id ? upload : u))
        onUploadComplete?.(upload)
      },
      onError: (upload, error) => {
        setUploads(prev => prev.map(u => u.id === upload.id ? upload : u))
        onUploadError?.(upload, error)
      }
    })
  }

  const validator = useCallback(createFileValidator({
    maxSize,
    allowedTypes
  }), [maxSize, allowedTypes])

  const processAndAddFiles = useCallback(async (files: File[]) => {
    setIsUploading(true)

    try {
      // Process files in batches with validation and compression
      const processedUploads = await processFilesBatch(files, {
        compressImages,
        quality: 0.8,
        validator
      })

      // Generate thumbnails for images
      if (generateThumbnails) {
        for (const upload of processedUploads) {
          if (upload.file.type.startsWith('image/')) {
            try {
              upload.thumbnail = await generateThumbnail(upload.file)
            } catch (error) {
              console.warn('Failed to generate thumbnail:', error)
            }
          }

          // Add file categorization
          const category = categorizeFile(upload.file)
          upload.file = Object.assign(upload.file, { category })
        }
      }

      // Filter out invalid files
      const validUploads = processedUploads.filter(upload => upload.status !== 'failed')

      if (validUploads.length === 0) {
        setIsUploading(false)
        return
      }

      // Check max files limit
      setUploads(prev => {
        const combined = [...prev, ...validUploads]
        return combined.slice(-maxFiles) // Keep only the latest files if over limit
      })

      // Auto-upload if enabled
      if (autoUpload) {
        validUploads.forEach(upload => {
          uploadQueueRef.current?.add(upload)
        })
      } else {
        // Mark as pending for manual upload
        validUploads.forEach(upload => {
          upload.status = 'pending'
        })
        setUploads(prev => prev.map(u =>
          validUploads.find(vu => vu.id === u.id) || u
        ))
      }
    } catch (error) {
      console.error('Error processing files:', error)
    } finally {
      setIsUploading(false)
    }
  }, [maxFiles, autoUpload, compressImages, generateThumbnails, validator])

  const uploadFiles = useCallback(() => {
    const pendingUploads = uploads.filter(upload => upload.status === 'pending')
    pendingUploads.forEach(upload => {
      uploadQueueRef.current?.add(upload)
    })
  }, [uploads])

  const cancelUpload = useCallback((uploadId: string) => {
    uploadQueueRef.current?.cancel(uploadId)
    setUploads(prev => prev.map(u =>
      u.id === uploadId ? { ...u, status: 'cancelled' as const } : u
    ))
  }, [])

  const retryUpload = useCallback((uploadId: string) => {
    uploadQueueRef.current?.retry(uploadId)
    setUploads(prev => prev.map(u =>
      u.id === uploadId ? { ...u, status: 'pending' as const, error: undefined, progress: 0 } : u
    ))
  }, [])

  const removeUpload = useCallback((uploadId: string) => {
    uploadQueueRef.current?.cancel(uploadId)
    setUploads(prev => prev.filter(u => u.id !== uploadId))
  }, [])

  const clearCompleted = useCallback(() => {
    setUploads(prev => prev.filter(u => u.status !== 'completed'))
  }, [])

  const clearAll = useCallback(() => {
    uploadQueueRef.current = new UploadQueue()
    setUploads([])
  }, [])

  // Drag and drop handlers
  const dragAndDropHandlers = {
    onDragOver: useCallback((e: React.DragEvent) => {
      e.preventDefault()
    }, []),

    onDragEnter: useCallback((e: React.DragEvent) => {
      e.preventDefault()
    }, []),

    onDragLeave: useCallback((e: React.DragEvent) => {
      e.preventDefault()
    }, []),

    onDrop: useCallback((e: React.DragEvent) => {
      e.preventDefault()
      const files = Array.from(e.dataTransfer.files)
      processAndAddFiles(files)
    }, [processAndAddFiles])
  }

  // File input handler
  const fileInputHandler = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : []
    processAndAddFiles(files)
    e.target.value = '' // Reset input
  }, [processAndAddFiles])

  return {
    // State
    uploads,
    isUploading,
    isQueueEmpty: uploads.length === 0,

    // Actions
    processAndAddFiles,
    uploadFiles,
    cancelUpload,
    retryUpload,
    removeUpload,
    clearCompleted,
    clearAll,

    // Drag and drop
    dragAndDropHandlers,

    // File input
    fileInputHandler,

    // Utilities
    getCompletedUploads: () => uploads.filter(u => u.status === 'completed'),
    getFailedUploads: () => uploads.filter(u => u.status === 'failed'),
    getPendingUploads: () => uploads.filter(u => u.status === 'pending'),
    getUploadingUploads: () => uploads.filter(u => u.status === 'uploading'),

    // Stats
    getStats: () => ({
      total: uploads.length,
      completed: uploads.filter(u => u.status === 'completed').length,
      failed: uploads.filter(u => u.status === 'failed').length,
      pending: uploads.filter(u => u.status === 'pending').length,
      uploading: uploads.filter(u => u.status === 'uploading').length,
      cancelled: uploads.filter(u => u.status === 'cancelled').length
    })
  }
}