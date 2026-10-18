import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { outcomes, ownedMap, useApp } from './app';

/**
 * Deleting an account (docs/plans/18-delete-account.md): only with its password; everything it owns goes, the
 * people studying its paths are told, and paths from others stay theirs.
 */

const { signedIn, makeClient } = useApp();
const password = 'long-enough';

describe('deleting an account', () => {
  it.effect('refuses a wrong password and deletes nothing', () =>
    Effect.gen(function* () {
      const map = yield* ownedMap(signedIn);
      const refused = yield* outcomes([map.owner.auth.deleteMe({ payload: { password: 'not-it' } })]);
      assert.deepStrictEqual(refused, ['InvalidCredentials']);
      const path = yield* map.owner.paths.get({ params: { pathId: map.pathId } });
      assert.strictEqual(path.title, 'Rust');
    }),
  );

  it.effect('deletes it with all it owns, tells who studied its paths, and leaves paths from others', () =>
    Effect.gen(function* () {
      const map = yield* ownedMap(signedIn);
      const params = { pathId: map.pathId };
      yield* map.owner.paths.setVisibility({ params, payload: { visibility: 'public' } });
      const { client: taker } = yield* signedIn('Bob');
      yield* taker.paths.take({ params });

      // A path someone else owns and shared with the account being deleted
      const other = yield* ownedMap(signedIn);
      yield* other.owner.paths.share({ params: { pathId: other.pathId }, payload: { email: map.ownerEmail, role: 'editor' } });

      yield* map.owner.auth.deleteMe({ payload: { password } });

      assert.deepStrictEqual(yield* outcomes([map.owner.auth.me()]), ['NotAuthenticated']);
      const stranger = yield* makeClient;
      assert.deepStrictEqual(yield* outcomes([stranger.auth.login({ payload: { email: map.ownerEmail, password } })]), [
        'InvalidCredentials',
      ]);

      assert.deepStrictEqual(
        (yield* taker.notices.list()).map((n) => [n.pathTitle, n.reason]),
        [['Rust', 'deleted']],
      );
      assert.deepStrictEqual(yield* taker.paths.list(), []);

      const kept = yield* other.owner.paths.get({ params: { pathId: other.pathId } });
      assert.strictEqual(kept.title, 'Rust');
      assert.deepStrictEqual((yield* other.owner.paths.shares({ params: { pathId: other.pathId } })).people, []);
    }),
  );
});
