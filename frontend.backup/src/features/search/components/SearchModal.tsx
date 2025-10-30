import React, { useState, useEffect } from 'react'
import { Search, X, Filter, Calendar, User, MessageCircle, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { SearchFilters, SearchResult, Conversation, Message } from '@/shared/lib/types'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSearch: (filters: SearchFilters) => Promise<SearchResult[]>
  conversations: Conversation[]
  currentUserId: string
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSearch,
  conversations,
  currentUserId
}) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedConversation, setSelectedConversation] = useState<string>('')
  const [selectedSender, setSelectedSender] = useState<string>('')
  const [messageType, setMessageType] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Get unique senders from all conversations
  const allSenders = Array.from(
    new Set(
      conversations
        .flatMap(conv => conv.participants)
        .map(user => user.id)
    )
  ).map(userId =>
    conversations
      .flatMap(conv => conv.participants)
      .find(user => user.id === userId)
  ).filter(Boolean) as any[]

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        handleSearch()
      } else {
        setResults([])
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query, selectedConversation, selectedSender, messageType, dateFrom, dateTo])

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsSearching(true)
    try {
      const filters: SearchFilters = {
        query: query.trim(),
        conversationId: selectedConversation || undefined,
        senderId: selectedSender || undefined,
        messageType: messageType ? messageType as Message['type'] : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }

      const searchResults = await onSearch(filters)
      setResults(searchResults)
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const clearFilters = () => {
    setSelectedConversation('')
    setSelectedSender('')
    setMessageType('')
    setDateFrom('')
    setDateTo('')
  }

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
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Search Messages</span>
          </DialogTitle>
          <DialogDescription>
            Search through your messages across all conversations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search messages..."
              className="pl-10 pr-20"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
              {query && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuery('')}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'h-6 w-6 p-0',
                  (selectedConversation || selectedSender || messageType || dateFrom || dateTo) && 'text-blue-600'
                )}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Filters</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs"
                >
                  Clear All
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Conversation filter */}
                <div className="space-y-1">
                  <Label className="text-xs">Conversation</Label>
                  <Select value={selectedConversation} onValueChange={setSelectedConversation}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="All conversations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All conversations</SelectItem>
                      {conversations.map((conv) => (
                        <SelectItem key={conv.id} value={conv.id}>
                          {conv.name || conv.participants.map(p => p.name).join(', ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sender filter */}
                <div className="space-y-1">
                  <Label className="text-xs">Sender</Label>
                  <Select value={selectedSender} onValueChange={setSelectedSender}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Anyone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Anyone</SelectItem>
                      {allSenders.map((sender) => (
                        <SelectItem key={sender.id} value={sender.id}>
                          {sender.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Message type filter */}
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select value={messageType} onValueChange={setMessageType}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All types</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="file">Files</SelectItem>
                      <SelectItem value="image">Images</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date range */}
                <div className="space-y-1">
                  <Label className="text-xs">Date From</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-8"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Search results */}
          <div className="flex-1 min-h-0">
            {isSearching && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-2 text-gray-500">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                  <span>Searching...</span>
                </div>
              </div>
            )}

            {!isSearching && query && results.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No messages found matching your search.
              </div>
            )}

            {!isSearching && results.length > 0 && (
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {results.map((result, index) => (
                    <div key={`${result.message.id}-${index}`}>
                      <div
                        className="p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          // Navigate to conversation and highlight message
                          console.log('Navigate to message:', result.message.id)
                          onClose()
                        }}
                      >
                        <div className="flex items-start space-x-3">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={result.message.senderId} alt="Sender" />
                            <AvatarFallback>
                              {result.message.senderId.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium text-sm">
                                {result.message.senderId}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(result.message.createdAt).toLocaleString()}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {getMessageTypeIcon(result.message.type)}
                                <span className="ml-1 capitalize">{result.message.type}</span>
                              </Badge>
                            </div>

                            <div className="text-sm text-gray-700 mb-1">
                              {highlightText(result.message.content, query)}
                            </div>

                            <div className="text-xs text-gray-500">
                              in {result.conversation.name || 'Direct Message'}
                            </div>
                          </div>
                        </div>
                      </div>
                      {index < results.length - 1 && <Separator className="my-2" />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}