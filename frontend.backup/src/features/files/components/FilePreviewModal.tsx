import React, { useState } from 'react'
import { X, Download, Send, RotateCw, ZoomIn, ZoomOut } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { FileUpload } from '@/shared/lib/types'

interface FilePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  uploads: FileUpload[]
  onSend: (uploads: FileUpload[]) => void
  conversationId: string
}

const getFileTypeCategory = (file: File): 'image' | 'video' | 'document' | 'other' => {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.includes('pdf') || file.type.includes('document') || file.type.includes('text')) return 'document'
  return 'other'
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  uploads,
  onSend,
  conversationId
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [imageRotation, setImageRotation] = useState(0)
  const [imageScale, setImageScale] = useState(1)

  const selectedUpload = uploads[selectedIndex]
  const selectedFile = selectedUpload?.file

  if (!selectedFile) return null

  const fileType = getFileTypeCategory(selectedFile)

  const handleSend = () => {
    onSend(uploads.filter(upload => upload.status === 'pending' || upload.status === 'completed'))
    onClose()
  }

  const handleRemove = (index: number) => {
    // Remove from uploads array would need to be handled by parent
    // For now, just mark as cancelled
    uploads[index].status = 'cancelled'
  }

  const resetImageTransforms = () => {
    setImageRotation(0)
    setImageScale(1)
  }

  const renderImagePreview = () => {
    if (fileType !== 'image') return null

    return (
      <div className="relative flex items-center justify-center min-h-[400px] bg-black/5 rounded-lg overflow-hidden">
        <img
          src={URL.createObjectURL(selectedFile)}
          alt={selectedFile.name}
          className="max-w-full max-h-full object-contain transition-transform duration-200"
          style={{
            transform: `rotate(${imageRotation}deg) scale(${imageScale})`
          }}
        />

        {/* Image Controls */}
        <div className="absolute top-4 right-4 flex space-x-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setImageRotation(prev => prev - 90)}
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setImageScale(prev => Math.max(0.5, prev - 0.1))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setImageScale(prev => Math.min(3, prev + 0.1))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={resetImageTransforms}
          >
            Reset
          </Button>
        </div>
      </div>
    )
  }

  const renderVideoPreview = () => {
    if (fileType !== 'video') return null

    return (
      <div className="flex items-center justify-center min-h-[400px] bg-black rounded-lg overflow-hidden">
        <video
          src={URL.createObjectURL(selectedFile)}
          controls
          className="max-w-full max-h-full"
        />
      </div>
    )
  }

  const renderDocumentPreview = () => {
    if (fileType !== 'document') return null

    return (
      <div className="flex items-center justify-center min-h-[400px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">📄</div>
          <p className="text-lg font-medium text-gray-900 mb-2">
            {selectedFile.name}
          </p>
          <p className="text-sm text-gray-500">
            Document preview not available
          </p>
        </div>
      </div>
    )
  }

  const renderOtherPreview = () => {
    if (fileType !== 'other') return null

    return (
      <div className="flex items-center justify-center min-h-[400px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">📁</div>
          <p className="text-lg font-medium text-gray-900 mb-2">
            {selectedFile.name}
          </p>
          <p className="text-sm text-gray-500">
            File type: {selectedFile.type || 'Unknown'}
          </p>
        </div>
      </div>
    )
  }

  const getPreviewContent = () => {
    switch (fileType) {
      case 'image':
        return renderImagePreview()
      case 'video':
        return renderVideoPreview()
      case 'document':
        return renderDocumentPreview()
      case 'other':
        return renderOtherPreview()
      default:
        return null
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Preview Files</span>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSend} disabled={uploads.length === 0}>
                <Send className="h-4 w-4 mr-2" />
                Send {uploads.length} file{uploads.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 min-h-[500px]">
          {/* File List Sidebar */}
          <div className="w-64 border-r">
            <ScrollArea className="h-[500px]">
              <div className="p-4 space-y-2">
                <h3 className="font-medium text-sm mb-3">Files ({uploads.length})</h3>
                {uploads.map((upload, index) => (
                  <div
                    key={upload.id}
                    className={cn(
                      'flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors',
                      selectedIndex === index ? 'bg-primary/10' : 'hover:bg-gray-50'
                    )}
                    onClick={() => setSelectedIndex(index)}
                  >
                    <div className="text-2xl">
                      {upload.file.type.startsWith('image/') && '🖼️'}
                      {upload.file.type.startsWith('video/') && '🎥'}
                      {upload.file.type.includes('pdf') && '📄'}
                      {upload.file.type.includes('document') && '📝'}
                      {upload.file.type.includes('text') && '📃'}
                      {!upload.file.type.match(/(image|video|pdf|document|text)/) && '📁'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{upload.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(upload.file.size)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemove(index)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Preview Area */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-medium">{selectedFile.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(selectedFile.size)} • {selectedFile.type}
                </p>
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>

            <div className="flex-1 p-4 overflow-auto">
              {getPreviewContent()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}