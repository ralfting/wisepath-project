import { assert, layer } from '@effect/vitest';
import { Effect } from 'effect';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { NoteId } from '@wisepath/domain/paths';
import type { NoteText, PathId } from '@wisepath/domain/paths';
import { Database } from '../src/shared/infrastructure/database/Database';
import { pageNotes } from '../src/shared/infrastructure/database/schema';
import { TestDatabase, adminOf, outcomes, ownedMap, useApp } from './app';
import type { Client, OwnedMap } from './app';

/**
 * My notes on a page (docs/plans/21-page-notes.md): each reader's own, like their studied marks. Nobody else reads
 * them, a public link and the catalog carry none, and they go with the page or with the reader's access.
 */

const { makeClient, signedIn } = useApp();

const pageIn = (client: Client, map: OwnedMap) =>
  Effect.map(client.paths.get({ params: { pathId: map.pathId } }), (path) => path.pages.find((p) => p.id === map.pageId)!);

const writeNote = (client: Client, map: OwnedMap, noteId: NoteId, text: NoteText) =>
  client.paths.writeNote({ params: { pathId: map.pathId, pageId: map.pageId, noteId }, payload: text });

const newNoteId = () => NoteId.make(randomUUID());

/** The bodies of the notes stored on the map, as the database has them */
const storedNotes = (pathId: PathId) =>
  Effect.gen(function* () {
    const { db, run } = yield* Database;
    const rows = yield* run(db.select().from(pageNotes).where(eq(pageNotes.pathId, pathId)));
    return rows.map((row) => row.body).sort();
  });

/** Ada's map, public, and Bob who took it */
const publicMapWithTaker = Effect.gen(function* () {
  const map = yield* ownedMap(signedIn);
  const { client: taker } = yield* signedIn('Bob');
  yield* map.owner.paths.setVisibility({ params: { pathId: map.pathId }, payload: { visibility: 'public' } });
  yield* taker.paths.take({ params: { pathId: map.pathId } });
  return { map, taker };
});

layer(TestDatabase)('notes on a page', (it) => {
  it.effect('gives each reader their own notes on the same page, leaving the page as it was', () =>
    Effect.gen(function* () {
      const { map, taker } = yield* publicMapWithTaker;
      const before = yield* pageIn(map.owner, map);
      const quote = { exact: 'Borrowing', prefix: '', suffix: '' };

      yield* writeNote(map.owner, map, newNoteId(), { quote, body: 'Lifetimes next' });
      yield* writeNote(taker, map, newNoteId(), { body: 'Ask about `&mut`' });

      const [owners, takers] = [yield* pageIn(map.owner, map), yield* pageIn(taker, map)];
      assert.deepStrictEqual(
        [owners.notes?.map((n) => [n.quote, n.body]), takers.notes?.map((n) => [n.quote, n.body])],
        [[[quote, 'Lifetimes next']], [[undefined, 'Ask about `&mut`']]],
      );
      assert.deepStrictEqual([owners.content, owners.updatedAt], [before.content, before.updatedAt]);
      const { client: stranger } = yield* signedIn('Eve');
      assert.strictEqual((yield* pageIn(stranger, map)).notes, undefined);
    }),
  );

  it.effect('rewrites a note sent again under its id, and deletes it', () =>
    Effect.gen(function* () {
      const map = yield* ownedMap(signedIn);
      const noteId = newNoteId();
      yield* writeNote(map.owner, map, noteId, { body: 'Draft' });
      yield* writeNote(map.owner, map, noteId, { body: 'Final' });
      yield* writeNote(map.owner, map, noteId, { body: 'Final' });
      const [written] = (yield* pageIn(map.owner, map)).notes!;
      assert.deepStrictEqual([written.id, written.body], [noteId, 'Final']);
      assert.deepStrictEqual(yield* storedNotes(map.pathId), ['Final']);

      const remove = map.owner.paths.removeNote({ params: { pathId: map.pathId, pageId: map.pageId, noteId } });
      assert.deepStrictEqual(yield* outcomes([remove, remove]), ['ok', 'ok']);
      assert.strictEqual((yield* pageIn(map.owner, map)).notes, undefined);
    }),
  );

  it.effect('never sends notes with a public link or the catalog', () =>
    Effect.gen(function* () {
      const map = yield* ownedMap(signedIn);
      const params = { pathId: map.pathId };
      yield* writeNote(map.owner, map, newNoteId(), { body: 'Mine only' });
      yield* map.owner.paths.requestPublication({
        params,
        payload: { description: 'Rust by its borrow checker', audience: 'Rust beginners', language: 'en' },
      });
      yield* (yield* adminOf(makeClient)).admin.approve({ params });
      const slug = (yield* map.owner.paths.get({ params })).slug!;

      const anonymous = yield* makeClient;
      const linked = yield* anonymous.publicPaths.get({ params });
      const listed = yield* anonymous.catalog.get({ params: { slug } });
      assert.deepStrictEqual(
        [...linked.pages, ...listed.pages].map((page) => page.notes),
        [undefined, undefined, undefined, undefined],
      );
    }),
  );

  it.effect('drops notes when their page goes and when their reader loses the path', () =>
    Effect.gen(function* () {
      const { map, taker } = yield* publicMapWithTaker;
      const { client: invited, email } = yield* signedIn('Cy');
      const params = { pathId: map.pathId };
      yield* map.owner.paths.share({ params, payload: { email, role: 'viewer' } });
      yield* writeNote(map.owner, map, newNoteId(), { body: "Ada's" });
      yield* writeNote(taker, map, newNoteId(), { body: "Bob's" });
      yield* writeNote(invited, map, newNoteId(), { body: "Cy's" });

      yield* invited.paths.leave({ params });
      assert.deepStrictEqual(yield* storedNotes(map.pathId), ["Ada's", "Bob's"]);
      // Private again: the taker loses the path, the owner keeps hers
      yield* map.owner.paths.setVisibility({ params, payload: { visibility: 'private' } });
      assert.deepStrictEqual(yield* storedNotes(map.pathId), ["Ada's"]);

      yield* map.owner.paths.removePage({ params: { ...params, pageId: map.pageId } });
      assert.deepStrictEqual(yield* storedNotes(map.pathId), []);
    }),
  );

  it.effect('keeps someone who cannot read the path from writing on it', () =>
    Effect.gen(function* () {
      const map = yield* ownedMap(signedIn);
      const { client: stranger } = yield* signedIn('Eve');
      const tried = yield* outcomes([writeNote(stranger, map, newNoteId(), { body: 'Hi' })]);
      assert.deepStrictEqual(tried, ['PathNotFound']);
    }),
  );
});
