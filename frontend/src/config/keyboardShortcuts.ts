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
      console.log('Search shortcut triggered');
    },
  },
  {
    key: 'n',
    ctrl: true,
    description: 'Navigation: New message',
    action: () => {
      console.log('New message shortcut triggered');
    },
  },
  {
    key: 's',
    ctrl: true,
    shift: true,
    description: 'Navigation: Open settings',
    action: () => {
      console.log('Settings shortcut triggered');
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
      console.log('Send message shortcut triggered');
    },
  },
  {
    key: 'f',
    ctrl: true,
    description: 'Messaging: Search messages',
    action: () => {
      console.log('Search messages shortcut triggered');
    },
  },
  {
    key: 'e',
    ctrl: true,
    description: 'Messaging: Edit last message',
    action: () => {
      console.log('Edit message shortcut triggered');
    },
  },
  {
    key: 'r',
    ctrl: true,
    description: 'Messaging: Reply to message',
    action: () => {
      console.log('Reply shortcut triggered');
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
    console.log(`Switch to chat ${i + 1} triggered`);
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
      console.log('Voice call shortcut triggered');
    },
  },
  {
    key: 'v',
    ctrl: true,
    shift: true,
    description: 'Call: Start video call',
    action: () => {
      console.log('Video call shortcut triggered');
    },
  },
  {
    key: 'm',
    ctrl: true,
    shift: true,
    description: 'Call: Toggle mute',
    action: () => {
      console.log('Toggle mute shortcut triggered');
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
      console.log('Escape shortcut triggered');
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
      console.log('Help shortcut triggered');
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
