import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { Effect, Layer } from 'effect';
import { LinkNotPreviewable } from '@wisepath/domain/projects';
import { PageFetcher } from '../application/PageFetcher';

/**
 * Fetches user-supplied URLs, so it only allows public http(s) hosts, caps
 * time and size, and never follows redirects to private addresses.
 */

const TIMEOUT_MS = 5000;
const MAX_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;

const fail = (reason: string) => Effect.fail(new LinkNotPreviewable({ reason }));

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

const publicUrl = Effect.fn('PageFetcher.publicUrl')(function* (raw: string, base?: URL) {
  const url = yield* Effect.try({
    try: () => new URL(raw, base),
    catch: () => new LinkNotPreviewable({ reason: 'Invalid url' }),
  });
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return yield* fail('Only http and https links');
  if (url.username || url.password) return yield* fail('Credentials in URL');

  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) {
    return yield* fail('Private host');
  }

  const addresses = isIP(host)
    ? [{ address: host }]
    : yield* Effect.tryPromise({
        try: () => lookup(host, { all: true }),
        catch: () => new LinkNotPreviewable({ reason: 'Unknown host' }),
      });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    return yield* fail('Private host');
  }

  return url;
});

/** Reads at most MAX_BYTES of the body; the <head> is all we need */
const readHead = (response: Response) =>
  Effect.tryPromise({
    try: async () => {
      const reader = response.body?.getReader();
      if (!reader) return '';

      const chunks: Array<Uint8Array> = [];
      let size = 0;
      while (size < MAX_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        size += value.length;
      }

      await reader.cancel().catch(() => undefined);
      return Buffer.concat(chunks).toString('utf8');
    },
    catch: () => new LinkNotPreviewable({ reason: 'Body unreadable' }),
  });

const fetchPage = Effect.fn('PageFetcher.fetch')(function* (start: string) {
  let url = yield* publicUrl(start);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const target = url;
    const response = yield* Effect.tryPromise({
      try: (signal) =>
        fetch(target, {
          redirect: 'manual',
          signal: AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)]),
          headers: { 'user-agent': 'WisePathLinkPreview/1.0', accept: 'text/html' },
        }),
      catch: () => new LinkNotPreviewable({ reason: 'Fetch failed' }),
    });

    // Every redirect is checked again, so a public page can't send us to a private one
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) return yield* fail('Redirect without location');

      url = yield* publicUrl(location, url);
      continue;
    }

    if (!response.ok) return yield* fail(`Status ${response.status}`);
    if (!(response.headers.get('content-type') ?? '').includes('text/html')) return yield* fail('Not HTML');

    return { html: yield* readHead(response), url };
  }

  return yield* fail('Too many redirects');
});

export const SafePageFetcher = Layer.succeed(PageFetcher, PageFetcher.of({ fetch: fetchPage }));
