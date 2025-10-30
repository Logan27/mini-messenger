import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface ShortcutHandlers {
  onCommandPalette: () => void
  onNewChat?: () => void
  onSearch?: () => void
  onToggleTheme?: () => void
}

export const useKeyboardShortcuts = (handlers: ShortcutHandlers) => {
  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl/Cmd modifier
      const isMod = event.ctrlKey || event.metaKey

      // Prevent default browser shortcuts when needed
      if (isMod) {
        switch (event.key.toLowerCase()) {
          case 'k':
            event.preventDefault()
            handlers.onCommandPalette()
            break

          case 'n':
            event.preventDefault()
            if (handlers.onNewChat) {
              handlers.onNewChat()
            } else {
              navigate('/chats/new')
            }
            break

          case 'f':
            // Only prevent default if not in an input field
            if (
              event.target instanceof HTMLElement &&
              !['INPUT', 'TEXTAREA'].includes(event.target.tagName)
            ) {
              event.preventDefault()
              if (handlers.onSearch) {
                handlers.onSearch()
              } else {
                navigate('/search')
              }
            }
            break

          case 'd':
            event.preventDefault()
            if (handlers.onToggleTheme) {
              handlers.onToggleTheme()
            } else {
              toggleTheme()
            }
            break

          case '1':
            event.preventDefault()
            navigate('/chats')
            break

          case '2':
            event.preventDefault()
            navigate('/calls')
            break

          case '3':
            event.preventDefault()
            navigate('/contacts')
            break

          case '4':
            event.preventDefault()
            navigate('/settings')
            break

          default:
            break
        }
      }

      // Escape key handling
      if (event.key === 'Escape') {
        // Close modals, clear selections, etc.
        // This can be handled by individual components
      }
    }

    // Add event listener
    window.addEventListener('keydown', handleKeyDown)

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handlers, navigate])
}

// Helper function to toggle theme
const toggleTheme = () => {
  const currentTheme = localStorage.getItem('theme') || 'light'
  const newTheme = currentTheme === 'light' ? 'dark' : 'light'
  localStorage.setItem('theme', newTheme)
  document.documentElement.classList.toggle('dark', newTheme === 'dark')
}

// Hook for detecting keyboard shortcuts in chat input
export const useChatShortcuts = (callbacks: {
  onSend?: () => void
  onEditLastMessage?: () => void
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMod = event.ctrlKey || event.metaKey

      // Check if we're in a textarea
      if (event.target instanceof HTMLTextAreaElement) {
        if (event.key === 'Enter' && !event.shiftKey) {
          // Send message on Enter (without Shift)
          event.preventDefault()
          callbacks.onSend?.()
        } else if (isMod && event.key === 'ArrowUp') {
          // Edit last message on Ctrl+Up
          event.preventDefault()
          callbacks.onEditLastMessage?.()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [callbacks])
}
