import { LinkMetadata } from '../components/messaging/LinkPreview';

/**
 * Regular expression to match URLs in text
 */
const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

/**
 * Extract URLs from text
 */
export const extractUrls = (text: string): string[] => {
  const matches = text.match(URL_REGEX);
  return matches || [];
};

/**
 * Check if text contains URLs
 */
export const containsUrl = (text: string): boolean => {
  return URL_REGEX.test(text);
};

/**
 * Fetch link metadata from a URL
 * This is a client-side implementation that uses a simple fetch approach.
 * For production, you should use a backend service to fetch metadata securely.
 */
export const fetchLinkMetadata = async (url: string): Promise<LinkMetadata | null> => {
  try {
    // In a production app, you would call your backend API endpoint
    // which would fetch the URL and parse the Open Graph tags
    // Example: const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);

    // For now, we'll return a mock metadata structure
    // In production, your backend would:
    // 1. Fetch the URL content
    // 2. Parse HTML to extract meta tags (og:title, og:description, og:image, etc.)
    // 3. Return structured metadata

    const urlObj = new URL(url);

    // Mock implementation - replace with actual API call
    const metadata: LinkMetadata = {
      url,
      title: `Link from ${urlObj.hostname}`,
      description: 'Click to open this link',
      siteName: urlObj.hostname,
    };

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return metadata;
  } catch (error) {
    console.error('Failed to fetch link metadata:', error);
    return null;
  }
};

/**
 * Extract the first URL from text
 */
export const extractFirstUrl = (text: string): string | null => {
  const urls = extractUrls(text);
  return urls.length > 0 ? urls[0] : null;
};

/**
 * Parse Open Graph metadata from HTML
 * This would be used on the backend
 */
export const parseOpenGraphTags = (html: string): Partial<LinkMetadata> => {
  const metadata: Partial<LinkMetadata> = {};

  // Extract og:title
  const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
  if (titleMatch) metadata.title = titleMatch[1];

  // Extract og:description
  const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
  if (descMatch) metadata.description = descMatch[1];

  // Extract og:image
  const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  if (imageMatch) metadata.image = imageMatch[1];

  // Extract og:site_name
  const siteMatch = html.match(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i);
  if (siteMatch) metadata.siteName = siteMatch[1];

  // Fallback to regular title if og:title not found
  if (!metadata.title) {
    const titleTagMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleTagMatch) metadata.title = titleTagMatch[1];
  }

  // Fallback to meta description if og:description not found
  if (!metadata.description) {
    const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    if (metaDescMatch) metadata.description = metaDescMatch[1];
  }

  return metadata;
};
