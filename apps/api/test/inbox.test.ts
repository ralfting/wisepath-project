import { randomUUID } from 'node:crypto';
import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { InboxItemId } from '@wisepath/domain/inbox';
import { useApp } from './app';

/**
 * The Inbox API, end to end: the real Nest app and Postgres, called through
 * the client generated from the contract.
 */

const { makeClient, signedIn: signUp, baseUrl } = useApp();
/** A new account, signed in */
const signedIn = Effect.map(signUp('Tester'), ({ client }) => client);

const iid = () => InboxItemId.make(randomUUID());

describe('inbox API', () => {
  it.effect('needs a session', () =>
    Effect.gen(function* () {
      const client = yield* makeClient;
      const error = yield* Effect.flip(client.inbox.list());
      assert.strictEqual(error._tag, 'NotAuthenticated');
    }),
  );

  it.effect('captures, lists newest first and deletes', () =>
    Effect.gen(function* () {
      const client = yield* signedIn;
      assert.deepStrictEqual(yield* client.inbox.list(), []);

      const first = yield* client.inbox.capture({ payload: { id: iid(), text: 'Guards run before pipes' } });
      const video = 'https://www.youtube.com/watch?v=abc';
      const second = yield* client.inbox.capture({
        payload: { id: iid(), text: video, url: video, title: 'A talk', videoTime: 85 },
      });
      assert.deepStrictEqual(
        [second.text, second.url, second.title, second.videoTime],
        [video, video, 'A talk', 85],
      );

      const listed = yield* client.inbox.list();
      assert.deepStrictEqual(
        listed.map((item) => item.id),
        [second.id, first.id],
      );
      assert.deepStrictEqual(listed[1], first);

      yield* client.inbox.discard({ params: { itemId: first.id } });
      // Deleting again (a retry) is fine
      yield* client.inbox.discard({ params: { itemId: first.id } });
      assert.deepStrictEqual(
        (yield* client.inbox.list()).map((item) => item.id),
        [second.id],
      );
    }),
  );

  it.effect('keeps one item when a capture is sent twice', () =>
    Effect.gen(function* () {
      const client = yield* signedIn;
      const id = iid();
      const made = yield* client.inbox.capture({ payload: { id, text: 'Once' } });
      const retried = yield* client.inbox.capture({ payload: { id, text: 'Once' } });
      assert.deepStrictEqual(retried, made);
      assert.strictEqual((yield* client.inbox.list()).length, 1);
    }),
  );

  it("refuses what isn't an item", async () => {
    const cookie = await fetch(`${baseUrl()}/auth/signup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'T', email: `i-${randomUUID()}@wisepath.test`, password: 'long-enough' }),
    }).then((r) => r.headers.get('set-cookie')!.split(';')[0]);
    for (const body of [{ id: 'x', text: '   ' }, { id: 'x', text: 'a', url: 'javascript:alert(1)' }, { text: 'no id' }]) {
      const response = await fetch(`${baseUrl()}/inbox`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie },
        body: JSON.stringify(body),
      });
      assert.strictEqual(response.status, 400, JSON.stringify(body));
      assert.strictEqual(((await response.json()) as { _tag: string })._tag, 'InvalidRequest');
    }
  });

  it.effect("never shows or deletes another learner's items", () =>
    Effect.gen(function* () {
      const alice = yield* signedIn;
      const bob = yield* signedIn;
      const item = yield* alice.inbox.capture({ payload: { id: iid(), text: 'Mine' } });

      assert.deepStrictEqual(yield* bob.inbox.list(), []);
      yield* bob.inbox.discard({ params: { itemId: item.id } });
      assert.strictEqual((yield* alice.inbox.list()).length, 1);
    }),
  );
});
