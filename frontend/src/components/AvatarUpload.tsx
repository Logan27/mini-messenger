import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { userService } from "@/services/user.service";
import { optimizeImage, formatFileSize, calculateCompressionRatio } from "@/utils/imageOptimization";

interface AvatarUploadProps {
  currentAvatar?: string;
  username: string;
  onAvatarChange: (url: string) => void;
}

export function AvatarUpload({ currentAvatar, username, onAvatarChange }: AvatarUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatar || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please select an image file (JPG, PNG, GIF, WebP)",
      });
      return;
    }

    // Validate file size (5MB max for avatars)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Avatar must be less than 5MB",
      });
      return;
    }

    // Optimize avatar before upload
    setIsOptimizing(true);

    try {
      // Optimize with square dimensions for avatars (500x500)
      const optimized = await optimizeImage(file, {
        maxWidth: 500,
        maxHeight: 500,
        quality: 0.9,
        format: 'auto', // Will use WebP if supported
        generateThumbnail: true, // Generate 200x200 thumbnail
        thumbnailSize: 200,
      });

      // Show optimized preview
      setPreviewUrl(optimized.dataUrl);

      // Calculate compression
      const ratio = calculateCompressionRatio(file.size, optimized.size);

      // Upload optimized file
      setIsOptimizing(false);
      setIsUploading(true);
      setUploadProgress(0);

      const uploadedData = await userService.uploadAvatar(optimized.file, (progress) => {
        setUploadProgress(progress);
      });

      // Backend returns { avatar: "/uploads/...", file: {...} }
      const avatarUrl = uploadedData.avatar;
      onAvatarChange(avatarUrl);

      toast({
        title: "Avatar uploaded",
        description: ratio > 10
          ? `Profile picture updated (${ratio}% smaller)`
          : "Your profile picture has been updated",
      });
    } catch (error) {
      console.error('Avatar optimization/upload failed:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Failed to upload avatar",
      });
      // Revert to previous avatar on error
      setPreviewUrl(currentAvatar || null);
    } finally {
      setIsUploading(false);
      setIsOptimizing(false);
      setUploadProgress(0);
    }
  };

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveAvatar = () => {
    setPreviewUrl(null);
    onAvatarChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <div 
          className="cursor-pointer group"
          onClick={handleCameraClick}
        >
          <Avatar className="h-24 w-24 transition-opacity group-hover:opacity-80">
            <AvatarImage src={previewUrl || undefined} alt={username} />
            <AvatarFallback className="text-2xl">
              {username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {(isUploading || isOptimizing) && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
              <div className="text-white text-center">
                {isOptimizing ? (
                  <div className="text-xs font-semibold">Optimizing...</div>
                ) : (
                  <div className="text-xs font-semibold">{uploadProgress}%</div>
                )}
              </div>
            </div>
          )}

          <Button
            size="icon"
            variant="secondary"
            className="absolute bottom-0 right-0 rounded-full h-8 w-8 pointer-events-none"
            disabled={isUploading || isOptimizing}
            type="button"
          >
            {(isUploading || isOptimizing) ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
          disabled={isUploading || isOptimizing}
        />
      </div>

      <div className="flex-1">
        <p className="text-sm font-medium mb-2">Profile Picture</p>
        <p className="text-xs text-muted-foreground mb-3">
          Click the avatar to upload a new picture (max 5MB). Images will be automatically optimized.
        </p>
        {previewUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemoveAvatar}
            disabled={isUploading || isOptimizing}
          >
            <X className="h-4 w-4 mr-2" />
            Remove Avatar
          </Button>
        )}
      </div>
    </div>
  );
}
