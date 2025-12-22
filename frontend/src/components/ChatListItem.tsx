import { Chat } from "@/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getAvatarUrl } from "@/lib/avatar-utils";
import { formatDistanceToNow } from "date-fns";
import { BellOff } from "lucide-react";
import { formatTimeAgo, safeParseDate } from "@/lib/date-utils";
import { useEffect, useState } from "react";
import { encryptionService } from "@/services/encryptionService";
import { encryptionAPI } from "@/lib/api-client";

interface ChatListItemProps {
  chat: Chat;
  isActive: boolean;
  onClick: () => void;
  onStartCall?: (contactId: string, callType: 'voice' | 'video') => void;
  onMuteToggle?: (chatId: string, isMuted: boolean) => void;
  onDelete?: (chatId: string) => void;
  onBlock?: (chatId: string) => void;
}

const getStatusText = (chat: Chat) => {
  if (chat.isOnline) {
    return <span className="text-green-500 text-xs">Online</span>;
  } else if (chat.lastSeen) {
    const parsedDate = safeParseDate(chat.lastSeen);
    if (parsedDate) {
      try {
        return (
          <span className="text-xs text-muted-foreground">
            Last seen {formatDistanceToNow(parsedDate, { addSuffix: true })}
          </span>
        );
      } catch (e) {
        return null;
      }
    }
  }
  return null;
};

export const ChatListItem = ({
  chat,
  isActive,
  onClick,
  onStartCall,
  onMuteToggle,
  onDelete,
  onBlock
}: ChatListItemProps) => {

  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const decryptMessage = async () => {
      // Return early if not encrypted
      if (!chat.lastMessageIsEncrypted) {
        if (isMounted) setDecryptedContent(null);
        return;
      }

      // If we don't have metadata, we can't decrypt
      if (!chat.lastMessageEncryptionMetadata?.nonce) return;

      try {
        const myKeys = encryptionService.loadKeys();
        if (!myKeys) return;

        let text: string | null = null;

        // 1. Try decrypting as Incoming Message (standard)
        if (chat.lastMessageEncryptedContent) {
          try {
            const otherUserId = chat.id; // Correct for DM

            // Try to get key from cache
            let senderKey = localStorage.getItem(`public_key_${otherUserId}`);
            if (!senderKey) {
              try {
                const res = await encryptionAPI.getPublicKey(otherUserId);
                if (res?.data?.data?.publicKey) {
                  senderKey = res.data.data.publicKey;
                  localStorage.setItem(`public_key_${otherUserId}`, senderKey);
                }
              } catch { }
            }

            if (senderKey) {
              text = await encryptionService.decrypt(
                chat.lastMessageEncryptedContent,
                chat.lastMessageEncryptionMetadata.nonce,
                senderKey
              );
            }
          } catch (e) {
            // Failed regular decryption
          }
        }

        // 2. If that failed, maybe it's OUR message (Dual Encryption)?
        if (!text && chat.lastMessageMetadata?.encryptedContentOwner && chat.lastMessageMetadata?.nonceOwner) {
          try {
            // Decrypt using MY key (I am the sender and recipient of this copy)
            text = await encryptionService.decrypt(
              chat.lastMessageMetadata.encryptedContentOwner,
              chat.lastMessageMetadata.nonceOwner,
              myKeys.publicKey
            );
          } catch (e) {
            // Failed owner decryption
          }
        }

        if (text && isMounted) {
          setDecryptedContent(text);
        }
      } catch (e) {
        console.error('Preview decryption failed', e);
      }
    };

    decryptMessage();

    return () => {
      isMounted = false;
    };
  }, [chat]);

  // Helper to safely check timestamp validity
  const isValidTimestamp = (date: Date) => {
    return date instanceof Date && date.getTime() > 0 && !isNaN(date.getTime());
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-border group relative",
        isActive ? "bg-muted" : "hover:bg-chat-hover"
      )}
    >
      <div className="relative">
        <Avatar className="h-12 w-12">
          <AvatarImage src={getAvatarUrl(chat.avatar)} alt={chat.name} />
          <AvatarFallback>{chat.name.charAt(0)}</AvatarFallback>
        </Avatar>
        {chat.isOnline && (
          <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center mb-1 gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{chat.name}</h3>
            {chat.isMuted && (
              <BellOff className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {isValidTimestamp(chat.timestamp) ? formatTimeAgo(chat.timestamp) : ''}
            </span>
            {chat.unreadCount > 0 && (
              <Badge className="bg-primary text-primary-foreground rounded-full h-5 min-w-[20px] px-1.5 text-xs flex-shrink-0">
                {chat.unreadCount}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground truncate flex-1 min-w-0">
            {chat.isTyping ? (
              <span className="text-primary italic flex items-center gap-1">
                <span className="inline-block w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }} />
                <span className="inline-block w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }} />
                <span className="inline-block w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1s' }} />
                <span className="ml-1">typing...</span>
              </span>
            ) : (
              decryptedContent || chat.lastMessage
            )}
          </p>
          {getStatusText(chat)}
        </div>
      </div>
    </div>
  );
};
