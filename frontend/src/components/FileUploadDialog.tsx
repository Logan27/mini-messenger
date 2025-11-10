import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { fileService } from "@/services/file.service";
import { Loader2, Upload, X, File, Image, CheckCircle2 } from "lucide-react";
import { optimizeImage, calculateCompressionRatio, formatFileSize } from "@/utils/imageOptimization";

interface FileUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileUploaded: (fileData: unknown) => void;
}

export function FileUploadDialog({ open, onOpenChange, onFileUploaded }: FileUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressionStats, setCompressionStats] = useState<{
    originalSize: number;
    optimizedSize: number;
    ratio: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (25MB max)
    if (file.size > 25 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Maximum file size is 25MB",
      });
      return;
    }

    setOriginalFile(file);

    // Optimize images before upload
    if (file.type.startsWith('image/')) {
      setOptimizing(true);

      try {
        const optimized = await optimizeImage(file, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.85,
          format: 'auto', // Will use WebP if supported, otherwise JPEG
        });

        setSelectedFile(optimized.file);
        setPreviewUrl(optimized.dataUrl);

        // Calculate compression stats
        const ratio = calculateCompressionRatio(file.size, optimized.size);
        setCompressionStats({
          originalSize: file.size,
          optimizedSize: optimized.size,
          ratio,
        });

        if (ratio > 10) {
          toast({
            title: "Image optimized",
            description: `Reduced file size by ${ratio}% (${formatFileSize(file.size)} → ${formatFileSize(optimized.size)})`,
          });
        }
      } catch (error) {
        console.error('Image optimization failed:', error);
        // Fall back to original file if optimization fails
        setSelectedFile(file);
        setCompressionStats(null);

        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);

        toast({
          variant: "destructive",
          title: "Optimization failed",
          description: "Using original file instead",
        });
      } finally {
        setOptimizing(false);
      }
    } else {
      // Non-image files: use as-is
      setSelectedFile(file);
      setPreviewUrl(null);
      setCompressionStats(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const fileData = await fileService.uploadFile(selectedFile, (progress) => {
        setUploadProgress(progress);
      });

      toast({
        title: "File uploaded",
        description: `${selectedFile.name} has been uploaded successfully`,
      });

      onFileUploaded(fileData);
      handleClose();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.response?.data?.message || "Failed to upload file",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setOriginalFile(null);
    setPreviewUrl(null);
    setUploadProgress(0);
    setCompressionStats(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload File</DialogTitle>
          <DialogDescription>
            Upload an image or document to share in the conversation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!selectedFile ? (
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-accent transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Click to select a file or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">
                Maximum file size: 25MB
              </p>
              <Input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
              />
            </div>
          ) : optimizing ? (
            <div className="flex items-center justify-center p-8 border border-dashed rounded-lg">
              <div className="text-center">
                <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Optimizing image...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {previewUrl ? (
                <div className="relative rounded-lg overflow-hidden border">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-64 object-contain bg-muted"
                  />
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setSelectedFile(null);
                      setOriginalFile(null);
                      setPreviewUrl(null);
                      setCompressionStats(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-lg border">
                  <File className="h-10 w-10 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setSelectedFile(null);
                      setOriginalFile(null);
                      setPreviewUrl(null);
                      setCompressionStats(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Compression Stats */}
              {compressionStats && compressionStats.ratio > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                      Image optimized ({compressionStats.ratio}% smaller)
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      {formatFileSize(compressionStats.originalSize)} → {formatFileSize(compressionStats.optimizedSize)}
                    </p>
                  </div>
                </div>
              )}

              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploading || optimizing}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading || optimizing}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : optimizing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
