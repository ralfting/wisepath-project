import { Effect, Layer, Option, Schema } from 'effect';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { Project } from '@wisepath/domain/projects';
import type { Page, ProjectId } from '@wisepath/domain/projects';
import type { UserId } from '@wisepath/domain/auth';
import { Database } from '../../shared/infrastructure/database/Database';
import { pages, projects, users } from '../../shared/infrastructure/database/schema';
import { ProjectStore } from '../application/ProjectStore';

/**
 * Projects in Postgres through Drizzle. What comes back is decoded with the
 * domain's Project schema, so a row the domain would not accept fails loudly.
 */

type ProjectRow = typeof projects.$inferSelect & { readonly pages: ReadonlyArray<typeof pages.$inferSelect> };

/** The map as the domain sees it: no nulls, ISO dates */
const toDomain = (row: ProjectRow) =>
  Schema.decodeUnknownEffect(Project)({
    id: row.id,
    title: row.title,
    ...(row.description !== null ? { description: row.description } : {}),
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

export const DrizzleProjectStore = Layer.effect(
  ProjectStore,
  Effect.gen(function* () {
    const { db, run, transaction } = yield* Database;

    const insertPages = (projectId: ProjectId, added: ReadonlyArray<Page>, from: number) => {
      if (added.length === 0) return Effect.void;

      const rows = added.map((page, i) => ({ projectId, id: page.id, position: from + i, ...pageColumns(page) }));
      return run(db.insert(pages).values(rows));
    };

    const listOwned = Effect.fn('ProjectStore.listOwned')(function* (ownerId: UserId) {
      const rows = yield* run(
        db.query.projects.findMany({
          where: eq(projects.ownerId, ownerId),
          orderBy: [asc(projects.createdAt), asc(projects.id)],
          with: { pages: pagesInOrder },
        }),
      );

      return yield* Effect.forEach(rows, toDomain);
    });

    const find = Effect.fn('ProjectStore.find')(function* (
      ownerId: UserId,
      id: ProjectId,
      options?: { readonly lock?: boolean },
    ) {
      const owned = and(eq(projects.id, id), eq(projects.ownerId, ownerId));

      if (options?.lock) {
        yield* run(db.select({ id: projects.id }).from(projects).where(owned).for('update'));
      }

      const row = yield* run(db.query.projects.findFirst({ where: owned, with: { pages: pagesInOrder } }));
      if (!row) return Option.none<Project>();

      return Option.some(yield* toDomain(row));
    });

    const insert = Effect.fn('ProjectStore.insert')(function* (ownerId: UserId, project: Project) {
      return yield* transaction(
        Effect.gen(function* () {
          const created = yield* run(
            db
              .insert(projects)
              .values({
                id: project.id,
                ownerId,
                title: project.title,
                description: project.description ?? null,
                rootPageId: project.rootPageId,
              })
              .onConflictDoNothing()
              .returning({ id: projects.id }),
          );
          if (created.length === 0) return false;

          yield* insertPages(project.id, project.pages, 0);
          return true;
        }),
      );
    });

    const save = Effect.fn('ProjectStore.save')(function* (before: Project, after: Project) {
      yield* transaction(
        Effect.gen(function* () {
          if (before.title !== after.title || before.description !== after.description) {
            yield* run(
              db
                .update(projects)
                .set({ title: after.title, description: after.description ?? null })
                .where(eq(projects.id, after.id)),
            );
          }

          const old = new Map(before.pages.map((p) => [p.id, p]));
          const kept = new Set(after.pages.map((p) => p.id));

          const removed = before.pages.filter((p) => !kept.has(p.id)).map((p) => p.id);
          if (removed.length > 0) {
            yield* run(db.delete(pages).where(and(eq(pages.projectId, after.id), inArray(pages.id, removed))));
          }

          for (const page of after.pages) {
            const was = old.get(page.id);
            if (!was || samePage(was, page)) continue;

            yield* run(
              db
                .update(pages)
                .set(pageColumns(page))
                .where(and(eq(pages.projectId, after.id), eq(pages.id, page.id))),
            );
          }

          const added = after.pages.filter((p) => !old.has(p.id));
          if (added.length > 0) {
            const [{ next }] = yield* run(
              db
                .select({ next: sql<number>`coalesce(max(${pages.position}) + 1, 0)::int` })
                .from(pages)
                .where(eq(pages.projectId, after.id)),
            );
            yield* insertPages(after.id, added, next);
          }
        }),
      );
    });

    const remove = Effect.fn('ProjectStore.remove')(function* (ownerId: UserId, id: ProjectId) {
      yield* run(db.delete(projects).where(and(eq(projects.id, id), eq(projects.ownerId, ownerId))));
    });

    const claimSample = Effect.fn('ProjectStore.claimSample')(function* (ownerId: UserId) {
      const claimed = yield* run(
        db
          .update(users)
          .set({ sampleSeededAt: new Date() })
          .where(and(eq(users.id, ownerId), isNull(users.sampleSeededAt)))
          .returning({ id: users.id }),
      );
      return claimed.length > 0;
    });

    return ProjectStore.of({ listOwned, find, insert, save, remove, claimSample, transaction });
  }),
);
