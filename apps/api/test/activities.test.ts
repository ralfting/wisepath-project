import { assert, layer } from '@effect/vitest';
import { Effect } from 'effect';
import { eq } from 'drizzle-orm';
import { activitiesIn } from '@wisepath/domain/paths';
import type { ActivityId, PageEdit, PathId } from '@wisepath/domain/paths';
import { Database } from '../src/shared/infrastructure/database/Database';
import { activityProgress } from '../src/shared/infrastructure/database/schema';
import { TestDatabase, adminOf, outcomes, ownedMap, useApp } from './app';
import type { Client, OwnedMap } from './app';

/**
 * Activities on a page (docs/plans/22-page-activities.md): each reader ticks their own, like their studied marks.
 * In a learning path a page is studied once its activities are done. A public link and the catalog carry no ticks,
 * and ticks go with the page or with the reader's access.
 */

const { makeClient, signedIn } = useApp();

const CONTENT = '> [!activity]\n> Write two things you like doing when you read.\n\n> [!activity]\n> Copy a sentence that stayed.';

/** Ada's map as a learning path whose page asks for two activities, and their ids */
const mapWithActivities = Effect.gen(function* () {
  const map = yield* ownedMap(signedIn);
  yield* map.owner.paths.update({ params: { pathId: map.pathId }, payload: { kind: 'learningPath' } });
  yield* map.owner.paths.updatePage({ params: { pathId: map.pathId, pageId: map.pageId }, payload: { content: CONTENT } });
  const [first, second] = activitiesIn(map.pathId, { id: map.pageId, content: CONTENT }).map((a) => a.id);
  return { map, first, second };
});

/** The same map made public, and Bob who took it */
const publicWithTaker = Effect.gen(function* () {
  const made = yield* mapWithActivities;
  const { client: taker } = yield* signedIn('Bob');
  yield* made.map.owner.paths.setVisibility({ params: { pathId: made.map.pathId }, payload: { visibility: 'public' } });
  yield* taker.paths.take({ params: { pathId: made.map.pathId } });
  return { ...made, taker };
});

const pageIn = (client: Client, map: OwnedMap) =>
  Effect.map(client.paths.get({ params: { pathId: map.pathId } }), (path) => path.pages.find((p) => p.id === map.pageId)!);

const edit = (client: Client, map: OwnedMap, payload: PageEdit) =>
  client.paths.updatePage({ params: { pathId: map.pathId, pageId: map.pageId }, payload });

/** The ticks stored on the map, as the database has them */
const storedTicks = (pathId: PathId) =>
  Effect.gen(function* () {
    const { db, run } = yield* Database;
    const rows = yield* run(db.select().from(activityProgress).where(eq(activityProgress.pathId, pathId)));
    return rows.length;
  });

const progressOf = (page: { readonly studied: boolean; readonly done?: ReadonlyArray<ActivityId> }) => [page.studied, page.done];

layer(TestDatabase)('activities on a page', (it) => {
  it.effect('gives each reader their own ticks, and studies the page only once they are all done', () =>
    Effect.gen(function* () {
      const { map, first, second, taker } = yield* publicWithTaker;
      const before = yield* pageIn(map.owner, map);

      assert.deepStrictEqual(yield* outcomes([edit(taker, map, { studied: true })]), ['ActivitiesOpen']);
      yield* edit(taker, map, { done: [first] });
      assert.deepStrictEqual(progressOf(yield* pageIn(taker, map)), [false, [first]]);
      assert.deepStrictEqual(progressOf(yield* pageIn(map.owner, map)), [false, undefined]);

      yield* edit(taker, map, { done: [first, second], studied: true });
      yield* edit(taker, map, { done: [first, second], studied: true });
      assert.deepStrictEqual(progressOf(yield* pageIn(taker, map)), [true, [first, second]]);

      yield* edit(taker, map, { done: [second] });
      const after = yield* pageIn(taker, map);
      assert.deepStrictEqual(progressOf(after), [false, [second]]);
      assert.deepStrictEqual([after.content, after.updatedAt], [before.content, before.updatedAt]);
    }),
  );

  it.effect('never sends ticks with a public link or the catalog', () =>
    Effect.gen(function* () {
      const { map, first, second } = yield* mapWithActivities;
      const params = { pathId: map.pathId };
      yield* edit(map.owner, map, { done: [first, second] });
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
        [...linked.pages, ...listed.pages].map((page) => page.done),
        [undefined, undefined, undefined, undefined],
      );
    }),
  );

  it.effect('drops ticks when their page goes and when their reader loses the path', () =>
    Effect.gen(function* () {
      const { map, first, taker } = yield* publicWithTaker;
      const { client: invited, email } = yield* signedIn('Cy');
      const params = { pathId: map.pathId };
      yield* map.owner.paths.share({ params, payload: { email, role: 'viewer' } });
      yield* edit(map.owner, map, { done: [first] });
      yield* edit(taker, map, { done: [first] });
      yield* edit(invited, map, { done: [first] });

      yield* invited.paths.leave({ params });
      assert.strictEqual(yield* storedTicks(map.pathId), 2);
      // Private again: the taker loses the path, the owner keeps hers
      yield* map.owner.paths.setVisibility({ params, payload: { visibility: 'private' } });
      assert.strictEqual(yield* storedTicks(map.pathId), 1);

      yield* map.owner.paths.removePage({ params: { ...params, pageId: map.pageId } });
      assert.strictEqual(yield* storedTicks(map.pathId), 0);
    }),
  );

  it.effect('keeps someone who cannot read the path from ticking on it', () =>
    Effect.gen(function* () {
      const { map, first } = yield* mapWithActivities;
      const { client: stranger } = yield* signedIn('Eve');
      assert.deepStrictEqual(yield* outcomes([edit(stranger, map, { done: [first] })]), ['PathNotFound']);
    }),
  );
});
