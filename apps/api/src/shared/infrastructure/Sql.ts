import { Config, Effect, Layer, Redacted } from 'effect';
import { PgClient } from '@effect/sql-pg';

/**
 * The Postgres connection pool, from DATABASE_URL. Queries reach it through
 * Drizzle (see database/Database.ts). Hosted databases that ask for TLS in
 * the URL (sslmode=require) get it.
 */
export const SqlLive = Layer.unwrap(
  Effect.gen(function* () {
    const url = yield* Config.Redacted('DATABASE_URL');
    const ssl = /[?&]sslmode=(require|verify-ca|verify-full)\b/.test(Redacted.value(url));

    return PgClient.layer({
      url,
      ssl,
      applicationName: 'wisepath-api',
    });
  }),
);
