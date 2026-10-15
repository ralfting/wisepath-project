import { Effect, Layer, Option, Schema } from 'effect';
import { and, desc, eq } from 'drizzle-orm';
import { InboxItem } from '@wisepath/domain/inbox';
import type { InboxItemId } from '@wisepath/domain/inbox';
import type { UserId } from '@wisepath/domain/auth';
import { Database } from '../../shared/infrastructure/database/Database';
import { inboxItems } from '../../shared/infrastructure/database/schema';
import { InboxStore } from '../application/InboxStore';

/**
 * Inbox items in Postgres through Drizzle, decoded with the domain's schema so
 * a row the domain would not accept fails loudly.
 */

/** The item as the domain sees it: no nulls, ISO dates */
const toDomain = (row: typeof inboxItems.$inferSelect) =>
  Schema.decodeUnknownEffect(InboxItem)({
    id: row.id,
    text: row.text,
    ...(row.url !== null ? { url: row.url } : {}),
    ...(row.title !== null ? { title: row.title } : {}),
    ...(row.videoTime !== null ? { videoTime: row.videoTime } : {}),
    createdAt: row.createdAt.toISOString(),
  }).pipe(Effect.orDie);

export const DrizzleInboxStore = Layer.effect(
  InboxStore,
  Effect.gen(function* () {
    const { db, run } = yield* Database;

    const owned = (ownerId: UserId, id: InboxItemId) => and(eq(inboxItems.id, id), eq(inboxItems.ownerId, ownerId));

    const listOwned = Effect.fn('InboxStore.listOwned')(function* (ownerId: UserId) {
      const rows = yield* run(
        db
          .select()
          .from(inboxItems)
          .where(eq(inboxItems.ownerId, ownerId))
          .orderBy(desc(inboxItems.createdAt), desc(inboxItems.id)),
      );
      return yield* Effect.forEach(rows, toDomain);
    });

    const find = Effect.fn('InboxStore.find')(function* (ownerId: UserId, id: InboxItemId) {
      const [row] = yield* run(db.select().from(inboxItems).where(owned(ownerId, id)));
      return row ? Option.some(yield* toDomain(row)) : Option.none<InboxItem>();
    });

    const insert = Effect.fn('InboxStore.insert')(function* (ownerId: UserId, item: InboxItem) {
      const created = yield* run(
        db
          .insert(inboxItems)
          .values({
            id: item.id,
            ownerId,
            text: item.text,
            url: item.url ?? null,
            title: item.title ?? null,
            videoTime: item.videoTime ?? null,
            createdAt: new Date(item.createdAt),
          })
          .onConflictDoNothing()
          .returning({ id: inboxItems.id }),
      );
      return created.length > 0;
    });

    const remove = Effect.fn('InboxStore.remove')(function* (ownerId: UserId, id: InboxItemId) {
      yield* run(db.delete(inboxItems).where(owned(ownerId, id)));
    });

    return InboxStore.of({ listOwned, find, insert, remove });
  }),
);
