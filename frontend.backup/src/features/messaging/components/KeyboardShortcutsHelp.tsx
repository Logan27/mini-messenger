import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

interface KeyboardShortcutsHelpProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const shortcuts = [
  {
    category: 'General',
    items: [
      { keys: ['Ctrl', 'K'], description: 'Open command palette' },
      { keys: ['Esc'], description: 'Close modal / Clear selection' },
      { keys: ['Ctrl', 'D'], description: 'Toggle dark mode' },
    ],
  },
  {
    category: 'Navigation',
    items: [
      { keys: ['Ctrl', '1'], description: 'Go to Chats' },
      { keys: ['Ctrl', '2'], description: 'Go to Calls' },
      { keys: ['Ctrl', '3'], description: 'Go to Contacts' },
      { keys: ['Ctrl', '4'], description: 'Go to Settings' },
    ],
  },
  {
    category: 'Actions',
    items: [
      { keys: ['Ctrl', 'N'], description: 'New chat' },
      { keys: ['Ctrl', 'F'], description: 'Search messages' },
    ],
  },
  {
    category: 'Chat',
    items: [
      { keys: ['Enter'], description: 'Send message' },
      { keys: ['Shift', 'Enter'], description: 'New line' },
      { keys: ['Ctrl', '↑'], description: 'Edit last message' },
    ],
  },
]

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  open,
  onOpenChange,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Quickly navigate and perform actions using keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {shortcuts.map((section, index) => (
            <div key={section.category}>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent transition-colors"
                  >
                    <span className="text-sm text-muted-foreground">
                      {item.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded">
                            {key}
                          </kbd>
                          {keyIndex < item.keys.length - 1 && (
                            <span className="text-xs text-muted-foreground">
                              +
                            </span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {index < shortcuts.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </div>

        <div className="mt-6 p-3 bg-accent rounded-md">
          <p className="text-xs text-muted-foreground">
            <strong>Tip:</strong> Press{' '}
            <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-background border border-border rounded">
              Ctrl
            </kbd>{' '}
            +{' '}
            <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-background border border-border rounded">
              K
            </kbd>{' '}
            to quickly access commands and navigate the app.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
