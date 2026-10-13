import { AsyncLocalStorage } from 'node:async_hooks';
import { drizzle } from 'drizzle-orm/pg-proxy';
import type { PgRemoteDatabase } from 'drizzle-orm/pg-proxy';
import { Context, Effect, Layer } from 'effect';
import { SqlClient } from 'effect/sql';
import * as schema from './schema';

/**
 * Drizzle on top of @effect/sql.
 *
 * Drizzle builds the queries and maps the results; @effect/sql runs them. A
 * query runs on the fiber that asked for it, so inside `transaction` it uses
 * the transaction's connection, and the domain rules (Effect) run inside the
 * transaction as they are.
 *
 * Drizzle's own Effect integration needs Effect 3; this bridge does the same
 * through its `pg-proxy` driver, which hands each query to a callback.
 */

export type Db = PgRemoteDatabase<typeof schema>;

/** The services of the fiber whose query is running: its connection, inside a transaction */
const runningFiber = new AsyncLocalStorage<Context.Context<never>>();

export class Database extends Context.Service<
  Database,
  {
    readonly db: Db;

    /** Runs a Drizzle query on the current fiber; a database error is a defect */
    readonly run: <A>(query: PromiseLike<A>) => Effect.Effect<A>;

    /** Runs a function that makes several Drizzle calls (like its migrator) on the current fiber */
    readonly use: <A>(f: (db: Db) => PromiseLike<A>) => Effect.Effect<A>;

    /** Runs the effect in one database transaction; every `run` inside it uses that transaction */
    readonly transaction: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
  }
>()('@wisepath/api/shared/infrastructure/database/Database') {}

export const DatabaseLive = Layer.effect(
  Database,
  Effect.gen(function* () {
    const client = yield* SqlClient.SqlClient;
    // Drizzle maps column names itself, so rows come back as Postgres sends them
    const sql = client.withoutTransforms();

    const db = drizzle(
      async (query, params, method) => {
        const services = runningFiber.getStore();
        if (!services) throw new Error('Drizzle queries must run through Database.run');

        const statement = sql.unsafe(query, params);
        // 'all' wants each row as an array of values, in the order of the selected fields
        const rows = await Effect.runPromiseWith(services)(method === 'all' ? statement.values : statement);
        return { rows: rows as Array<unknown> };
      },
      { schema },
    );

    const use = <A>(f: (db: Db) => PromiseLike<A>) =>
      Effect.flatMap(Effect.context<never>(), (services) =>
        Effect.tryPromise(() => runningFiber.run(services, () => Promise.resolve(f(db)))),
      ).pipe(Effect.orDie);

    // A Drizzle query starts when awaited, which `use` does inside the fiber's context
    const run = <A>(query: PromiseLike<A>) => use(() => query);

    const transaction = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
      client.withTransaction(effect).pipe(Effect.catchTag('SqlError', Effect.die)) as Effect.Effect<A, E, R>;

    return Database.of({ db, run, use, transaction });
  }),
);
