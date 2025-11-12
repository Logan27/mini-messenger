import {
  extractUrls,
  containsUrl,
  fetchLinkMetadata,
  extractFirstUrl,
  parseOpenGraphTags,
} from '../linkPreview';

describe('linkPreview', () => {
  describe('extractUrls', () => {
    it('extracts single URL from text', () => {
      const text = 'Check out this link: https://example.com';
      const urls = extractUrls(text);

      expect(urls).toEqual(['https://example.com']);
    });

    it('extracts multiple URLs from text', () => {
      const text = 'Visit https://example.com and http://test.org for more info';
      const urls = extractUrls(text);

      expect(urls).toHaveLength(2);
      expect(urls).toContain('https://example.com');
      expect(urls).toContain('http://test.org');
    });

    it('extracts URLs with paths and query parameters', () => {
      const text = 'Check https://example.com/path/to/page?foo=bar&baz=qux';
      const urls = extractUrls(text);

      expect(urls).toEqual(['https://example.com/path/to/page?foo=bar&baz=qux']);
    });

    it('extracts URLs with fragments', () => {
      const text = 'See https://example.com/page#section';
      const urls = extractUrls(text);

      expect(urls).toEqual(['https://example.com/page#section']);
    });

    it('extracts URLs with www subdomain', () => {
      const text = 'Visit https://www.example.com';
      const urls = extractUrls(text);

      expect(urls).toEqual(['https://www.example.com']);
    });

    it('extracts URLs with ports', () => {
      const text = 'Check http://example.com:3000/api';
      const urls = extractUrls(text);

      expect(urls).toEqual(['http://example.com:3000/api']);
    });

    it('returns empty array when no URLs present', () => {
      const text = 'This is just plain text without any links';
      const urls = extractUrls(text);

      expect(urls).toEqual([]);
    });

    it('extracts multiple URLs on different lines', () => {
      const text = `
        First link: https://example.com
        Second link: http://test.org
        Third link: https://another.site.com/path
      `;
      const urls = extractUrls(text);

      expect(urls).toHaveLength(3);
    });

    it('handles URLs with special characters', () => {
      const text = 'Check https://example.com/path?foo=bar&name=John+Doe';
      const urls = extractUrls(text);

      expect(urls[0]).toContain('https://example.com/path?foo=bar');
    });
  });

  describe('containsUrl', () => {
    it('returns true when text contains URL', () => {
      const text = 'Check out https://example.com';
      expect(containsUrl(text)).toBe(true);
    });

    it('returns false when text has no URLs', () => {
      const text = 'Just plain text';
      expect(containsUrl(text)).toBe(false);
    });

    it('returns true for URLs anywhere in text', () => {
      const text = 'Before text https://example.com after text';
      expect(containsUrl(text)).toBe(true);
    });

    it('returns false for invalid URL patterns', () => {
      const text = 'This is not a url: example.com';
      expect(containsUrl(text)).toBe(false);
    });

    it('returns true for multiple URLs', () => {
      const text = 'Visit https://example.com and http://test.org';
      expect(containsUrl(text)).toBe(true);
    });
  });

  describe('extractFirstUrl', () => {
    it('extracts first URL when multiple exist', () => {
      const text = 'Check https://first.com and https://second.com';
      const url = extractFirstUrl(text);

      expect(url).toBe('https://first.com');
    });

    it('extracts single URL', () => {
      const text = 'Only one link: https://example.com';
      const url = extractFirstUrl(text);

      expect(url).toBe('https://example.com');
    });

    it('returns null when no URLs present', () => {
      const text = 'No links here';
      const url = extractFirstUrl(text);

      expect(url).toBeNull();
    });

    it('returns first URL even with surrounding text', () => {
      const text = 'Some text before https://example.com/path?q=test and after';
      const url = extractFirstUrl(text);

      expect(url).toBe('https://example.com/path?q=test');
    });
  });

  describe('fetchLinkMetadata', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('fetches metadata for valid URL', async () => {
      const url = 'https://example.com/article';

      const metadataPromise = fetchLinkMetadata(url);

      // Fast-forward through the timeout
      jest.advanceTimersByTime(500);

      const metadata = await metadataPromise;

      expect(metadata).not.toBeNull();
      expect(metadata?.url).toBe(url);
      expect(metadata?.title).toContain('example.com');
      expect(metadata?.siteName).toBe('example.com');
    });

    it('generates title from hostname', async () => {
      const url = 'https://test.org/page';

      const metadataPromise = fetchLinkMetadata(url);
      jest.advanceTimersByTime(500);

      const metadata = await metadataPromise;

      expect(metadata?.title).toBe('Link from test.org');
      expect(metadata?.siteName).toBe('test.org');
    });

    it('returns null for invalid URL', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      const url = 'not-a-valid-url';

      const metadataPromise = fetchLinkMetadata(url);
      jest.advanceTimersByTime(500);

      const metadata = await metadataPromise;

      expect(metadata).toBeNull();
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to fetch link metadata:',
        expect.any(Error)
      );

      consoleError.mockRestore();
    });

    it('includes description in metadata', async () => {
      const url = 'https://example.com';

      const metadataPromise = fetchLinkMetadata(url);
      jest.advanceTimersByTime(500);

      const metadata = await metadataPromise;

      expect(metadata?.description).toBeDefined();
      expect(metadata?.description).toBe('Click to open this link');
    });
  });

  describe('parseOpenGraphTags', () => {
    it('parses og:title from HTML', () => {
      const html = '<meta property="og:title" content="Test Title">';
      const metadata = parseOpenGraphTags(html);

      expect(metadata.title).toBe('Test Title');
    });

    it('parses og:description from HTML', () => {
      const html = '<meta property="og:description" content="Test Description">';
      const metadata = parseOpenGraphTags(html);

      expect(metadata.description).toBe('Test Description');
    });

    it('parses og:image from HTML', () => {
      const html = '<meta property="og:image" content="https://example.com/image.jpg">';
      const metadata = parseOpenGraphTags(html);

      expect(metadata.image).toBe('https://example.com/image.jpg');
    });

    it('parses og:site_name from HTML', () => {
      const html = '<meta property="og:site_name" content="Example Site">';
      const metadata = parseOpenGraphTags(html);

      expect(metadata.siteName).toBe('Example Site');
    });

    it('parses all Open Graph tags together', () => {
      const html = `
        <html>
          <head>
            <meta property="og:title" content="Article Title">
            <meta property="og:description" content="Article Description">
            <meta property="og:image" content="https://example.com/image.jpg">
            <meta property="og:site_name" content="Example Site">
          </head>
        </html>
      `;
      const metadata = parseOpenGraphTags(html);

      expect(metadata.title).toBe('Article Title');
      expect(metadata.description).toBe('Article Description');
      expect(metadata.image).toBe('https://example.com/image.jpg');
      expect(metadata.siteName).toBe('Example Site');
    });

    it('falls back to title tag when og:title not found', () => {
      const html = '<title>Fallback Title</title>';
      const metadata = parseOpenGraphTags(html);

      expect(metadata.title).toBe('Fallback Title');
    });

    it('falls back to meta description when og:description not found', () => {
      const html = '<meta name="description" content="Fallback Description">';
      const metadata = parseOpenGraphTags(html);

      expect(metadata.description).toBe('Fallback Description');
    });

    it('prefers og:title over regular title', () => {
      const html = `
        <title>Regular Title</title>
        <meta property="og:title" content="OG Title">
      `;
      const metadata = parseOpenGraphTags(html);

      expect(metadata.title).toBe('OG Title');
    });

    it('prefers og:description over meta description', () => {
      const html = `
        <meta name="description" content="Regular Description">
        <meta property="og:description" content="OG Description">
      `;
      const metadata = parseOpenGraphTags(html);

      expect(metadata.description).toBe('OG Description');
    });

    it('handles HTML with single quotes', () => {
      const html = "<meta property='og:title' content='Single Quote Title'>";
      const metadata = parseOpenGraphTags(html);

      expect(metadata.title).toBe('Single Quote Title');
    });

    it('returns empty object when no metadata found', () => {
      const html = '<html><body>No metadata here</body></html>';
      const metadata = parseOpenGraphTags(html);

      expect(metadata.title).toBeUndefined();
      expect(metadata.description).toBeUndefined();
      expect(metadata.image).toBeUndefined();
      expect(metadata.siteName).toBeUndefined();
    });

    it('handles malformed HTML gracefully', () => {
      const html = '<meta property="og:title" content="Missing closing tag';
      const metadata = parseOpenGraphTags(html);

      // Should not throw and may or may not extract the title
      expect(metadata).toBeDefined();
    });

    it('extracts complex URLs from og:image', () => {
      const imageUrl = 'https://example.com/images/article.jpg?w=1200&h=630';
      const html = `<meta property="og:image" content="${imageUrl}">`;
      const metadata = parseOpenGraphTags(html);

      expect(metadata.image).toBe(imageUrl);
    });
  });

  describe('Integration scenarios', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('complete flow: extract URL, check existence, fetch metadata', async () => {
      const message = 'Check out this article: https://example.com/article';

      const hasUrl = containsUrl(message);
      expect(hasUrl).toBe(true);

      const firstUrl = extractFirstUrl(message);
      expect(firstUrl).toBe('https://example.com/article');

      const metadataPromise = fetchLinkMetadata(firstUrl!);
      jest.advanceTimersByTime(500);
      const metadata = await metadataPromise;

      expect(metadata).not.toBeNull();
      expect(metadata?.url).toBe('https://example.com/article');
    });

    it('handles message with no URLs gracefully', async () => {
      const message = 'Just a regular message without links';

      const hasUrl = containsUrl(message);
      expect(hasUrl).toBe(false);

      const firstUrl = extractFirstUrl(message);
      expect(firstUrl).toBeNull();
    });

    it('extracts and processes multiple URLs', () => {
      const message = 'Visit https://site1.com and https://site2.org for more';

      const urls = extractUrls(message);
      expect(urls).toHaveLength(2);

      const firstUrl = extractFirstUrl(message);
      expect(firstUrl).toBe('https://site1.com');
    });
  });
});
