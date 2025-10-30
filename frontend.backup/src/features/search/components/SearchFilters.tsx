import React from 'react'
import { Calendar, User, MessageCircle, Hash, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { SearchFilters, Conversation, Message } from '@/shared/lib/types'

interface SearchFiltersProps {
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
  conversations: Conversation[]
  availableSenders: any[]
  className?: string
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  onFiltersChange,
  conversations,
  availableSenders,
  className
}) => {
  const updateFilter = (key: keyof SearchFilters, value: string | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value
    })
  }

  const clearFilter = (key: keyof SearchFilters) => {
    const newFilters = { ...filters }
    delete newFilters[key]
    onFiltersChange(newFilters)
  }

  const clearAllFilters = () => {
    onFiltersChange({ query: filters.query })
  }

  const getActiveFiltersCount = () => {
    return Object.keys(filters).filter(key =>
      key !== 'query' && filters[key as keyof SearchFilters]
    ).length
  }

  const activeFiltersCount = getActiveFiltersCount()

  return (
    <div className={cn('space-y-4', className)}>
      {/* Active filters summary */}
      {activeFiltersCount > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Active Filters ({activeFiltersCount})
            </Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs"
            >
              Clear All
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {filters.conversationId && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <span>Conversation: {conversations.find(c => c.id === filters.conversationId)?.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearFilter('conversationId')}
                  className="h-4 w-4 p-0 ml-1"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}

            {filters.senderId && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <span>Sender: {availableSenders.find(s => s.id === filters.senderId)?.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearFilter('senderId')}
                  className="h-4 w-4 p-0 ml-1"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}

            {filters.messageType && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <span>Type: {filters.messageType}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearFilter('messageType')}
                  className="h-4 w-4 p-0 ml-1"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}

            {filters.dateFrom && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <span>From: {new Date(filters.dateFrom).toLocaleDateString()}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearFilter('dateFrom')}
                  className="h-4 w-4 p-0 ml-1"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}

            {filters.dateTo && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <span>To: {new Date(filters.dateTo).toLocaleDateString()}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearFilter('dateTo')}
                  className="h-4 w-4 p-0 ml-1"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
          </div>

          <Separator />
        </div>
      )}

      {/* Filter controls */}
      <div className="grid grid-cols-2 gap-4">
        {/* Conversation filter */}
        <div className="space-y-2">
          <Label className="text-sm">Conversation</Label>
          <Select
            value={filters.conversationId || ''}
            onValueChange={(value) => updateFilter('conversationId', value || undefined)}
          >
            <SelectTrigger>
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
        <div className="space-y-2">
          <Label className="text-sm">Sender</Label>
          <Select
            value={filters.senderId || ''}
            onValueChange={(value) => updateFilter('senderId', value || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Anyone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Anyone</SelectItem>
              {availableSenders.map((sender) => (
                <SelectItem key={sender.id} value={sender.id}>
                  {sender.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Message type filter */}
        <div className="space-y-2">
          <Label className="text-sm">Message Type</Label>
          <Select
            value={filters.messageType || ''}
            onValueChange={(value) => updateFilter('messageType', value || undefined)}
          >
            <SelectTrigger>
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

        {/* Date from filter */}
        <div className="space-y-2">
          <Label className="text-sm">Date From</Label>
          <Input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => updateFilter('dateFrom', e.target.value || undefined)}
          />
        </div>
      </div>

      {/* Date to filter (full width) */}
      <div className="space-y-2">
        <Label className="text-sm">Date To</Label>
        <Input
          type="date"
          value={filters.dateTo || ''}
          onChange={(e) => updateFilter('dateTo', e.target.value || undefined)}
        />
      </div>
    </div>
  )
}