import React, { useState } from 'react';
import { Keyboard, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { useKeyboardShortcuts, formatShortcut, KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  shortcuts: KeyboardShortcut[];
}

/**
 * KeyboardShortcutsHelp Component
 * 
 * Displays a modal with all available keyboard shortcuts organized by category.
 * Opens when user presses '?' key.
 * 
 * @example
 * ```tsx
 * <KeyboardShortcutsHelp shortcuts={appShortcuts} />
 * ```
 */
export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  shortcuts
}) => {
  const [open, setOpen] = useState(false);

  // Add '?' key to open help
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: '?',
        shift: true,
        description: 'Show keyboard shortcuts',
        action: () => setOpen(true)
      }
    ]
  });

  // Group shortcuts by category (based on description prefix)
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    // Extract category from description (e.g., "Navigation: Go home" -> "Navigation")
    const parts = shortcut.description.split(':');
    const category = parts.length > 1 ? parts[0].trim() : 'General';
    const description = parts.length > 1 ? parts[1].trim() : shortcut.description;

    if (!acc[category]) {
      acc[category] = [];
    }

    acc[category].push({
      ...shortcut,
      description
    });

    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  return (
    <>
      {/* Help dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription>
              Use these keyboard shortcuts to navigate faster
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold mb-3 text-foreground">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {categoryShortcuts.map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-sm text-muted-foreground">
                          {shortcut.description}
                        </span>
                        <Badge
                          variant="outline"
                          className="font-mono text-xs"
                        >
                          {formatShortcut(shortcut)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  {Object.keys(groupedShortcuts).indexOf(category) < Object.keys(groupedShortcuts).length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex justify-between items-center pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              Press <Badge variant="outline" className="font-mono mx-1">Shift+?</Badge> to open this dialog
            </span>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

/**
 * HelpButton Component
 * 
 * A button that opens the keyboard shortcuts help modal.
 * Can be placed in menus, toolbars, or settings.
 * 
 * @example
 * ```tsx
 * <HelpButton onClick={() => setHelpOpen(true)} />
 * ```
 */
export const HelpButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      title="Keyboard shortcuts (Shift+?)"
    >
      <Keyboard className="h-5 w-5" />
    </Button>
  );
};

export default KeyboardShortcutsHelp;
