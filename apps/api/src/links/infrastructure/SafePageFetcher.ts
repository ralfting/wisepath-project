import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { Effect, Layer } from 'effect';
import { LinkNotPreviewable } from '@wisepath/domain/paths';
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

/** Reads at most MAX_BYTES of the body: a page's <head> or a small JSON answer is all we need */
const readStart = (response: Response) =>
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

/** Requests a public address with these headers, checking again at every redirect */
const send = Effect.fn('PageFetcher.send')(function* (start: string, accept: string) {
  let url = yield* publicUrl(start);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const target = url;
    const response = yield* Effect.tryPromise({
      try: (signal) =>
        fetch(target, {
          redirect: 'manual',
          signal: AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)]),
          headers: { 'user-agent': 'WisePathLinkPreview/1.0', accept },
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
    return { response, url };
  }

  return yield* fail('Too many redirects');
});

const fetchPage = Effect.fn('PageFetcher.fetch')(function* (start: string) {
  const { response, url } = yield* send(start, 'text/html');
  if (!(response.headers.get('content-type') ?? '').includes('text/html')) return yield* fail('Not HTML');

  return { html: yield* readStart(response), url };
});

const fetchJson = Effect.fn('PageFetcher.fetchJson')(function* (start: string) {
  const { response } = yield* send(start, 'application/json');
  if (!(response.headers.get('content-type') ?? '').includes('application/json')) return yield* fail('Not JSON');

  const body = yield* readStart(response);
  return yield* Effect.try({
    try: (): unknown => JSON.parse(body),
    catch: () => new LinkNotPreviewable({ reason: 'Invalid JSON' }),
  });
});

export const SafePageFetcher = Layer.succeed(PageFetcher, PageFetcher.of({ fetch: fetchPage, fetchJson }));
