import { Context } from 'effect';
import type { Effect, Option } from 'effect';
import type { Locale, UserId } from '@wisepath/domain/auth';
import type { Project, ProjectId } from '@wisepath/domain/projects';

/**
 * Where projects are stored. Storage failures are defects here, as in
 * PathStore: the request fails with a 500 and is logged.
 */
export class ProjectStore extends Context.Service<
  ProjectStore,
  {
    /** The owner's projects, in no particular order */
    readonly listOwned: (ownerId: UserId) => Effect.Effect<ReadonlyArray<Project>>;

    /**
     * The owner's default project, made now if they have none yet, named in
     * their account's language, else in `shown` (the one they see the app in)
     */
    readonly ensureDefault: (ownerId: UserId, shown?: Locale) => Effect.Effect<Project>;

    readonly find: (ownerId: UserId, id: ProjectId) => Effect.Effect<Option.Option<Project>>;

    /** Stores a new project; false when its id is already used */
    readonly insert: (ownerId: UserId, project: Project) => Effect.Effect<boolean>;

    /** false when the owner has no such project */
    readonly rename: (ownerId: UserId, id: ProjectId, name: string) => Effect.Effect<boolean>;

    /** Moves the project's paths to `to`, then deletes it */
    readonly remove: (ownerId: UserId, id: ProjectId, to: ProjectId) => Effect.Effect<void>;

    /** Runs the effect in one database transaction */
    readonly transaction: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
  }
>()('@wisepath/api/projects/application/ProjectStore') {}
