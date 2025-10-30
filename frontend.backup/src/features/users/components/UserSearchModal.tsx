import React, { useState, useCallback, useEffect } from 'react'
import {
  Search,
  Filter,
  UserPlus,
  MessageCircle,
  UserCheck,
  Clock,
  MapPin,
  Calendar,
  Loader2,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
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
import { UserProfile, UserSearchFilters } from '@/shared/lib/types'

interface UserSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSendMessage?: (user: UserProfile) => void
  onAddContact?: (user: UserProfile) => void
  onViewProfile?: (user: UserProfile) => void
  currentUserId: string
  existingContacts?: string[]
}

interface SearchResult extends UserProfile {
  distance?: number // For location-based search
  lastActive?: string
}

const UserSearchFilters: React.FC<{
  filters: UserSearchFilters
  onFiltersChange: (filters: UserSearchFilters) => void
}> = ({ filters, onFiltersChange }) => {
  return (
    <div className="space-y-4 p-4 border-b">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="online-only"
            checked={filters.isOnline || false}
            onCheckedChange={(checked) =>
              onFiltersChange({ ...filters, isOnline: checked ? true : undefined })
            }
          />
          <label htmlFor="online-only" className="text-sm">
            Online only
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="mutual-contacts"
            checked={filters.hasMutualContacts || false}
            onCheckedChange={(checked) =>
              onFiltersChange({ ...filters, hasMutualContacts: checked ? true : undefined })
            }
          />
          <label htmlFor="mutual-contacts" className="text-sm">
            Has mutual contacts
          </label>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Select
          value={filters.location || ''}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, location: value || undefined })
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Any location</SelectItem>
            <SelectItem value="local">Near me</SelectItem>
            <SelectItem value="same-country">Same country</SelectItem>
            <SelectItem value="same-city">Same city</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

const SearchResultItem: React.FC<{
  user: SearchResult
  onSendMessage?: (user: SearchResult) => void
  onAddContact?: (user: SearchResult) => void
  onViewProfile?: (user: SearchResult) => void
  isExistingContact?: boolean
}> = ({ user, onSendMessage, onAddContact, onViewProfile, isExistingContact }) => {
  const formatLastSeen = (lastSeen: string) => {
    const now = new Date()
    const lastSeenDate = new Date(lastSeen)
    const diffInMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`

    return lastSeenDate.toLocaleDateString()
  }

  return (
    <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent transition-colors group">
      <div className="relative">
        <Avatar className="h-12 w-12">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback>
            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div
          className={cn(
            'absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background',
            user.isOnline ? 'bg-green-500' : 'bg-gray-400'
          )}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">@{user.username}</p>

            <div className="flex items-center space-x-2 mt-1">
              {user.isOnline ? (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                  Online
                </Badge>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {user.lastSeen ? formatLastSeen(user.lastSeen) : 'Offline'}
                </p>
              )}

              {user.mutualContacts && user.mutualContacts.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {user.mutualContacts.length} mutual
                </Badge>
              )}

              {user.distance && (
                <Badge variant="outline" className="text-xs">
                  {user.distance < 1 ? `${Math.round(user.distance * 1000)}m` : `${user.distance.toFixed(1)}km`} away
                </Badge>
              )}
            </div>

            {user.bio && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {user.bio}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onSendMessage && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onSendMessage(user)}
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            )}

            {onViewProfile && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onViewProfile(user)}
              >
                <UserCheck className="h-4 w-4" />
              </Button>
            )}

            {!isExistingContact && onAddContact && (
              <Button
                size="sm"
                onClick={() => onAddContact(user)}
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export const UserSearchModal: React.FC<UserSearchModalProps> = ({
  isOpen,
  onClose,
  onSendMessage,
  onAddContact,
  onViewProfile,
  currentUserId,
  existingContacts = []
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<UserSearchFilters>({
    query: '',
    isOnline: undefined,
    hasMutualContacts: undefined,
    location: undefined
  })

  // Mock search function
  const performSearch = useCallback(async (query: string, searchFilters: UserSearchFilters) => {
    if (!query.trim() && !searchFilters.isOnline && !searchFilters.hasMutualContacts) {
      setSearchResults([])
      return
    }

    setIsSearching(true)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800))

    // Mock search results
    const mockResults: SearchResult[] = [
      {
        id: '1',
        email: 'john.doe@example.com',
        username: 'johndoe',
        name: 'John Doe',
        avatar: '',
        role: 'user',
        isApproved: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        isOnline: true,
        lastSeen: '2024-01-15T10:30:00Z',
        bio: 'Software developer passionate about React and TypeScript',
        location: 'San Francisco, CA',
        joinedAt: '2024-01-01T00:00:00Z',
        mutualContacts: [],
        sharedMedia: [],
        canAddAsContact: true
      },
      {
        id: '2',
        email: 'jane.smith@example.com',
        username: 'janesmith',
        name: 'Jane Smith',
        avatar: '',
        role: 'user',
        isApproved: true,
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        isOnline: false,
        lastSeen: '2024-01-14T15:45:00Z',
        bio: 'UX Designer | Love creating beautiful and functional interfaces',
        location: 'New York, NY',
        joinedAt: '2024-01-02T00:00:00Z',
        mutualContacts: [
          {
            id: '3',
            name: 'Alice Johnson',
            username: 'alicej',
            email: 'alice@example.com',
            avatar: '',
            role: 'user',
            isApproved: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        ],
        sharedMedia: [],
        canAddAsContact: true
      }
    ].filter(user => {
      // Apply search query filter
      if (query.trim()) {
        const queryLower = query.toLowerCase()
        if (!user.name.toLowerCase().includes(queryLower) &&
            !user.username.toLowerCase().includes(queryLower) &&
            !user.email.toLowerCase().includes(queryLower)) {
          return false
        }
      }

      // Apply filters
      if (searchFilters.isOnline && !user.isOnline) return false
      if (searchFilters.hasMutualContacts && (!user.mutualContacts || user.mutualContacts.length === 0)) return false

      return true
    })

    setSearchResults(mockResults)
    setIsSearching(false)
  }, [])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performSearch(searchQuery, filters)
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [searchQuery, filters, performSearch])

  const handleClose = () => {
    setSearchQuery('')
    setSearchResults([])
    setShowFilters(false)
    setFilters({
      query: '',
      isOnline: undefined,
      hasMutualContacts: undefined,
      location: undefined
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Find Users</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-[600px]">
          {/* Search Input */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, username, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <UserSearchFilters
              filters={filters}
              onFiltersChange={(newFilters) => {
                setFilters(newFilters)
                performSearch(searchQuery, newFilters)
              }}
            />
          )}

          {/* Search Results */}
          <ScrollArea className="flex-1">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Searching users...</span>
              </div>
            ) : searchResults.length === 0 && (searchQuery || filters.isOnline || filters.hasMutualContacts) ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No users found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try adjusting your search terms or filters
                </p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Start typing to search for users
                </p>
              </div>
            ) : (
              <div className="p-2">
                {searchResults.map((user) => (
                  <SearchResultItem
                    key={user.id}
                    user={user}
                    onSendMessage={onSendMessage}
                    onAddContact={onAddContact}
                    onViewProfile={onViewProfile}
                    isExistingContact={existingContacts.includes(user.id)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}