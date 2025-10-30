import React from 'react'
import { cn } from '@/lib/utils'

interface SkeletonLoaderProps {
  className?: string
  lines?: number
  height?: string
  width?: string
  variant?: 'text' | 'rectangular' | 'circular'
  animated?: boolean
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  className,
  lines = 1,
  height = 'h-4',
  width,
  variant = 'text',
  animated = true
}) => {
  const baseClasses = cn(
    'bg-muted rounded',
    animated && 'animate-pulse'
  )

  if (variant === 'circular') {
    return (
      <div
        className={cn(
          'bg-muted rounded-full',
          animated && 'animate-pulse',
          className
        )}
        style={{ width: width || height, height: height }}
        role="presentation"
        aria-hidden="true"
      />
    )
  }

  if (variant === 'rectangular') {
    return (
      <div
        className={cn(baseClasses, className)}
        style={{ width, height }}
        role="presentation"
        aria-hidden="true"
      />
    )
  }

  // Text variant
  return (
    <div className={cn('space-y-2', className)} role="presentation" aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <div
          key={index}
          className={cn(
            baseClasses,
            height,
            index === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'
          )}
          style={{ width: index === lines - 1 && lines > 1 ? '75%' : width }}
        />
      ))}
    </div>
  )
}

// Predefined skeleton components for common use cases
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('p-6 space-y-4 border rounded-lg', className)} role="presentation" aria-hidden="true">
    <SkeletonLoader height="h-6" width="w-3/4" />
    <SkeletonLoader height="h-4" lines={3} />
    <div className="flex gap-2">
      <SkeletonLoader height="h-8" width="w-20" variant="rectangular" />
      <SkeletonLoader height="h-8" width="w-20" variant="rectangular" />
    </div>
  </div>
)

export const SkeletonTable: React.FC<{ rows?: number; columns?: number; className?: string }> = ({
  rows = 5,
  columns = 4,
  className
}) => (
  <div className={cn('space-y-3', className)} role="presentation" aria-hidden="true">
    {/* Header */}
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {Array.from({ length: columns }, (_, i) => (
        <SkeletonLoader key={i} height="h-5" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }, (_, rowIndex) => (
      <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }, (_, colIndex) => (
          <SkeletonLoader
            key={colIndex}
            height="h-4"
            width={colIndex === 0 ? 'w-8' : colIndex === columns - 1 ? 'w-16' : 'w-full'}
          />
        ))}
      </div>
    ))}
  </div>
)

export const SkeletonAvatar: React.FC<{ size?: string; className?: string }> = ({
  size = 'w-10 h-10',
  className
}) => (
  <SkeletonLoader
    variant="circular"
    height={size}
    width={size}
    className={className}
  />
)

export const SkeletonMessage: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('flex gap-3 p-4', className)} role="presentation" aria-hidden="true">
    <SkeletonAvatar size="w-8 h-8" />
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-2">
        <SkeletonLoader height="h-4" width="w-24" />
        <SkeletonLoader height="h-3" width="w-16" />
      </div>
      <SkeletonLoader height="h-4" lines={2} />
    </div>
  </div>
)

// Messenger-specific skeleton components
export const SkeletonConversationList: React.FC<{ count?: number; className?: string }> = ({
  count = 5,
  className
}) => (
  <div className={cn('space-y-1', className)} role="presentation" aria-hidden="true">
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="flex items-center p-4 border-b">
        <SkeletonAvatar size="w-12 h-12" />
        <div className="ml-3 flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <SkeletonLoader height="h-4" width="w-32" />
            <SkeletonLoader height="h-3" width="w-12" />
          </div>
          <div className="flex items-center justify-between">
            <SkeletonLoader height="h-3" width="w-48" />
            <SkeletonLoader height="h-4" width="w-6" variant="rectangular" />
          </div>
        </div>
      </div>
    ))}
  </div>
)

export const SkeletonChatHeader: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('flex items-center justify-between p-4 border-b', className)} role="presentation" aria-hidden="true">
    <div className="flex items-center space-x-3">
      <SkeletonAvatar size="w-10 h-10" />
      <div className="space-y-1">
        <SkeletonLoader height="h-4" width="w-32" />
        <SkeletonLoader height="h-3" width="w-24" />
      </div>
    </div>
    <div className="flex items-center space-x-2">
      <SkeletonLoader height="h-8" width="w-8" variant="rectangular" />
      <SkeletonLoader height="h-8" width="w-8" variant="rectangular" />
      <SkeletonLoader height="h-8" width="w-8" variant="rectangular" />
    </div>
  </div>
)

export const SkeletonMessageList: React.FC<{ count?: number; className?: string }> = ({
  count = 3,
  className
}) => (
  <div className={cn('space-y-4 p-4', className)} role="presentation" aria-hidden="true">
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className={cn('flex gap-3', index % 2 === 1 && 'flex-row-reverse')}>
        <SkeletonAvatar size="w-8 h-8" />
        <div className={cn('flex-1 space-y-1 max-w-xs', index % 2 === 1 && 'items-end')}>
          <SkeletonLoader height="h-3" width="w-16" />
          <div className="bg-muted rounded-lg p-3">
            <SkeletonLoader height="h-4" lines={Math.floor(Math.random() * 3) + 1} />
          </div>
        </div>
      </div>
    ))}
  </div>
)

export const SkeletonMessageInput: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('flex items-center gap-2 p-4 border-t', className)} role="presentation" aria-hidden="true">
    <SkeletonLoader height="h-10" className="flex-1" variant="rectangular" />
    <SkeletonLoader height="h-10" width="h-10" variant="rectangular" />
    <SkeletonLoader height="h-10" width="h-10" variant="rectangular" />
  </div>
)

export const SkeletonSearchResults: React.FC<{ count?: number; className?: string }> = ({
  count = 3,
  className
}) => (
  <div className={cn('space-y-3', className)} role="presentation" aria-hidden="true">
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="flex items-center p-3 border rounded-lg">
        <SkeletonAvatar size="w-10 h-10" />
        <div className="ml-3 flex-1 space-y-1">
          <SkeletonLoader height="h-4" width="w-32" />
          <SkeletonLoader height="h-3" width="w-48" />
        </div>
        <SkeletonLoader height="h-8" width="w-20" variant="rectangular" />
      </div>
    ))}
  </div>
)

export default SkeletonLoader