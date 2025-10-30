import { useEffect, useCallback } from 'react';

// Keyboard shortcuts for Telegram-like navigation
export const useKeyboardNavigation = (
  shortcuts: Record<string, () => void>,
  enabled: boolean = true
) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const { key, ctrlKey, metaKey, shiftKey, altKey } = event;

    // Build the shortcut string
    const parts = [];
    if (ctrlKey || metaKey) parts.push('ctrl');
    if (shiftKey) parts.push('shift');
    if (altKey) parts.push('alt');
    parts.push(key.toLowerCase());

    const shortcut = parts.join('+');

    // Execute matching shortcut
    if (shortcuts[shortcut]) {
      event.preventDefault();
      shortcuts[shortcut]();
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

// Common messaging shortcuts
export const useMessagingShortcuts = ({
  onNewChat,
  onSearch,
  onSettings,
  onNextChat,
  onPreviousChat,
  onSendMessage,
  onFocusInput,
  toggleDarkMode,
}: {
  onNewChat?: () => void;
  onSearch?: () => void;
  onSettings?: () => void;
  onNextChat?: () => void;
  onPreviousChat?: () => void;
  onSendMessage?: () => void;
  onFocusInput?: () => void;
  toggleDarkMode?: () => void;
}) => {
  const shortcuts: Record<string, () => void> = {};

  if (onNewChat) shortcuts['ctrl+n'] = onNewChat;
  if (onSearch) shortcuts['ctrl+f'] = onSearch;
  if (onSettings) shortcuts['ctrl+,'] = onSettings;
  if (onNextChat) shortcuts['ctrl+tab'] = onNextChat;
  if (onPreviousChat) shortcuts['ctrl+shift+tab'] = onPreviousChat;
  if (onSendMessage) shortcuts['ctrl+enter'] = onSendMessage;
  if (onFocusInput) shortcuts['ctrl+/'] = onFocusInput;
  if (toggleDarkMode) shortcuts['ctrl+d'] = toggleDarkMode;

  useKeyboardNavigation(shortcuts);
};

// Focus management utilities
export const useFocusManagement = () => {
  const focusNextElement = useCallback(() => {
    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const currentIndex = Array.from(focusableElements).findIndex(
      el => el === document.activeElement
    );
    const nextIndex = (currentIndex + 1) % focusableElements.length;
    (focusableElements[nextIndex] as HTMLElement)?.focus();
  }, []);

  const focusPreviousElement = useCallback(() => {
    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const currentIndex = Array.from(focusableElements).findIndex(
      el => el === document.activeElement
    );
    const prevIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
    (focusableElements[prevIndex] as HTMLElement)?.focus();
  }, []);

  const trapFocus = useCallback((container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    return () => container.removeEventListener('keydown', handleTabKey);
  }, []);

  return {
    focusNextElement,
    focusPreviousElement,
    trapFocus,
  };
};