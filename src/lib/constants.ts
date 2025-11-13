/**
 * Application-wide constants
 */

/**
 * Default pagination page size for data tables
 */
export const DEFAULT_PAGE_SIZE = 10;

/**
 * Maximum file size for uploads (5 MB in bytes)
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Default date format options
 */
export const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

/**
 * Default visual size (width and height in pixels)
 */
export const DEFAULT_VISUAL_SIZE = 400;

/**
 * Minimum visual size (width and height in pixels)
 */
export const MIN_VISUAL_SIZE = 400;
