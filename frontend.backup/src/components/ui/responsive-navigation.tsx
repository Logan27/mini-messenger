import React, { useState, useEffect, useRef } from 'react'
import { Menu, X, MessageCircle, Users, Settings, LogOut, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/app/stores/authStore'
import { useMessageStore } from '@/app/stores/messageStore'
import { cn } from '@/lib/utils'

interface ResponsiveNavigationProps {
  onNewChat?: () => void
  onSettings?: () => void
  onMenuToggle?: (isOpen: boolean) => void
  showNewChatButton?: boolean
  className?: string
}

export const ResponsiveNavigation: React.FC<ResponsiveNavigationProps> = ({
  onNewChat,
  onSettings,
  onMenuToggle,
  showNewChatButton = true,
  className
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const { user, logout } = useAuthStore()
  const { conversations } = useMessageStore()

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) {
        setIsMenuOpen(false)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  // Handle escape key to close menu
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false)
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isMenuOpen])

  // Notify parent of menu state changes
  useEffect(() => {
    onMenuToggle?.(isMenuOpen)
  }, [isMenuOpen, onMenuToggle])

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const handleLogout = () => {
    logout()
    setIsMenuOpen(false)
  }

  const totalUnreadCount = conversations.reduce((total, conv) => total + conv.unreadCount, 0)

  // Desktop header
  if (!isMobile) {
    return (
      <header className={cn(
        "bg-card border-b border px-4 lg:px-6 py-3 flex items-center justify-between",
        className
      )}>
        <div className="flex items-center space-x-3">
          {/* App title */}
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Messenger</h1>
            {totalUnreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
              </Badge>
            )}
          </div>
        </div>

        {/* Header actions */}
        <div className="flex items-center space-x-2">
          {showNewChatButton && onNewChat && (
            <Button onClick={onNewChat} size="sm" className="hidden sm:flex">
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          )}
          
          {onSettings && (
            <Button variant="ghost" size="sm" onClick={onSettings}>
              <Settings className="h-4 w-4" />
            </Button>
          )}

          {/* User menu */}
          <div className="flex items-center space-x-2 ml-4 pl-4 border-l border">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatar} alt={user?.name} />
              <AvatarFallback>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:block text-sm">
              <p className="font-medium text-foreground">{user?.name}</p>
              <p className="text-muted-foreground">{user?.email}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
    )
  }

  // Mobile header with hamburger menu
  return (
    <>
      <header className={cn(
        "bg-card border-b border px-4 py-3 flex items-center justify-between relative z-50",
        className
      )}>
        <div className="flex items-center space-x-3">
          {/* Mobile menu button */}
          <Button
            ref={buttonRef}
            variant="ghost"
            size="sm"
            onClick={handleMenuToggle}
            className="h-10 w-10 p-0"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* App title */}
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Messenger</h1>
            {totalUnreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
              </Badge>
            )}
          </div>
        </div>

        {/* Mobile header actions */}
        <div className="flex items-center space-x-1">
          {showNewChatButton && onNewChat && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onNewChat}
              className="h-10 w-10 p-0"
              aria-label="New chat"
            >
              <Plus className="h-5 w-5" />
            </Button>
          )}
          
          {onSettings && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSettings}
              className="h-10 w-10 p-0"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </Button>
          )}
        </div>
      </header>

      {/* Mobile menu overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Slide-out menu */}
          <div 
            ref={menuRef}
            className="fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-card shadow-xl transform transition-transform duration-300 ease-in-out"
            style={{ transform: isMenuOpen ? 'translateX(0)' : 'translateX(-100%)' }}
          >
            <div className="flex flex-col h-full">
              {/* Menu header */}
              <div className="flex items-center justify-between p-4 border-b border">
                <h2 className="text-lg font-semibold text-foreground">Menu</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMenuOpen(false)}
                  className="h-8 w-8 p-0"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* User info */}
              <div className="p-4 border-b border">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback>
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{user?.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <nav className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {showNewChatButton && onNewChat && (
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-12 px-4"
                      onClick={() => {
                        onNewChat()
                        setIsMenuOpen(false)
                      }}
                    >
                      <Plus className="h-5 w-5 mr-3" />
                      New Chat
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12 px-4"
                    onClick={() => {
                      // Navigate to conversations
                      setIsMenuOpen(false)
                    }}
                  >
                    <Users className="h-5 w-5 mr-3" />
                    Conversations
                    {totalUnreadCount > 0 && (
                      <Badge variant="destructive" className="ml-auto">
                        {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                      </Badge>
                    )}
                  </Button>

                  {onSettings && (
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-12 px-4"
                      onClick={() => {
                        onSettings()
                        setIsMenuOpen(false)
                      }}
                    >
                      <Settings className="h-5 w-5 mr-3" />
                      Settings
                    </Button>
                  )}
                </div>
              </nav>

              {/* Logout button */}
              <div className="p-4 border-t border">
                <Button
                  variant="ghost"
                  className="w-full justify-start h-12 px-4 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}