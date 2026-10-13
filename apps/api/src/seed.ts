import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { Effect, Layer } from 'effect';
import { Database, DatabaseLive } from './shared/infrastructure/database/Database';
import { users } from './shared/infrastructure/database/schema';
import { SqlLive } from './shared/infrastructure/Sql';

/**
 * node dist/seed.js: first data for a local database, a demo account you can
 * log in with right away. Safe to run more than once.
 */

const DEMO_USER = {
  email: 'demo@wisepath.dev',
  password: 'wisepath-demo',
  name: 'Demo Learner',
};

const program = Effect.gen(function* () {
  const { db, run } = yield* Database;
  const password = yield* Effect.promise(() => bcrypt.hash(DEMO_USER.password, 10));
  const now = new Date();

  yield* run(
    db
      .insert(users)
      .values({ id: randomUUID(), email: DEMO_USER.email, name: DEMO_USER.name, password, updatedAt: now })
      .onConflictDoUpdate({ target: users.email, set: { name: DEMO_USER.name, password, updatedAt: now } }),
  );

  yield* Effect.log(`Seeded demo user ${DEMO_USER.email} (password: ${DEMO_USER.password})`);
}).pipe(Effect.provide(DatabaseLive.pipe(Layer.provideMerge(SqlLive))));

Effect.runPromise(program).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
