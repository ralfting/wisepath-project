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
    /** When this account got its copy of the sample map; no longer set, since accounts start with no paths (2026-10-16) */
    sampleSeededAt: timestamp('sample_seeded_at', { precision: 3 }),
  },
  (t) => [
    uniqueIndex('User_email_key').on(t.email),
    uniqueIndex('User_googleId_key').on(t.googleId),
    uniqueIndex('User_githubId_key').on(t.githubId),
  ],
);

/** A user's group of paths. Each user has one default project, which every path falls back to. Ids come from the client. */
export const projects = pgTable(
  'projects',
  {
    id: text().primaryKey(),
    ownerId: text('owner_id').notNull(),
    name: text().notNull(),
    /** The project made with the account: it cannot be deleted, and takes the paths of a project that is */
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index('projects_owner_id_idx').on(t.ownerId),
    // One default project per user
    uniqueIndex('projects_owner_id_default_key').on(t.ownerId).where(sql`${t.isDefault}`),
    foreignKey({ name: 'projects_owner_id_fkey', columns: [t.ownerId], foreignColumns: [users.id] })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
);

/** A learner's map, in one of their projects. Its title is its root page's title. Ids come from the client. */
export const paths = pgTable(
  'paths',
  {
    id: text().primaryKey(),
    projectId: text('project_id').notNull(),
    title: text().notNull(),
    description: text(),
    /** 'study' (open notes, no progress) or 'learningPath' (followed to the end, with progress) */
    kind: text({ enum: ['study', 'learningPath'] })
      .notNull()
      .default('study'),
    rootPageId: text('root_page_id').notNull(),
    /** 'private' (its owner and members) or 'public' (anyone with the link reads it) */
    visibility: text({ enum: ['private', 'public'] })
      .notNull()
      .default('private'),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index('paths_project_id_idx').on(t.projectId),
    foreignKey({ name: 'paths_project_id_fkey', columns: [t.projectId], foreignColumns: [projects.id] })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
);

/** A page of markdown; pages connect only through [[Title]] links in their content. */
export const pages = pgTable(
  'pages',
  {
    id: text().notNull(),
    pathId: text('path_id').notNull(),
    /** Order the pages were added in */
    position: integer().notNull(),
    title: text().notNull(),
    /** lower(trim(title)), or null while the page has no title: keeps titles unique per map */
    titleKey: text('title_key'),
    content: text().notNull().default(''),
    /** No longer read or written: marks moved to page_progress. Dropped once the API that reads it is gone */
    studied: boolean().notNull().default(false),
    module: boolean(),
    color: text(),
    icon: text(),
    /** Last edit to the title or the text */
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ name: 'pages_pkey', columns: [t.pathId, t.id] }),
    uniqueIndex('pages_path_id_title_key_key').on(t.pathId, t.titleKey),
    // Search everywhere: LIKE '%word%' on the folded title and text (wp_fold, made with the migration)
    index('pages_title_search_idx').using('gin', sql`wp_fold(${t.title}) gin_trgm_ops`),
    index('pages_content_search_idx').using('gin', sql`wp_fold(${t.content}) gin_trgm_ops`),
    foreignKey({ name: 'pages_path_id_fkey', columns: [t.pathId], foreignColumns: [paths.id] })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
);

/**
 * People a path is shared with: invited by its owner to read or edit, or who took a public path to study (as
 * viewers). The owner is never a member of their own path.
 */
export const pathMembers = pgTable(
  'path_members',
  {
    pathId: text('path_id').notNull(),
    userId: text('user_id').notNull(),
    role: text({ enum: ['viewer', 'editor'] }).notNull(),
    source: text({ enum: ['invited', 'taken'] }).notNull(),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    primaryKey({ name: 'path_members_pkey', columns: [t.pathId, t.userId] }),
    index('path_members_user_id_idx').on(t.userId),
    foreignKey({ name: 'path_members_path_id_fkey', columns: [t.pathId], foreignColumns: [paths.id] })
      .onDelete('cascade')
      .onUpdate('cascade'),
    foreignKey({ name: 'path_members_user_id_fkey', columns: [t.userId], foreignColumns: [users.id] })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
);

/**
 * Emails a path was shared with before they had an account: each becomes a member of the path, with its role, when
 * someone signs up with it. The email is kept in lower case.
 */
export const pathInvites = pgTable(
  'path_invites',
  {
    pathId: text('path_id').notNull(),
    email: text().notNull(),
    role: text({ enum: ['viewer', 'editor'] }).notNull(),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    primaryKey({ name: 'path_invites_pkey', columns: [t.pathId, t.email] }),
    index('path_invites_email_idx').on(t.email),
    foreignKey({ name: 'path_invites_path_id_fkey', columns: [t.pathId], foreignColumns: [paths.id] })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
);

/**
 * Paths a learner lost without choosing to, shown to them once (then deleted): the title and owner are copied,
 * since the path itself may be gone.
 */
export const accessNotices = pgTable(
  'access_notices',
  {
    id: text().primaryKey(),
    userId: text('user_id').notNull(),
    pathTitle: text('path_title').notNull(),
    ownerName: text('owner_name'),
    reason: text({ enum: ['private', 'removed', 'deleted'] }).notNull(),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index('access_notices_user_id_idx').on(t.userId),
    foreignKey({ name: 'access_notices_user_id_fkey', columns: [t.userId], foreignColumns: [users.id] })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
);

/**
 * The pages a learner marked studied. Progress is each learner's own, on their paths and on anyone else's,
 * and never shown to another (docs/plans/14-public-and-shared-paths.md).
 */
export const pageProgress = pgTable(
  'page_progress',
  {
    userId: text('user_id').notNull(),
    pathId: text('path_id').notNull(),
    pageId: text('page_id').notNull(),
    studiedAt: timestamp('studied_at', { precision: 3, withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    primaryKey({ name: 'page_progress_pkey', columns: [t.userId, t.pathId, t.pageId] }),
    foreignKey({ name: 'page_progress_user_id_fkey', columns: [t.userId], foreignColumns: [users.id] })
      .onDelete('cascade')
      .onUpdate('cascade'),
    foreignKey({ name: 'page_progress_page_fkey', columns: [t.pathId, t.pageId], foreignColumns: [pages.pathId, pages.id] })
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
    pathId: text('path_id').notNull(),
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
    foreignKey({ name: 'review_states_path_id_fkey', columns: [t.pathId], foreignColumns: [paths.id] })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
);

/** What a learner captured to file later: one Inbox per learner. Ids come from the client. */
export const inboxItems = pgTable(
  'inbox_items',
  {
    id: text().primaryKey(),
    ownerId: text('owner_id').notNull(),
    text: text().notNull(),
    url: text(),
    /** The address's title, from its link preview */
    title: text(),
    /** A moment of the video at the address, in seconds */
    videoTime: integer('video_time'),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index('inbox_items_owner_id_created_at_idx').on(t.ownerId, t.createdAt),
    foreignKey({ name: 'inbox_items_owner_id_fkey', columns: [t.ownerId], foreignColumns: [users.id] })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, { fields: [projects.ownerId], references: [users.id] }),
  paths: many(paths),
}));

export const pathsRelations = relations(paths, ({ one, many }) => ({
  project: one(projects, { fields: [paths.projectId], references: [projects.id] }),
  pages: many(pages),
  members: many(pathMembers),
}));

export const pathMembersRelations = relations(pathMembers, ({ one }) => ({
  path: one(paths, { fields: [pathMembers.pathId], references: [paths.id] }),
  user: one(users, { fields: [pathMembers.userId], references: [users.id] }),
}));

export const pagesRelations = relations(pages, ({ one, many }) => ({
  path: one(paths, { fields: [pages.pathId], references: [paths.id] }),
  progress: many(pageProgress),
}));

export const pageProgressRelations = relations(pageProgress, ({ one }) => ({
  page: one(pages, { fields: [pageProgress.pathId, pageProgress.pageId], references: [pages.pathId, pages.id] }),
}));
