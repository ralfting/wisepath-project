import { Effect, Layer } from 'effect';
import { DatabaseLive } from './shared/infrastructure/database/Database';
import { migrateDatabase } from './shared/infrastructure/database/migrate';
import { SqlLive } from './shared/infrastructure/Sql';

/** node dist/migrate.js: applies pending migrations to DATABASE_URL */
const program = migrateDatabase.pipe(
  Effect.tap(() => Effect.log('Database is up to date')),
  Effect.provide(DatabaseLive.pipe(Layer.provideMerge(SqlLive))),
);

Effect.runPromise(program).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
