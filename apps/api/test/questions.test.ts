import { assert, layer } from '@effect/vitest';
import { Effect } from 'effect';
import { eq } from 'drizzle-orm';
import { questionsIn } from '@wisepath/domain/paths';
import type { PageEdit, PathId } from '@wisepath/domain/paths';
import { Database } from '../src/shared/infrastructure/database/Database';
import { questionAnswers } from '../src/shared/infrastructure/database/schema';
import { TestDatabase, adminOf, outcomes, ownedMap, useApp } from './app';
import type { Client, OwnedMap } from './app';

/**
 * Questions on a page (docs/plans/24-page-questions.md): each reader writes their own answer, kept beside their ticks
 * and never in the page's text. In a learning path a page is studied once its questions are answered. A public link
 * and the catalog carry no answers, a reworded question keeps everyone's, and answers go with the page or with the
 * reader's access.
 */

const { makeClient, signedIn } = useApp();

const CONTENT = '> [!question]\n> What makes a habit last?\n\nBetween.\n\n> [!question]\n> Which one will you keep?';

const questionIds = (map: OwnedMap, content: string) => questionsIn(map.pathId, { id: map.pageId, content }).map((q) => q.id);

/** Ada's map as a learning path whose page asks two questions, made public, and Bob who took it */
const publicWithTaker = Effect.gen(function* () {
  const map = yield* ownedMap(signedIn);
  const params = { pathId: map.pathId };
  yield* map.owner.paths.update({ params, payload: { kind: 'learningPath' } });
  yield* map.owner.paths.updatePage({ params: { ...params, pageId: map.pageId }, payload: { content: CONTENT } });
  const [first, second] = questionIds(map, CONTENT);
  const { client: taker } = yield* signedIn('Bob');
  yield* map.owner.paths.setVisibility({ params, payload: { visibility: 'public' } });
  yield* taker.paths.take({ params });
  return { map, first, second, taker };
});

const pageIn = (client: Client, map: OwnedMap) =>
  Effect.map(client.paths.get({ params: { pathId: map.pathId } }), (path) => path.pages.find((p) => p.id === map.pageId)!);

const edit = (client: Client, map: OwnedMap, payload: PageEdit) =>
  client.paths.updatePage({ params: { pathId: map.pathId, pageId: map.pageId }, payload });

/** How many answers are stored on the map, as the database has them */
const storedAnswers = (pathId: PathId) =>
  Effect.gen(function* () {
    const { db, run } = yield* Database;
    const rows = yield* run(db.select().from(questionAnswers).where(eq(questionAnswers.pathId, pathId)));
    return rows.length;
  });

layer(TestDatabase)('questions on a page', (it) => {
  it.effect('gives each reader their own answers, and studies the page only once all are answered', () =>
    Effect.gen(function* () {
      const { map, first, second, taker } = yield* publicWithTaker;
      const before = yield* pageIn(map.owner, map);

      assert.deepStrictEqual(yield* outcomes([edit(taker, map, { studied: true })]), ['ActivitiesOpen']);
      yield* edit(taker, map, { answers: [{ question: first, body: 'Small steps.' }] });
      yield* edit(map.owner, map, { answers: [{ question: first, body: 'Cues.' }] });
      assert.deepStrictEqual((yield* pageIn(taker, map)).answers, [{ question: first, body: 'Small steps.' }]);
      assert.deepStrictEqual((yield* pageIn(map.owner, map)).answers, [{ question: first, body: 'Cues.' }]);

      yield* edit(taker, map, { answers: [{ question: second, body: 'Reading.' }], studied: true });
      const studied = yield* pageIn(taker, map);
      assert.deepStrictEqual([studied.studied, studied.answers?.length], [true, 2]);

      yield* edit(taker, map, { answers: [{ question: first, body: '' }] });
      const cleared = yield* pageIn(taker, map);
      assert.deepStrictEqual([cleared.studied, cleared.answers], [false, [{ question: second, body: 'Reading.' }]]);
      assert.deepStrictEqual([cleared.content, cleared.updatedAt], [before.content, before.updatedAt]);
    }),
  );

  it.effect('never sends answers with a public link or the catalog', () =>
    Effect.gen(function* () {
      const { map, first } = yield* publicWithTaker;
      const params = { pathId: map.pathId };
      yield* edit(map.owner, map, { answers: [{ question: first, body: 'Cues.' }] });
      yield* map.owner.paths.requestPublication({
        params,
        payload: { description: 'Habits that last', audience: 'Anyone starting a habit', language: 'en' },
      });
      yield* (yield* adminOf(makeClient)).admin.approve({ params });
      const slug = (yield* map.owner.paths.get({ params })).slug!;

      const anonymous = yield* makeClient;
      const linked = yield* anonymous.publicPaths.get({ params });
      const listed = yield* anonymous.catalog.get({ params: { slug } });
      assert.deepStrictEqual(
        [...linked.pages, ...listed.pages].map((page) => page.answers),
        [...linked.pages, ...listed.pages].map(() => undefined),
      );
    }),
  );

  it.effect("keeps two readers' answers with a question its author rewords", () =>
    Effect.gen(function* () {
      const { map, first, second, taker } = yield* publicWithTaker;
      yield* edit(map.owner, map, { answers: [{ question: first, body: 'Cues.' }] });
      yield* edit(taker, map, { answers: [{ question: first, body: 'Small steps.' }, { question: second, body: 'Reading.' }] });

      const reworded = CONTENT.replace('What makes', 'What helps');
      yield* edit(map.owner, map, { content: reworded });
      const [renamed] = questionIds(map, reworded);
      assert.notStrictEqual(renamed, first);
      assert.deepStrictEqual((yield* pageIn(map.owner, map)).answers, [{ question: renamed, body: 'Cues.' }]);
      assert.sameDeepMembers([...((yield* pageIn(taker, map)).answers ?? [])], [
        { question: renamed, body: 'Small steps.' },
        { question: second, body: 'Reading.' },
      ]);
    }),
  );

  it.effect('drops answers when their page goes and when their reader loses the path', () =>
    Effect.gen(function* () {
      const { map, first, taker } = yield* publicWithTaker;
      const { client: invited, email } = yield* signedIn('Cy');
      const params = { pathId: map.pathId };
      yield* map.owner.paths.share({ params, payload: { email, role: 'viewer' } });
      for (const reader of [map.owner, taker, invited]) yield* edit(reader, map, { answers: [{ question: first, body: 'Mine.' }] });

      yield* invited.paths.leave({ params });
      assert.strictEqual(yield* storedAnswers(map.pathId), 2);
      // Private again: the taker loses the path, the owner keeps hers
      yield* map.owner.paths.setVisibility({ params, payload: { visibility: 'private' } });
      assert.strictEqual(yield* storedAnswers(map.pathId), 1);

      yield* map.owner.paths.removePage({ params: { ...params, pageId: map.pageId } });
      assert.strictEqual(yield* storedAnswers(map.pathId), 0);
    }),
  );
});
