import React, { useState } from 'react'
import {
  Download,
  FileText,
  Eye,
  ExternalLink,
  MoreVertical,
  Calendar,
  User,
  Hash
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { FileMessage as FileMessageType } from '@/shared/lib/types'

interface DocumentMessageProps {
  fileMessage: FileMessageType
  onDownload?: (fileMessage: FileMessageType) => void
  onPreview?: (fileMessage: FileMessageType) => void
  className?: string
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getDocumentIcon = (mimeType: string) => {
  if (mimeType.includes('pdf')) {
    return { icon: '📄', color: 'text-red-600', bgColor: 'bg-red-100' }
  }
  if (mimeType.includes('document') || mimeType.includes('word')) {
    return { icon: '📝', color: 'text-blue-600', bgColor: 'bg-blue-100' }
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return { icon: '📊', color: 'text-green-600', bgColor: 'bg-green-100' }
  }
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return { icon: '📋', color: 'text-orange-600', bgColor: 'bg-orange-100' }
  }
  if (mimeType.includes('text')) {
    return { icon: '📃', color: 'text-gray-600', bgColor: 'bg-gray-100' }
  }
  return { icon: '📄', color: 'text-gray-600', bgColor: 'bg-gray-100' }
}

const getFileExtension = (fileName: string): string => {
  return fileName.split('.').pop()?.toUpperCase() || 'FILE'
}

const DocumentPreview: React.FC<{ fileMessage: FileMessageType }> = ({ fileMessage }) => {
  const [showPreview, setShowPreview] = useState(false)

  // Mock document content for preview
  const mockContent = {
    title: fileMessage.fileName,
    pages: 15,
    author: 'John Doe',
    createdDate: '2024-01-15',
    modifiedDate: '2024-01-20',
    wordCount: 2547,
    description: 'This is a sample document preview showing metadata and basic information about the file.'
  }

  return (
    <div className="space-y-4">
      {/* Document Header */}
      <div className="flex items-start space-x-4 p-4 border-b">
        <div className="text-4xl">
          {getDocumentIcon(fileMessage.mimeType).icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate">{mockContent.title}</h3>
          <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <User className="h-4 w-4" />
              <span>{mockContent.author}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>{mockContent.modifiedDate}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Hash className="h-4 w-4" />
              <span>{mockContent.pages} pages</span>
            </div>
          </div>
        </div>
      </div>

      {/* Document Preview Content */}
      <div className="p-4">
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-700 leading-relaxed">
            {mockContent.description}
          </p>
        </div>

        {/* Document Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">File Size:</span>
            <span className="ml-2 font-medium">{formatFileSize(fileMessage.fileSize)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Word Count:</span>
            <span className="ml-2 font-medium">{mockContent.wordCount.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Created:</span>
            <span className="ml-2 font-medium">{mockContent.createdDate}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Modified:</span>
            <span className="ml-2 font-medium">{mockContent.modifiedDate}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export const DocumentMessage: React.FC<DocumentMessageProps> = ({
  fileMessage,
  onDownload,
  onPreview,
  className
}) => {
  const [showPreview, setShowPreview] = useState(false)
  const docIcon = getDocumentIcon(fileMessage.mimeType)

  const handleDownload = () => {
    if (onDownload) {
      onDownload(fileMessage)
    } else {
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
    } else {
      setShowPreview(true)
    }
  }

  const canPreview = (mimeType: string): boolean => {
    return mimeType.includes('pdf') ||
           mimeType.includes('text') ||
           mimeType.includes('document')
  }

  return (
    <>
      <div className={cn('flex items-start space-x-3 p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors', className)}>
        {/* Document Icon */}
        <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center text-2xl', docIcon.bgColor)}>
          <span className={docIcon.color}>{docIcon.icon}</span>
        </div>

        {/* Document Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" title={fileMessage.fileName}>
                {fileMessage.fileName}
              </p>

              <div className="flex items-center space-x-3 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {getFileExtension(fileMessage.fileName)}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(fileMessage.fileSize)}
                </p>
                {fileMessage.mimeType.includes('pdf') && (
                  <Badge variant="outline" className="text-xs">
                    PDF
                  </Badge>
                )}
              </div>

              {/* Document Metadata Preview */}
              <div className="mt-2 text-xs text-muted-foreground">
                <p>Document • {formatFileSize(fileMessage.fileSize)}</p>
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
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.open(fileMessage.url, '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Document Preview</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
                ×
              </Button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              <DocumentPreview fileMessage={fileMessage} />
            </div>
            <div className="flex items-center justify-end space-x-2 p-4 border-t">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Close
              </Button>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}