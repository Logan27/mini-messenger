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
  console.log('🎨 MessageReactions rendering:', {
    reactions,
    reactionsType: typeof reactions,
    reactionsKeys: reactions ? Object.keys(reactions) : [],
    currentUserId,
  });

  if (!reactions || Object.keys(reactions).length === 0) {
    console.log('❌ No reactions to display');
    return null;
  }

  console.log('✅ Rendering reactions:', Object.entries(reactions));

  return (
    <div className="flex flex-wrap gap-1 mt-1" style={{ backgroundColor: 'rgba(255, 0, 0, 0.1)' }}>
      {Object.entries(reactions).map(([emoji, userIds]) => {
        const count = userIds.length;
        const hasReacted = userIds.includes(currentUserId);

        console.log('🎨 Rendering reaction button:', { emoji, userIds, count, hasReacted });

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
                  style={{ backgroundColor: 'yellow', minWidth: '50px', minHeight: '30px' }}
                >
                  <span className="text-sm" style={{ color: 'black' }}>{emoji}</span>
                  {count > 1 && <span className="text-xs font-medium" style={{ color: 'black' }}>{count}</span>}
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
