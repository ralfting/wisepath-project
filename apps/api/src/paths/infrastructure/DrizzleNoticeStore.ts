import { randomUUID } from 'node:crypto';
import { Effect, Layer, Schema } from 'effect';
import { and, asc, eq } from 'drizzle-orm';
import type { UserId } from '@wisepath/domain/auth';
import { AccessNotice } from '@wisepath/domain/paths';
import type { NoticeId } from '@wisepath/domain/paths';
import { Database } from '../../shared/infrastructure/database/Database';
import { accessNotices } from '../../shared/infrastructure/database/schema';
import { NoticeStore } from '../application/NoticeStore';

/** Notices in Postgres through Drizzle; what is listed is decoded with the domain's schema */
export const DrizzleNoticeStore = Layer.effect(
  NoticeStore,
  Effect.gen(function* () {
    const { db, run } = yield* Database;

    const add = Effect.fn('NoticeStore.add')(function* (userIds: ReadonlyArray<UserId>, notice: Omit<AccessNotice, 'id'>) {
      if (userIds.length === 0) return;
      yield* run(db.insert(accessNotices).values(userIds.map((userId) => ({ id: randomUUID(), userId, ...notice }))));
    });

    const list = Effect.fn('NoticeStore.list')(function* (userId: UserId) {
      const rows = yield* run(
        db
          .select({ id: accessNotices.id, pathTitle: accessNotices.pathTitle, ownerName: accessNotices.ownerName, reason: accessNotices.reason })
          .from(accessNotices)
          .where(eq(accessNotices.userId, userId))
          .orderBy(asc(accessNotices.createdAt), asc(accessNotices.id)),
      );
      return yield* Schema.decodeUnknownEffect(Schema.Array(AccessNotice))(rows).pipe(Effect.orDie);
    });

    const dismiss = Effect.fn('NoticeStore.dismiss')(function* (userId: UserId, id: NoticeId) {
      yield* run(db.delete(accessNotices).where(and(eq(accessNotices.userId, userId), eq(accessNotices.id, id))));
    });

    return NoticeStore.of({ add, list, dismiss });
  }),
);
