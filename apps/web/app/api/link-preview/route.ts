import { NextResponse } from 'next/server';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * GET /api/link-preview?url=<https url>
 * Returns { title, description, siteName, favicon } read from a page's meta tags.
 * Fetches user-supplied URLs, so it only allows public http(s) hosts,
 * caps time and size, and never follows redirects to private addresses.
 */

export const runtime = 'nodejs';

const TIMEOUT_MS = 5000;
const MAX_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;

function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const a = address.toLowerCase();
    if (a === '::1' || a === '::') return true;
    if (a.startsWith('fc') || a.startsWith('fd') || a.startsWith('fe80')) return true;
    const mapped = a.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isPrivateAddress(mapped[1]) : false;
  }
  const [a, b] = address.split('.').map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

async function assertPublicUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Only http and https links');
  if (url.username || url.password) throw new Error('Credentials in URL');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) throw new Error('Private host');
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error('Private host');
  }
  return url;
}

async function fetchHtml(start: string): Promise<{ html: string; url: URL }> {
  let url = await assertPublicUrl(start);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': 'WisePathLinkPreview/1.0', accept: 'text/html' },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Redirect without location');
      url = await assertPublicUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) throw new Error(`Status ${response.status}`);
    if (!(response.headers.get('content-type') ?? '').includes('text/html')) throw new Error('Not HTML');

    // Read at most MAX_BYTES; the <head> is all we need
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Empty body');
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
    }
    await reader.cancel().catch(() => undefined);
    return { html: Buffer.concat(chunks).toString('utf8'), url };
  }
  throw new Error('Too many redirects');
}

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

function metaContent(html: string, keys: string[]): string | null {
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

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('url');
  if (!raw) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  try {
    const { html, url } = await fetchHtml(raw);
    const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
    const iconHref = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*href=["']([^"']+)["']/i)?.[1];
    const favicon = new URL(iconHref ?? '/favicon.ico', url);

    return NextResponse.json(
      {
        title: metaContent(html, ['og:title', 'twitter:title']) ?? (titleTag ? decodeEntities(titleTag) : null),
        description: metaContent(html, ['og:description', 'description', 'twitter:description']),
        siteName: metaContent(html, ['og:site_name']) ?? url.hostname.replace(/^www\./, ''),
        favicon: favicon.protocol === 'https:' || favicon.protocol === 'http:' ? favicon.toString() : null,
      },
      { headers: { 'cache-control': 'public, max-age=86400' } },
    );
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Preview failed' }, { status: 422 });
  }
}
