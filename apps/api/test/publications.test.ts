import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { adminOf, outcomes, ownedMap, useApp } from './app';
import type { OwnedMap } from './app';

/**
 * Publishing a map to the catalog (docs/plans/19-publish-to-the-catalog.md): its owner asks, an administrator
 * (ADMIN_EMAILS, set in vitest.config.mts) approves or declines; the map keeps its visibility until then.
 */

const { makeClient, signedIn } = useApp();

const admin = adminOf(makeClient);

const request = { description: 'Testing React by behaviour', audience: 'Frontend developers', language: 'pt-BR' } as const;

const ask = (map: OwnedMap) => map.owner.paths.requestPublication({ params: { pathId: map.pathId }, payload: request });
const read = (map: OwnedMap) => map.owner.paths.get({ params: { pathId: map.pathId } });

describe('publishing a map to the catalog', () => {
  it.effect('lets only the owner ask, and keeps the visibility while the request waits', () =>
    Effect.gen(function* () {
      const map = yield* ownedMap(signedIn);
      const { client: stranger } = yield* signedIn('Eve');
      const refused = yield* outcomes([stranger.paths.requestPublication({ params: { pathId: map.pathId }, payload: request })]);
      assert.deepStrictEqual(refused, ['PathNotFound']);

      yield* ask(map);
      const path = yield* read(map);
      assert.deepStrictEqual(
        [path.visibility, path.publication, path.description, path.audience, path.language],
        ['private', 'pending', request.description, request.audience, request.language],
      );
    }),
  );

  it.effect('answers anyone but an administrator as if there were nothing there', () =>
    Effect.gen(function* () {
      const map = yield* ownedMap(signedIn);
      yield* ask(map);
      const params = { pathId: map.pathId };
      const refused = yield* outcomes([
        map.owner.admin.publications(),
        map.owner.admin.approve({ params }),
        map.owner.admin.decline({ params }),
      ]);
      assert.deepStrictEqual(refused, ['NotAdmin', 'NotAdmin', 'NotAdmin']);
    }),
  );

  it.effect('publishes on approval, readable without an account, and decides a request only once', () =>
    Effect.gen(function* () {
      const map = yield* ownedMap(signedIn);
      yield* ask(map);
      const reviewer = yield* admin;

      const pending = (yield* reviewer.admin.publications()).find((p) => p.pathId === map.pathId);
      assert.deepStrictEqual(
        [pending?.title, pending?.pages, pending?.ownerEmail, pending?.language],
        ['Rust', 2, map.ownerEmail, 'pt-BR'],
      );

      yield* reviewer.admin.approve({ params: { pathId: map.pathId } });
      const path = yield* read(map);
      assert.deepStrictEqual([path.visibility, path.publication], ['published', undefined]);
      const anonymous = yield* makeClient;
      assert.strictEqual((yield* anonymous.publicPaths.get({ params: { pathId: map.pathId } })).title, 'Rust');
      assert.deepStrictEqual(yield* outcomes([reviewer.admin.approve({ params: { pathId: map.pathId } })]), ['PathNotFound']);
    }),
  );

  it.effect('keeps the visibility when declined, and the owner may ask again', () =>
    Effect.gen(function* () {
      const map = yield* ownedMap(signedIn);
      yield* ask(map);
      yield* (yield* admin).admin.decline({ params: { pathId: map.pathId } });
      assert.deepStrictEqual([(yield* read(map)).visibility, (yield* read(map)).publication], ['private', 'declined']);

      yield* ask(map);
      assert.strictEqual((yield* read(map)).publication, 'pending');
    }),
  );

  it.effect('unpublishing leaves the map readable by its link, and its learners keep it', () =>
    Effect.gen(function* () {
      const map = yield* ownedMap(signedIn);
      const params = { pathId: map.pathId };
      yield* ask(map);
      yield* (yield* admin).admin.approve({ params });
      const { client: taker } = yield* signedIn('Bob');
      yield* taker.paths.take({ params });

      yield* map.owner.paths.withdrawPublication({ params });
      assert.strictEqual((yield* read(map)).visibility, 'public');
      assert.deepStrictEqual((yield* taker.paths.list()).map((p) => p.title), ['Rust']);
    }),
  );

  it.effect('making the map private drops its request', () =>
    Effect.gen(function* () {
      const map = yield* ownedMap(signedIn);
      yield* ask(map);
      yield* map.owner.paths.setVisibility({ params: { pathId: map.pathId }, payload: { visibility: 'private' } });
      assert.strictEqual((yield* read(map)).publication, undefined);
      const waiting = yield* (yield* admin).admin.publications();
      assert.isFalse(waiting.some((p) => p.pathId === map.pathId));
    }),
  );

  it.effect('gives maps of the same title approved at the same time an address each', () =>
    Effect.gen(function* () {
      const reviewer = yield* admin;
      const maps = yield* Effect.all(Array.from({ length: 6 }, () => ownedMap(signedIn)), { concurrency: 'unbounded' });
      yield* Effect.all(maps.map(ask), { concurrency: 'unbounded' });
      yield* Effect.all(
        maps.map((map) => reviewer.admin.approve({ params: { pathId: map.pathId } })),
        { concurrency: 'unbounded' },
      );
      const slugs = yield* Effect.all(maps.map((map) => Effect.map(read(map), (path) => path.slug)));
      assert.strictEqual(new Set(slugs).size, maps.length);
    }));

  it.effect('gives a published map its address from its title, unique, and reads it there without an account', () =>
    Effect.gen(function* () {
      const reviewer = yield* admin;
      const publish = (map: OwnedMap) =>
        Effect.gen(function* () {
          yield* ask(map);
          yield* reviewer.admin.approve({ params: { pathId: map.pathId } });
          return (yield* read(map)).slug!;
        });
      const first = yield* ownedMap(signedIn);
      const second = yield* ownedMap(signedIn);
      const [one, two] = [yield* publish(first), yield* publish(second)];
      assert.match(one, /^rust(-\d+)?$/);
      assert.strictEqual(two, one === 'rust' ? 'rust-2' : `rust-${Number(one.split('-')[1]) + 1}`);

      const anonymous = yield* makeClient;
      const path = yield* anonymous.catalog.get({ params: { slug: two } });
      assert.deepStrictEqual([path.id, path.visibility, path.access], [second.pathId, 'published', 'viewer']);

      // The catalog lists it with what its card shows and its page, and anyone may read the list
      const listed = (yield* anonymous.catalog.list({ query: {} })).find((entry) => entry.slug === two);
      assert.deepStrictEqual(listed?.pages.map((page) => page.slug), ['borrowing']);
      assert.deepStrictEqual([listed?.title, listed?.audience, listed?.language], ['Rust', request.audience, request.language]);
      // Searched by words in what it teaches, ignoring case and accents, and by its language
      const found = (query: { q?: string; language?: 'en' | 'pt-BR' }) =>
        Effect.map(anonymous.catalog.list({ query }), (entries) => entries.some((entry) => entry.slug === two));
      assert.deepStrictEqual(
        [yield* found({ q: 'TESTING react' }), yield* found({ q: 'python' }), yield* found({ language: 'pt-BR' }), yield* found({ language: 'en' })],
        [true, false, true, false],
      );

      // Out of the catalog, its address finds nothing; nor does one never given
      yield* second.owner.paths.withdrawPublication({ params: { pathId: second.pathId } });
      const gone = yield* outcomes([anonymous.catalog.get({ params: { slug: two } }), anonymous.catalog.get({ params: { slug: 'nowhere' } })]);
      assert.deepStrictEqual(gone, ['PathNotFound', 'PathNotFound']);
    }),
  );
});
