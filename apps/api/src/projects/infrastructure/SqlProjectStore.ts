import { Effect, Layer, Option, Schema } from 'effect';
import { SqlClient, SqlSchema } from 'effect/sql';
import { UserId } from '@wisepath/domain/auth';
import { PageColor, PageIcon, PageId, ProjectId } from '@wisepath/domain/projects';
import type { Page, Project } from '@wisepath/domain/projects';
import { ProjectStore } from '../application/ProjectStore';

/**
 * Projects in Postgres: one row per map in `projects`, one per page in
 * `pages` (tables made by the Prisma migrations). Rows are decoded with the
 * domain schemas, so a row the domain would not accept fails loudly.
 */

const ProjectRow = Schema.Struct({
  id: ProjectId,
  title: Schema.String,
  description: Schema.NullOr(Schema.String),
  rootPageId: PageId,
});
type ProjectRow = typeof ProjectRow.Type;

const PageRow = Schema.Struct({
  id: PageId,
  projectId: ProjectId,
  title: Schema.String,
  content: Schema.String,
  studied: Schema.Boolean,
  module: Schema.NullOr(Schema.Boolean),
  color: Schema.NullOr(PageColor),
  icon: Schema.NullOr(PageIcon),
  updatedAt: Schema.String,
});
type PageRow = typeof PageRow.Type;

const OwnerQuery = Schema.Struct({ ownerId: UserId });
const ProjectQuery = Schema.Struct({ ownerId: UserId, id: ProjectId, lock: Schema.Boolean });
const PagesQuery = Schema.Struct({ projectIds: Schema.Array(ProjectId) });

/** Keeps titles unique per map in the database too; untitled pages don't count */
const titleKey = (title: string) => title.trim().toLowerCase() || null;

const toPage = (row: PageRow): Page => ({
  id: row.id,
  title: row.title,
  content: row.content,
  studied: row.studied,
  updatedAt: row.updatedAt,
  ...(row.module !== null ? { module: row.module } : {}),
  ...(row.color !== null ? { color: row.color } : {}),
  ...(row.icon !== null ? { icon: row.icon } : {}),
});

const toProject = (row: ProjectRow, pages: ReadonlyArray<PageRow>): Project => ({
  id: row.id,
  title: row.title,
  ...(row.description !== null ? { description: row.description } : {}),
  rootPageId: row.rootPageId,
  pages: pages.filter((p) => p.projectId === row.id).map(toPage),
});

const pageColumns = (projectId: ProjectId, page: Page) => ({
  projectId,
  id: page.id,
  title: page.title,
  titleKey: titleKey(page.title),
  content: page.content,
  studied: page.studied,
  module: page.module ?? null,
  color: page.color ?? null,
  icon: page.icon ?? null,
  updatedAt: page.updatedAt,
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

export const SqlProjectStore = Layer.effect(
  ProjectStore,
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    // ISO dates as the domain keeps them, whatever the session's time zone
    const updatedAt = sql.literal(
      `to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS updated_at`,
    );

    const projectsOf = SqlSchema.findAll({
      Request: OwnerQuery,
      Result: ProjectRow,
      execute: ({ ownerId }) => sql`
        SELECT id, title, description, root_page_id
        FROM projects
        WHERE owner_id = ${ownerId}
        ORDER BY created_at, id`,
    });

    const pagesOf = SqlSchema.findAll({
      Request: PagesQuery,
      Result: PageRow,
      execute: ({ projectIds }) => sql`
        SELECT id, project_id, title, content, studied, module, color, icon, ${updatedAt}
        FROM pages
        WHERE ${sql.in('project_id', projectIds)}
        ORDER BY position, id`,
    });

    const projectById = SqlSchema.findOneOption({
      Request: ProjectQuery,
      Result: ProjectRow,
      execute: ({ ownerId, id, lock }) => sql`
        SELECT id, title, description, root_page_id
        FROM projects
        WHERE id = ${id} AND owner_id = ${ownerId}
        ${sql.literal(lock ? 'FOR UPDATE' : '')}`,
    });

    const listOwned = Effect.fn('ProjectStore.listOwned')(function* (ownerId: UserId) {
      const rows = yield* projectsOf({ ownerId });
      if (rows.length === 0) return [];

      const pages = yield* pagesOf({ projectIds: rows.map((r) => r.id) });
      return rows.map((row) => toProject(row, pages));
    }, Effect.orDie);

    const find = Effect.fn('ProjectStore.find')(function* (
      ownerId: UserId,
      id: ProjectId,
      options?: { readonly lock?: boolean },
    ) {
      const row = yield* projectById({ ownerId, id, lock: options?.lock ?? false });
      if (Option.isNone(row)) return Option.none<Project>();

      const pages = yield* pagesOf({ projectIds: [id] });
      return Option.some(toProject(row.value, pages));
    }, Effect.orDie);

    const insertPages = (projectId: ProjectId, pages: ReadonlyArray<Page>, from: number) => {
      if (pages.length === 0) return Effect.void;

      const rows = pages.map((page, i) => ({ ...pageColumns(projectId, page), position: from + i }));
      return sql`INSERT INTO pages ${sql.insert(rows)}`;
    };

    const insert = Effect.fn('ProjectStore.insert')(
      function* (ownerId: UserId, project: Project) {
        const created = yield* sql`
          INSERT INTO projects ${sql.insert({
            id: project.id,
            ownerId,
            title: project.title,
            description: project.description ?? null,
            rootPageId: project.rootPageId,
          })}
          ON CONFLICT (id) DO NOTHING
          RETURNING id`;
        if (created.length === 0) return false;

        yield* insertPages(project.id, project.pages, 0);
        return true;
      },
      (effect) => sql.withTransaction(effect),
      Effect.orDie,
    );

    const save = Effect.fn('ProjectStore.save')(
      function* (before: Project, after: Project) {
        if (before.title !== after.title || before.description !== after.description) {
          const columns = { title: after.title, description: after.description ?? null };
          yield* sql`UPDATE projects SET ${sql.update(columns)} WHERE id = ${after.id}`;
        }

        const old = new Map(before.pages.map((p) => [p.id, p]));
        const kept = new Set(after.pages.map((p) => p.id));

        const removed = before.pages.filter((p) => !kept.has(p.id)).map((p) => p.id);
        if (removed.length > 0) {
          yield* sql`DELETE FROM pages WHERE project_id = ${after.id} AND ${sql.in('id', removed)}`;
        }

        for (const page of after.pages) {
          const was = old.get(page.id);
          if (!was || samePage(was, page)) continue;

          const { projectId: _projectId, id: _id, ...columns } = pageColumns(after.id, page);
          yield* sql`UPDATE pages SET ${sql.update(columns)} WHERE project_id = ${after.id} AND id = ${page.id}`;
        }

        const added = after.pages.filter((p) => !old.has(p.id));
        if (added.length > 0) {
          const [{ next }] = yield* sql<{ next: number }>`
            SELECT COALESCE(MAX(position) + 1, 0)::int AS next
            FROM pages
            WHERE project_id = ${after.id}`;
          yield* insertPages(after.id, added, next);
        }
      },
      (effect) => sql.withTransaction(effect),
      Effect.orDie,
    );

    const remove = Effect.fn('ProjectStore.remove')(function* (ownerId: UserId, id: ProjectId) {
      yield* sql`DELETE FROM projects WHERE id = ${id} AND owner_id = ${ownerId}`;
    }, Effect.orDie);

    const claimSample = Effect.fn('ProjectStore.claimSample')(function* (ownerId: UserId) {
      const claimed = yield* sql`
        UPDATE "User"
        SET sample_seeded_at = now()
        WHERE id = ${ownerId} AND sample_seeded_at IS NULL
        RETURNING id`;
      return claimed.length > 0;
    }, Effect.orDie);

    const transaction = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
      sql.withTransaction(effect).pipe(Effect.catchTag('SqlError', Effect.die)) as Effect.Effect<A, E, R>;

    return ProjectStore.of({ listOwned, find, insert, save, remove, claimSample, transaction });
  }),
);
