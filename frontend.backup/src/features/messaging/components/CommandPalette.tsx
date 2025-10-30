import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  MessageSquare,
  Phone,
  Users,
  Settings,
  Search,
  Moon,
  Sun,
  Plus,
  Archive,
  Keyboard,
} from 'lucide-react'
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate()
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  useEffect(() => {
    // Load theme from localStorage
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (stored) {
      setTheme(stored)
      document.documentElement.classList.toggle('dark', stored === 'dark')
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
    onOpenChange(false)
  }

  const runCommand = (command: () => void) => {
    onOpenChange(false)
    command()
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Quick Actions */}
        <CommandGroup heading="Quick Actions">
          <CommandItem
            onSelect={() => runCommand(() => navigate('/chats/new'))}
          >
            <Plus className="mr-2 h-4 w-4" />
            <span>New Chat</span>
            <span className="ml-auto text-xs text-muted-foreground">
              Ctrl+N
            </span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate('/search'))}
          >
            <Search className="mr-2 h-4 w-4" />
            <span>Search Messages</span>
            <span className="ml-auto text-xs text-muted-foreground">
              Ctrl+F
            </span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate('/archive'))}
          >
            <Archive className="mr-2 h-4 w-4" />
            <span>Archived Chats</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() => runCommand(() => navigate('/chats'))}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>Chats</span>
            <span className="ml-auto text-xs text-muted-foreground">
              Ctrl+1
            </span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate('/calls'))}
          >
            <Phone className="mr-2 h-4 w-4" />
            <span>Calls</span>
            <span className="ml-auto text-xs text-muted-foreground">
              Ctrl+2
            </span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate('/contacts'))}
          >
            <Users className="mr-2 h-4 w-4" />
            <span>Contacts</span>
            <span className="ml-auto text-xs text-muted-foreground">
              Ctrl+3
            </span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate('/settings'))}
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
            <span className="ml-auto text-xs text-muted-foreground">
              Ctrl+4
            </span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Preferences */}
        <CommandGroup heading="Preferences">
          <CommandItem onSelect={toggleTheme}>
            {theme === 'light' ? (
              <Moon className="mr-2 h-4 w-4" />
            ) : (
              <Sun className="mr-2 h-4 w-4" />
            )}
            <span>Toggle {theme === 'light' ? 'Dark' : 'Light'} Mode</span>
            <span className="ml-auto text-xs text-muted-foreground">
              Ctrl+D
            </span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Help */}
        <CommandGroup heading="Help">
          <CommandItem
            onSelect={() => {
              onOpenChange(false)
              setShortcutsOpen(true)
            }}
          >
            <Keyboard className="mr-2 h-4 w-4" />
            <span>Keyboard Shortcuts</span>
            <span className="ml-auto text-xs text-muted-foreground">?</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>

      {/* Keyboard Shortcuts Help Dialog */}
      <KeyboardShortcutsHelp
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />
    </CommandDialog>
  )
}
