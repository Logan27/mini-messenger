import React from 'react';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * ChatListSkeleton Component
 * 
 * Skeleton loader for chat list items
 */
export const ChatListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg"
        >
          {/* Avatar */}
          <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />

          {/* Content */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-3 w-full max-w-[200px]" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * MessageSkeleton Component
 * 
 * Skeleton loader for message bubbles
 */
export const MessageSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: count }).map((_, index) => {
        const isOwn = index % 2 === 0;
        return (
          <div
            key={index}
            className={cn(
              'flex gap-2',
              isOwn ? 'justify-end' : 'justify-start'
            )}
          >
            {!isOwn && <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />}
            
            <div
              className={cn(
                'space-y-2 max-w-[70%]',
                isOwn ? 'items-end' : 'items-start'
              )}
            >
              {!isOwn && <Skeleton className="h-3 w-24" />}
              <Skeleton
                className={cn(
                  'h-16 rounded-2xl',
                  index % 3 === 0 ? 'w-64' : index % 3 === 1 ? 'w-48' : 'w-56'
                )}
              />
              <Skeleton className="h-2 w-16" />
            </div>

            {isOwn && <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />}
          </div>
        );
      })}
    </div>
  );
};

/**
 * SettingsSkeleton Component
 * 
 * Skeleton loader for settings pages
 */
export const SettingsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Settings sections */}
      {Array.from({ length: 3 }).map((_, sectionIndex) => (
        <div key={sectionIndex} className="space-y-4">
          <Skeleton className="h-6 w-32" />
          
          {Array.from({ length: 4 }).map((_, itemIndex) => (
            <div key={itemIndex} className="flex items-center justify-between py-3">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * ContactListSkeleton Component
 * 
 * Skeleton loader for contact lists
 */
export const ContactListSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg"
        >
          {/* Avatar with status */}
          <div className="relative">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-3 w-3 rounded-full absolute bottom-0 right-0" />
          </div>

          {/* Content */}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>

          {/* Action buttons */}
          <div className="flex gap-1">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * CallHistorySkeleton Component
 * 
 * Skeleton loader for call history
 */
export const CallHistorySkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg"
        >
          {/* Avatar */}
          <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />

          {/* Content */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>

          {/* Call button */}
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      ))}
    </div>
  );
};

/**
 * TableSkeleton Component
 * 
 * Skeleton loader for data tables (admin panels)
 */
export const TableSkeleton: React.FC<{ 
  rows?: number;
  columns?: number;
}> = ({ 
  rows = 5,
  columns = 5
}) => {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="h-4 flex-1" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-3">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={colIndex} 
              className={cn(
                'h-4 flex-1',
                colIndex === 0 && 'h-8 w-8 rounded-full'
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * CardSkeleton Component
 * 
 * Skeleton loader for card-based layouts
 */
export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-lg border p-6 space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="flex justify-between pt-4">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default {
  ChatListSkeleton,
  MessageSkeleton,
  SettingsSkeleton,
  ContactListSkeleton,
  CallHistorySkeleton,
  TableSkeleton,
  CardSkeleton
};
