import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, Loader2, UserPlus, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';

interface UserSearchResult {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email: string;
  avatar?: string;
  status: string;
  isOnline: boolean;
  isContact?: boolean;
  isBlocked?: boolean;
}

/**
 * GlobalUserSearch Component
 * 
 * Provides global user discovery across the entire messenger:
 * - Search by username or email
 * - Real-time availability status
 * - Quick add to contacts
 * - Filter out blocked users
 * - Paginated results (20 per page)
 * - Minimum 2 characters to search
 * - Case-insensitive matching
 */
export const GlobalUserSearch: React.FC = () => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [addingContactIds, setAddingContactIds] = useState<Set<string>>(new Set());
  const debounceTimer = useRef<NodeJS.Timeout>();

  const token = localStorage.getItem('accessToken');

  const performSearch = useCallback(async (query: string, page: number = 0) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        q: query,
        limit: '20',
        offset: String(page * 20),
      });

      const response = await axios.get(`/api/users/search?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Backend returns an object in response.data.data with structure:
      // { users: [...], search: { totalResults }, pagination: { totalUsers, hasNextPage, ... } }
      // Older or alternate endpoints may return an array directly.
      const payload = response.data?.data ?? response.data?.users ?? response.data ?? [];

      // Normalize users array
      const users = Array.isArray(payload) ? payload : (payload.users || []);

      if (page === 0) {
        setResults(users);
      } else {
        setResults((prev) => [...prev, ...users]);
      }

      // Total results may be in different places depending on backend shape
      const total = payload?.search?.totalResults ?? payload?.pagination?.totalUsers ?? response.data?.total ?? users.length;
      setTotalResults(total);

      // hasMore / next page flag
      const more = payload?.pagination?.hasNextPage ?? response.data?.hasMore ?? false;
      setHasMore(Boolean(more));
      setCurrentPage(page);
    } catch (error: any) {
      console.error('Search error:', error);
      if (error.response?.status !== 401) {
        toast({
          variant: 'destructive',
          title: 'Search error',
          description: error.response?.data?.message || 'Failed to search users',
        });
      }
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [token, toast]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(0);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      performSearch(query, 0);
    }, 300);
  }, [performSearch]);

  const handleLoadMore = () => {
    performSearch(searchQuery, currentPage + 1);
  };

  const handleAddContact = async (userId: string, username: string) => {
    if (addingContactIds.has(userId)) return;

    setAddingContactIds((prev) => new Set(prev).add(userId));

    try {
      await axios.post(
        `/api/contacts`,
        { userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update results to show contact added
      setResults((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, isContact: true } : user
        )
      );

      toast({
        title: 'Contact added',
        description: `${username} has been added to your contacts`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to add contact',
        description: error.response?.data?.message || 'Please try again',
      });
    } finally {
      setAddingContactIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const getDisplayName = (user: UserSearchResult) => {
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return fullName || user.username;
  };

  const getInitials = (user: UserSearchResult) => {
    const name = getDisplayName(user);
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          title="Search users globally"
        >
          <Search className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by username or email... (min 2 chars)"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-10"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setResults([]);
                }}
                className="absolute right-3 top-3"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {isLoading && results.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
              Searching users...
            </div>
          ) : results.length > 0 ? (
            <>
              {results.map((user) => (
                <Card
                  key={user.id}
                  className="m-2 cursor-default hover:bg-accent transition-colors"
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar} alt={user.username} />
                          <AvatarFallback>{getInitials(user)}</AvatarFallback>
                        </Avatar>
                        {user.isOnline && (
                          <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate">
                            {getDisplayName(user)}
                          </p>
                          {user.isOnline ? (
                            <Badge variant="secondary" className="text-xs">
                              online
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              offline
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          @{user.username}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex-shrink-0">
                        {user.isContact ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled
                            className="w-9 h-9 p-0"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        ) : user.isBlocked ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled
                            className="w-9 h-9 p-0"
                            title="User is blocked"
                          >
                            X
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="default"
                            className="w-9 h-9 p-0"
                            onClick={() => handleAddContact(user.id, getDisplayName(user))}
                            disabled={addingContactIds.has(user.id) || isLoading}
                          >
                            {addingContactIds.has(user.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserPlus className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {hasMore && (
                <div className="p-3 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMore}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading...
                      </>
                    ) : (
                      'Load more'
                    )}
                  </Button>
                </div>
              )}

              {/* Results summary */}
              <div className="p-3 text-center border-t">
                <p className="text-xs text-muted-foreground">
                  Showing {results.length} of {totalResults} results
                </p>
              </div>
            </>
          ) : searchQuery.length >= 2 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No users found matching "{searchQuery}"
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Start typing to search for users (minimum 2 characters)
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default GlobalUserSearch;
