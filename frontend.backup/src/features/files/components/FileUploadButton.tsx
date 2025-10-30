import React, { useCallback, useState } from 'react'
import { Upload, X, File, Image, Video, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { FileUpload, FileValidation } from '@/shared/lib/types'

interface FileUploadButtonProps {
  onFilesSelected: (files: FileUpload[]) => void
  maxFiles?: number
  maxSize?: number // in MB
  acceptedTypes?: string[]
  multiple?: boolean
  disabled?: boolean
  className?: string
}

const getFileIcon = (file: File) => {
  if (file.type.startsWith('image/')) return Image
  if (file.type.startsWith('video/')) return Video
  if (file.type.includes('pdf') || file.type.includes('document')) return FileText
  return File
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const FileUploadButton: React.FC<FileUploadButtonProps> = ({
  onFilesSelected,
  maxFiles = 10,
  maxSize = 50, // 50MB default
  acceptedTypes = [],
  multiple = true,
  disabled = false,
  className
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploads, setUploads] = useState<FileUpload[]>([])

  const validateFile = useCallback((file: File): FileValidation => {
    const errors: string[] = []
    const warnings: string[] = []

    // Size validation
    if (file.size > maxSize * 1024 * 1024) {
      errors.push(`File size must be less than ${maxSize}MB`)
    }

    // Type validation
    if (acceptedTypes.length > 0 && !acceptedTypes.some(type => file.type.match(type))) {
      errors.push('File type not supported')
    }

    // Warning for large files
    if (file.size > 10 * 1024 * 1024) {
      warnings.push('Large files may take longer to upload')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }, [maxSize, acceptedTypes])

  const processFiles = useCallback((files: FileList) => {
    const fileArray = Array.from(files)
    const newUploads: FileUpload[] = []

    fileArray.forEach((file, index) => {
      const validation = validateFile(file)

      const upload: FileUpload = {
        id: `${Date.now()}-${index}`,
        file,
        progress: 0,
        status: validation.isValid ? 'pending' : 'failed',
        error: validation.errors[0]
      }

      newUploads.push(upload)
    })

    setUploads(prev => [...prev, ...newUploads])
    onFilesSelected(newUploads.filter(upload => upload.status !== 'failed'))
  }, [validateFile, onFilesSelected])

  const handleFileInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      processFiles(files)
    }
    // Reset input
    event.target.value = ''
  }, [processFiles])

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragOver(false)

    const files = event.dataTransfer.files
    if (files) {
      processFiles(files)
    }
  }, [processFiles])

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragOver(false)
  }, [])

  const removeUpload = useCallback((uploadId: string) => {
    setUploads(prev => prev.filter(upload => upload.id !== uploadId))
  }, [])

  const retryUpload = useCallback((uploadId: string) => {
    setUploads(prev => prev.map(upload =>
      upload.id === uploadId
        ? { ...upload, status: 'pending' as const, error: undefined, progress: 0 }
        : upload
    ))
  }, [])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
          isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Drag and drop files here, or click to select
          </p>
          <Button
            variant="outline"
            disabled={disabled}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            Choose Files
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Max {maxFiles} files, up to {maxSize}MB each
          {acceptedTypes.length > 0 && ` • ${acceptedTypes.join(', ')}`}
        </p>
      </div>

      {/* Hidden File Input */}
      <input
        id="file-input"
        type="file"
        multiple={multiple}
        accept={acceptedTypes.join(',')}
        onChange={handleFileInput}
        disabled={disabled}
        className="hidden"
      />

      {/* Upload Queue */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Upload Queue</h4>
          {uploads.map((upload) => {
            const Icon = getFileIcon(upload.file)
            return (
              <div key={upload.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{upload.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(upload.file.size)}
                  </p>
                  {upload.status === 'uploading' && (
                    <Progress value={upload.progress} className="mt-2" />
                  )}
                  {upload.error && (
                    <p className="text-xs text-destructive mt-1">{upload.error}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {upload.status === 'failed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => retryUpload(upload.id)}
                    >
                      Retry
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeUpload(upload.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}