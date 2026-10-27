import { Effect } from 'effect';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import type { UserId } from '@wisepath/domain/auth';
import { rewordedQuestions } from '@wisepath/domain/paths';
import type { Page, PageNote, PathId } from '@wisepath/domain/paths';
import type { Database } from '../../shared/infrastructure/database/Database';
import { activityProgress, pageNotes, pageProgress, questionAnswers } from '../../shared/infrastructure/database/schema';

/**
 * What each reader keeps of a map's pages for themselves: their studied marks (page_progress), the activities they
 * ticked done (activity_progress), their answers to its questions (question_answers) and their notes (page_notes). Read and written for that reader only; with no reader
 * (a public link, the catalog) a page has none.
 */

type NoteRow = typeof pageNotes.$inferSelect;

/** The reader's own rows, read with each page */
export const readersOwnRows = (reader: UserId | null) => ({
  progress: { columns: { pageId: true as const }, where: reader === null ? sql`false` : eq(pageProgress.userId, reader) },
  notes: {
    where: reader === null ? sql`false` : eq(pageNotes.userId, reader),
    orderBy: [asc(pageNotes.createdAt), asc(pageNotes.id)],
  },
  done: {
    columns: { activityId: true as const },
    where: reader === null ? sql`false` : eq(activityProgress.userId, reader),
    orderBy: [asc(activityProgress.doneAt), asc(activityProgress.activityId)],
  },
  answers: {
    columns: { questionId: true as const, body: true as const },
    where: reader === null ? sql`false` : eq(questionAnswers.userId, reader),
    orderBy: [asc(questionAnswers.updatedAt), asc(questionAnswers.questionId)],
  },
});

export type ReadersOwnRows = {
  readonly progress: ReadonlyArray<unknown>;
  readonly notes: ReadonlyArray<NoteRow>;
  readonly done: ReadonlyArray<{ readonly activityId: string }>;
  readonly answers: ReadonlyArray<{ readonly questionId: string; readonly body: string }>;
};

/** A note as the domain has it; a quote is its three columns together */
const toNote = (row: NoteRow) => ({
  id: row.id,
  ...(row.quoteExact !== null ? { quote: { exact: row.quoteExact, prefix: row.quotePrefix ?? '', suffix: row.quoteSuffix ?? '' } } : {}),
  body: row.body,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

/** The page's fields that are its reader's, as the domain has them */
export const readersOwnFields = (page: ReadersOwnRows) => ({
  studied: page.progress.length > 0,
  ...(page.done.length > 0 ? { done: page.done.map((row) => row.activityId) } : {}),
  ...(page.answers.length > 0 ? { answers: page.answers.map((row) => ({ question: row.questionId, body: row.body })) } : {}),
  ...(page.notes.length > 0 ? { notes: page.notes.map(toNote) } : {}),
});

/** A note as its row, the reader's and on its page */
const toRow = (userId: UserId, pathId: PathId, pageId: string, note: PageNote) => ({
  userId,
  pathId,
  pageId,
  id: note.id,
  quoteExact: note.quote?.exact ?? null,
  quotePrefix: note.quote?.prefix ?? null,
  quoteSuffix: note.quote?.suffix ?? null,
  body: note.body,
  createdAt: new Date(note.createdAt),
  updatedAt: new Date(note.updatedAt),
});

/** Writes the reader's marks, ticks, answers and notes that differ between two versions of a map; its pages already stored */
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

      for (const page of after) {
        const ticked = new Set(was.get(page.id)?.done ?? []);
        const ticks = new Set(page.done ?? []);
        const added = [...ticks].filter((id) => !ticked.has(id));
        const removed = [...ticked].filter((id) => !ticks.has(id));
        if (added.length > 0) {
          const rows = added.map((activityId) => ({ userId: readerId, pathId, pageId: page.id, activityId }));
          yield* run(db.insert(activityProgress).values(rows).onConflictDoNothing());
        }
        if (removed.length > 0) {
          yield* run(
            db
              .delete(activityProgress)
              .where(
                and(
                  eq(activityProgress.userId, readerId),
                  eq(activityProgress.pathId, pathId),
                  eq(activityProgress.pageId, page.id),
                  inArray(activityProgress.activityId, removed),
                ),
              ),
          );
        }
      }

      for (const page of after) {
        const old = new Map((was.get(page.id)?.answers ?? []).map((a) => [a.question, a.body]));
        const answers = page.answers ?? [];
        const written = answers
          .filter((a) => old.get(a.question) !== a.body)
          .map((a) => ({ userId: readerId, pathId, pageId: page.id, questionId: a.question, body: a.body }));
        const kept = new Set<string>(answers.map((a) => a.question));
        const removed = [...old.keys()].filter((id) => !kept.has(id));
        if (written.length > 0) {
          yield* run(
            db
              .insert(questionAnswers)
              .values(written)
              .onConflictDoUpdate({
                target: [questionAnswers.userId, questionAnswers.pathId, questionAnswers.pageId, questionAnswers.questionId],
                set: { body: sql`excluded.body`, updatedAt: sql`excluded.updated_at` },
              }),
          );
        }
        if (removed.length > 0) {
          yield* run(
            db
              .delete(questionAnswers)
              .where(
                and(
                  eq(questionAnswers.userId, readerId),
                  eq(questionAnswers.pathId, pathId),
                  eq(questionAnswers.pageId, page.id),
                  inArray(questionAnswers.questionId, removed),
                ),
              ),
          );
        }
      }

      // The domain returns a note it did not change as the same object, so identity tells what was written
      for (const page of after) {
        const old = new Map((was.get(page.id)?.notes ?? []).map((n) => [n.id, n]));
        const notes = page.notes ?? [];
        const written = notes.filter((n) => old.get(n.id) !== n).map((n) => toRow(readerId, pathId, page.id, n));
        const kept = new Set(notes.map((n) => n.id));
        const removed = [...old.keys()].filter((id) => !kept.has(id));
        if (written.length > 0) {
          yield* run(
            db
              .insert(pageNotes)
              .values(written)
              .onConflictDoUpdate({
                target: [pageNotes.userId, pageNotes.pathId, pageNotes.pageId, pageNotes.id],
                set: {
                  quoteExact: sql`excluded.quote_exact`,
                  quotePrefix: sql`excluded.quote_prefix`,
                  quoteSuffix: sql`excluded.quote_suffix`,
                  body: sql`excluded.body`,
                  updatedAt: sql`excluded.updated_at`,
                },
              }),
          );
        }
        if (removed.length > 0) {
          yield* run(
            db
              .delete(pageNotes)
              .where(
                and(
                  eq(pageNotes.userId, readerId),
                  eq(pageNotes.pathId, pathId),
                  eq(pageNotes.pageId, page.id),
                  inArray(pageNotes.id, removed),
                ),
              ),
          );
        }
      }
    });

/**
 * Moves every reader's answers to the questions the author reworded in place (rewordedQuestions) to their new
 * names, as a page's new text is stored, so nobody's answer is left behind by a fixed typo
 */
export const moveRewordedAnswers =
  ({ db, run }: Pick<Database['Service'], 'db' | 'run'>) =>
  (pathId: PathId, before: Page, after: Page) =>
    Effect.gen(function* () {
      const onPage = and(eq(questionAnswers.pathId, pathId), eq(questionAnswers.pageId, after.id));
      for (const { from, to } of rewordedQuestions(pathId, before, after)) {
        const movers = db
          .select({ userId: questionAnswers.userId })
          .from(questionAnswers)
          .where(and(onPage, eq(questionAnswers.questionId, from)));
        // An answer kept from a question deleted earlier with the new words gives way to the one moving onto them
        yield* run(
          db.delete(questionAnswers).where(and(onPage, eq(questionAnswers.questionId, to), inArray(questionAnswers.userId, movers))),
        );
        yield* run(db.update(questionAnswers).set({ questionId: to }).where(and(onPage, eq(questionAnswers.questionId, from))));
      }
    });
