import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge class names with Tailwind conflict resolution.
 * Usage: cn('px-4 py-2', isActive && 'bg-accent', className)
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date into a relative/absolute timestamp string.
 */
export function formatRelativeTime(date) {
  if (!date) return '';
  const now = new Date();
  const d = new Date(date);
  const diffMs = now - d;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) {
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format a date for message timestamps (HH:MM format).
 */
export function formatMessageTime(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format date separators for message streams:
 * - Today
 * - Yesterday
 * - Day of week (e.g., "Monday", "Tuesday") if within 7 days
 * - "15 Jan", "28 Jul" for older dates
 */
export function formatDateSeparator(date) {
  if (!date) return '';
  const now = new Date();
  const d = new Date(date);

  const nowReset = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dReset = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const diffMs = nowReset - dReset;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) {
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  }

  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

/**
 * Format "last seen" status text.
 */
export function formatLastSeen(date) {
  if (!date) return 'last seen recently';
  const now = new Date();
  const d = new Date(date);
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);

  if (diffMin < 1) return 'last seen just now';
  if (diffMin < 60) return `last seen ${diffMin}m ago`;
  if (diffHr < 24) return `last seen ${diffHr}h ago`;
  return `last seen ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

/**
 * Truncate text to a maximum length with ellipsis.
 */
export function truncate(str, maxLength = 40) {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength).trim() + '…';
}

/**
 * Generate a random ID.
 */
export function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Delay utility for mock adapters.
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
