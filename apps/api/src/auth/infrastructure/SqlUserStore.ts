import { Effect, Layer, Option, Schema } from 'effect';
import { SqlClient, SqlSchema } from 'effect/sql';
import { Email, User, UserId } from '@wisepath/domain/auth';
import { UserStore } from '../application/UserStore';

/**
 * Accounts in Postgres, in the `User` table the Prisma migrations made. Its
 * columns are camelCase (quoted), unlike the snake_case of newer tables.
 */

const UserRow = Schema.Struct({
  id: UserId,
  email: Schema.String,
  name: Schema.NullOr(Schema.String),
  password: Schema.NullOr(Schema.String),
});
type UserRow = typeof UserRow.Type;

const toUser = (row: UserRow) => new User({ id: row.id, email: row.email, name: row.name });

export const SqlUserStore = Layer.effect(
  UserStore,
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    const byEmail = SqlSchema.findOneOption({
      Request: Email,
      Result: UserRow,
      execute: (email) => sql`SELECT id, email, name, password FROM "User" WHERE email = ${email}`,
    });

    const byId = SqlSchema.findOneOption({
      Request: UserId,
      Result: UserRow,
      execute: (id) => sql`SELECT id, email, name, password FROM "User" WHERE id = ${id}`,
    });

    const findByEmail = Effect.fn('UserStore.findByEmail')(function* (email: Email) {
      const row = yield* byEmail(email);
      return Option.map(row, (r) => ({ user: toUser(r), passwordHash: r.password }));
    }, Effect.orDie);

    const findById = Effect.fn('UserStore.findById')(function* (id: UserId) {
      return Option.map(yield* byId(id), toUser);
    }, Effect.orDie);

    const insert = Effect.fn('UserStore.insert')(function* (user: User, passwordHash: string) {
      const added = yield* sql`
        INSERT INTO "User" (id, email, name, password, "updatedAt")
        VALUES (${user.id}, ${user.email}, ${user.name}, ${passwordHash}, now())
        ON CONFLICT (email) DO NOTHING
        RETURNING id`;
      return added.length > 0;
    }, Effect.orDie);

    return UserStore.of({ findByEmail, findById, insert });
  }),
);
