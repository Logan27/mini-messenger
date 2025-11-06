import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MessageReactionsProps {
  reactions: Record<string, string[]>; // { "👍": ["userId1", "userId2"], "❤️": ["userId3"] }
  currentUserId: string;
  onReactionClick?: (emoji: string) => void;
}

export const MessageReactions = ({
  reactions,
  currentUserId,
  onReactionClick
}: MessageReactionsProps) => {
  if (!reactions || Object.keys(reactions).length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(reactions).map(([emoji, userIds]) => {
        const count = userIds.length;
        const hasReacted = userIds.includes(currentUserId);

        return (
          <TooltipProvider key={emoji}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onReactionClick?.(emoji)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors",
                    hasReacted
                      ? "bg-primary/20 border border-primary hover:bg-primary/30"
                      : "bg-muted border border-border hover:bg-muted/80"
                  )}
                >
                  <span className="text-sm">{emoji}</span>
                  {count > 1 && <span className="text-xs font-medium">{count}</span>}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {hasReacted
                    ? count > 1
                      ? `You and ${count - 1} other${count > 2 ? 's' : ''}`
                      : 'You reacted'
                    : `${count} reaction${count > 1 ? 's' : ''}`}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
};
