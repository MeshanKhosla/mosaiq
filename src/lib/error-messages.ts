/**
 * Standardized error messages used throughout the application
 */
export const ERROR_MESSAGES = {
  DATASOURCE_NOT_FOUND: 'Datasource not found or unauthorized',
  ANALYSIS_NOT_FOUND: 'Analysis not found or unauthorized',
  DATASOURCE_UPDATE_FAILED: 'Failed to update datasource name',
  ANALYSIS_CREATE_FAILED: 'Failed to create analysis',
  FILE_UPLOAD_FAILED: 'Failed to upload file',
  INVALID_FILE_TYPE: 'Please select a CSV file',
  FILE_TOO_LARGE: (size: number, maxSize: number) =>
    `File size must be less than ${(maxSize / 1024 / 1024).toFixed(0)} MB. Current size: ${(size / 1024 / 1024).toFixed(2)} MB`,
  INVALID_DATASOURCE_ID: 'Invalid datasource ID',
  INVALID_ANALYSIS_ID: 'Invalid analysis ID',
  CSV_EMPTY: 'CSV file is empty',
  CSV_NO_HEADERS: 'CSV file has no headers',
  CSV_EMPTY_HEADERS: 'CSV has empty headers',
  CSV_DUPLICATE_HEADER: (header: string) =>
    `CSV has duplicate header: ${header}`,
  CSV_INVALID_ROW: (row: number, expected: number, actual: number) =>
    `Row ${row} has ${actual} columns, expected ${expected}`,
  CSV_NO_DATA: 'CSV file has no data rows',
  UNEXPECTED_ERROR: 'An unexpected error occurred',
} as const;
