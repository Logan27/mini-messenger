import { useState, useEffect, lazy, Suspense } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileImage,
  FileVideo,
  FileAudio,
  FileText,
  File,
  Search,
  Grid3x3,
  List,
  Download,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { InlineLoadingFallback } from './LoadingFallback';
import type { FilePreviewData } from './FilePreview';

// Lazy load FilePreview component - only loaded when user clicks on a file
const FilePreview = lazy(() => import("./FilePreview").then(module => ({ default: module.FilePreview })));

interface FileGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId?: string;
  groupId?: string;
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
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <FileImage className="h-5 w-5" />;
  if (mimeType.startsWith('video/')) return <FileVideo className="h-5 w-5" />;
  if (mimeType.startsWith('audio/')) return <FileAudio className="h-5 w-5" />;
  if (mimeType.includes('pdf') || mimeType.includes('document'))
    return <FileText className="h-5 w-5" />;
  return <File className="h-5 w-5" />;
};

const getFileTypeCategory = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf') || mimeType.includes('document')) return 'document';
  return 'other';
};

export const FileGallery = ({
  isOpen,
  onClose,
  conversationId,
  groupId,
}: FileGalleryProps) => {
  const [files, setFiles] = useState<FilePreviewData[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FilePreviewData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFile, setSelectedFile] = useState<FilePreviewData | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('all');

  // Mock data - Replace with actual API call
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      // TODO: Fetch files from API
      // For now, using mock data
      setTimeout(() => {
        const mockFiles: FilePreviewData[] = [
          {
            id: '1',
            fileName: 'vacation-photo.jpg',
            fileUrl: 'https://picsum.photos/800/600',
            mimeType: 'image/jpeg',
            fileSize: 2048576,
            uploadedAt: new Date('2025-10-20'),
            sender: { id: 'user1', username: 'john_doe' },
          },
          {
            id: '2',
            fileName: 'presentation.pdf',
            fileUrl: '/sample.pdf',
            mimeType: 'application/pdf',
            fileSize: 5242880,
            uploadedAt: new Date('2025-10-18'),
            sender: { id: 'user2', username: 'jane_smith' },
          },
          {
            id: '3',
            fileName: 'meeting-recording.mp4',
            fileUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            mimeType: 'video/mp4',
            fileSize: 15728640,
            uploadedAt: new Date('2025-10-15'),
            sender: { id: 'user1', username: 'john_doe' },
          },
        ];
        setFiles(mockFiles);
        setFilteredFiles(mockFiles);
        setLoading(false);
      }, 500);
    }
  }, [isOpen, conversationId, groupId]);

  // Filter files based on search and tab
  useEffect(() => {
    let filtered = files;

    // Filter by type tab
    if (activeTab !== 'all') {
      filtered = filtered.filter(
        (file) => getFileTypeCategory(file.mimeType) === activeTab
      );
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((file) =>
        file.fileName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredFiles(filtered);
  }, [files, searchQuery, activeTab]);

  const handleFileClick = (file: FilePreviewData, index: number) => {
    setSelectedFile(file);
    setSelectedIndex(index);
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' ? selectedIndex - 1 : selectedIndex + 1;
    if (newIndex >= 0 && newIndex < filteredFiles.length) {
      setSelectedIndex(newIndex);
      setSelectedFile(filteredFiles[newIndex]);
    }
  };

  const handleDownloadAll = () => {
    // TODO: Implement bulk download as ZIP
    console.log('Download all files');
  };

  const imageFiles = files.filter((f) => f.mimeType.startsWith('image/'));
  const videoFiles = files.filter((f) => f.mimeType.startsWith('video/'));
  const audioFiles = files.filter((f) => f.mimeType.startsWith('audio/'));
  const documentFiles = files.filter(
    (f) => f.mimeType.includes('pdf') || f.mimeType.includes('document')
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Files & Media</DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                >
                  {viewMode === 'grid' ? (
                    <List className="h-4 w-4" />
                  ) : (
                    <Grid3x3 className="h-4 w-4" />
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadAll}>
                  <Download className="h-4 w-4 mr-2" />
                  Download All
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="all">
                  All ({files.length})
                </TabsTrigger>
                <TabsTrigger value="image">
                  Images ({imageFiles.length})
                </TabsTrigger>
                <TabsTrigger value="video">
                  Videos ({videoFiles.length})
                </TabsTrigger>
                <TabsTrigger value="audio">
                  Audio ({audioFiles.length})
                </TabsTrigger>
                <TabsTrigger value="document">
                  Docs ({documentFiles.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                <ScrollArea className="h-[500px]">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                        <p className="text-sm text-muted-foreground">Loading files...</p>
                      </div>
                    </div>
                  ) : filteredFiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-12">
                      <File className="h-16 w-16 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">No files found</p>
                      <p className="text-sm text-muted-foreground">
                        {searchQuery
                          ? 'Try a different search query'
                          : 'No files have been shared in this conversation yet'}
                      </p>
                    </div>
                  ) : viewMode === 'grid' ? (
                    // Grid View
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1">
                      {filteredFiles.map((file, index) => (
                        <div
                          key={file.id}
                          className="group relative aspect-square rounded-lg overflow-hidden border bg-muted cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                          onClick={() => handleFileClick(file, index)}
                        >
                          {file.mimeType.startsWith('image/') ? (
                            <img
                              src={file.fileUrl}
                              alt={file.fileName}
                              className="w-full h-full object-cover"
                            />
                          ) : file.mimeType.startsWith('video/') ? (
                            <div className="relative w-full h-full">
                              <video
                                src={file.fileUrl}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <FileVideo className="h-12 w-12 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
                              {getFileIcon(file.mimeType)}
                              <p className="text-xs font-medium mt-2 text-center line-clamp-2">
                                {file.fileName}
                              </p>
                            </div>
                          )}
                          {/* Overlay */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end p-2">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs truncate w-full">
                              {file.fileName}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // List View
                    <div className="space-y-2 p-1">
                      {filteredFiles.map((file, index) => (
                        <div
                          key={file.id}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors"
                          onClick={() => handleFileClick(file, index)}
                        >
                          <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-muted flex items-center justify-center">
                            {file.mimeType.startsWith('image/') ? (
                              <img
                                src={file.fileUrl}
                                alt={file.fileName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-muted-foreground">
                                {getFileIcon(file.mimeType)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{file.fileName}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span>{formatFileSize(file.fileSize)}</span>
                              <span>•</span>
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(file.uploadedAt)}</span>
                              {file.sender && (
                                <>
                                  <span>•</span>
                                  <span>{file.sender.username}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Download individual file
                              window.open(file.fileUrl, '_blank');
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Preview Modal */}
      {selectedFile && (
        <Suspense fallback={<InlineLoadingFallback />}>
          <FilePreview
            isOpen={!!selectedFile}
            onClose={() => setSelectedFile(null)}
            file={selectedFile}
            allFiles={filteredFiles}
            currentIndex={selectedIndex}
            onNavigate={handleNavigate}
          />
        </Suspense>
      )}
    </>
  );
};
