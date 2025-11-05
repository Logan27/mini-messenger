import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  action: () => void;
  enabled?: boolean;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

/**
 * useKeyboardShortcuts Hook
 * 
 * Manages keyboard shortcuts for the application with support for
 * modifier keys (Ctrl, Shift, Alt, Meta) and conditional enablement.
 * 
 * @example
 * ```tsx
 * useKeyboardShortcuts({
 *   shortcuts: [
 *     {
 *       key: 'k',
 *       ctrl: true,
 *       description: 'Open search',
 *       action: () => setSearchOpen(true)
 *     },
 *     {
 *       key: 'Escape',
 *       description: 'Close modal',
 *       action: () => setModalOpen(false),
 *       enabled: isModalOpen
 *     }
 *   ]
 * });
 * ```
 */
export const useKeyboardShortcuts = ({
  shortcuts,
  enabled = true
}: UseKeyboardShortcutsOptions) => {
  const shortcutsRef = useRef(shortcuts);

  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    const isInputField =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable;

    shortcutsRef.current.forEach((shortcut) => {
      // Skip if shortcut is disabled
      if (shortcut.enabled === false) return;

      // Match key
      const keyMatches =
        event.key.toLowerCase() === shortcut.key.toLowerCase();

      // Match modifiers
      const ctrlMatches = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
      const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatches = shortcut.alt ? event.altKey : !event.altKey;
      const metaMatches = shortcut.meta ? event.metaKey : !event.metaKey;

      // Special case: Allow Escape key even in input fields
      const shouldTrigger =
        keyMatches &&
        ctrlMatches &&
        shiftMatches &&
        altMatches &&
        metaMatches &&
        (event.key === 'Escape' || !isInputField);

      if (shouldTrigger) {
        event.preventDefault();
        shortcut.action();
      }
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);

  return { shortcuts };
};

/**
 * Helper function to format shortcut for display
 */
export const formatShortcut = (shortcut: KeyboardShortcut): string => {
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');
  if (shortcut.meta) parts.push('⌘');

  // Capitalize first letter of key for display
  const keyDisplay = shortcut.key.length === 1
    ? shortcut.key.toUpperCase()
    : shortcut.key.charAt(0).toUpperCase() + shortcut.key.slice(1);

  parts.push(keyDisplay);

  return parts.join('+');
};

export default useKeyboardShortcuts;
