import { randomUUID } from 'node:crypto';
import { Effect, Layer, Option } from 'effect';
import { and, eq, sql } from 'drizzle-orm';
import { defaultProjectName, ProjectId } from '@wisepath/domain/projects';
import type { Project } from '@wisepath/domain/projects';
import type { UserId } from '@wisepath/domain/auth';
import { Database } from '../../shared/infrastructure/database/Database';
import { paths, projects, users } from '../../shared/infrastructure/database/schema';
import { ProjectStore } from '../application/ProjectStore';

/** Projects in Postgres through Drizzle */

const toDomain = (row: typeof projects.$inferSelect): Project => ({
  id: ProjectId.make(row.id),
  name: row.name,
  isDefault: row.isDefault,
});

export const DrizzleProjectStore = Layer.effect(
  ProjectStore,
  Effect.gen(function* () {
    const { db, run, transaction } = yield* Database;

    const owned = (ownerId: UserId, id: ProjectId) => and(eq(projects.id, id), eq(projects.ownerId, ownerId));

    const listOwned = Effect.fn('ProjectStore.listOwned')(function* (ownerId: UserId) {
      const rows = yield* run(db.select().from(projects).where(eq(projects.ownerId, ownerId)));
      return rows.map(toDomain);
    });

    const findDefault = (ownerId: UserId) =>
      run(
        db
          .select()
          .from(projects)
          .where(and(eq(projects.ownerId, ownerId), eq(projects.isDefault, true))),
      );

    const ensureDefault = Effect.fn('ProjectStore.ensureDefault')(function* (ownerId: UserId) {
      const [found] = yield* findDefault(ownerId);
      if (found) return toDomain(found);

      const [user] = yield* run(db.select({ locale: users.locale }).from(users).where(eq(users.id, ownerId)));
      // Two requests may both find none: the unique index keeps one, and both read it back
      yield* run(
        db
          .insert(projects)
          .values({ id: randomUUID(), ownerId, name: defaultProjectName(user?.locale), isDefault: true })
          .onConflictDoNothing({ target: projects.ownerId, where: sql`${projects.isDefault}` }),
      );
      const [made] = yield* findDefault(ownerId);
      return toDomain(made);
    });

    const find = Effect.fn('ProjectStore.find')(function* (ownerId: UserId, id: ProjectId) {
      const [row] = yield* run(db.select().from(projects).where(owned(ownerId, id)));
      return row ? Option.some(toDomain(row)) : Option.none<Project>();
    });

    const insert = Effect.fn('ProjectStore.insert')(function* (ownerId: UserId, project: Project) {
      const created = yield* run(
        db
          .insert(projects)
          .values({ id: project.id, ownerId, name: project.name, isDefault: project.isDefault })
          .onConflictDoNothing()
          .returning({ id: projects.id }),
      );
      return created.length > 0;
    });

    const rename = Effect.fn('ProjectStore.rename')(function* (ownerId: UserId, id: ProjectId, name: string) {
      const renamed = yield* run(db.update(projects).set({ name }).where(owned(ownerId, id)).returning({ id: projects.id }));
      return renamed.length > 0;
    });

    const remove = Effect.fn('ProjectStore.remove')(function* (ownerId: UserId, id: ProjectId, to: ProjectId) {
      yield* transaction(
        Effect.gen(function* () {
          const [gone] = yield* run(db.select({ id: projects.id }).from(projects).where(owned(ownerId, id)).for('update'));
          if (!gone) return;

          yield* run(db.update(paths).set({ projectId: to }).where(eq(paths.projectId, id)));
          yield* run(db.delete(projects).where(eq(projects.id, id)));
        }),
      );
    });

    return ProjectStore.of({ listOwned, ensureDefault, find, insert, rename, remove, transaction });
  }),
);
