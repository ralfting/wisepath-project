import { Effect, Layer, Option } from 'effect';
import { eq } from 'drizzle-orm';
import { User, UserId } from '@wisepath/domain/auth';
import type { Email, Locale } from '@wisepath/domain/auth';
import { Database } from '../../shared/infrastructure/database/Database';
import { users } from '../../shared/infrastructure/database/schema';
import { UserStore } from '../application/UserStore';

/** Accounts in Postgres through Drizzle */

const toUser = (row: typeof users.$inferSelect) =>
  new User({ id: UserId.make(row.id), email: row.email, name: row.name, locale: row.locale });

export const DrizzleUserStore = Layer.effect(
  UserStore,
  Effect.gen(function* () {
    const { db, run } = yield* Database;

    const findByEmail = Effect.fn('UserStore.findByEmail')(function* (email: Email) {
      const row = yield* run(db.query.users.findFirst({ where: eq(users.email, email) }));
      return Option.map(Option.fromNullishOr(row), (r) => ({ user: toUser(r), passwordHash: r.password }));
    });

    const findById = Effect.fn('UserStore.findById')(function* (id: UserId) {
      const row = yield* run(db.query.users.findFirst({ where: eq(users.id, id) }));
      return Option.map(Option.fromNullishOr(row), toUser);
    });

    const insert = Effect.fn('UserStore.insert')(function* (user: User, passwordHash: string) {
      const added = yield* run(
        db
          .insert(users)
          .values({ id: user.id, email: user.email, name: user.name, password: passwordHash, updatedAt: new Date() })
          .onConflictDoNothing({ target: users.email })
          .returning({ id: users.id }),
      );
      return added.length > 0;
    });

    const setLocale = Effect.fn('UserStore.setLocale')(function* (id: UserId, locale: Locale | null) {
      yield* run(db.update(users).set({ locale, updatedAt: new Date() }).where(eq(users.id, id)));
    });

    return UserStore.of({ findByEmail, findById, insert, setLocale });
  }),
);
