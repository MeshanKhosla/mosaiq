import type { Id } from '../../convex/_generated/dataModel';

/**
 * Extracts datasource ID from a pathname
 * @param pathname - The pathname to parse (e.g., "/datasource/abc123")
 * @returns The datasource ID if found, null otherwise
 */
export function extractDatasourceId(
  pathname: string,
): Id<'datasources'> | null {
  const match = pathname.match(/^\/datasource\/(.+)$/);
  return match ? (match[1] as Id<'datasources'>) : null;
}

/**
 * Extracts analysis ID from a pathname
 * @param pathname - The pathname to parse (e.g., "/analysis/abc123")
 * @returns The analysis ID if found, null otherwise
 */
export function extractAnalysisId(pathname: string): Id<'analyses'> | null {
  const match = pathname.match(/^\/analysis\/(.+)$/);
  return match ? (match[1] as Id<'analyses'>) : null;
}

/**
 * Checks if a string looks like a Convex ID
 * Convex IDs are typically 27 characters long, alphanumeric
 * @param str - The string to check
 * @returns true if the string looks like a Convex ID
 */
export function looksLikeId(str: string): boolean {
  return /^[a-zA-Z0-9]{20,}$/.test(str);
}
