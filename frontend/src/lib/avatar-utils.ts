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

  // If avatar is a relative path, prepend API URL
  const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4000';

  // Ensure path starts with /
  const normalizedPath = avatarPath.startsWith('/') ? avatarPath : `/${avatarPath}`;

  return `${baseUrl}${normalizedPath}`;
}
