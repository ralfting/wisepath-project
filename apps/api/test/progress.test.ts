import { randomUUID } from 'node:crypto';
import { assert, layer } from '@effect/vitest';
import { Effect, Layer, Option } from 'effect';
import { and, eq } from 'drizzle-orm';
import { UserId } from '@wisepath/domain/auth';
import { PageId, PathId, startPath } from '@wisepath/domain/paths';
import type { Path } from '@wisepath/domain/paths';
import { ProjectId } from '@wisepath/domain/projects';
import { PathStore } from '../src/paths/application/PathStore';
import { DrizzlePathStore } from '../src/paths/infrastructure/DrizzlePathStore';
import { Database, DatabaseLive } from '../src/shared/infrastructure/database/Database';
import { pageProgress, pages, projects, users } from '../src/shared/infrastructure/database/schema';
import { SqlLive } from '../src/shared/infrastructure/Sql';

/**
 * Studied marks are each learner's own (docs/plans/14-public-and-shared-paths.md): the store reads the marks of the
 * learner it is asked for and writes only theirs, whoever else marked the same page.
 */

const TestDatabase = DatabaseLive.pipe(Layer.provide(SqlLive));
const TestStore = DrizzlePathStore.pipe(Layer.provideMerge(TestDatabase));

const newUser = Effect.gen(function* () {
  const { db, run } = yield* Database;
  const id = randomUUID();
  yield* run(db.insert(users).values({ id, email: `p-${id}@wisepath.test`, updatedAt: new Date() }));
  return UserId.make(id);
});

/** An owner with a map of a root and two pages */
const ownedMap = Effect.gen(function* () {
  const { db, run } = yield* Database;
  const store = yield* PathStore;
  const ownerId = yield* newUser;
  const projectId = ProjectId.make(randomUUID());
  yield* run(db.insert(projects).values({ id: projectId, ownerId, name: 'General', isDefault: true }));

  const started = startPath({ id: PathId.make(randomUUID()), projectId, rootPageId: PageId.make('root'), title: 'Rust' });
  const page = (id: string, title: string) => ({ ...started.pages[0], id: PageId.make(id), title });
  const path: Path = { ...started, pages: [...started.pages, page('a', 'Ownership'), page('b', 'Borrowing')] };
  assert.isTrue(yield* store.insert(ownerId, projectId, path));
  return { ownerId, path };
});

const marked = (path: Path) => path.pages.filter((p) => p.studied).map((p) => p.id);
const studied = (path: Path, ids: ReadonlyArray<string>): Path => ({
  ...path,
  pages: path.pages.map((p) => ({ ...p, studied: ids.includes(p.id) })),
});

layer(TestStore)('Progress', (it) => {
  it.effect("reads the learner's marks and writes only theirs", () =>
    Effect.gen(function* () {
      const { db, run } = yield* Database;
      const store = yield* PathStore;
      const { ownerId, path } = yield* ownedMap;
      const otherId = yield* newUser;

      // Someone else studied page b: the owner's map does not show it
      yield* run(db.insert(pageProgress).values({ userId: otherId, pathId: path.id, pageId: 'b' }));
      const before = Option.getOrThrow(yield* store.find(ownerId, path.id));
      assert.deepStrictEqual(marked(before), []);

      yield* store.save(ownerId, before, studied(before, ['a', 'b']));
      const after = Option.getOrThrow(yield* store.find(ownerId, path.id));
      assert.deepStrictEqual(marked(after), ['a', 'b']);

      // Unmarking b removes the owner's mark and keeps the other learner's
      yield* store.save(ownerId, after, studied(after, ['a']));
      assert.deepStrictEqual(marked(Option.getOrThrow(yield* store.find(ownerId, path.id))), ['a']);
      const others = yield* run(db.select().from(pageProgress).where(eq(pageProgress.userId, otherId)));
      assert.deepStrictEqual(
        others.map((row) => row.pageId),
        ['b'],
      );
    }),
  );

  it.effect('stores the marks of a new map as its learner\'s, and lists them', () =>
    Effect.gen(function* () {
      const store = yield* PathStore;
      const { db, run } = yield* Database;
      const ownerId = yield* newUser;
      const projectId = ProjectId.make(randomUUID());
      yield* run(db.insert(projects).values({ id: projectId, ownerId, name: 'General', isDefault: true }));
      const started = startPath({ id: PathId.make(randomUUID()), projectId, rootPageId: PageId.make('root'), title: 'Go' });
      const path: Path = { ...started, pages: [...started.pages, { ...started.pages[0], id: PageId.make('a'), title: 'Goroutines', studied: true }] };

      yield* store.insert(ownerId, projectId, path);

      const [listed] = yield* store.listOwned(ownerId);
      assert.deepStrictEqual(marked(listed.path), ['a']);
    }),
  );

  it.effect('drops the marks of a page when the page goes', () =>
    Effect.gen(function* () {
      const { db, run } = yield* Database;
      const store = yield* PathStore;
      const { ownerId, path } = yield* ownedMap;
      const before = Option.getOrThrow(yield* store.find(ownerId, path.id));
      yield* store.save(ownerId, before, studied(before, ['a']));

      yield* run(db.delete(pages).where(and(eq(pages.pathId, path.id), eq(pages.id, 'a'))));

      const left = yield* run(db.select().from(pageProgress).where(eq(pageProgress.pathId, path.id)));
      assert.deepStrictEqual(left, []);
    }),
  );
});
