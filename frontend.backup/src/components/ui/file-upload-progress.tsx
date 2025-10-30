import React from 'react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { X, File, Image, FileText, Archive, Music, Video } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploadProgressProps {
  file: File
  progress: number
  status: 'uploading' | 'success' | 'error'
  onCancel?: () => void
  onRetry?: () => void
  className?: string
}

const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase()
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
    return Image
  }
  if (['mp4', 'avi', 'mov', 'wmv', 'flv'].includes(extension || '')) {
    return Video
  }
  if (['mp3', 'wav', 'ogg', 'flac'].includes(extension || '')) {
    return Music
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension || '')) {
    return Archive
  }
  if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(extension || '')) {
    return FileText
  }
  
  return File
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const FileUploadProgress: React.FC<FileUploadProgressProps> = ({
  file,
  progress,
  status,
  onCancel,
  onRetry,
  className
}) => {
  const FileIcon = getFileIcon(file.name)
  
  return (
    <div className={cn(
      'flex items-center gap-3 p-3 border rounded-lg bg-card',
      status === 'error' && 'border-destructive/50 bg-destructive/5',
      className
    )}>
      <div className={cn(
        'p-2 rounded-full',
        status === 'success' && 'bg-green-100 text-green-600',
        status === 'error' && 'bg-red-100 text-red-600',
        status === 'uploading' && 'bg-muted text-muted-foreground'
      )}>
        <FileIcon className="h-4 w-4" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {formatFileSize(file.size)}
            </span>
            {status === 'uploading' && onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="h-6 w-6 p-0"
                aria-label="Cancel upload"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            {status === 'error' && onRetry && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRetry}
                className="h-6 w-6 p-0"
                aria-label="Retry upload"
              >
                ↻
              </Button>
            )}
          </div>
        </div>
        
        {status === 'uploading' && (
          <div className="space-y-1">
            <Progress value={progress} className="h-1" />
            <p className="text-xs text-muted-foreground">
              {progress}% uploaded
            </p>
          </div>
        )}
        
        {status === 'success' && (
          <p className="text-xs text-green-600">
            Upload complete
          </p>
        )}
        
        {status === 'error' && (
          <p className="text-xs text-destructive">
            Upload failed
          </p>
        )}
      </div>
    </div>
  )
}

interface FileUploadListProps {
  uploads: Array<{
    id: string
    file: File
    progress: number
    status: 'uploading' | 'success' | 'error'
  }>
  onCancel?: (id: string) => void
  onRetry?: (id: string) => void
  className?: string
}

export const FileUploadList: React.FC<FileUploadListProps> = ({
  uploads,
  onCancel,
  onRetry,
  className
}) => {
  if (uploads.length === 0) return null
  
  return (
    <div className={cn('space-y-2', className)}>
      {uploads.map((upload) => (
        <FileUploadProgress
          key={upload.id}
          file={upload.file}
          progress={upload.progress}
          status={upload.status}
          onCancel={() => onCancel?.(upload.id)}
          onRetry={() => onRetry?.(upload.id)}
        />
      ))}
    </div>
  )
}

export default FileUploadProgress