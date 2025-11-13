import { Message } from "@/types/chat";
import { cn } from "@/lib/utils";
import { Check, CheckCheck, MoreVertical, Reply, Copy, Trash2, Edit2, Download, FileIcon, Image as ImageIcon, Video, Music, Clock } from "lucide-react";
import { MessageReactions } from "./MessageReactions";
import { ReactionPicker } from "./ReactionPicker";
import { ReplyPreview } from "./ReplyPreview";
import { useState, lazy, Suspense } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { InlineLoadingFallback } from "./LoadingFallback";
import type { FilePreviewData } from "./FilePreview";
import { AuthenticatedImage } from "./AuthenticatedImage";

// Lazy load FilePreview component - only loaded when user clicks on a file
const FilePreview = lazy(() => import("./FilePreview").then(module => ({ default: module.FilePreview })));

interface MessageBubbleProps {
  message: Message;
  currentUserId: string;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  onReplyClick?: (messageId: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  isGroupMessage?: boolean;
  allImages?: Message[]; // All image messages in chat for navigation
}

const formatMessageTime = (date: Date) => {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const MessageBubble = ({ message, currentUserId, onReply, onEdit, onDelete, onReplyClick, onReaction, isGroupMessage = false, allImages = [] }: MessageBubbleProps) => {
  const [showActions, setShowActions] = useState(false);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleCopy = () => {
    if (message.text) {
      navigator.clipboard.writeText(message.text);
    }
  };

  const handleEdit = () => {
    onEdit?.(message);
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      onDelete?.(message.id);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = () => {
    if (!message.mimeType) return <FileIcon className="h-5 w-5" />;
    if (message.mimeType.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
    if (message.mimeType.startsWith('video/')) return <Video className="h-5 w-5" />;
    if (message.mimeType.startsWith('audio/')) return <Music className="h-5 w-5" />;
    return <FileIcon className="h-5 w-5" />;
  };

  const handleFileClick = () => {
    if (message.fileUrl && message.fileName && message.mimeType?.startsWith('image/')) {
      // Find index of current image in all images
      const index = allImages.findIndex(img => img.id === message.id);
      setCurrentImageIndex(index !== -1 ? index : 0);
      setShowFilePreview(true);
    }
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    } else if (direction === 'next' && currentImageIndex < allImages.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  // Get all file preview data for navigation (images, PDFs, videos, audio)
  const allFileMessages = allImages.filter(msg =>
    msg.fileId && msg.fileName && msg.fileUrl && msg.mimeType
  );

  const allImageFiles: FilePreviewData[] = allFileMessages.map(msg => ({
    id: msg.fileId!,
    fileName: msg.fileName!,
    fileUrl: msg.fileUrl!,
    mimeType: msg.mimeType!,
    fileSize: msg.fileSize || 0,
    uploadedAt: msg.timestamp,
  }));

  const currentFilePreviewData = allImageFiles[currentImageIndex] || null;

  return (
    <>
      <div
        className={cn(
          "flex mb-4 animate-fade-in group",
          message.isOwn ? "justify-end" : "justify-start"
        )}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div className="flex items-start gap-2 max-w-xs lg:max-w-md xl:max-w-lg">
          <div
            className={cn(
              "flex-1",
              message.isOwn && "order-2"
            )}
          >
            <div
              className={cn(
                "px-4 py-2 rounded-2xl relative",
                message.isOwn
                  ? "bg-message-sent text-message-sent-foreground rounded-br-md"
                  : "bg-message-received text-message-received-foreground rounded-bl-md"
              )}
            >
              {message.replyTo && (
                <ReplyPreview
                  reply={message.replyTo}
                  isOwn={message.isOwn}
                  onClick={() => onReplyClick?.(message.replyTo!.id)}
                />
              )}
              
              {/* File Attachment */}
              {message.messageType === 'file' && message.fileName && (
                <>
                  {/* Image preview for image files - click to open in preview */}
                  {message.mimeType?.startsWith('image/') && message.fileUrl && (
                    <div className="cursor-pointer" onClick={handleFileClick}>
                      <AuthenticatedImage
                        src={message.fileUrl}
                        alt={message.fileName}
                        className="rounded-lg max-w-full max-h-80 object-contain"
                      />
                    </div>
                  )}

                  {/* Document card for non-image files */}
                  {!message.mimeType?.startsWith('image/') && (
                    <div
                      className="flex items-center gap-3 p-3 bg-background/10 rounded-lg border border-border/20 cursor-pointer hover:bg-background/20 transition-colors max-w-sm"
                      onClick={async (e) => {
                        e.stopPropagation();
                        // Download file immediately with authentication
                        try {
                          const token = localStorage.getItem('accessToken');
                          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
                          const fileUrl = message.fileUrl.startsWith('http')
                            ? message.fileUrl
                            : `${API_URL}${message.fileUrl.startsWith('/api/') ? message.fileUrl.substring(4) : message.fileUrl}`;

                          const response = await fetch(fileUrl, {
                            headers: {
                              Authorization: `Bearer ${token}`,
                            },
                          });

                          const blob = await response.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = message.fileName;
                          document.body.appendChild(a);
                          a.click();
                          URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                        } catch (error) {
                          console.error('Download failed:', error);
                        }
                      }}
                      title={`Download ${message.fileName}`}
                    >
                      <div className="flex-shrink-0">
                        {getFileIcon()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{message.fileName}</p>
                        {message.fileSize && (
                          <p className="text-xs opacity-70">{formatFileSize(message.fileSize)}</p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Image (legacy support) */}
              {message.imageUrl && (
                <LazyImage
                  src={message.imageUrl}
                  alt="Shared image"
                  className="rounded-lg mb-2 max-w-full"
                  objectFit="contain"
                  loading="lazy"
                  onClick={() => {
                    // Could open FilePreview here too
                    window.open(message.imageUrl, '_blank');
                  }}
                />
              )}

              {/* Message text - hide filenames for file attachments */}
              {message.text && message.messageType !== 'file' && (
                <p className="text-sm break-words">{message.text}</p>
              )}
              
              <div
                className={cn(
                  "flex items-center gap-1 mt-1",
                  message.isOwn ? "justify-end" : "justify-start"
                )}
              >
                <span
                  className={cn(
                    "text-xs",
                    message.isOwn
                      ? "text-message-sent-foreground/70"
                      : "text-muted-foreground"
                  )}
                >
                  {formatMessageTime(message.timestamp)}
                </span>
                {message.isOwn && (
                  <span>
                    {message.status === 'sending' && (
                      <Clock className="h-3 w-3 text-white/60" />
                    )}
                    {message.status === 'failed' && (
                      <Clock className="h-3 w-3 text-red-300" />
                    )}
                    {/* Group messages: show simple sent indicator */}
                    {isGroupMessage && message.status !== 'sending' && message.status !== 'failed' && (
                      <Check className="h-3 w-3 text-white/80" />
                    )}
                    {/* Direct messages: show detailed delivery status */}
                    {!isGroupMessage && message.status === 'sent' && (
                      <Check className="h-3 w-3 text-white/80" />
                    )}
                    {!isGroupMessage && message.status === 'delivered' && (
                      <CheckCheck className="h-3 w-3 text-white/80" />
                    )}
                    {!isGroupMessage && message.status === 'read' && (
                      <CheckCheck className="h-3 w-3 text-white" />
                    )}
                  </span>
                )}
              </div>

              {/* Message Reactions - positioned below message content */}
              {message.reactions && Object.keys(message.reactions).length > 0 && (
                <MessageReactions
                  reactions={message.reactions}
                  currentUserId={currentUserId}
                  onReactionClick={onReaction ? (emoji) => onReaction(message.id, emoji) : undefined}
                />
              )}
            </div>
          </div>

          {/* Reaction Picker - shown on hover */}
          <div className={cn(
            "opacity-0 group-hover:opacity-100 transition-opacity",
            message.isOwn && "order-1"
          )}>
            <ReactionPicker
              onReactionSelect={(emoji) => onReaction?.(message.id, emoji)}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity",
                  message.isOwn && "order-1"
                )}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={message.isOwn ? "end" : "start"} className="bg-popover">
              <DropdownMenuItem onClick={() => onReply?.(message)}>
                <Reply className="mr-2 h-4 w-4" />
                Reply
              </DropdownMenuItem>
              {message.text && (
                <DropdownMenuItem onClick={handleCopy}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </DropdownMenuItem>
              )}
              {message.isOwn && message.text && (
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {message.isOwn && (
                <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* File Preview Modal with navigation */}
      {currentFilePreviewData && showFilePreview && (
        <Suspense fallback={<InlineLoadingFallback />}>
          <FilePreview
            isOpen={showFilePreview}
            onClose={() => setShowFilePreview(false)}
            file={currentFilePreviewData}
            allFiles={allImageFiles}
            currentIndex={currentImageIndex}
            onNavigate={handleNavigate}
          />
        </Suspense>
      )}
    </>
  );
};
