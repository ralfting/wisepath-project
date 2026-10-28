import { assert, describe, it } from '@effect/vitest';
import { Effect, Layer } from 'effect';
import { LinkNotPreviewable } from '@wisepath/domain/paths';
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

/** A fetcher that answers every URL with this page, and has no JSON for anyone */
const servesPage = (html: string, at: string) =>
  Layer.succeed(
    PageFetcher,
    PageFetcher.of({
      fetch: () => Effect.succeed({ html, url: new URL(at) }),
      fetchJson: () => Effect.fail(new LinkNotPreviewable({ reason: 'Not JSON' })),
    }),
  );

/** A fetcher whose every JSON request gets this answer, noting the addresses asked for; pages are never fetched */
const servesJson = (answer: Effect.Effect<unknown, LinkNotPreviewable>, asked: Array<string> = []) =>
  Layer.succeed(
    PageFetcher,
    PageFetcher.of({
      fetch: (url) => Effect.die(`fetched the page ${url}`),
      fetchJson: (url) => Effect.sync(() => asked.push(url)).pipe(Effect.andThen(answer)),
    }),
  );

const rickRoll = {
  title: 'Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)',
  author_name: 'Rick Astley',
  provider_name: 'YouTube',
  thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  type: 'video',
};
const oEmbedOfRickRoll =
  'https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ&format=json';
const youTubeWithoutTitle = {
  title: null,
  description: null,
  siteName: 'YouTube',
  favicon: 'https://www.youtube.com/favicon.ico',
};

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

  it.effect("reads a YouTube video's title from YouTube's oEmbed, whichever way its address is written", () =>
    Effect.gen(function* () {
      for (const url of [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s',
        'https://youtu.be/dQw4w9WgXcQ?si=share',
        'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtube.com/shorts/dQw4w9WgXcQ',
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
      ]) {
        const asked: Array<string> = [];
        const preview = yield* previewLink(url).pipe(Effect.provide(servesJson(Effect.succeed(rickRoll), asked)));
        assert.deepStrictEqual(asked, [oEmbedOfRickRoll], url);
        assert.deepStrictEqual(preview, { ...youTubeWithoutTitle, title: rickRoll.title }, url);
      }
    }),
  );

  it.effect('answers a YouTube video without a title when oEmbed has none for it', () =>
    Effect.gen(function* () {
      for (const answer of [
        Effect.fail(new LinkNotPreviewable({ reason: 'Status 401' })),
        Effect.succeed({ error: 'Not Found' }),
      ]) {
        const preview = yield* previewLink('https://www.youtube.com/watch?v=dQw4w9WgXcQ').pipe(
          Effect.provide(servesJson(answer)),
        );
        assert.deepStrictEqual(preview, youTubeWithoutTitle);
      }
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
