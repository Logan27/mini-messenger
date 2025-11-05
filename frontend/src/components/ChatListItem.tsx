import { Chat } from "@/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getAvatarUrl } from "@/lib/avatar-utils";
import { formatDistanceToNow } from "date-fns";
import { BellOff } from "lucide-react";
import { formatTimeAgo, safeParseDate } from "@/lib/date-utils";

interface ChatListItemProps {
  chat: Chat;
  isActive: boolean;
  onClick: () => void;
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
  onClick
}: ChatListItemProps) => {

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
              {formatTimeAgo(chat.timestamp)}
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
              chat.lastMessage
            )}
          </p>
          {getStatusText(chat)}
        </div>
      </div>
    </div>
  );
};
