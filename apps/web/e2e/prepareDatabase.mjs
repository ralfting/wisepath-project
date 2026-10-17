import { PgClient } from '@effect/sql-pg';
import { Effect, Redacted } from 'effect';
import { SqlClient } from 'effect/sql';

/**
 * A fresh, empty database for the end-to-end run; the API's own migrations fill it (dist/migrate.js). Refuses any
 * database whose name doesn't end in _e2e, since it drops everything in it.
 */
const url = new URL(process.env.DATABASE_URL);
const name = url.pathname.slice(1);
if (!/_e2e$/.test(name)) throw new Error(`Refusing to reset ${name}: not an end-to-end database`);

const server = new URL(url);
server.pathname = '/postgres';

const createIfMissing = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const [found] = yield* sql`SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = ${name})`;
  if (!found.exists) yield* sql.unsafe(`CREATE DATABASE "${name}"`);
}).pipe(Effect.provide(PgClient.layer({ url: Redacted.make(server.toString()) })));

const wipe = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`DROP SCHEMA IF EXISTS drizzle CASCADE`;
  yield* sql`DROP SCHEMA public CASCADE`;
  yield* sql`CREATE SCHEMA public`;
}).pipe(Effect.provide(PgClient.layer({ url: Redacted.make(url.toString()) })));

await Effect.runPromise(Effect.andThen(createIfMissing, wipe));
console.log(`e2e database ${name} is empty`);
