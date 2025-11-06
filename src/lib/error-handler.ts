/**
 * Error handling utilities
 */

/**
 * Formats an error message for display to users
 * @param error - Error object or string
 * @param defaultMessage - Default message if error cannot be formatted
 * @returns User-friendly error message
 */
export function formatErrorMessage(
  error: unknown,
  defaultMessage = 'An error occurred',
): string {
  if (error instanceof Error) {
    return error.message || defaultMessage;
  }
  if (typeof error === 'string') {
    return error;
  }
  return defaultMessage;
}

/**
 * Logs an error to the console in development
 * @param error - Error object or string
 * @param context - Additional context about where the error occurred
 */
export function logError(error: unknown, context?: string): void {
  if (import.meta.env.DEV) {
    const message = context
      ? `[${context}] ${formatErrorMessage(error)}`
      : formatErrorMessage(error);
    console.error(message, error);
  }
}
