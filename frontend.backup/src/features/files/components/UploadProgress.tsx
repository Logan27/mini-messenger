import React from 'react'
import { X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { FileUpload } from '@/shared/lib/types'

interface UploadProgressProps {
  uploads: FileUpload[]
  onCancel?: (uploadId: string) => void
  onRetry?: (uploadId: string) => void
  onRemove?: (uploadId: string) => void
  className?: string
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatTimeRemaining = (progress: number, startTime: number): string => {
  if (progress <= 0) return ''

  const elapsed = Date.now() - startTime
  const rate = progress / elapsed
  const remaining = (100 - progress) / rate

  if (remaining < 1000) return '< 1s'
  if (remaining < 60000) return `${Math.ceil(remaining / 1000)}s`

  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.ceil((remaining % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  uploads,
  onCancel,
  onRetry,
  onRemove,
  className
}) => {
  if (uploads.length === 0) return null

  const completedUploads = uploads.filter(upload => upload.status === 'completed')
  const failedUploads = uploads.filter(upload => upload.status === 'failed')
  const activeUploads = uploads.filter(upload =>
    upload.status === 'uploading' || upload.status === 'pending'
  )

  const overallProgress = uploads.length > 0
    ? uploads.reduce((sum, upload) => sum + upload.progress, 0) / uploads.length
    : 0

  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="p-4">
        {/* Overall Progress */}
        {uploads.length > 1 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Uploading {uploads.length} files
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(overallProgress)}%
              </span>
            </div>
            <Progress value={overallProgress} className="mb-2" />
          </div>
        )}

        {/* Upload List */}
        <div className="space-y-3">
          {uploads.map((upload) => {
            const Icon = upload.status === 'completed' ? CheckCircle :
                        upload.status === 'failed' ? AlertCircle :
                        upload.status === 'uploading' ? Loader2 : null

            return (
              <div
                key={upload.id}
                className={cn(
                  'flex items-center space-x-3 p-3 rounded-lg border transition-colors',
                  upload.status === 'completed' && 'bg-green-50 border-green-200',
                  upload.status === 'failed' && 'bg-red-50 border-red-200',
                  upload.status === 'uploading' && 'bg-blue-50 border-blue-200'
                )}
              >
                {/* File Icon */}
                <div className="flex-shrink-0">
                  {upload.file.type.startsWith('image/') && (
                    <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                      🖼️
                    </div>
                  )}
                  {upload.file.type.startsWith('video/') && (
                    <div className="w-10 h-10 bg-purple-100 rounded flex items-center justify-center">
                      🎥
                    </div>
                  )}
                  {upload.file.type.includes('pdf') && (
                    <div className="w-10 h-10 bg-red-100 rounded flex items-center justify-center">
                      📄
                    </div>
                  )}
                  {upload.file.type.includes('document') && (
                    <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                      📝
                    </div>
                  )}
                  {upload.file.type.includes('text') && (
                    <div className="w-10 h-10 bg-yellow-100 rounded flex items-center justify-center">
                      📃
                    </div>
                  )}
                  {!upload.file.type.match(/(image|video|pdf|document|text)/) && (
                    <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                      📁
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium truncate">
                      {upload.file.name}
                    </p>
                    {Icon && (
                      <Icon
                        className={cn(
                          'h-4 w-4',
                          upload.status === 'uploading' && 'animate-spin',
                          upload.status === 'completed' && 'text-green-600',
                          upload.status === 'failed' && 'text-red-600'
                        )}
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(upload.file.size)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {upload.status === 'uploading' && upload.progress > 0 && (
                        <>
                          {Math.round(upload.progress)}% •
                          {formatTimeRemaining(upload.progress, Date.now())}
                        </>
                      )}
                      {upload.status === 'completed' && 'Completed'}
                      {upload.status === 'failed' && upload.error && (
                        <span className="text-red-600">{upload.error}</span>
                      )}
                    </p>
                  </div>

                  {/* Individual Progress Bar */}
                  {(upload.status === 'uploading' || upload.status === 'pending') && (
                    <Progress value={upload.progress} className="h-1" />
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-1">
                  {upload.status === 'uploading' && onCancel && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onCancel(upload.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}

                  {upload.status === 'failed' && onRetry && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRetry(upload.id)}
                    >
                      Retry
                    </Button>
                  )}

                  {(upload.status === 'completed' || upload.status === 'failed') && onRemove && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRemove(upload.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary */}
        {completedUploads.length > 0 && (
          <div className="mt-4 pt-3 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-600">
                {completedUploads.length} of {uploads.length} completed
              </span>
              {failedUploads.length > 0 && (
                <span className="text-red-600">
                  {failedUploads.length} failed
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}