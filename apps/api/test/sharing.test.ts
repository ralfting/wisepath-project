import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { Email } from '@wisepath/domain/auth';
import { outcomes, ownedMap, useApp } from './app';
import type { Client, OwnedMap } from './app';

/**
 * Sharing a path (docs/plans/14-public-and-shared-paths.md): the owner invites people by email and makes the path
 * public; anyone may take a public path to study it with their own marks, and leave it. What each one may then do
 * is in access.test.ts.
 */

const { makeClient, signedIn } = useApp();

const studiedIn = (client: Client, map: OwnedMap) =>
  Effect.map(client.paths.get({ params: { pathId: map.pathId } }), (path) => path.pages.find((p) => p.id === map.pageId)?.studied);

const markStudied = (client: Client, map: OwnedMap) =>
  client.paths.updatePage({ params: { pathId: map.pathId, pageId: map.pageId }, payload: { studied: true } });

describe('sharing a path', () => {
  it.effect('invites by email, changes the role, and refuses what makes no sense', () =>
    Effect.gen(function* () {
      const map = yield* ownedMap(signedIn);
      const { email, user } = yield* signedIn('Bob');
      const params = { pathId: map.pathId };

      const invited = yield* map.owner.paths.share({ params, payload: { email, role: 'viewer' } });
      assert.deepStrictEqual([invited.userId, invited.name, invited.role], [user.id, 'Bob', 'viewer']);
      // Sharing again changes the role, it does not add the person twice
      yield* map.owner.paths.share({ params, payload: { email, role: 'editor' } });
      const shares = yield* map.owner.paths.shares({ params });
      assert.deepStrictEqual(
        shares.map((s) => [s.name, s.role]),
        [['Bob', 'editor']],
      );

      const refused = yield* outcomes([
        map.owner.paths.share({ params, payload: { email: Email.make('nobody@wisepath.test'), role: 'viewer' } }),
        map.owner.paths.share({ params, payload: { email: map.ownerEmail, role: 'viewer' } }),
      ]);
      assert.deepStrictEqual(refused, ['ShareTargetNotFound', 'CannotShareWithSelf']);
    }),
  );

  it.effect('leaves sharing to the owner: a member neither lists, invites nor removes others', () =>
    Effect.gen(function* () {
      const map = yield* ownedMap(signedIn);
      const { client: editor, email } = yield* signedIn('Cy');
      const { email: otherEmail, user: other } = yield* signedIn('Dee');
      const params = { pathId: map.pathId };
      yield* map.owner.paths.share({ params, payload: { email, role: 'editor' } });
      yield* map.owner.paths.share({ params, payload: { email: otherEmail, role: 'viewer' } });

      const tried = yield* outcomes([
        editor.paths.shares({ params }),
        editor.paths.share({ params, payload: { email: otherEmail, role: 'editor' } }),
        editor.paths.unshare({ params: { ...params, userId: other.id } }),
        editor.paths.setVisibility({ params, payload: { visibility: 'public' } }),
      ]);
      assert.deepStrictEqual(tried, Array(4).fill('PathNotFound'));
      assert.deepStrictEqual(
        (yield* map.owner.paths.shares({ params })).map((s) => [s.name, s.role]),
        [
          ['Cy', 'editor'],
          ['Dee', 'viewer'],
        ],
      );
    }),
  );

  it.effect('lets a member leave, taking their marks with them, and the owner remove them', () =>
    Effect.gen(function* () {
      const map = yield* ownedMap(signedIn);
      const { client: reader, email, user } = yield* signedIn('Bob');
      const { email: otherEmail, user: other } = yield* signedIn('Eve');
      const params = { pathId: map.pathId };
      yield* map.owner.paths.share({ params, payload: { email, role: 'viewer' } });
      yield* map.owner.paths.share({ params, payload: { email: otherEmail, role: 'viewer' } });
      yield* markStudied(reader, map);

      yield* reader.paths.unshare({ params: { ...params, userId: user.id } });
      assert.deepStrictEqual(yield* reader.paths.list(), []);
      // Invited again, they start with no marks
      yield* map.owner.paths.share({ params, payload: { email, role: 'viewer' } });
      assert.isFalse(yield* studiedIn(reader, map));

      yield* map.owner.paths.unshare({ params: { ...params, userId: other.id } });
      assert.deepStrictEqual(
        (yield* map.owner.paths.shares({ params })).map((s) => s.name),
        ['Bob'],
      );
    }),
  );
});

describe('a public path', () => {
  it.effect('is taken to study with your own marks, never listed to the owner, and gone once private', () =>
    Effect.gen(function* () {
      const map = yield* ownedMap(signedIn);
      const { client: taker } = yield* signedIn('Gil');
      const { client: invited, email } = yield* signedIn('Hal');
      const params = { pathId: map.pathId };
      yield* map.owner.paths.share({ params, payload: { email, role: 'viewer' } });

      // A private path can't be taken
      assert.deepStrictEqual(yield* outcomes([taker.paths.take({ params })]), ['PathNotFound']);

      yield* map.owner.paths.setVisibility({ params, payload: { visibility: 'public' } });
      yield* taker.paths.take({ params });
      yield* taker.paths.take({ params });
      const [taken] = yield* taker.paths.list();
      assert.deepStrictEqual([taken.id, taken.access, taken.projectId, taken.ownerName], [map.pathId, 'viewer', null, 'Ada']);
      yield* markStudied(taker, map);
      assert.isTrue(yield* studiedIn(taker, map));
      assert.isFalse(yield* studiedIn(map.owner, map));
      assert.deepStrictEqual(
        (yield* map.owner.paths.shares({ params })).map((s) => s.name),
        ['Hal'],
      );

      // Private again: the taker loses it and their marks, the invited person keeps it
      yield* map.owner.paths.setVisibility({ params, payload: { visibility: 'private' } });
      assert.deepStrictEqual(yield* taker.paths.list(), []);
      assert.strictEqual((yield* invited.paths.list())[0]?.id, map.pathId);
      yield* map.owner.paths.setVisibility({ params, payload: { visibility: 'public' } });
      yield* taker.paths.take({ params });
      assert.isFalse(yield* studiedIn(taker, map));

      // Taking your own path changes nothing
      yield* map.owner.paths.take({ params });
      assert.strictEqual((yield* map.owner.paths.get({ params })).access, 'owner');
    }),
  );

  it.effect('is read without an account, with no one\'s marks, and not found once private', () =>
    Effect.gen(function* () {
      const map = yield* ownedMap(signedIn);
      const visitor = yield* makeClient;
      const params = { pathId: map.pathId };
      yield* markStudied(map.owner, map);

      assert.deepStrictEqual(yield* outcomes([visitor.publicPaths.get({ params })]), ['PathNotFound']);
      yield* map.owner.paths.setVisibility({ params, payload: { visibility: 'public' } });

      const read = yield* visitor.publicPaths.get({ params });
      assert.deepStrictEqual(
        [read.title, read.access, read.pages.some((p) => p.studied)],
        ['Rust', 'viewer', false],
      );
      // The signed-in endpoints still need a session
      assert.deepStrictEqual(yield* outcomes([visitor.paths.get({ params })]), ['NotAuthenticated']);
    }),
  );
});
