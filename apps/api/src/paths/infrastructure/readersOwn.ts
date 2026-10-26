import { Effect } from 'effect';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { UserId } from '@wisepath/domain/auth';
import type { Page, PathId } from '@wisepath/domain/paths';
import type { Database } from '../../shared/infrastructure/database/Database';
import { pageNotes, pageProgress } from '../../shared/infrastructure/database/schema';

/**
 * What each reader keeps of a map's pages for themselves: their studied marks (page_progress) and their notes
 * (page_notes). Read and written for that reader only; with no reader (a public link, the catalog) a page has none.
 */

/** The reader's own rows, read with each page */
export const readersOwnRows = (reader: UserId | null) => ({
  progress: { columns: { pageId: true as const }, where: reader === null ? sql`false` : eq(pageProgress.userId, reader) },
  notes: { columns: { content: true as const }, where: reader === null ? sql`false` : eq(pageNotes.userId, reader) },
});

export type ReadersOwnRows = {
  readonly progress: ReadonlyArray<unknown>;
  readonly notes: ReadonlyArray<{ readonly content: string }>;
};

/** The page's fields that are its reader's, as the domain has them */
export const readersOwnFields = (page: ReadersOwnRows) => ({
  studied: page.progress.length > 0,
  ...(page.notes.length > 0 ? { notes: page.notes[0].content } : {}),
});

/** Blank notes are no notes: they are not stored */
const notesOf = (page: Page | undefined) => (page?.notes?.trim() ? page.notes : undefined);

/** Writes the reader's marks and notes that differ between two versions of a map; its pages already stored */
export const saveReadersOwn =
  ({ db, run }: Pick<Database['Service'], 'db' | 'run'>) =>
  (readerId: UserId, pathId: PathId, before: ReadonlyArray<Page>, after: ReadonlyArray<Page>) =>
    Effect.gen(function* () {
      const was = new Map(before.map((p) => [p.id, p]));

      const marked = after.filter((p) => p.studied && !was.get(p.id)?.studied).map((p) => p.id);
      const unmarked = after.filter((p) => !p.studied && was.get(p.id)?.studied).map((p) => p.id);
      if (marked.length > 0) {
        const rows = marked.map((pageId) => ({ userId: readerId, pathId, pageId }));
        yield* run(db.insert(pageProgress).values(rows).onConflictDoNothing());
      }
      if (unmarked.length > 0) {
        yield* run(
          db
            .delete(pageProgress)
            .where(and(eq(pageProgress.userId, readerId), eq(pageProgress.pathId, pathId), inArray(pageProgress.pageId, unmarked))),
        );
      }

      const rewritten = after.filter((p) => notesOf(p) !== notesOf(was.get(p.id)));
      const written = rewritten.flatMap((p) => {
        const content = notesOf(p);
        return content === undefined ? [] : [{ userId: readerId, pathId, pageId: p.id, content, updatedAt: new Date() }];
      });
      const cleared = rewritten.filter((p) => notesOf(p) === undefined).map((p) => p.id);
      if (written.length > 0) {
        yield* run(
          db
            .insert(pageNotes)
            .values(written)
            .onConflictDoUpdate({
              target: [pageNotes.userId, pageNotes.pathId, pageNotes.pageId],
              set: { content: sql`excluded.content`, updatedAt: sql`excluded.updated_at` },
            }),
        );
      }
      if (cleared.length > 0) {
        yield* run(
          db
            .delete(pageNotes)
            .where(and(eq(pageNotes.userId, readerId), eq(pageNotes.pathId, pathId), inArray(pageNotes.pageId, cleared))),
        );
      }
    });
