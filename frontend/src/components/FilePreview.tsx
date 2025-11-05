import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilePreviewData {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: Date;
  sender?: {
    id: string;
    username: string;
    avatar?: string;
  };
}

interface FilePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  file: FilePreviewData;
  allFiles?: FilePreviewData[];
  currentIndex?: number;
  onNavigate?: (direction: 'prev' | 'next') => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getFileTypeCategory = (mimeType: string): 'image' | 'video' | 'pdf' | 'audio' | 'other' => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf')) return 'pdf';
  return 'other';
};

export const FilePreview = ({
  isOpen,
  onClose,
  file,
  allFiles = [],
  currentIndex = 0,
  onNavigate,
}: FilePreviewProps) => {
  const [imageScale, setImageScale] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fileType = getFileTypeCategory(file.mimeType);
  const canNavigate = allFiles.length > 1;
  const hasPrev = canNavigate && currentIndex > 0;
  const hasNext = canNavigate && currentIndex < allFiles.length - 1;

  useEffect(() => {
    // Reset transforms when file changes
    setImageScale(1);
    setImageRotation(0);
  }, [file.id]);

  useEffect(() => {
    // Keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (hasPrev) onNavigate?.('prev');
          break;
        case 'ArrowRight':
          if (hasNext) onNavigate?.('next');
          break;
        case '+':
        case '=':
          setImageScale((prev) => Math.min(3, prev + 0.1));
          break;
        case '-':
          setImageScale((prev) => Math.max(0.5, prev - 0.1));
          break;
        case 'r':
        case 'R':
          setImageRotation((prev) => prev + 90);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasPrev, hasNext, onNavigate, onClose]);

  const handleDownload = async () => {
    try {
      const response = await fetch(file.fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const resetImageTransforms = () => {
    setImageScale(1);
    setImageRotation(0);
  };

  const renderImagePreview = () => {
    if (fileType !== 'image') return null;

    return (
      <div
        className={cn(
          'relative flex items-center justify-center bg-black/95 rounded-lg overflow-hidden',
          isFullscreen ? 'fixed inset-0 z-50' : 'min-h-[500px]'
        )}
      >
        <img
          src={file.fileUrl}
          alt={file.fileName}
          className="max-w-full max-h-[80vh] object-contain transition-transform duration-200 cursor-zoom-in"
          style={{
            transform: `rotate(${imageRotation}deg) scale(${imageScale})`,
          }}
          onClick={() => setImageScale((prev) => (prev === 1 ? 2 : 1))}
        />

        {/* Image Controls */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 rounded-lg p-2 backdrop-blur">
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20"
            onClick={() => setImageScale((prev) => Math.max(0.5, prev - 0.1))}
            disabled={imageScale <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-white text-sm min-w-[60px] text-center">
            {Math.round(imageScale * 100)}%
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20"
            onClick={() => setImageScale((prev) => Math.min(3, prev + 0.1))}
            disabled={imageScale >= 3}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-white/20 mx-1" />
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20"
            onClick={() => setImageRotation((prev) => prev + 90)}
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20"
            onClick={resetImageTransforms}
          >
            Reset
          </Button>
          <div className="w-px h-6 bg-white/20 mx-1" />
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation Arrows */}
        {canNavigate && (
          <>
            {hasPrev && (
              <Button
                size="icon"
                variant="ghost"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
                onClick={() => onNavigate?.('prev')}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
            )}
            {hasNext && (
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
                onClick={() => onNavigate?.('next')}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            )}
          </>
        )}
      </div>
    );
  };

  const renderVideoPreview = () => {
    if (fileType !== 'video') return null;

    return (
      <div className="flex items-center justify-center min-h-[500px] bg-black rounded-lg overflow-hidden">
        <video
          src={file.fileUrl}
          controls
          className="max-w-full max-h-[80vh]"
          controlsList="nodownload"
        >
          Your browser does not support the video tag.
        </video>
      </div>
    );
  };

  const renderAudioPreview = () => {
    if (fileType !== 'audio') return null;

    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 rounded-lg p-8">
        <div className="text-6xl mb-6">🎵</div>
        <h3 className="text-xl font-semibold mb-4">{file.fileName}</h3>
        <audio src={file.fileUrl} controls className="w-full max-w-md" controlsList="nodownload">
          Your browser does not support the audio tag.
        </audio>
      </div>
    );
  };

  const renderPdfPreview = () => {
    if (fileType !== 'pdf') return null;

    return (
      <div className="min-h-[600px] bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden">
        <iframe
          src={`${file.fileUrl}#toolbar=1&navpanes=0&scrollbar=1`}
          className="w-full h-[600px] border-0"
          title={file.fileName}
        />
        <div className="p-4 bg-muted flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            PDF files are displayed in your browser's PDF viewer
          </span>
          <Button variant="outline" size="sm" asChild>
            <a href={file.fileUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in new tab
            </a>
          </Button>
        </div>
      </div>
    );
  };

  const renderOtherPreview = () => {
    if (fileType !== 'other') return null;

    const fileIcon = (() => {
      if (file.mimeType.includes('zip') || file.mimeType.includes('archive')) return '📦';
      if (file.mimeType.includes('text')) return '📝';
      if (file.mimeType.includes('word') || file.mimeType.includes('document')) return '📄';
      if (file.mimeType.includes('sheet') || file.mimeType.includes('excel')) return '📊';
      if (file.mimeType.includes('presentation') || file.mimeType.includes('powerpoint'))
        return '📽️';
      return '📁';
    })();

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-900 dark:to-slate-900 rounded-lg border-2 border-dashed border-border p-8">
        <div className="text-8xl mb-6">{fileIcon}</div>
        <h3 className="text-2xl font-semibold mb-2">{file.fileName}</h3>
        <p className="text-muted-foreground mb-6">
          {file.mimeType || 'Unknown file type'}
        </p>
        <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
          Preview is not available for this file type. You can download it to view the contents.
        </p>
        <Button onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download File
        </Button>
      </div>
    );
  };

  const getPreviewContent = () => {
    switch (fileType) {
      case 'image':
        return renderImagePreview();
      case 'video':
        return renderVideoPreview();
      case 'audio':
        return renderAudioPreview();
      case 'pdf':
        return renderPdfPreview();
      case 'other':
        return renderOtherPreview();
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex-1 min-w-0 mr-4">
            <DialogTitle className="text-lg font-semibold truncate">
              {file.fileName}
            </DialogTitle>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span>{formatFileSize(file.fileSize)}</span>
              <span>•</span>
              <span>{file.mimeType}</span>
              <span>•</span>
              <span>{formatDate(file.uploadedAt)}</span>
              {file.sender && (
                <>
                  <span>•</span>
                  <span>Uploaded by {file.sender.username}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canNavigate && (
              <span className="text-sm text-muted-foreground mr-2">
                {currentIndex + 1} / {allFiles.length}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Preview Area */}
        <ScrollArea className="h-[calc(95vh-80px)]">
          <div className="p-6">{getPreviewContent()}</div>
        </ScrollArea>

        {/* Keyboard shortcuts hint */}
        <div className="absolute bottom-4 left-4 text-xs text-muted-foreground bg-background/80 backdrop-blur rounded px-2 py-1">
          <kbd className="px-1 py-0.5 bg-muted rounded">←</kbd>
          <kbd className="px-1 py-0.5 bg-muted rounded ml-1">→</kbd> Navigate •{' '}
          <kbd className="px-1 py-0.5 bg-muted rounded">Esc</kbd> Close
          {fileType === 'image' && (
            <>
              {' '}
              • <kbd className="px-1 py-0.5 bg-muted rounded">+</kbd>
              <kbd className="px-1 py-0.5 bg-muted rounded">-</kbd> Zoom •{' '}
              <kbd className="px-1 py-0.5 bg-muted rounded">R</kbd> Rotate
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
