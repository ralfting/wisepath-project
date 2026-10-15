import { relations, sql } from 'drizzle-orm';
import { boolean, doublePrecision, foreignKey, index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * The database, as Drizzle sees it: the source of the migrations (drizzle-kit
 * generate) and of the types every query is checked against.
 *
 * `User` keeps the camelCase columns it was created with; newer tables are
 * snake_case. Constraint names are the ones the first migrations gave them,
 * so databases made before Drizzle and after it are the same.
 */

export const users = pgTable(
  'User',
  {
    id: text().primaryKey(),
    email: text().notNull(),
    password: text(),
    name: text(),
    googleId: text(),
    githubId: text(),
    createdAt: timestamp({ precision: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp({ precision: 3 })
      .notNull()
      .$onUpdate(() => new Date()),
    /** The language the user chose ('en', 'pt-BR'); null follows their browser */
    locale: text({ enum: ['en', 'pt-BR'] }),
    /** When this account got its copy of the sample map (once, even if it is deleted later) */
    sampleSeededAt: timestamp('sample_seeded_at', { precision: 3 }),
  },
  (t) => [
    uniqueIndex('User_email_key').on(t.email),
    uniqueIndex('User_googleId_key').on(t.googleId),
    uniqueIndex('User_githubId_key').on(t.githubId),
  ],
);

/** A learner's map. Its title is its root page's title. Ids come from the client. */
export const projects = pgTable(
  'projects',
  {
    id: text().primaryKey(),
    ownerId: text('owner_id').notNull(),
    title: text().notNull(),
    description: text(),
    /** 'study' (open notes, no progress) or 'learningPath' (followed to the end, with progress) */
    kind: text({ enum: ['study', 'learningPath'] })
      .notNull()
      .default('study'),
    rootPageId: text('root_page_id').notNull(),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index('projects_owner_id_idx').on(t.ownerId),
    foreignKey({ name: 'projects_owner_id_fkey', columns: [t.ownerId], foreignColumns: [users.id] })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
);

/** A page of markdown; pages connect only through [[Title]] links in their content. */
export const pages = pgTable(
  'pages',
  {
    id: text().notNull(),
    projectId: text('project_id').notNull(),
    /** Order the pages were added in */
    position: integer().notNull(),
    title: text().notNull(),
    /** lower(trim(title)), or null while the page has no title: keeps titles unique per map */
    titleKey: text('title_key'),
    content: text().notNull().default(''),
    studied: boolean().notNull().default(false),
    module: boolean(),
    color: text(),
    icon: text(),
    /** Last edit to the title or the text */
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ name: 'pages_pkey', columns: [t.projectId, t.id] }),
    uniqueIndex('pages_project_id_title_key_key').on(t.projectId, t.titleKey),
    // Search everywhere: LIKE '%word%' on the folded title and text (wp_fold, made with the migration)
    index('pages_title_search_idx').using('gin', sql`wp_fold(${t.title}) gin_trgm_ops`),
    index('pages_content_search_idx').using('gin', sql`wp_fold(${t.content}) gin_trgm_ops`),
    foreignKey({ name: 'pages_project_id_fkey', columns: [t.projectId], foreignColumns: [projects.id] })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
);

/**
 * Where each card stands in the learner's spaced review. Cards themselves are
 * read from the pages (`::` and ==cloze== lines); a card's id is a hash of
 * its path, page and question. A state outlives its card's line, in case the
 * line is written again, but goes with its path.
 */
export const reviewStates = pgTable(
  'review_states',
  {
    ownerId: text('owner_id').notNull(),
    cardId: text('card_id').notNull(),
    projectId: text('project_id').notNull(),
    pageId: text('page_id').notNull(),
    due: timestamp({ precision: 3, withTimezone: true }).notNull(),
    stability: doublePrecision().notNull(),
    difficulty: doublePrecision().notNull(),
    reps: integer().notNull(),
    lapses: integer().notNull(),
    lastReview: timestamp('last_review', { precision: 3, withTimezone: true }),
    /** The card's first review: it counts among that day's new cards */
    firstReview: timestamp('first_review', { precision: 3, withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ name: 'review_states_pkey', columns: [t.ownerId, t.cardId] }),
    index('review_states_owner_id_first_review_idx').on(t.ownerId, t.firstReview),
    foreignKey({ name: 'review_states_owner_id_fkey', columns: [t.ownerId], foreignColumns: [users.id] })
      .onDelete('cascade')
      .onUpdate('cascade'),
    foreignKey({ name: 'review_states_project_id_fkey', columns: [t.projectId], foreignColumns: [projects.id] })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, { fields: [projects.ownerId], references: [users.id] }),
  pages: many(pages),
}));

export const pagesRelations = relations(pages, ({ one }) => ({
  project: one(projects, { fields: [pages.projectId], references: [projects.id] }),
}));
