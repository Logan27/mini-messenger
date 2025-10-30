# Keyboard Shortcuts

This messenger application includes comprehensive keyboard shortcuts for power users, inspired by Telegram's design philosophy of speed and efficiency.

## Quick Access

Press **`Ctrl+K`** (or `Cmd+K` on Mac) to open the Command Palette and access all features quickly.

---

## Global Shortcuts

### General
| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Open Command Palette |
| `Ctrl+D` | Toggle Dark/Light Mode |
| `Esc` | Close modal / Clear selection |

### Navigation
| Shortcut | Action |
|----------|--------|
| `Ctrl+1` | Go to Chats |
| `Ctrl+2` | Go to Calls |
| `Ctrl+3` | Go to Contacts |
| `Ctrl+4` | Go to Settings |

### Quick Actions
| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New Chat |
| `Ctrl+F` | Search Messages (when not in input field) |

---

## Chat-Specific Shortcuts

### Message Input
| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift+Enter` | New line in message |
| `Ctrl+↑` | Edit last message (coming soon) |

---

## Command Palette Features

The Command Palette (`Ctrl+K`) provides quick access to:

### Quick Actions
- **New Chat** - Start a conversation
- **Search Messages** - Find messages across all conversations
- **Archived Chats** - View archived conversations

### Navigation
- Jump to different sections of the app
- Direct access via keyboard shortcuts

### Preferences
- Toggle theme (Dark/Light mode)
- Access keyboard shortcuts help

### Help
- **Keyboard Shortcuts** - View all available shortcuts

---

## Implementation Details

### Components
- **`CommandPalette.tsx`** - Main command palette component using `cmdk`
- **`KeyboardShortcutsHelp.tsx`** - Help dialog showing all shortcuts
- **`useKeyboardShortcuts.ts`** - Global keyboard shortcuts hook
- **`useChatShortcuts.ts`** - Chat-specific shortcuts hook

### Usage Example

```tsx
import { CommandPalette } from '@/features/messaging'
import { useKeyboardShortcuts } from '@/shared/lib/hooks/useKeyboardShortcuts'

function App() {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  useKeyboardShortcuts({
    onCommandPalette: () => setCommandPaletteOpen(true),
  })

  return (
    <>
      <YourAppContent />
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />
    </>
  )
}
```

---

## Accessibility

All keyboard shortcuts follow accessibility best practices:

- **Focus Management**: Proper focus trapping in modals
- **Screen Reader Support**: ARIA labels on all interactive elements
- **Keyboard Navigation**: Full keyboard accessibility (Tab, Enter, Arrow keys)
- **Visual Feedback**: Clear focus indicators

---

## Browser Compatibility

Keyboard shortcuts work in all modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

**Note:** On macOS, `Ctrl` is replaced with `Cmd` for shortcuts.

---

## Future Enhancements

Planned keyboard shortcuts:

- **Chat List**
  - `↑/↓` - Navigate between conversations
  - `Enter` - Open selected conversation
  - `Delete` - Archive conversation

- **Message Actions**
  - `Ctrl+E` - Edit selected message
  - `Ctrl+R` - Reply to message
  - `Ctrl+C` - Copy message text
  - `Ctrl+Shift+D` - Delete message

- **Search**
  - `Ctrl+G` - Find next search result
  - `Ctrl+Shift+G` - Find previous search result

---

## Contributing

To add new keyboard shortcuts:

1. Update `useKeyboardShortcuts.ts` with the new handler
2. Add the shortcut to `KeyboardShortcutsHelp.tsx`
3. Update this documentation
4. Add tests for the new shortcut

---

## References

- [cmdk](https://cmdk.paco.me/) - Command menu component
- [Radix UI](https://www.radix-ui.com/) - Accessible UI primitives
- [Telegram Shortcuts](https://telegram.org/blog/shortcuts) - Design inspiration
