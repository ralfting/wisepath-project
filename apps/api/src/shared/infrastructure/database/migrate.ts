import { join } from 'node:path';
import { readMigrationFiles } from 'drizzle-orm/migrator';
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

/** The Prisma migrations that made the same schema as Drizzle's first one */
const PRISMA_MIGRATIONS = ['20260306205617_init', '20261013014659_projects_and_pages'];

/**
 * A database made by Prisma already has the schema of the first migration:
 * record that migration as applied instead of running it, and forget Prisma's
 * history. Anything else Prisma left half done stops the migration.
 */
const adoptPrismaDatabase = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const [found] = yield* sql<{ prisma: boolean; drizzle: boolean }>`
    SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS prisma,
           to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS drizzle`;
  if (!found.prisma || found.drizzle) return;

  const applied = yield* sql<{ name: string }>`
    SELECT migration_name AS name
    FROM _prisma_migrations
    WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
  const names = new Set(applied.map((m) => m.name));
  if (applied.length !== PRISMA_MIGRATIONS.length || !PRISMA_MIGRATIONS.every((name) => names.has(name))) {
    return yield* Effect.die(new Error(`Can't adopt this database: Prisma applied ${[...names].join(', ')}`));
  }

  const [first] = readMigrationFiles({ migrationsFolder });
  yield* sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
  yield* sql`CREATE TABLE drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)`;
  yield* sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${first.hash}, ${first.folderMillis})`;
  yield* sql`DROP TABLE _prisma_migrations`;
}).pipe((effect) => Effect.flatMap(SqlClient.SqlClient, (sql) => sql.withTransaction(effect)));

export const migrateDatabase = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const { use } = yield* Database;
  const services = yield* Effect.context<never>();

  yield* adoptPrismaDatabase;

  const runAll = (queries: Array<string>) =>
    Effect.runPromiseWith(services)(
      sql.withTransaction(Effect.forEach(queries, (query) => sql.unsafe(query), { discard: true })),
    );

  yield* use((db) => migrate(db, runAll, { migrationsFolder }));
}).pipe(Effect.orDie);
