import React, { useState, useCallback, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiClient } from '@/lib/api-client';
import { getAvatarUrl } from '@/lib/avatar-utils';

interface SearchResult {
  id: string;
  content: string;
  senderId: string;
  recipientId?: string;
  groupId?: string;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  group?: {
    id: string;
    name: string;
    description?: string;
  };
}

interface MessageSearchProps {
  recipientId?: string; // Filter to specific conversation
  onSelectResult: (result: SearchResult) => void;
}

export const MessageSearch: React.FC<MessageSearchProps> = ({ recipientId, onSelectResult }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const debounceTimer = useRef<NodeJS.Timeout>();

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
        page: String(page + 1), // API uses 1-based pagination
      });

      // Filter by current conversation if recipientId provided
      // Backend expects 'conversationWith' parameter
      if (recipientId) {
        params.append('conversationWith', recipientId);
      }

      const response = await apiClient.get(`/messages/search?${params}`);

      if (page === 0) {
        setResults(response.data.data || response.data.results || []);
      } else {
        setResults((prev) => [...prev, ...(response.data.data || response.data.results || [])]);
      }
      
      const pagination = response.data.pagination || {};
      setHasMore(pagination.hasNextPage || false);
      setCurrentPage(page);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [recipientId]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(0);

    // Clear existing debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Debounce search by 300ms
    debounceTimer.current = setTimeout(() => {
      performSearch(query, 0);
    }, 300);
  }, [performSearch]);

  const handleLoadMore = () => {
    performSearch(searchQuery, currentPage + 1);
  };

  const handleSelectResult = (result: SearchResult) => {
    onSelectResult(result);
    setIsOpen(false);
    setSearchQuery('');
    setResults([]);
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, index) =>
          regex.test(part) ? (
            <mark key={index} className="bg-yellow-200 font-semibold">
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getConversationName = (result: SearchResult) => {
    if (result.group) {
      return result.group.name;
    }
    return `${result.sender.firstName || result.sender.username} ${result.sender.lastName || ''}`.trim();
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" title="Search messages">
          <Search className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={recipientId ? "Search in this chat..." : "Search messages..."}
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
              Searching...
            </div>
          ) : results.length > 0 ? (
            <>
              {results.map((result) => (
                <Card
                  key={result.id}
                  className="m-2 cursor-pointer hover:bg-accent"
                  onClick={() => handleSelectResult(result)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={getAvatarUrl(result.sender.avatar)} alt={result.sender.username} />
                        <AvatarFallback>
                          {result.sender.username[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="font-semibold text-sm">{result.sender.username}</p>
                            {!recipientId && (
                              <p className="text-xs text-muted-foreground">{getConversationName(result)}</p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatTimestamp(result.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground mt-1 line-clamp-2">
                          {highlightText(result.content, searchQuery)}
                        </p>
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
            </>
          ) : searchQuery.length >= 2 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No messages found{recipientId ? ' in this conversation' : ''}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Start typing to search messages{recipientId ? ' in this conversation' : ''}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default MessageSearch;
