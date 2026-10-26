import { assert, layer } from '@effect/vitest';
import { Effect } from 'effect';
import { eq } from 'drizzle-orm';
import type { PathId } from '@wisepath/domain/paths';
import { Database } from '../src/shared/infrastructure/database/Database';
import { pageNotes } from '../src/shared/infrastructure/database/schema';
import { TestDatabase, adminOf, ownedMap, useApp } from './app';
import type { Client, OwnedMap } from './app';

/**
 * My notes on a page (docs/plans/21-page-notes.md): each reader's own, like their studied marks. Nobody else reads
 * them, a public link and the catalog carry none, and they go with the page or with the reader's access.
 */

const { makeClient, signedIn } = useApp();

const pageIn = (client: Client, map: OwnedMap) =>
  Effect.map(client.paths.get({ params: { pathId: map.pathId } }), (path) => path.pages.find((p) => p.id === map.pageId)!);

const writeNotes = (client: Client, map: OwnedMap, notes: string) =>
  client.paths.updatePage({ params: { pathId: map.pathId, pageId: map.pageId }, payload: { notes } });

/** Whose notes are stored on the map, as the database has them */
const storedNotes = (pathId: PathId) =>
  Effect.gen(function* () {
    const { db, run } = yield* Database;
    const rows = yield* run(db.select().from(pageNotes).where(eq(pageNotes.pathId, pathId)));
    return rows.map((row) => row.content).sort();
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
  it.effect("gives each reader their own notes on the same page, leaving the page as it was", () =>
    Effect.gen(function* () {
      const { map, taker } = yield* publicMapWithTaker;
      const before = yield* pageIn(map.owner, map);

      yield* writeNotes(map.owner, map, 'Lifetimes next');
      yield* writeNotes(taker, map, 'Ask about `&mut`');

      const [owners, takers] = [yield* pageIn(map.owner, map), yield* pageIn(taker, map)];
      assert.deepStrictEqual([owners.notes, takers.notes], ['Lifetimes next', 'Ask about `&mut`']);
      assert.deepStrictEqual([owners.content, owners.updatedAt], [before.content, before.updatedAt]);
      const { client: stranger } = yield* signedIn('Eve');
      assert.strictEqual((yield* pageIn(stranger, map)).notes, undefined);
    }),
  );

  it.effect('never sends notes with a public link or the catalog', () =>
    Effect.gen(function* () {
      const map = yield* ownedMap(signedIn);
      const params = { pathId: map.pathId };
      yield* writeNotes(map.owner, map, 'Mine only');
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

  it.effect('removes blank notes instead of keeping them', () =>
    Effect.gen(function* () {
      const map = yield* ownedMap(signedIn);
      yield* writeNotes(map.owner, map, 'Draft');
      yield* writeNotes(map.owner, map, '  \n ');

      assert.strictEqual((yield* pageIn(map.owner, map)).notes, undefined);
      assert.deepStrictEqual(yield* storedNotes(map.pathId), []);
    }),
  );

  it.effect('drops notes when their page goes and when their reader loses the path', () =>
    Effect.gen(function* () {
      const { map, taker } = yield* publicMapWithTaker;
      const { client: invited, email } = yield* signedIn('Cy');
      const params = { pathId: map.pathId };
      yield* map.owner.paths.share({ params, payload: { email, role: 'viewer' } });
      yield* writeNotes(map.owner, map, "Ada's");
      yield* writeNotes(taker, map, "Bob's");
      yield* writeNotes(invited, map, "Cy's");

      yield* invited.paths.leave({ params });
      assert.deepStrictEqual(yield* storedNotes(map.pathId), ["Ada's", "Bob's"]);
      // Private again: the taker loses the path, the owner keeps hers
      yield* map.owner.paths.setVisibility({ params, payload: { visibility: 'private' } });
      assert.deepStrictEqual(yield* storedNotes(map.pathId), ["Ada's"]);

      yield* map.owner.paths.removePage({ params: { ...params, pageId: map.pageId } });
      assert.deepStrictEqual(yield* storedNotes(map.pathId), []);
    }),
  );
});
