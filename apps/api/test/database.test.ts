import { randomUUID } from 'node:crypto';
import { assert, layer } from '@effect/vitest';
import { Effect, Exit, Fiber, Layer } from 'effect';
import { and, eq } from 'drizzle-orm';
import { Database, DatabaseLive } from '../src/shared/infrastructure/database/Database';
import { pages, paths, projects, users } from '../src/shared/infrastructure/database/schema';
import { SqlLive } from '../src/shared/infrastructure/Sql';

/**
 * The bridge between Drizzle and @effect/sql, on the test database: Drizzle's
 * whole API works, and a transaction holds every query run inside it.
 */

const TestDatabase = DatabaseLive.pipe(Layer.provide(SqlLive));

/** Waits in real time (tests run on a test clock, which only moves when told to) */
const pause = (ms: number) => Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));

const newUser = Effect.gen(function* () {
  const { db, run } = yield* Database;
  const id = randomUUID();
  yield* run(db.insert(users).values({ id, email: `d-${id}@wisepath.test`, updatedAt: new Date() }));
  return id;
});

layer(TestDatabase)('Database', (it) => {
  it.effect('runs relational queries, with their nested rows mapped', () =>
    Effect.gen(function* () {
      const { db, run } = yield* Database;
      const ownerId = yield* newUser;
      const pathId = randomUUID();

      const projectId = randomUUID();
      yield* run(db.insert(projects).values({ id: projectId, ownerId, name: 'General', isDefault: true }));
      yield* run(db.insert(paths).values({ id: pathId, projectId, title: 'Rust', rootPageId: 'root' }));
      yield* run(
        db.insert(pages).values([
          { pathId, id: 'b', position: 1, title: 'Borrowing', updatedAt: new Date('2026-01-02T00:00:00.000Z') },
          { pathId, id: 'root', position: 0, title: 'Rust', updatedAt: new Date('2026-01-01T00:00:00.000Z') },
        ]),
      );

      const found = yield* run(
        db.query.paths.findFirst({
          where: and(eq(paths.id, pathId), eq(paths.projectId, projectId)),
          with: { pages: { orderBy: (p, { asc }) => [asc(p.position)] } },
        }),
      );

      assert.strictEqual(found?.title, 'Rust');
      assert.deepStrictEqual(
        found?.pages.map((p) => [p.id, p.title, p.module]),
        [
          ['root', 'Rust', null],
          ['b', 'Borrowing', null],
        ],
      );
      assert.strictEqual(found?.pages[1].updatedAt.toISOString(), '2026-01-02T00:00:00.000Z');
    }),
  );

  it.effect('rolls back every query of a failed transaction', () =>
    Effect.gen(function* () {
      const { db, run, transaction } = yield* Database;
      const id = randomUUID();

      const exit = yield* Effect.exit(
        transaction(
          Effect.gen(function* () {
            yield* run(db.insert(users).values({ id, email: `r-${id}@wisepath.test`, updatedAt: new Date() }));
            return yield* Effect.fail('the domain refused' as const);
          }),
        ),
      );

      assert.isTrue(Exit.isFailure(exit));
      assert.deepStrictEqual(yield* run(db.select().from(users).where(eq(users.id, id))), []);
    }),
  );

  it.effect('holds a row locked FOR UPDATE until its transaction ends', () =>
    Effect.gen(function* () {
      const { db, run, transaction } = yield* Database;
      const id = yield* newUser;
      const order: Array<string> = [];

      const lockFor = (name: string, hold: number) =>
        transaction(
          Effect.gen(function* () {
            yield* run(db.select({ id: users.id }).from(users).where(eq(users.id, id)).for('update'));
            order.push(`${name} locked`);
            yield* pause(hold);
            order.push(`${name} done`);
          }),
        );

      const first = yield* Effect.forkChild(lockFor('first', 300));
      yield* pause(50);
      yield* lockFor('second', 0);
      yield* Fiber.join(first);

      assert.deepStrictEqual(order, ['first locked', 'first done', 'second locked', 'second done']);
    }),
  );
});
