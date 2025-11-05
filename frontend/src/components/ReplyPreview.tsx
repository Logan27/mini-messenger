import { ReplyPreview as ReplyPreviewType } from "@/types/chat";
import { Reply } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReplyPreviewProps {
  reply: ReplyPreviewType;
  isOwn?: boolean;
  onClick?: () => void;
}

export const ReplyPreview = ({ reply, isOwn, onClick }: ReplyPreviewProps) => {
  return (
    <div
      className={cn(
        "flex items-start gap-2 mb-1 pl-3 border-l-2 py-1 transition-colors",
        isOwn ? "border-primary-foreground/40" : "border-primary/60",
        onClick && "cursor-pointer hover:bg-background/10 rounded"
      )}
      onClick={onClick}
    >
      <Reply className="h-3 w-3 mt-0.5 opacity-70" />
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-xs font-semibold",
          isOwn ? "text-primary-foreground" : "text-primary"
        )}>
          {reply.senderName}
        </p>
        <p className={cn(
          "text-xs truncate opacity-80",
          isOwn ? "text-primary-foreground" : "text-foreground"
        )}>
          {reply.text}
        </p>
      </div>
    </div>
  );
};
