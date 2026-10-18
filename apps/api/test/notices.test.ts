import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { ownedMap, useApp } from './app';
import type { Client } from './app';

/**
 * Notices of a path lost without choosing to (docs/plans/14-public-and-shared-paths.md): its owner made it private,
 * stopped sharing it, or deleted it. Each learner who lost it gets one, shown once and then dismissed.
 */

const { signedIn } = useApp();

const reasons = (client: Client) =>
  Effect.map(client.notices.list(), (notices) => notices.map((n) => [n.pathTitle, n.ownerName, n.reason]));

describe('access notices', () => {
  it.effect('tells whoever took a path that it went private, once', () =>
    Effect.gen(function* () {
      const map = yield* ownedMap(signedIn);
      const { client: taker } = yield* signedIn('Gil');
      const params = { pathId: map.pathId };
      yield* map.owner.paths.setVisibility({ params, payload: { visibility: 'public' } });
      yield* taker.paths.take({ params });
      yield* map.owner.paths.setVisibility({ params, payload: { visibility: 'private' } });

      const [notice] = yield* taker.notices.list();
      assert.deepStrictEqual(yield* reasons(taker), [['Rust', 'Ada', 'private']]);
      yield* taker.notices.dismiss({ params: { noticeId: notice.id } });
      yield* taker.notices.dismiss({ params: { noticeId: notice.id } });
      assert.deepStrictEqual(yield* reasons(taker), []);
      // The owner made the change: nothing for them
      assert.deepStrictEqual(yield* reasons(map.owner), []);
    }),
  );

  it.effect('tells someone the owner removed, never someone who left', () =>
    Effect.gen(function* () {
      const map = yield* ownedMap(signedIn);
      const { client: removed, email, user } = yield* signedIn('Bob');
      const { client: leaver, email: leaverEmail } = yield* signedIn('Cy');
      const params = { pathId: map.pathId };
      yield* map.owner.paths.share({ params, payload: { email, role: 'viewer' } });
      yield* map.owner.paths.share({ params, payload: { email: leaverEmail, role: 'viewer' } });

      yield* map.owner.paths.unshare({ params: { ...params, userId: user.id } });
      yield* leaver.paths.leave({ params });
      assert.deepStrictEqual([yield* reasons(removed), yield* reasons(leaver)], [[['Rust', 'Ada', 'removed']], []]);
    }),
  );

  it.effect("tells every member a deleted path is gone, and nobody can dismiss someone else's notice", () =>
    Effect.gen(function* () {
      const map = yield* ownedMap(signedIn);
      const { client: editor, email } = yield* signedIn('Dee');
      const { client: taker } = yield* signedIn('Eve');
      const params = { pathId: map.pathId };
      yield* map.owner.paths.share({ params, payload: { email, role: 'editor' } });
      yield* map.owner.paths.setVisibility({ params, payload: { visibility: 'public' } });
      yield* taker.paths.take({ params });

      // Someone else deleting it changes nothing, and tells nobody
      yield* editor.paths.remove({ params });
      assert.deepStrictEqual(yield* reasons(taker), []);

      yield* map.owner.paths.remove({ params });
      assert.deepStrictEqual([yield* reasons(editor), yield* reasons(taker)], [[['Rust', 'Ada', 'deleted']], [['Rust', 'Ada', 'deleted']]]);

      const [notice] = yield* taker.notices.list();
      yield* editor.notices.dismiss({ params: { noticeId: notice.id } });
      assert.strictEqual((yield* taker.notices.list()).length, 1);
    }),
  );
});
