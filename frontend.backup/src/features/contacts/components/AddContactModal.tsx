import React, { useState, useCallback, useEffect } from 'react'
import {
  Search,
  UserPlus,
  Check,
  X,
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { User, UserSearchFilters } from '@/shared/lib/types'

interface AddContactModalProps {
  isOpen: boolean
  onClose: () => void
  onSendRequest: (userId: string) => void
  existingContacts?: string[]
  currentUserId: string
}

interface SearchResult extends User {
  mutualContacts?: User[]
  canAddAsContact: boolean
  isAlreadyContact?: boolean
  hasPendingRequest?: boolean
}

const SearchResultItem: React.FC<{
  user: SearchResult
  onSendRequest: (userId: string) => void
  isLoading?: boolean
}> = ({ user, onSendRequest, isLoading = false }) => {
  const getStatusBadge = () => {
    if (user.isAlreadyContact) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          <Check className="h-3 w-3 mr-1" />
          Contact
        </Badge>
      )
    }
    if (user.hasPendingRequest) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      )
    }
    return null
  }

  return (
    <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent transition-colors">
      <Avatar className="h-12 w-12">
        <AvatarImage src={user.avatar} alt={user.name} />
        <AvatarFallback>
          {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
            {user.mutualContacts && user.mutualContacts.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {user.mutualContacts.length} mutual contact{user.mutualContacts.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {getStatusBadge()}
            {!user.isAlreadyContact && !user.hasPendingRequest && user.canAddAsContact && (
              <Button
                size="sm"
                onClick={() => onSendRequest(user.id)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export const AddContactModal: React.FC<AddContactModalProps> = ({
  isOpen,
  onClose,
  onSendRequest,
  existingContacts = [],
  currentUserId
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState('search')
  const [filters, setFilters] = useState<UserSearchFilters>({
    query: '',
    isOnline: undefined,
    hasMutualContacts: undefined
  })

  // Mock search function - in real app this would call an API
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

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
        mutualContacts: [],
        canAddAsContact: true,
        isAlreadyContact: existingContacts.includes('1'),
        hasPendingRequest: false
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
        canAddAsContact: true,
        isAlreadyContact: existingContacts.includes('2'),
        hasPendingRequest: false
      }
    ].filter(user =>
      user.name.toLowerCase().includes(query.toLowerCase()) ||
      user.username.toLowerCase().includes(query.toLowerCase()) ||
      user.email.toLowerCase().includes(query.toLowerCase())
    )

    setSearchResults(mockResults)
    setIsSearching(false)
  }, [existingContacts])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performSearch(searchQuery)
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [searchQuery, performSearch])

  const handleSendRequest = async (userId: string) => {
    setPendingRequests(prev => [...prev, userId])
    try {
      await onSendRequest(userId)
      // Update the search result to show pending status
      setSearchResults(prev => prev.map(user =>
        user.id === userId ? { ...user, hasPendingRequest: true } : user
      ))
    } catch (error) {
      console.error('Failed to send contact request:', error)
    } finally {
      setPendingRequests(prev => prev.filter(id => id !== userId))
    }
  }

  const handleClose = () => {
    setSearchQuery('')
    setSearchResults([])
    setActiveTab('search')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Add New Contact</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">Search Users</TabsTrigger>
            <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, username, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Search Results */}
            <ScrollArea className="h-[400px]">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Searching...</span>
                </div>
              ) : searchResults.length === 0 && searchQuery ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No users found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try searching with a different name or username
                  </p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Start typing to search for users
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <SearchResultItem
                      key={user.id}
                      user={user}
                      onSendRequest={handleSendRequest}
                      isLoading={pendingRequests.includes(user.id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="suggestions" className="space-y-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {/* Mock suggestions - in real app this would come from API */}
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No suggestions available at the moment
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Suggestions will appear here based on your activity
                  </p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

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