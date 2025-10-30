import { useState, useEffect, useRef, useCallback } from 'react'
import { useMessageStore } from '@/app/stores/messageStore'
import { useAuthStore } from '@/app/stores/authStore'
import { useWebSocketIntegration } from '@/features/messaging/lib/websocketIntegration'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, Send, Phone, Video, MoreVertical, ArrowDown, Paperclip, Smile, Check, CheckCheck, Menu, X, User, Settings, LogOut, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { GroupMembersModal } from '@/features/groups/components/GroupMembersModal'
import { groupsApi } from '@/features/groups/api/groupsApi'

const Chat = () => {
  const navigate = useNavigate()
  const [activeChat, setActiveChat] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isGroupMembersModalOpen, setIsGroupMembersModalOpen] = useState(false)
  const [currentGroup, setCurrentGroup] = useState<any>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const {
    conversations,
    currentConversationId,
    messages,
    isLoading,
    error,
    loadConversations,
    loadMessages,
    sendMessage,
    setTyping,
    joinConversation,
    leaveConversation
  } = useMessageStore()

  const { user, logout } = useAuthStore()

  // WebSocket integration
  const {
    isConnected,
    sendTypingIndicator,
    joinConversation: wsJoinConversation,
    leaveConversation: wsLeaveConversation,
  } = useWebSocketIntegration()

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [])

  // Handle mobile responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)

      // On mobile, hide sidebar when conversation is selected
      if (mobile && activeChat) {
        setSidebarOpen(false)
      } else if (!mobile) {
        setSidebarOpen(true)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [activeChat])

  // Load messages when conversation changes
  useEffect(() => {
    if (activeChat && activeChat !== currentConversationId) {
      loadMessages(activeChat)
      joinConversation(activeChat)
      wsJoinConversation(activeChat)
    }

    return () => {
      if (currentConversationId) {
        leaveConversation(currentConversationId)
        wsLeaveConversation(currentConversationId)
      }
    }
  }, [activeChat, currentConversationId, loadMessages, joinConversation, leaveConversation, wsJoinConversation, wsLeaveConversation])

  // Load group details when active chat changes to a group
  useEffect(() => {
    if (activeChat) {
      const conversation = conversations.find(c => c.id === activeChat)
      if (conversation?.type === 'group') {
        setCurrentGroup(conversation)
        // Load group details to check admin status
        loadGroupDetails(activeChat)
      } else {
        setCurrentGroup(null)
      }
    }
  }, [activeChat, conversations])

  const loadGroupDetails = async (groupId: string) => {
    try {
      const groupData = await groupsApi.getGroup(groupId)
      setCurrentGroup((prev: any) => ({
        ...prev,
        members: groupData.members,
        creatorId: groupData.creatorId
      }))
    } catch (error) {
      console.error('Failed to load group details:', error)
    }
  }

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle scroll button visibility
  useEffect(() => {
    const handleScroll = () => {
      if (messagesContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
        setShowScrollButton(!isNearBottom)
      }
    }

    const container = messagesContainerRef.current
    container?.addEventListener('scroll', handleScroll)
    return () => container?.removeEventListener('scroll', handleScroll)
  }, [])

  const currentConversation = conversations.find(c => c.id === activeChat)
  const conversationMessages = activeChat ? messages[activeChat] || [] : []

  const handleSendMessage = async () => {
    if (!activeChat || !inputValue.trim()) return

    try {
      await sendMessage(activeChat, inputValue, 'text')
      setInputValue('')
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleTyping = (isTyping: boolean) => {
    if (activeChat) {
      setTyping(activeChat, isTyping)
      // Debounce typing indicator to avoid excessive WebSocket calls
      const timeoutId = setTimeout(() => {
        sendTypingIndicator(activeChat, isTyping)
      }, 300)
      return () => clearTimeout(timeoutId)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const goToProfile = () => {
    navigate('/profile')
  }

  const goToDashboard = () => {
    navigate('/dashboard')
  }

  const getConversationDisplayName = () => {
    if (!currentConversation) return 'Chat'

    if (currentConversation.name) return currentConversation.name

    // For direct messages, show the other participant's name
    const otherParticipant = currentConversation.participants.find(p => p.id !== user?.id)
    return otherParticipant?.name || otherParticipant?.username || 'Unknown User'
  }

  const getConversationAvatar = () => {
    if (!currentConversation) return null

    if (currentConversation.avatar) return currentConversation.avatar

    // For direct messages, use the other participant's avatar
    const otherParticipant = currentConversation.participants.find(p => p.id !== user?.id)
    return otherParticipant?.avatar
  }

  const getOnlineStatus = () => {
    if (!currentConversation) return false

    if (currentConversation.type === 'group') return false

    const otherParticipant = currentConversation.participants.find(p => p.id !== user?.id)
    // Check if the participant has an isOnline property, otherwise default to false
    return (otherParticipant as any)?.isOnline || false
  }

  // Check if current user is admin of the current group
  const isGroupAdmin = () => {
    if (!currentGroup || !user) return false
    
    const currentUserMember = currentGroup.members?.find((m: any) => m.userId === user.id)
    return currentUserMember?.role === 'admin' || currentUserMember?.role === 'moderator'
  }

  // Debounce search filtering to prevent excessive re-renders
  const filteredConversations = useCallback(() => {
    if (!searchQuery) return conversations
    const searchLower = searchQuery.toLowerCase()
    return conversations.filter(conv => {
      const displayName = conv.name || conv.participants.find(p => p.id !== user?.id)?.name || ''
      return displayName.toLowerCase().includes(searchLower)
    })
  }, [conversations, searchQuery, user?.id])()

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return 'Yesterday'
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-chat-bg">
      {/* Conversations Sidebar */}
      {sidebarOpen && (
        <div className={cn(
          'w-full md:w-80 lg:w-96 border-r border-border flex flex-col h-screen bg-background',
          isMobile ? 'fixed inset-0 z-50' : 'flex-shrink-0'
        )}>
          {/* Sidebar Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-bold">Messages</h1>
              <div className="flex items-center gap-2">
                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={user?.avatar} alt={user?.name || 'User'} />
                        <AvatarFallback>
                          {(user?.name || user?.username || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5 text-sm font-medium">
                      {user?.name || user?.username || 'Unknown User'}
                    </div>
                    <div className="px-2 py-1 text-xs text-muted-foreground">
                      {user?.email || ''}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={goToProfile}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={goToDashboard}>
                      <Settings className="mr-2 h-4 w-4" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {isMobile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                className="pl-9 bg-muted border-0"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading && conversations.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-sm text-muted-foreground">Loading conversations...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-sm text-muted-foreground">No conversations found</p>
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const otherParticipant = conversation.participants.find(p => p.id !== user?.id)
                const displayName = conversation.name || otherParticipant?.name || otherParticipant?.username || 'Unknown User'
                const avatar = conversation.avatar || otherParticipant?.avatar
                // Check if the participant has an isOnline property, otherwise default to false
                const isOnline = (otherParticipant as any)?.isOnline || false

                return (
                  <div
                    key={conversation.id}
                    onClick={() => {
                      setActiveChat(conversation.id)
                      if (isMobile) setSidebarOpen(false)
                    }}
                    className={cn(
                      'flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-border',
                      activeChat === conversation.id ? 'bg-muted' : 'hover:bg-chat-hover'
                    )}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={avatar} alt={displayName} />
                        <AvatarFallback>
                          {conversation.type === 'group' ? 'G' : displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {isOnline && (
                        <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-sm truncate">{displayName}</h3>
                        {conversation.lastMessage && (
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {formatMessageTime(conversation.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground truncate">
                          {conversation.lastMessage?.content || 'No messages yet'}
                        </p>
                        {conversation.unreadCount > 0 && (
                          <Badge className="ml-2 bg-primary text-primary-foreground rounded-full h-5 min-w-5 px-1.5 text-xs flex-shrink-0">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Chat Area */}
      {activeChat ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-background">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(true)}
                  className="flex-shrink-0"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              )}

              <div className="relative flex-shrink-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={getConversationAvatar() || ''} alt={getConversationDisplayName()} />
                  <AvatarFallback>
                    {currentConversation?.type === 'group' ? 'G' : getConversationDisplayName().charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {getOnlineStatus() && (
                  <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="font-semibold truncate">{getConversationDisplayName()}</h2>
                <p className="text-xs text-muted-foreground">
                  {currentConversation?.type === 'group' 
                    ? `${currentConversation.participants.length} members`
                    : (getOnlineStatus() ? 'online' : 'offline')
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Manage Members button for group admins */}
              {currentConversation?.type === 'group' && isGroupAdmin() && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsGroupMembersModalOpen(true)}
                  title="Manage Members"
                >
                  <Users className="h-5 w-5" />
                </Button>
              )}
              
              <Button variant="ghost" size="icon">
                <Phone className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Video className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Messages Area */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 bg-muted/30 relative"
          >
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg mb-4">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {conversationMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              conversationMessages.map((message) => {
                const isOwn = message.senderId === user?.id
                return (
                  <div
                    key={message.id}
                    className={cn(
                      'flex mb-4 animate-fade-in group',
                      isOwn ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div className="flex items-start gap-2 max-w-xs lg:max-w-md xl:max-w-lg">
                      <div className={cn(
                        'flex-1',
                        isOwn && 'order-2'
                      )}>
                        <div
                          className={cn(
                            'px-4 py-2 rounded-2xl relative',
                            isOwn
                              ? 'bg-message-sent text-message-sent-foreground rounded-br-md'
                              : 'bg-message-received text-message-received-foreground rounded-bl-md'
                          )}
                        >
                          <p className="text-sm break-words">{message.content}</p>
                          <div className={cn(
                            'flex items-center gap-1 mt-1',
                            isOwn ? 'justify-end' : 'justify-start'
                          )}>
                            <span className={cn(
                              'text-xs',
                              isOwn
                                ? 'text-message-sent-foreground/70'
                                : 'text-muted-foreground'
                            )}>
                              {formatMessageTime(message.createdAt)}
                            </span>
                            {isOwn && (
                              <span className="text-message-sent-foreground/70">
                                {message.status === 'read' ? (
                                  <CheckCheck className="h-3 w-3" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Message Actions Dropdown */}
                      <div className={cn(
                        'opacity-0 group-hover:opacity-100 transition-opacity',
                        isOwn && 'order-1'
                      )}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />

            {showScrollButton && (
              <Button
                onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                size="icon"
                className="fixed bottom-24 right-8 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <ArrowDown className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Message Input */}
          <div className="border-t border-border bg-background p-4">
            <div className="flex items-end gap-2">
              <Button variant="ghost" size="icon" className="mb-1 flex-shrink-0">
                <Paperclip className="h-5 w-5" />
              </Button>

              <Input
                placeholder="Type a message..."
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value)
                  handleTyping(e.target.value.length > 0)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                className="flex-1"
              />

              <Button variant="ghost" size="icon" className="mb-1 flex-shrink-0">
                <Smile className="h-5 w-5" />
              </Button>

              <Button
                onClick={handleSendMessage}
                size="icon"
                className="bg-primary text-primary-foreground hover:bg-primary/90 mb-1 flex-shrink-0"
                disabled={!inputValue.trim()}
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Select a chat to start messaging</h2>
            <p className="text-muted-foreground">Choose a conversation from the sidebar</p>
          </div>
        </div>
      )}

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Group Members Modal */}
      {currentGroup && (
        <GroupMembersModal
          isOpen={isGroupMembersModalOpen}
          onClose={() => setIsGroupMembersModalOpen(false)}
          groupId={currentGroup.id}
          groupName={currentGroup.name || 'Group'}
        />
      )}
    </div>
  )
}

export default Chat