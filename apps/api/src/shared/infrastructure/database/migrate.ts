import { join } from 'node:path';
import { migrate } from 'drizzle-orm/pg-proxy/migrator';
import { Effect } from 'effect';
import { SqlClient } from 'effect/sql';
import { Database } from './Database';

/**
 * Brings the database up to date with the migrations drizzle-kit generated
 * (apps/api/drizzle), each run once, all in one transaction.
 */

/** Where the migrations are, from apps/api: where the scripts, the tests and the container run */
const migrationsFolder = join(process.cwd(), 'drizzle');

export const migrateDatabase = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const { use } = yield* Database;
  const services = yield* Effect.context<never>();

  const runAll = (queries: Array<string>) =>
    Effect.runPromiseWith(services)(
      sql.withTransaction(Effect.forEach(queries, (query) => sql.unsafe(query), { discard: true })),
    );

  yield* use((db) => migrate(db, runAll, { migrationsFolder }));
}).pipe(Effect.orDie);
