import { Effect, Layer, Schema } from 'effect';
import { and, asc, count, eq, isNotNull, like, sql } from 'drizzle-orm';
import { PendingPublication, freeSlug, slugOf } from '@wisepath/domain/paths';
import type { PathId, PublicationRequest } from '@wisepath/domain/paths';
import { Database } from '../../shared/infrastructure/database/Database';
import { pages, paths, projects, publicationRequests, users } from '../../shared/infrastructure/database/schema';
import { PublicationStore } from '../application/PublicationStore';

/** Requests to publish paths, in Postgres through Drizzle */
export const DrizzlePublicationStore = Layer.effect(
  PublicationStore,
  Effect.gen(function* () {
    const { db, run } = yield* Database;

    const describe = Effect.fn('PublicationStore.describe')(function* (pathId: PathId, request: PublicationRequest) {
      yield* run(
        db
          .update(paths)
          .set({ description: request.description, audience: request.audience, language: request.language })
          .where(eq(paths.id, pathId)),
      );
    });

    const request = Effect.fn('PublicationStore.request')(function* (pathId: PathId) {
      const waiting = { status: 'pending' as const, requestedAt: new Date(), decidedAt: null };
      yield* run(
        db
          .insert(publicationRequests)
          .values({ pathId, ...waiting })
          .onConflictDoUpdate({ target: publicationRequests.pathId, set: waiting }),
      );
    });

    const decline = Effect.fn('PublicationStore.decline')(function* (pathId: PathId) {
      yield* run(
        db
          .update(publicationRequests)
          .set({ status: 'declined', decidedAt: new Date() })
          .where(eq(publicationRequests.pathId, pathId)),
      );
    });

    const drop = Effect.fn('PublicationStore.drop')(function* (pathId: PathId) {
      yield* run(db.delete(publicationRequests).where(eq(publicationRequests.pathId, pathId)));
    });

    const assignSlug = Effect.fn('PublicationStore.assignSlug')(function* (pathId: PathId) {
      const [path] = yield* run(db.select({ title: paths.title, slug: paths.slug }).from(paths).where(eq(paths.id, pathId)));
      if (!path || path.slug !== null) return;
      // One approval picks a slug at a time, until its transaction commits: two of the same title at once read the
      // same free slug, and the second write broke the unique index
      yield* run(db.execute(sql`select pg_advisory_xact_lock(hashtext('paths.slug'))`));
      const base = slugOf(path.title) || 'path';
      const similar = yield* run(
        db.select({ slug: paths.slug }).from(paths).where(and(isNotNull(paths.slug), like(paths.slug, `${base}%`))),
      );
      const slug = freeSlug(base, new Set(similar.map((row) => row.slug!)));
      yield* run(db.update(paths).set({ slug }).where(eq(paths.id, pathId)));
    });

    const isPending = Effect.fn('PublicationStore.isPending')(function* (pathId: PathId) {
      const rows = yield* run(
        db
          .select({ pathId: publicationRequests.pathId })
          .from(publicationRequests)
          .where(and(eq(publicationRequests.pathId, pathId), eq(publicationRequests.status, 'pending'))),
      );
      return rows.length > 0;
    });

    const listPending = Effect.fn('PublicationStore.listPending')(function* () {
      const rows = yield* run(
        db
          .select({
            pathId: paths.id,
            title: paths.title,
            description: paths.description,
            audience: paths.audience,
            language: paths.language,
            pages: count(pages.id),
            ownerName: users.name,
            ownerEmail: users.email,
            requestedAt: publicationRequests.requestedAt,
          })
          .from(publicationRequests)
          .innerJoin(paths, eq(paths.id, publicationRequests.pathId))
          .innerJoin(projects, eq(projects.id, paths.projectId))
          .innerJoin(users, eq(users.id, projects.ownerId))
          .leftJoin(pages, eq(pages.pathId, paths.id))
          .where(eq(publicationRequests.status, 'pending'))
          .groupBy(paths.id, users.id, publicationRequests.pathId)
          .orderBy(asc(publicationRequests.requestedAt), asc(paths.id)),
      );
      return yield* Effect.forEach(rows, (row) =>
        Schema.decodeUnknownEffect(PendingPublication)({
          ...row,
          description: row.description ?? '',
          audience: row.audience ?? '',
          requestedAt: row.requestedAt.toISOString(),
        }).pipe(Effect.orDie),
      );
    });

    return PublicationStore.of({ describe, request, decline, drop, assignSlug, isPending, listPending });
  }),
);
