import { Effect, Layer } from 'effect';
import { and, desc, eq, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { UserId } from '@wisepath/domain/auth';
import { PageId, PathId } from '@wisepath/domain/paths';
import { Database } from '../../shared/infrastructure/database/Database';
import { pages, paths, projects } from '../../shared/infrastructure/database/schema';
import { SearchStore } from '../application/SearchStore';

/**
 * Search in Postgres: `wp_fold` (lower case, unaccent) on titles and texts,
 * each with a trigram index, so `LIKE '%word%'` stays quick without a
 * separate search engine.
 */

/** A word as a LIKE pattern that finds it anywhere; % and _ in it are taken literally */
const anywhere = (word: string) => `%${word.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/** Matches the trigram indexes' expressions (see schema.ts), so they are used */
const folded = (column: typeof pages.title | typeof pages.content) => sql`wp_fold(${column})`;

const allIn = (column: typeof pages.title | typeof pages.content, words: ReadonlyArray<string>) =>
  and(...words.map((word) => sql`${folded(column)} like ${anywhere(word)}`)) as SQL;

export const DrizzleSearchStore = Layer.effect(
  SearchStore,
  Effect.gen(function* () {
    const { db, run } = yield* Database;

    const findPages = Effect.fn('SearchStore.findPages')(function* (ownerId: UserId, words: ReadonlyArray<string>, limit: number) {
      const titleHasAll = allIn(pages.title, words);
      const eachWord = words.map((word) => or(sql`${folded(pages.title)} like ${anywhere(word)}`, sql`${folded(pages.content)} like ${anywhere(word)}`));

      const rows = yield* run(
        db
          .select({
            pathId: pages.pathId,
            pageId: pages.id,
            title: pages.title,
            content: pages.content,
            pathTitle: paths.title,
            updatedAt: pages.updatedAt,
          })
          .from(pages)
          .innerJoin(paths, eq(paths.id, pages.pathId))
          .innerJoin(projects, eq(projects.id, paths.projectId))
          .where(and(eq(projects.ownerId, ownerId), ...eachWord))
          .orderBy(desc(titleHasAll), desc(pages.updatedAt))
          .limit(limit),
      );

      return rows.map((row) => ({
        ...row,
        pathId: PathId.make(row.pathId),
        pageId: PageId.make(row.pageId),
        updatedAt: row.updatedAt.toISOString(),
      }));
    });

    return SearchStore.of({ findPages });
  }),
);
