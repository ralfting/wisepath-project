import { Effect, Layer, Option, Schema } from 'effect';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { Path } from '@wisepath/domain/paths';
import type { Page, PathId } from '@wisepath/domain/paths';
import type { UserId } from '@wisepath/domain/auth';
import { ProjectId } from '@wisepath/domain/projects';
import { Database } from '../../shared/infrastructure/database/Database';
import { pages, paths, projects, users } from '../../shared/infrastructure/database/schema';
import { PathStore } from '../application/PathStore';

/**
 * Paths in Postgres through Drizzle. What comes back is decoded with the
 * domain's Path schema, so a row the domain would not accept fails loudly.
 */

type PathRow = typeof paths.$inferSelect & { readonly pages: ReadonlyArray<typeof pages.$inferSelect> };

/** The map as the domain sees it: no nulls, ISO dates */
const toDomain = (row: PathRow) =>
  Schema.decodeUnknownEffect(Path)({
    id: row.id,
    title: row.title,
    ...(row.description !== null ? { description: row.description } : {}),
    kind: row.kind,
    rootPageId: row.rootPageId,
    pages: row.pages.map((page) => ({
      id: page.id,
      title: page.title,
      content: page.content,
      studied: page.studied,
      updatedAt: page.updatedAt.toISOString(),
      ...(page.module !== null ? { module: page.module } : {}),
      ...(page.color !== null ? { color: page.color } : {}),
      ...(page.icon !== null ? { icon: page.icon } : {}),
    })),
  }).pipe(Effect.orDie);

/** Keeps titles unique per map in the database too; untitled pages don't count */
const titleKey = (title: string) => title.trim().toLowerCase() || null;

/** A page's columns, except the keys and its position */
const pageColumns = (page: Page) => ({
  title: page.title,
  titleKey: titleKey(page.title),
  content: page.content,
  studied: page.studied,
  module: page.module ?? null,
  color: page.color ?? null,
  icon: page.icon ?? null,
  updatedAt: new Date(page.updatedAt),
});

const samePage = (a: Page, b: Page) =>
  a === b ||
  (a.title === b.title &&
    a.content === b.content &&
    a.studied === b.studied &&
    a.updatedAt === b.updatedAt &&
    a.module === b.module &&
    a.color === b.color &&
    a.icon === b.icon);

/** Pages in the order they were added */
const pagesInOrder = { orderBy: [asc(pages.position), asc(pages.id)] };

export const DrizzlePathStore = Layer.effect(
  PathStore,
  Effect.gen(function* () {
    const { db, run, transaction } = yield* Database;

    const insertPages = (pathId: PathId, added: ReadonlyArray<Page>, from: number) => {
      if (added.length === 0) return Effect.void;

      const rows = added.map((page, i) => ({ pathId, id: page.id, position: from + i, ...pageColumns(page) }));
      return run(db.insert(pages).values(rows));
    };

    /** A path is the owner's when its project is */
    const ownedBy = (ownerId: UserId) =>
      inArray(paths.projectId, db.select({ id: projects.id }).from(projects).where(eq(projects.ownerId, ownerId)));

    const listOwned = Effect.fn('PathStore.listOwned')(function* (ownerId: UserId) {
      const rows = yield* run(
        db.query.paths.findMany({
          where: ownedBy(ownerId),
          orderBy: [asc(paths.createdAt), asc(paths.id)],
          with: { pages: pagesInOrder },
        }),
      );

      return yield* Effect.forEach(rows, (row) =>
        toDomain(row).pipe(Effect.map((path) => ({ path, projectId: ProjectId.make(row.projectId) }))),
      );
    });

    const find = Effect.fn('PathStore.find')(function* (
      ownerId: UserId,
      id: PathId,
      options?: { readonly lock?: boolean },
    ) {
      const owned = and(eq(paths.id, id), ownedBy(ownerId));

      if (options?.lock) {
        yield* run(db.select({ id: paths.id }).from(paths).where(owned).for('update'));
      }

      const row = yield* run(db.query.paths.findFirst({ where: owned, with: { pages: pagesInOrder } }));
      if (!row) return Option.none<Path>();

      return Option.some(yield* toDomain(row));
    });

    const insert = Effect.fn('PathStore.insert')(function* (projectId: ProjectId, path: Path) {
      return yield* transaction(
        Effect.gen(function* () {
          const created = yield* run(
            db
              .insert(paths)
              .values({
                id: path.id,
                projectId,
                title: path.title,
                description: path.description ?? null,
                kind: path.kind,
                rootPageId: path.rootPageId,
              })
              .onConflictDoNothing()
              .returning({ id: paths.id }),
          );
          if (created.length === 0) return false;

          yield* insertPages(path.id, path.pages, 0);
          return true;
        }),
      );
    });

    const save = Effect.fn('PathStore.save')(function* (before: Path, after: Path) {
      yield* transaction(
        Effect.gen(function* () {
          if (before.title !== after.title || before.description !== after.description || before.kind !== after.kind) {
            yield* run(
              db
                .update(paths)
                .set({ title: after.title, description: after.description ?? null, kind: after.kind })
                .where(eq(paths.id, after.id)),
            );
          }

          const old = new Map(before.pages.map((p) => [p.id, p]));
          const kept = new Set(after.pages.map((p) => p.id));

          const removed = before.pages.filter((p) => !kept.has(p.id)).map((p) => p.id);
          if (removed.length > 0) {
            yield* run(db.delete(pages).where(and(eq(pages.pathId, after.id), inArray(pages.id, removed))));
          }

          for (const page of after.pages) {
            const was = old.get(page.id);
            if (!was || samePage(was, page)) continue;

            yield* run(
              db
                .update(pages)
                .set(pageColumns(page))
                .where(and(eq(pages.pathId, after.id), eq(pages.id, page.id))),
            );
          }

          const added = after.pages.filter((p) => !old.has(p.id));
          if (added.length > 0) {
            const [{ next }] = yield* run(
              db
                .select({ next: sql<number>`coalesce(max(${pages.position}) + 1, 0)::int` })
                .from(pages)
                .where(eq(pages.pathId, after.id)),
            );
            yield* insertPages(after.id, added, next);
          }
        }),
      );
    });

    const remove = Effect.fn('PathStore.remove')(function* (ownerId: UserId, id: PathId) {
      yield* run(db.delete(paths).where(and(eq(paths.id, id), ownedBy(ownerId))));
    });

    const move = Effect.fn('PathStore.move')(function* (id: PathId, projectId: ProjectId) {
      yield* run(db.update(paths).set({ projectId }).where(eq(paths.id, id)));
    });

    const claimSample = Effect.fn('PathStore.claimSample')(function* (ownerId: UserId) {
      const claimed = yield* run(
        db
          .update(users)
          .set({ sampleSeededAt: new Date() })
          .where(and(eq(users.id, ownerId), isNull(users.sampleSeededAt)))
          .returning({ id: users.id }),
      );
      return claimed.length > 0;
    });

    return PathStore.of({ listOwned, find, insert, move, save, remove, claimSample, transaction });
  }),
);
