/**
 * Keyboard Shortcuts Configuration
 * 
 * This file defines all keyboard shortcuts used throughout the application.
 * Shortcuts are organized by category for better maintainability.
 * 
 * Press Shift+? anywhere in the app to see the keyboard shortcuts help modal.
 */

import { KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';

/**
 * Navigation shortcuts
 */
export const navigationShortcuts: KeyboardShortcut[] = [
  {
    key: 'k',
    ctrl: true,
    description: 'Navigation: Open search',
    action: () => {
      // Will be implemented in components
    },
  },
  {
    key: 'n',
    ctrl: true,
    description: 'Navigation: New message',
    action: () => {
    },
  },
  {
    key: 's',
    ctrl: true,
    shift: true,
    description: 'Navigation: Open settings',
    action: () => {
    },
  },
];

/**
 * Messaging shortcuts
 */
export const messagingShortcuts: KeyboardShortcut[] = [
  {
    key: 'Enter',
    ctrl: true,
    description: 'Messaging: Send message',
    action: () => {
    },
  },
  {
    key: 'f',
    ctrl: true,
    description: 'Messaging: Search messages',
    action: () => {
    },
  },
  {
    key: 'e',
    ctrl: true,
    description: 'Messaging: Edit last message',
    action: () => {
    },
  },
  {
    key: 'r',
    ctrl: true,
    description: 'Messaging: Reply to message',
    action: () => {
    },
  },
];

/**
 * Chat switching shortcuts (Alt+1 through Alt+9)
 */
export const chatSwitchingShortcuts: KeyboardShortcut[] = Array.from({ length: 9 }, (_, i) => ({
  key: String(i + 1),
  alt: true,
  description: `Chat: Switch to chat ${i + 1}`,
  action: () => {
  },
}));

/**
 * Call shortcuts
 */
export const callShortcuts: KeyboardShortcut[] = [
  {
    key: 'c',
    ctrl: true,
    shift: true,
    description: 'Call: Start voice call',
    action: () => {
    },
  },
  {
    key: 'v',
    ctrl: true,
    shift: true,
    description: 'Call: Start video call',
    action: () => {
    },
  },
  {
    key: 'm',
    ctrl: true,
    shift: true,
    description: 'Call: Toggle mute',
    action: () => {
    },
  },
];

/**
 * Modal/Dialog shortcuts
 */
export const dialogShortcuts: KeyboardShortcut[] = [
  {
    key: 'Escape',
    description: 'Dialog: Close modal/cancel',
    action: () => {
    },
  },
];

/**
 * Help shortcuts
 */
export const helpShortcuts: KeyboardShortcut[] = [
  {
    key: '?',
    shift: true,
    description: 'Help: Show keyboard shortcuts',
    action: () => {
    },
  },
];

/**
 * All shortcuts combined
 */
export const allShortcuts: KeyboardShortcut[] = [
  ...navigationShortcuts,
  ...messagingShortcuts,
  ...chatSwitchingShortcuts,
  ...callShortcuts,
  ...dialogShortcuts,
  ...helpShortcuts,
];

/**
 * Get shortcuts for a specific component
 */
export const getShortcutsForContext = (context: 'global' | 'chat' | 'call' | 'settings'): KeyboardShortcut[] => {
  switch (context) {
    case 'global':
      return [...navigationShortcuts, ...dialogShortcuts, ...helpShortcuts];
    case 'chat':
      return [...messagingShortcuts, ...chatSwitchingShortcuts, ...callShortcuts];
    case 'call':
      return [...callShortcuts, ...dialogShortcuts];
    case 'settings':
      return [...navigationShortcuts, ...dialogShortcuts];
    default:
      return allShortcuts;
  }
};

/**
 * Export individual categories for specific use cases
 */
export default {
  navigation: navigationShortcuts,
  messaging: messagingShortcuts,
  chatSwitching: chatSwitchingShortcuts,
  call: callShortcuts,
  dialog: dialogShortcuts,
  help: helpShortcuts,
  all: allShortcuts,
  getShortcutsForContext,
};
