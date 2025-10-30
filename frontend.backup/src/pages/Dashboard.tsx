import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Users } from 'lucide-react'
import { useAuthStore } from '@/app/stores/authStore'
import { useMessageStore } from '@/app/stores/messageStore'
import { ConversationsList } from '@/features/messaging/components/ConversationsList'
import { ResponsiveNavigation } from '@/components/ui/responsive-navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const { user } = useAuthStore()
  const { conversations, loadConversations } = useMessageStore()

  // Handle mobile responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)

      // On mobile, hide sidebar by default
      if (mobile) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  const handleNewChat = () => {
    // TODO: Implement new chat creation
    console.log('New chat')
  }

  const handleSettings = () => {
    navigate('/settings')
  }

  return (
    <div className="min-h-screen bg-chat-bg flex flex-col xs:flex-row">
      {/* Conversations Sidebar */}
      {sidebarOpen && (
        <div className={cn(
          'w-full xs:w-80 md:w-96 border-r border bg-card',
          isMobile ? 'fixed inset-0 z-50' : 'flex-shrink-0'
        )}>
          <ConversationsList
            onConversationSelect={(conversationId) => {
              navigate(`/chat/${conversationId}`)
              if (isMobile) setSidebarOpen(false)
            }}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Responsive Navigation */}
        <ResponsiveNavigation
          onNewChat={handleNewChat}
          onSettings={handleSettings}
          onMenuToggle={setSidebarOpen}
          showNewChatButton={true}
        />

        {/* Main content */}
        <main className="flex-1 flex items-center justify-center p-4 xs:p-6 lg:p-8">
          <div className="text-center w-full max-w-lg">
            <div className="w-16 h-16 xs:w-20 xs:h-20 md:w-24 md:h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 xs:mb-6">
              <MessageCircle className="h-8 w-8 xs:h-10 xs:w-10 md:h-12 md:w-12 text-primary" />
            </div>
            <h2 className="text-xl xs:text-2xl font-bold text-foreground mb-2">
              Welcome to Messenger
            </h2>
            <p className="text-sm xs:text-base text-muted-foreground mb-4 xs:mb-6 max-w-md mx-auto">
              Select a conversation from the sidebar to start messaging, or create a new chat to connect with friends and colleagues.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={handleNewChat}
                className="flex items-center justify-center h-12 px-6 text-sm xs:text-base"
                size="lg"
              >
                <Users className="h-4 w-4 xs:h-5 xs:w-5 mr-2" />
                Start New Conversation
              </Button>
              <Button
                variant="outline"
                onClick={() => setSidebarOpen(true)}
                className="flex items-center justify-center h-12 px-6 text-sm xs:text-base"
                size="lg"
              >
                <MessageCircle className="h-4 w-4 xs:h-5 xs:w-5 mr-2" />
                Browse Conversations
              </Button>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}

export default Dashboard