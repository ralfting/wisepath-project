import { Effect, Layer, Redacted } from 'effect';
import { SqlClient } from 'effect/sql';
import { PgClient } from '@effect/sql-pg';
import { DatabaseLive } from '../src/shared/infrastructure/database/Database';
import { migrateDatabase } from '../src/shared/infrastructure/database/migrate';
import { SqlLive } from '../src/shared/infrastructure/Sql';

/** A fresh, fully migrated test database for every run */
export default async function setup() {
  const url = new URL(process.env.TEST_DATABASE_URL ?? 'postgresql://wisepath:wisepath@localhost:5432/wisepath_test');
  const name = url.pathname.slice(1);
  // Resetting wipes the database: never point it at anything but a test one
  if (!/_test$/.test(name)) throw new Error(`Refusing to reset ${name}: not a test database`);

  // Made once, from the server's default database
  const server = new URL(url);
  server.pathname = '/postgres';
  const createIfMissing = Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const [found] = yield* sql<{ exists: boolean }>`SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = ${name})`;
    if (!found.exists) yield* sql.unsafe(`CREATE DATABASE "${name}"`);
  }).pipe(Effect.provide(PgClient.layer({ url: Redacted.make(server.toString()) })));

  const reset = Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`DROP SCHEMA IF EXISTS drizzle CASCADE`;
    yield* sql`DROP SCHEMA public CASCADE`;
    yield* sql`CREATE SCHEMA public`;
    yield* migrateDatabase;
  });

  process.env.DATABASE_URL = url.toString();
  await Effect.runPromise(
    createIfMissing.pipe(Effect.andThen(reset), Effect.provide(DatabaseLive.pipe(Layer.provideMerge(SqlLive)))),
  );
}
