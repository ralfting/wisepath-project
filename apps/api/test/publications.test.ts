import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { Email } from '@wisepath/domain/auth';
import { outcomes, ownedMap, useApp } from './app';
import type { OwnedMap } from './app';

/**
 * Publishing a map to the catalog (docs/plans/19-publish-to-the-catalog.md): its owner asks, an administrator
 * (ADMIN_EMAILS, set in vitest.config.mts) approves or declines; the map keeps its visibility until then.
 */

const { makeClient, signedIn } = useApp();

/** The administrator's session; the account is made once and logged into after that */
const admin = Effect.gen(function* () {
  const client = yield* makeClient;
  const credentials = { email: Email.make('admin@wisepath.test'), password: 'long-enough' };
  yield* client.auth.signup({ payload: { name: 'Admin', ...credentials } }).pipe(
    Effect.catchTag('EmailAlreadyRegistered', () => client.auth.login({ payload: credentials })),
  );
  return client;
});

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
});
