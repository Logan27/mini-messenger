// Telegram-inspired color palette and styling constants
// Based on docs/UI_UX_GUIDELINES.md

export const TelegramColors = {
  // Primary (Telegram Blue)
  primary: '#0088cc',
  primaryHover: '#0077b3',
  primaryActive: '#006ba3',

  // Background
  background: '#ffffff',
  backgroundSecondary: '#fafafa',
  chatBg: '#dfe5e9',

  // Text
  foreground: '#262626',
  mutedForeground: '#737373',

  // Message Bubbles
  bubbleOut: '#0088cc',
  bubbleOutText: '#ffffff',
  bubbleIn: '#ffffff',
  bubbleInText: '#262626',

  // Status Colors
  success: '#28a745',
  warning: '#ffc107',
  error: '#f44336',
  info: '#0dcaf0',

  // Borders
  border: '#e5e5e5',
  divider: '#eeeeee',

  // Online Indicator
  online: '#28a745',

  // Unread Badge
  badge: '#999999',
  badgeImportant: '#0088cc',
} as const;

// Common inline styles for Telegram-like UI
export const TelegramStyles = {
  // Page container (full screen with chat background)
  page: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: TelegramColors.chatBg,
  } as React.CSSProperties,

  // Card container (white background with shadow)
  card: {
    width: '100%',
    maxWidth: '28rem',
    padding: '2rem',
    backgroundColor: TelegramColors.background,
    borderRadius: '0.75rem',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    border: `1px solid ${TelegramColors.border}`,
  } as React.CSSProperties,

  // Icon container (Telegram blue circle)
  iconContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '4rem',
    height: '4rem',
    margin: '0 auto 1rem',
    backgroundColor: TelegramColors.primary,
    borderRadius: '50%',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.2)',
  } as React.CSSProperties,

  // Title text
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    textAlign: 'center',
    color: TelegramColors.foreground,
    marginBottom: '0.5rem',
  } as React.CSSProperties,

  // Subtitle/description text
  subtitle: {
    fontSize: '0.875rem',
    textAlign: 'center',
    color: TelegramColors.mutedForeground,
    marginBottom: '1.5rem',
  } as React.CSSProperties,

  // Form group container
  formGroup: {
    marginBottom: '1rem',
  } as React.CSSProperties,

  // Label text
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: TelegramColors.foreground,
  } as React.CSSProperties,

  // Input field
  input: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    fontSize: '1rem',
    border: `1px solid ${TelegramColors.border}`,
    borderRadius: '0.375rem',
    outline: 'none',
  } as React.CSSProperties,

  // Primary button (Telegram blue)
  button: {
    width: '100%',
    padding: '0.625rem 1rem',
    backgroundColor: TelegramColors.primary,
    color: '#ffffff',
    fontWeight: '500',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '1rem',
    marginTop: '0.5rem',
  } as React.CSSProperties,

  // Button hover state
  buttonHover: {
    backgroundColor: TelegramColors.primaryHover,
  } as React.CSSProperties,

  // Footer section (with border separator)
  footer: {
    marginTop: '1.5rem',
    paddingTop: '1.5rem',
    borderTop: `1px solid ${TelegramColors.border}`,
    textAlign: 'center',
    fontSize: '0.875rem',
    color: TelegramColors.mutedForeground,
  } as React.CSSProperties,

  // Link text
  link: {
    color: TelegramColors.primary,
    textDecoration: 'none',
    fontWeight: '500',
  } as React.CSSProperties,

  // Error message
  error: {
    color: TelegramColors.error,
    fontSize: '0.875rem',
    marginTop: '0.25rem',
  } as React.CSSProperties,

  // Chat list container
  chatList: {
    backgroundColor: TelegramColors.background,
    minHeight: '100vh',
  } as React.CSSProperties,

  // Chat list item
  chatListItem: {
    padding: '1rem',
    borderBottom: `1px solid ${TelegramColors.divider}`,
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  } as React.CSSProperties,

  // Chat list item hover
  chatListItemHover: {
    backgroundColor: TelegramColors.backgroundSecondary,
  } as React.CSSProperties,

  // Message container
  messageContainer: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: TelegramColors.chatBg,
    minHeight: '100vh',
  } as React.CSSProperties,

  // Message bubble outgoing
  messageBubbleOut: {
    backgroundColor: TelegramColors.bubbleOut,
    color: TelegramColors.bubbleOutText,
    padding: '0.5rem 0.75rem',
    borderRadius: '1rem',
    maxWidth: '70%',
    marginLeft: 'auto',
    marginBottom: '0.5rem',
  } as React.CSSProperties,

  // Message bubble incoming
  messageBubbleIn: {
    backgroundColor: TelegramColors.bubbleIn,
    color: TelegramColors.bubbleInText,
    padding: '0.5rem 0.75rem',
    borderRadius: '1rem',
    maxWidth: '70%',
    marginRight: 'auto',
    marginBottom: '0.5rem',
  } as React.CSSProperties,
};

// Helper function to merge styles
export const mergeStyles = (...styles: React.CSSProperties[]): React.CSSProperties => {
  return Object.assign({}, ...styles);
};
