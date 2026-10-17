import { Effect, Layer, Schema } from 'effect';
import { and, asc, eq, inArray } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { UserId } from '@wisepath/domain/auth';
import { PathShare } from '@wisepath/domain/paths';
import type { MemberRole, PathId } from '@wisepath/domain/paths';
import { Database } from '../../shared/infrastructure/database/Database';
import { pageProgress, pathMembers, users } from '../../shared/infrastructure/database/schema';
import { MemberStore } from '../application/MemberStore';

/** Path members in Postgres through Drizzle; what the Share dialog lists is decoded with the domain's schema */
export const DrizzleMemberStore = Layer.effect(
  MemberStore,
  Effect.gen(function* () {
    const { db, run, transaction } = yield* Database;

    /** Removes these members of a path and their marks on it, in one transaction */
    const removeWhere = (pathId: PathId, which: SQL) =>
      transaction(
        Effect.gen(function* () {
          const gone = yield* run(
            db
              .delete(pathMembers)
              .where(and(eq(pathMembers.pathId, pathId), which))
              .returning({ userId: pathMembers.userId }),
          );
          if (gone.length === 0) return;
          const ids = gone.map((m) => m.userId);
          yield* run(db.delete(pageProgress).where(and(eq(pageProgress.pathId, pathId), inArray(pageProgress.userId, ids))));
        }),
      );

    const listInvited = Effect.fn('MemberStore.listInvited')(function* (pathId: PathId) {
      const rows = yield* run(
        db
          .select({ userId: users.id, name: users.name, email: users.email, role: pathMembers.role })
          .from(pathMembers)
          .innerJoin(users, eq(users.id, pathMembers.userId))
          .where(and(eq(pathMembers.pathId, pathId), eq(pathMembers.source, 'invited')))
          .orderBy(asc(pathMembers.createdAt), asc(users.id)),
      );
      return yield* Schema.decodeUnknownEffect(Schema.Array(PathShare))(rows).pipe(Effect.orDie);
    });

    const invite = Effect.fn('MemberStore.invite')(function* (pathId: PathId, userId: UserId, role: MemberRole) {
      yield* run(
        db
          .insert(pathMembers)
          .values({ pathId, userId, role, source: 'invited' })
          .onConflictDoUpdate({ target: [pathMembers.pathId, pathMembers.userId], set: { role, source: 'invited' } }),
      );
    });

    const take = Effect.fn('MemberStore.take')(function* (pathId: PathId, userId: UserId) {
      yield* run(db.insert(pathMembers).values({ pathId, userId, role: 'viewer', source: 'taken' }).onConflictDoNothing());
    });

    const remove = Effect.fn('MemberStore.remove')(function* (pathId: PathId, userId: UserId) {
      yield* removeWhere(pathId, eq(pathMembers.userId, userId));
    });

    const removeTaken = Effect.fn('MemberStore.removeTaken')(function* (pathId: PathId) {
      yield* removeWhere(pathId, eq(pathMembers.source, 'taken'));
    });

    return MemberStore.of({ listInvited, invite, take, remove, removeTaken });
  }),
);
