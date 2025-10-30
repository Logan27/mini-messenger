import React, { useState } from 'react'
import {
  Download,
  File,
  Image as ImageIcon,
  Video,
  FileText,
  Music,
  Archive,
  MoreVertical,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { FileMessage as FileMessageType } from '@/shared/lib/types'

interface FileMessageProps {
  fileMessage: FileMessageType
  onDownload?: (fileMessage: FileMessageType) => void
  onPreview?: (fileMessage: FileMessageType) => void
  className?: string
}

const getFileIcon = (mimeType: string, size: 'sm' | 'md' | 'lg' = 'md') => {
  const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-6 w-6' : 'h-8 w-8'

  if (mimeType.startsWith('image/')) {
    return <ImageIcon className={iconSize} />
  }
  if (mimeType.startsWith('video/')) {
    return <Video className={iconSize} />
  }
  if (mimeType.startsWith('audio/')) {
    return <Music className={iconSize} />
  }
  if (mimeType.includes('pdf')) {
    return <FileText className={iconSize} />
  }
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) {
    return <Archive className={iconSize} />
  }
  return <File className={iconSize} />
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getFileTypeColor = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'text-blue-600'
  if (mimeType.startsWith('video/')) return 'text-purple-600'
  if (mimeType.startsWith('audio/')) return 'text-green-600'
  if (mimeType.includes('pdf')) return 'text-red-600'
  if (mimeType.includes('document')) return 'text-gray-600'
  return 'text-gray-500'
}

export const FileMessage: React.FC<FileMessageProps> = ({
  fileMessage,
  onDownload,
  onPreview,
  className
}) => {
  const [imageError, setImageError] = useState(false)

  const handleDownload = () => {
    if (onDownload) {
      onDownload(fileMessage)
    } else {
      // Default download behavior
      const link = document.createElement('a')
      link.href = fileMessage.url
      link.download = fileMessage.fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handlePreview = () => {
    if (onPreview) {
      onPreview(fileMessage)
    }
  }

  const canPreview = (mimeType: string): boolean => {
    return mimeType.startsWith('image/') ||
           mimeType.startsWith('video/') ||
           mimeType.includes('pdf') ||
           mimeType.includes('text')
  }

  const isImage = fileMessage.mimeType.startsWith('image/')
  const hasThumbnail = fileMessage.thumbnail && !imageError

  return (
    <div className={cn('flex items-start space-x-3 p-3 rounded-lg border bg-card', className)}>
      {/* File Icon or Thumbnail */}
      <div className="flex-shrink-0">
        {isImage && hasThumbnail ? (
          <div className="relative">
            <img
              src={fileMessage.thumbnail}
              alt={fileMessage.fileName}
              className="w-12 h-12 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handlePreview}
              onError={() => setImageError(true)}
            />
            {fileMessage.dimensions && (
              <div className="absolute -top-1 -right-1 bg-black/70 text-white text-xs px-1 rounded">
                {fileMessage.dimensions.width}×{fileMessage.dimensions.height}
              </div>
            )}
          </div>
        ) : (
          <div className={cn(
            'w-12 h-12 rounded-lg bg-muted flex items-center justify-center',
            getFileTypeColor(fileMessage.mimeType)
          )}>
            {getFileIcon(fileMessage.mimeType, 'md')}
          </div>
        )}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" title={fileMessage.fileName}>
              {fileMessage.fileName}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-xs text-muted-foreground">
                {formatFileSize(fileMessage.fileSize)}
              </p>
              <span className="text-xs text-muted-foreground">•</span>
              <p className="text-xs text-muted-foreground">
                {fileMessage.mimeType.split('/')[1]?.toUpperCase() || 'FILE'}
              </p>
            </div>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canPreview(fileMessage.mimeType) && (
                <DropdownMenuItem onClick={handlePreview}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Preview
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Image Thumbnail Grid */}
        {isImage && hasThumbnail && (
          <div className="mt-2">
            <img
              src={fileMessage.thumbnail}
              alt={fileMessage.fileName}
              className="w-full max-w-sm rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={handlePreview}
              onError={() => setImageError(true)}
            />
          </div>
        )}

        {/* Video/Audio Player Placeholder */}
        {(fileMessage.mimeType.startsWith('video/') || fileMessage.mimeType.startsWith('audio/')) && (
          <div className="mt-2">
            <div className="w-full max-w-sm bg-muted rounded-lg p-4 text-center">
              <div className={cn('inline-flex items-center justify-center w-12 h-12 rounded-full bg-background', getFileTypeColor(fileMessage.mimeType))}>
                {getFileIcon(fileMessage.mimeType, 'lg')}
              </div>
              <p className="text-sm font-medium mt-2">{fileMessage.fileName}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={handlePreview}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}