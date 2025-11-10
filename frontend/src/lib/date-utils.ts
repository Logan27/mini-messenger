/**
 * Date utility functions for safe date handling and formatting
 */

/**
 * Safely parse a date value and return a valid Date object or null
 * @param value - Date string, number, or Date object
 * @returns Valid Date object or null if invalid
 */
export function safeParseDate(value: string | number | Date | null | undefined): Date | null {
  if (!value) return null;

  const date = new Date(value);

  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.warn('Invalid date value:', value);
    return null;
  }

  return date;
}

/**
 * Safely format time difference from now
 * @param date - Date to format
 * @returns Formatted string like "5m ago", "2h ago", "3d ago" or empty string if invalid
 */
export function formatTimeAgo(date: Date | string | number | null | undefined): string {
  const parsedDate = safeParseDate(date);
  if (!parsedDate) return '';

  const now = new Date();
  const diff = now.getTime() - parsedDate.getTime();

  // Handle future dates or invalid diffs
  if (diff < 0) return 'just now';

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) {
    return 'just now';
  } else if (hours < 1) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else {
    return `${days}d ago`;
  }
}

/**
 * Check if a date value is valid
 * @param value - Date to check
 * @returns true if valid, false otherwise
 */
export function isValidDate(value: unknown): boolean {
  if (!value) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}
