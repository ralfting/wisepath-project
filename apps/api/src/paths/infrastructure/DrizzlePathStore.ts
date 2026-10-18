import { Effect, Layer, Option, Schema } from 'effect';
import { and, asc, eq, inArray, or, sql } from 'drizzle-orm';
import { Path, accessOf } from '@wisepath/domain/paths';
import type { Page, PathId, PathVisibility } from '@wisepath/domain/paths';
import { UserId } from '@wisepath/domain/auth';
import { ProjectId } from '@wisepath/domain/projects';
import { Database } from '../../shared/infrastructure/database/Database';
import { pageProgress, pages, pathMembers, paths, projects } from '../../shared/infrastructure/database/schema';
import { PathStore } from '../application/PathStore';

/**
 * Paths in Postgres through Drizzle. What comes back is decoded with the
 * domain's Path schema, so a row the domain would not accept fails loudly.
 */

type PageRow = typeof pages.$inferSelect & { readonly progress: ReadonlyArray<unknown> };
type PathRow = typeof paths.$inferSelect & {
  readonly pages: ReadonlyArray<PageRow>;
  readonly project: { readonly ownerId: string; readonly owner: { readonly name: string | null } };
  /** Only the reader's membership, if they have one */
  readonly members: ReadonlyArray<typeof pathMembers.$inferSelect>;
  readonly publication: { readonly status: 'pending' | 'declined' } | null;
};

/** What the reader may do with the map, by the domain's one rule */
const accessFor = (row: PathRow, reader: UserId | null) =>
  accessOf(
    {
      ownerId: UserId.make(row.project.ownerId),
      visibility: row.visibility,
      members: row.members.map((m) => ({ userId: UserId.make(m.userId), role: m.role, source: m.source })),
    },
    reader,
  );

/** The map as the domain sees it, as its reader may use it and with their marks: no nulls, ISO dates */
const toDomain = (row: PathRow, reader: UserId | null) => {
  const access = accessFor(row, reader);
  return Schema.decodeUnknownEffect(Path)({
    id: row.id,
    title: row.title,
    ...(row.description !== null ? { description: row.description } : {}),
    kind: row.kind,
    rootPageId: row.rootPageId,
    visibility: row.visibility,
    access,
    ...(row.audience !== null ? { audience: row.audience } : {}),
    ...(row.language !== null ? { language: row.language } : {}),
    // Whether its owner asked to publish it, and what came of it, is theirs to know
    ...(access === 'owner' && row.publication ? { publication: row.publication.status } : {}),
    pages: row.pages.map((page) => ({
      id: page.id,
      title: page.title,
      content: page.content,
      studied: page.progress.length > 0,
      updatedAt: page.updatedAt.toISOString(),
      ...(page.module !== null ? { module: page.module } : {}),
      ...(page.color !== null ? { color: page.color } : {}),
      ...(page.icon !== null ? { icon: page.icon } : {}),
    })),
  }).pipe(Effect.orDie);
};

/** Keeps titles unique per map in the database too; untitled pages don't count */
const titleKey = (title: string) => title.trim().toLowerCase() || null;

/** A page's columns, except the keys and its position; studied is the learner's, in page_progress */
const pageColumns = (page: Page) => ({
  title: page.title,
  titleKey: titleKey(page.title),
  content: page.content,
  module: page.module ?? null,
  color: page.color ?? null,
  icon: page.icon ?? null,
  updatedAt: new Date(page.updatedAt),
});

const samePage = (a: Page, b: Page) =>
  a === b ||
  (a.title === b.title &&
    a.content === b.content &&
    a.updatedAt === b.updatedAt &&
    a.module === b.module &&
    a.color === b.color &&
    a.icon === b.icon);

/**
 * What a map is read with: its pages in the order they were added, each with the reader's mark when they studied
 * it, the owner, and the reader's membership. No reader (a public link opened logged out): no marks, no membership.
 */
const readFor = (reader: UserId | null) => {
  const theirs = (column: typeof pageProgress.userId | typeof pathMembers.userId) =>
    reader === null ? sql`false` : eq(column, reader);
  return {
    pages: {
      orderBy: [asc(pages.position), asc(pages.id)],
      with: { progress: { columns: { pageId: true as const }, where: theirs(pageProgress.userId) } },
    },
    project: { columns: { ownerId: true as const }, with: { owner: { columns: { name: true as const } } } },
    members: { where: theirs(pathMembers.userId) },
    publication: { columns: { status: true as const } },
  };
};

export const DrizzlePathStore = Layer.effect(
  PathStore,
  Effect.gen(function* () {
    const { db, run, transaction } = yield* Database;

    const insertPages = (pathId: PathId, added: ReadonlyArray<Page>, from: number) => {
      if (added.length === 0) return Effect.void;

      const rows = added.map((page, i) => ({ pathId, id: page.id, position: from + i, ...pageColumns(page) }));
      return run(db.insert(pages).values(rows));
    };

    /** Writes the learner's marks that differ between two versions of a map; its pages already stored */
    const saveProgress = (learnerId: UserId, pathId: PathId, before: ReadonlyArray<Page>, after: ReadonlyArray<Page>) =>
      Effect.gen(function* () {
        const was = new Set(before.filter((p) => p.studied).map((p) => p.id));
        const marked = after.filter((p) => p.studied && !was.has(p.id)).map((p) => p.id);
        const unmarked = after.filter((p) => !p.studied && was.has(p.id)).map((p) => p.id);

        if (marked.length > 0) {
          const rows = marked.map((pageId) => ({ userId: learnerId, pathId, pageId }));
          yield* run(db.insert(pageProgress).values(rows).onConflictDoNothing());
        }
        if (unmarked.length > 0) {
          yield* run(
            db
              .delete(pageProgress)
              .where(
                and(eq(pageProgress.userId, learnerId), eq(pageProgress.pathId, pathId), inArray(pageProgress.pageId, unmarked)),
              ),
          );
        }
      });

    /** A path is the owner's when its project is */
    const ownedBy = (ownerId: UserId) =>
      inArray(paths.projectId, db.select({ id: projects.id }).from(projects).where(eq(projects.ownerId, ownerId)));

    /** A path is someone's other than its owner's when they are its member */
    const memberOf = (userId: UserId) =>
      inArray(paths.id, db.select({ id: pathMembers.pathId }).from(pathMembers).where(eq(pathMembers.userId, userId)));

    const listFor = Effect.fn('PathStore.listFor')(function* (learnerId: UserId) {
      const rows = yield* run(
        db.query.paths.findMany({
          where: or(ownedBy(learnerId), memberOf(learnerId)),
          orderBy: [asc(paths.createdAt), asc(paths.id)],
          with: readFor(learnerId),
        }),
      );

      return yield* Effect.forEach(rows, (row) =>
        toDomain(row, learnerId).pipe(
          Effect.map((path) =>
            path.access === 'owner'
              ? { path, projectId: ProjectId.make(row.projectId), ownerName: null }
              : { path, projectId: null, ownerName: row.project.owner.name },
          ),
        ),
      );
    });

    const find = Effect.fn('PathStore.find')(function* (
      reader: UserId | null,
      id: PathId,
      options?: { readonly lock?: boolean },
    ) {
      if (options?.lock) {
        yield* run(db.select({ id: paths.id }).from(paths).where(eq(paths.id, id)).for('update'));
      }

      const row = yield* run(db.query.paths.findFirst({ where: eq(paths.id, id), with: readFor(reader) }));
      if (!row) return Option.none<Path>();

      const path = yield* toDomain(row, reader);
      return path.access === 'none' ? Option.none<Path>() : Option.some(path);
    });

    const insert = Effect.fn('PathStore.insert')(function* (learnerId: UserId, projectId: ProjectId, path: Path) {
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
          yield* saveProgress(learnerId, path.id, [], path.pages);
          return true;
        }),
      );
    });

    const save = Effect.fn('PathStore.save')(function* (learnerId: UserId, before: Path, after: Path) {
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

          yield* saveProgress(learnerId, after.id, before.pages, after.pages);
        }),
      );
    });

    const remove = Effect.fn('PathStore.remove')(function* (ownerId: UserId, id: PathId) {
      yield* run(db.delete(paths).where(and(eq(paths.id, id), ownedBy(ownerId))));
    });

    const move = Effect.fn('PathStore.move')(function* (id: PathId, projectId: ProjectId) {
      yield* run(db.update(paths).set({ projectId }).where(eq(paths.id, id)));
    });

    const setVisibility = Effect.fn('PathStore.setVisibility')(function* (id: PathId, visibility: PathVisibility) {
      yield* run(db.update(paths).set({ visibility }).where(eq(paths.id, id)));
    });

    return PathStore.of({ listFor, find, insert, move, setVisibility, save, remove, transaction });
  }),
);
