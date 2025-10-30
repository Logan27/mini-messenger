import React from 'react'
import { MessageCircle, Hash, Calendar, User, ArrowRight } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { SearchResult, Message } from '@/shared/lib/types'

interface SearchResultsProps {
  results: SearchResult[]
  query: string
  isLoading?: boolean
  onResultClick?: (result: SearchResult) => void
  onLoadMore?: () => void
  hasMore?: boolean
  className?: string
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  query,
  isLoading = false,
  onResultClick,
  onLoadMore,
  hasMore = false,
  className
}) => {
  const getMessageTypeIcon = (type: Message['type']) => {
    switch (type) {
      case 'text':
        return <MessageCircle className="h-4 w-4" />
      case 'file':
        return <Hash className="h-4 w-4" />
      case 'image':
        return <Hash className="h-4 w-4" />
      default:
        return <MessageCircle className="h-4 w-4" />
    }
  }

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text

    const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <div className="flex items-center space-x-2 text-gray-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
          <span>Searching...</span>
        </div>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className={cn('text-center py-8 text-gray-500', className)}>
        <SearchIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No messages found</p>
        <p className="text-sm">Try adjusting your search terms or filters</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
        </p>
      </div>

      <ScrollArea className="h-96">
        <div className="space-y-1">
          {results.map((result, index) => (
            <div key={`${result.message.id}-${index}`}>
              <div
                className="p-3 rounded-lg hover:bg-gray-50 cursor-pointer group"
                onClick={() => onResultClick?.(result)}
              >
                <div className="flex items-start space-x-3">
                  {/* Sender avatar */}
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={`/api/users/${result.message.senderId}/avatar`} alt="Sender" />
                    <AvatarFallback>
                      {result.message.senderId.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    {/* Header with sender, timestamp, and type */}
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-sm">
                        {result.message.senderId}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(result.message.createdAt)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {getMessageTypeIcon(result.message.type)}
                        <span className="ml-1 capitalize">{result.message.type}</span>
                      </Badge>
                    </div>

                    {/* Message content with highlighting */}
                    <div className="text-sm text-gray-700 mb-2">
                      {highlightText(result.message.content, query)}
                    </div>

                    {/* Conversation context */}
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>in</span>
                      <span className="font-medium truncate">
                        {result.conversation.name || 'Direct Message'}
                      </span>
                      <ArrowRight className="h-3 w-3" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          onResultClick?.(result)
                        }}
                      >
                        Jump to
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {index < results.length - 1 && <Separator className="my-1" />}
            </div>
          ))}
        </div>

        {/* Load more button */}
        {hasMore && onLoadMore && (
          <div className="flex justify-center pt-4">
            <Button variant="outline" size="sm" onClick={onLoadMore}>
              Load More Results
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

// Simple search icon component for the empty state
const SearchIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
)