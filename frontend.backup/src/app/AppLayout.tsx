import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { CommandPalette } from '@/features/messaging/components/CommandPalette'
import { useKeyboardShortcuts } from '@/shared/lib/hooks/useKeyboardShortcuts'
import { Toaster } from '@/components/ui/sonner'

export function AppLayout() {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  // Setup global keyboard shortcuts
  useKeyboardShortcuts({
    onCommandPalette: () => setCommandPaletteOpen(true),
  })

  return (
    <>
      <div className="flex h-screen bg-background text-foreground">
        <aside className="w-64 bg-secondary border-r border-border p-4">
          {/* Sidebar content */}
        </aside>
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />

      {/* Toast notifications */}
      <Toaster />
    </>
  )
}
