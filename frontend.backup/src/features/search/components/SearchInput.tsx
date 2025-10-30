import React, { useState, useEffect } from 'react'
import { Search, X, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SearchFilters, SearchResult } from '@/shared/lib/types'

interface SearchInputProps {
  onSearch: (query: string) => void
  onOpenFilters?: () => void
  placeholder?: string
  className?: string
  showFilters?: boolean
  activeFiltersCount?: number
}

export const SearchInput: React.FC<SearchInputProps> = ({
  onSearch,
  onOpenFilters,
  placeholder = "Search messages...",
  className,
  showFilters = false,
  activeFiltersCount = 0
}) => {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onSearch(query)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query, onSearch])

  const clearSearch = () => {
    setQuery('')
    onSearch('')
  }

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={cn(
            'pl-10 pr-20',
            isFocused && 'ring-2 ring-blue-500'
          )}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
          {/* Active filters indicator */}
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
              {activeFiltersCount}
            </Badge>
          )}

          {/* Filter button */}
          {onOpenFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenFilters}
              className={cn(
                'h-6 w-6 p-0',
                showFilters && 'text-blue-600'
              )}
            >
              <Filter className="h-4 w-4" />
            </Button>
          )}

          {/* Clear button */}
          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Search suggestions/quick filters could go here */}
      {isFocused && query.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-50 p-2">
          <div className="text-xs text-gray-500 mb-2">Quick searches</div>
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setQuery('from:me')}
              className="w-full justify-start text-xs h-7"
            >
              Messages from me
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setQuery('has:file')}
              className="w-full justify-start text-xs h-7"
            >
              Messages with files
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setQuery('has:image')}
              className="w-full justify-start text-xs h-7"
            >
              Messages with images
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}