/**
 * Get the full URL for an avatar path
 * @param avatarPath - The avatar path from the user object
 * @returns Full URL or undefined if no avatar
 */
export function getAvatarUrl(avatarPath: string | undefined): string | undefined {
  if (!avatarPath) return undefined;

  // If avatar is already a full URL, return as is
  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
    return avatarPath;
  }

  // Get base URL without /api suffix
  const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4000';

  // Ensure path starts with /
  let normalizedPath = avatarPath.startsWith('/') ? avatarPath : `/${avatarPath}`;

  // If the path starts with /uploads/ but not /api/uploads/, prepend /api
  // This handles both legacy paths (/uploads/...) and new paths (/api/uploads/...)
  if (normalizedPath.startsWith('/uploads/') && !normalizedPath.startsWith('/api/uploads/')) {
    normalizedPath = '/api' + normalizedPath;
  }

  return `${baseUrl}${normalizedPath}`;
}
