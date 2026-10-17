import { randomUUID } from 'node:crypto';
import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { eq } from 'drizzle-orm';
import { PageId, PathId } from '@wisepath/domain/paths';
import type { MemberRole, PathVisibility } from '@wisepath/domain/paths';
import { Database } from '../src/shared/infrastructure/database/Database';
import { pathMembers, paths } from '../src/shared/infrastructure/database/schema';
import { TestDatabase, useApp } from './app';
import type { Client } from './app';

/**
 * Who may do what with a path (docs/plans/14-public-and-shared-paths.md), through the API: the owner manages it, an
 * editor edits its pages, a reader reads it and keeps their own marks, and anyone else finds nothing, as if it did
 * not exist. Members and visibility are set in the database here; their own endpoints are tested beside them.
 */

const { signedIn } = useApp();

const pid = () => PathId.make(randomUUID());
const pgid = () => PageId.make(randomUUID());

/** An owner's map of a root linking one page */
const ownedMap = Effect.gen(function* () {
  const { client } = yield* signedIn('Ada');
  const pathId = pid();
  const rootPageId = pgid();
  const pageId = pgid();
  const [general] = yield* client.projects.list();
  yield* client.paths.create({ payload: { id: pathId, projectId: general.id, rootPageId, title: 'Rust' } });
  yield* client.paths.updatePage({ params: { pathId, pageId: rootPageId }, payload: { content: 'See [[Borrowing]]' } });
  yield* client.paths.createPage({ params: { pathId }, payload: { id: pageId, title: 'Borrowing' } });
  return { owner: client, pathId, rootPageId, pageId };
});

const join = (pathId: PathId, userId: string, role: MemberRole) =>
  Effect.gen(function* () {
    const { db, run } = yield* Database;
    yield* run(db.insert(pathMembers).values({ pathId, userId, role, source: 'invited' }));
  }).pipe(Effect.provide(TestDatabase));

const show = (pathId: PathId, visibility: PathVisibility) =>
  Effect.gen(function* () {
    const { db, run } = yield* Database;
    yield* run(db.update(paths).set({ visibility }).where(eq(paths.id, pathId)));
  }).pipe(Effect.provide(TestDatabase));

/** The tag of each failure, or 'ok', for a list of calls */
const outcomes = (calls: ReadonlyArray<Effect.Effect<unknown, { readonly _tag: string }>>) =>
  Effect.forEach(calls, (call) =>
    call.pipe(
      Effect.as('ok'),
      Effect.catch((error) => Effect.succeed(error._tag)),
    ),
  );

/** Every write a non-owner might try, in order: content, a new page, the root's title, the kind, the project */
const writes = (client: Client, map: Effect.Success<typeof ownedMap>) => [
  client.paths.updatePage({ params: { pathId: map.pathId, pageId: map.pageId }, payload: { content: 'Mine now' } }),
  client.paths.createPage({ params: { pathId: map.pathId }, payload: { id: pgid(), title: 'Lifetimes' } }),
  client.paths.updatePage({ params: { pathId: map.pathId, pageId: map.rootPageId }, payload: { title: 'Taken' } }),
  client.paths.update({ params: { pathId: map.pathId }, payload: { kind: 'learningPath' } }),
];

describe('paths API access', () => {
  it.effect('finds nothing of a private path it was not shared with', () =>
    Effect.gen(function* () {
      const map = yield* ownedMap;
      const { client: stranger } = yield* signedIn('Eve');

      const read = yield* outcomes([
        stranger.paths.get({ params: { pathId: map.pathId } }),
        stranger.paths.updatePage({ params: { pathId: map.pathId, pageId: map.pageId }, payload: { studied: true } }),
        ...writes(stranger, map),
      ]);
      assert.deepStrictEqual(read, Array(6).fill('PathNotFound'));
      assert.deepStrictEqual(yield* stranger.paths.list(), []);

      // Deleting someone else's path does nothing
      yield* stranger.paths.remove({ params: { pathId: map.pathId } });
      assert.strictEqual((yield* map.owner.paths.get({ params: { pathId: map.pathId } })).access, 'owner');
    }),
  );

  it.effect('lets a reader read and keep their own marks, and nothing else', () =>
    Effect.gen(function* () {
      const map = yield* ownedMap;
      const { client: reader, user } = yield* signedIn('Bob');
      yield* join(map.pathId, user.id, 'viewer');

      const [listed] = yield* reader.paths.list();
      assert.deepStrictEqual([listed.id, listed.access, listed.projectId, listed.ownerName], [map.pathId, 'viewer', null, 'Ada']);

      yield* reader.paths.updatePage({ params: { pathId: map.pathId, pageId: map.pageId }, payload: { studied: true } });
      const theirs = yield* reader.paths.get({ params: { pathId: map.pathId } });
      const owners = yield* map.owner.paths.get({ params: { pathId: map.pathId } });
      assert.deepStrictEqual(
        [theirs.access, theirs.pages.find((p) => p.id === map.pageId)?.studied, owners.pages.find((p) => p.id === map.pageId)?.studied],
        ['viewer', true, false],
      );

      assert.deepStrictEqual(yield* outcomes(writes(reader, map)), Array(4).fill('PathNotFound'));
      // A mark sent with an edit is refused whole
      const mixed = yield* outcomes([
        reader.paths.updatePage({ params: { pathId: map.pathId, pageId: map.pageId }, payload: { studied: false, content: 'x' } }),
      ]);
      assert.deepStrictEqual(mixed, ['PathNotFound']);
      assert.isTrue((yield* reader.paths.get({ params: { pathId: map.pathId } })).pages.find((p) => p.id === map.pageId)?.studied);
    }),
  );

  it.effect("lets an editor edit pages, but not rename, change, move or delete the path", () =>
    Effect.gen(function* () {
      const map = yield* ownedMap;
      const { client: editor, user } = yield* signedIn('Cy');
      yield* join(map.pathId, user.id, 'editor');

      const [content, page, rename, kind] = yield* outcomes(writes(editor, map));
      assert.deepStrictEqual([content, page, rename, kind], ['ok', 'ok', 'PathNotFound', 'PathNotFound']);

      yield* editor.paths.remove({ params: { pathId: map.pathId } });
      const seen = yield* map.owner.paths.get({ params: { pathId: map.pathId } });
      assert.deepStrictEqual(
        [seen.title, seen.kind, seen.pages.find((p) => p.id === map.pageId)?.content, seen.pages.length],
        ['Rust', 'study', 'Mine now', 3],
      );
    }),
  );

  it.effect('lets anyone read a public path without listing it for them', () =>
    Effect.gen(function* () {
      const map = yield* ownedMap;
      const { client: stranger } = yield* signedIn('Dee');
      yield* show(map.pathId, 'public');

      const read = yield* stranger.paths.get({ params: { pathId: map.pathId } });
      assert.deepStrictEqual([read.access, read.visibility], ['viewer', 'public']);
      assert.deepStrictEqual(yield* stranger.paths.list(), []);
      assert.deepStrictEqual(yield* outcomes(writes(stranger, map)), Array(4).fill('PathNotFound'));

      yield* show(map.pathId, 'private');
      assert.deepStrictEqual(yield* outcomes([stranger.paths.get({ params: { pathId: map.pathId } })]), ['PathNotFound']);
    }),
  );
});
