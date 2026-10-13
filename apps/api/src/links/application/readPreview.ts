import type { LinkPreview } from '@wisepath/domain/projects';

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

function metaContent(html: string, keys: Array<string>): string | null {
  for (const key of keys) {
    const pattern = new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`,
      'i',
    );
    const match = html.match(pattern);
    const value = match?.[1] ?? match?.[2];
    if (value) return decodeEntities(value);
  }

  return null;
}

/** Reads title, description, site name and favicon from the page's HTML */
export function readPreview(html: string, url: URL): LinkPreview {
  const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
  const iconHref = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*href=["']([^"']+)["']/i)?.[1];
  const favicon = new URL(iconHref ?? '/favicon.ico', url);

  return {
    title: metaContent(html, ['og:title', 'twitter:title']) ?? (titleTag ? decodeEntities(titleTag) : null),
    description: metaContent(html, ['og:description', 'description', 'twitter:description']),
    siteName: metaContent(html, ['og:site_name']) ?? url.hostname.replace(/^www\./, ''),
    favicon: favicon.protocol === 'https:' || favicon.protocol === 'http:' ? favicon.toString() : null,
  };
}
