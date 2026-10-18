import { assert, describe, it } from '@effect/vitest';
import { Effect, Layer } from 'effect';
import { previewLink } from '../src/links/application/links';
import { PageFetcher } from '../src/links/application/PageFetcher';
import { useApp } from './app';

/**
 * Link previews: what is read from a page (with a stand-in fetcher), and the
 * real endpoint refusing what it must never fetch.
 */

const { makeClient, signedIn: signUp } = useApp();
/** A new account, signed in */
const signedIn = Effect.map(signUp('Tester'), ({ client }) => client);

/** A fetcher that answers every URL with this page */
const servesPage = (html: string, at: string) =>
  Layer.succeed(PageFetcher, PageFetcher.of({ fetch: () => Effect.succeed({ html, url: new URL(at) }) }));

describe('link previews', () => {
  it.effect('reads Open Graph tags, then falls back to the title and host', () =>
    Effect.gen(function* () {
      const og = yield* previewLink('https://docs.nestjs.com/guards').pipe(
        Effect.provide(
          servesPage(
            `<head><title>Ignored</title>
              <meta property="og:title" content="Guards &amp; you">
              <meta content="Who may pass" name="description">
              <meta property="og:site_name" content="NestJS">
              <link rel="icon" href="/favicon.png"></head>`,
            'https://docs.nestjs.com/guards',
          ),
        ),
      );
      assert.deepStrictEqual(og, {
        title: 'Guards & you',
        description: 'Who may pass',
        siteName: 'NestJS',
        favicon: 'https://docs.nestjs.com/favicon.png',
      });

      const plain = yield* previewLink('https://www.example.org/').pipe(
        Effect.provide(servesPage('<title> Just   a title </title>', 'https://www.example.org/')),
      );
      assert.deepStrictEqual(plain, {
        title: 'Just a title',
        description: null,
        siteName: 'example.org',
        favicon: 'https://www.example.org/favicon.ico',
      });
    }),
  );

  it.effect('needs a session', () =>
    Effect.gen(function* () {
      const client = yield* makeClient;
      const error = yield* Effect.flip(client.links.preview({ query: { url: 'https://example.org' } }));
      assert.strictEqual(error._tag, 'NotAuthenticated');
    }),
  );

  it.effect('never fetches private addresses or other schemes', () =>
    Effect.gen(function* () {
      const client = yield* signedIn;
      for (const url of [
        'http://127.0.0.1:3001/api',
        'http://localhost/',
        'http://169.254.169.254/latest/meta-data',
        'http://[::1]/',
        'http://10.0.0.1/',
        'file:///etc/passwd',
        'https://user:secret@example.org/',
        'not a url',
      ]) {
        const error = yield* Effect.flip(client.links.preview({ query: { url } }));
        assert.strictEqual(error._tag, 'LinkNotPreviewable', url);
      }
    }),
  );
});
