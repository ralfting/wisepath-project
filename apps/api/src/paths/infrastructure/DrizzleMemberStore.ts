import { Effect, Layer, Schema } from 'effect';
import { and, asc, eq, notInArray } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { UserId } from '@wisepath/domain/auth';
import { PathInvite, PathShare } from '@wisepath/domain/paths';
import type { MemberRole, PathId } from '@wisepath/domain/paths';
import { Database } from '../../shared/infrastructure/database/Database';
import { pageNotes, pageProgress, pathInvites, pathMembers, paths, projects, users } from '../../shared/infrastructure/database/schema';
import { MemberStore } from '../application/MemberStore';

/** Path members in Postgres through Drizzle; what the Share dialog lists is decoded with the domain's schema */
export const DrizzleMemberStore = Layer.effect(
  MemberStore,
  Effect.gen(function* () {
    const { db, run, transaction } = yield* Database;

    /**
     * Removes members of a path, then the marks and notes on it of everyone who may no longer study it (`whose`, over
     * the column of their id), in one transaction; the members removed
     */
    const removeWhere = (pathId: PathId, which: SQL, whose: (userId: PgColumn) => SQL) =>
      transaction(
        Effect.gen(function* () {
          const gone = yield* run(
            db
              .delete(pathMembers)
              .where(and(eq(pathMembers.pathId, pathId), which))
              .returning({ userId: pathMembers.userId }),
          );
          yield* run(db.delete(pageProgress).where(and(eq(pageProgress.pathId, pathId), whose(pageProgress.userId))));
          yield* run(db.delete(pageNotes).where(and(eq(pageNotes.pathId, pathId), whose(pageNotes.userId))));
          return gone.map((m) => UserId.make(m.userId));
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

    // Their marks and notes go even when they were never a member: a public path can be studied without taking it
    const remove = Effect.fn('MemberStore.remove')(function* (pathId: PathId, userId: UserId) {
      return (yield* removeWhere(pathId, eq(pathMembers.userId, userId), (column) => eq(column, userId))).length > 0;
    });

    const memberIds = Effect.fn('MemberStore.memberIds')(function* (pathId: PathId) {
      const rows = yield* run(db.select({ userId: pathMembers.userId }).from(pathMembers).where(eq(pathMembers.pathId, pathId)));
      return rows.map((row) => UserId.make(row.userId));
    });

    /** Everyone but the owner and the people invited loses the path and their marks and notes on it */
    const removeTaken = Effect.fn('MemberStore.removeTaken')(function* (pathId: PathId) {
      const owner = db.select({ id: projects.ownerId }).from(projects).innerJoin(paths, eq(paths.projectId, projects.id)).where(eq(paths.id, pathId));
      const invited = db
        .select({ id: pathMembers.userId })
        .from(pathMembers)
        .where(and(eq(pathMembers.pathId, pathId), eq(pathMembers.source, 'invited')));
      return yield* removeWhere(
        pathId,
        eq(pathMembers.source, 'taken'),
        (column) => and(notInArray(column, owner), notInArray(column, invited))!,
      );
    });

    // Kept in lower case, so a sign up matches whatever case the owner typed
    const folded = (email: string) => email.trim().toLowerCase();

    const listInvites = Effect.fn('MemberStore.listInvites')(function* (pathId: PathId) {
      const rows = yield* run(
        db
          .select({ email: pathInvites.email, role: pathInvites.role })
          .from(pathInvites)
          .where(eq(pathInvites.pathId, pathId))
          .orderBy(asc(pathInvites.createdAt), asc(pathInvites.email)),
      );
      return yield* Schema.decodeUnknownEffect(Schema.Array(PathInvite))(rows).pipe(Effect.orDie);
    });

    const keepInvite = Effect.fn('MemberStore.keepInvite')(function* (pathId: PathId, email: string, role: MemberRole) {
      const invite = { email: folded(email), role };
      yield* run(
        db
          .insert(pathInvites)
          .values({ pathId, ...invite })
          .onConflictDoUpdate({ target: [pathInvites.pathId, pathInvites.email], set: { role } }),
      );
      return invite;
    });

    const cancelInvite = Effect.fn('MemberStore.cancelInvite')(function* (pathId: PathId, email: string) {
      yield* run(db.delete(pathInvites).where(and(eq(pathInvites.pathId, pathId), eq(pathInvites.email, folded(email)))));
    });

    const claimInvites = Effect.fn('MemberStore.claimInvites')(function* (userId: UserId, email: string) {
      yield* transaction(
        Effect.gen(function* () {
          const claimed = yield* run(
            db.delete(pathInvites).where(eq(pathInvites.email, folded(email))).returning({ pathId: pathInvites.pathId, role: pathInvites.role }),
          );
          if (claimed.length === 0) return;
          const rows = claimed.map(({ pathId, role }) => ({ pathId, userId, role, source: 'invited' as const }));
          yield* run(db.insert(pathMembers).values(rows).onConflictDoNothing());
        }),
      );
    });

    return MemberStore.of({ listInvited, invite, take, remove, memberIds, listInvites, keepInvite, cancelInvite, claimInvites, removeTaken });
  }),
);
