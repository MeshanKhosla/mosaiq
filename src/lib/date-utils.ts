/**
 * Date formatting utilities
 */

const DEFAULT_DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

/**
 * Formats a timestamp (number) to a readable date string
 * @param timestamp - Unix timestamp in milliseconds
 * @param options - Optional Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDate(
  timestamp: number,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Date(timestamp).toLocaleDateString(
    'en-US',
    options ?? DEFAULT_DATE_FORMAT_OPTIONS,
  );
}
