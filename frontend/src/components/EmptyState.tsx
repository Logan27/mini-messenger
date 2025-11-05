import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  iconClassName?: string;
}

/**
 * EmptyState Component
 * 
 * Reusable component for displaying empty states across the application
 * with consistent styling and optional call-to-action buttons.
 * 
 * @example
 * ```tsx
 * <EmptyState
 *   icon={MessageSquare}
 *   title="No messages yet"
 *   description="Start a conversation to see your messages here"
 *   actionLabel="New Message"
 *   onAction={() => console.log('Action clicked')}
 * />
 * ```
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  iconClassName
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center',
        'min-h-[300px] h-full',
        className
      )}
    >
      {/* Icon */}
      <div className={cn(
        'rounded-full p-6 mb-4',
        'bg-muted/50 dark:bg-muted/30',
        iconClassName
      )}>
        <Icon 
          className="w-12 h-12 text-muted-foreground" 
          strokeWidth={1.5}
        />
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold mb-2 text-foreground">
        {title}
      </h3>

      {/* Description */}
      <p className="text-muted-foreground max-w-md mb-6">
        {description}
      </p>

      {/* Optional CTA Button */}
      {actionLabel && onAction && (
        <Button 
          onClick={onAction}
          variant="default"
          size="default"
          className="mt-2"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
