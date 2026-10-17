import { Context } from 'effect';
import type { Effect, Option } from 'effect';
import type { UserId } from '@wisepath/domain/auth';
import type { Path, PathId } from '@wisepath/domain/paths';
import type { ProjectId } from '@wisepath/domain/projects';

/**
 * Where paths are stored. Storage failures are defects here: the request
 * fails with a 500 and is logged, while the commands keep their own errors.
 */
export class PathStore extends Context.Service<
  PathStore,
  {
    /** The owner's maps (those in their projects), oldest first, with the project each is in and the owner's marks */
    readonly listOwned: (ownerId: UserId) => Effect.Effect<ReadonlyArray<{ readonly path: Path; readonly projectId: ProjectId }>>;

    /**
     * One of the owner's maps, with the owner's marks; `lock` holds it until the transaction ends, so commands on it
     * run one at a time
     */
    readonly find: (
      ownerId: UserId,
      id: PathId,
      options?: { readonly lock?: boolean },
    ) => Effect.Effect<Option.Option<Path>>;

    /** Stores a new map in a project, its studied pages as the learner's marks; false when its id is already used */
    readonly insert: (learnerId: UserId, projectId: ProjectId, path: Path) => Effect.Effect<boolean>;

    /** Files the map in another project */
    readonly move: (id: PathId, projectId: ProjectId) => Effect.Effect<void>;

    /** Writes what changed between two versions of a map; changed studied marks are the learner's */
    readonly save: (learnerId: UserId, before: Path, after: Path) => Effect.Effect<void>;

    readonly remove: (ownerId: UserId, id: PathId) => Effect.Effect<void>;

    /** Runs the effect in one database transaction */
    readonly transaction: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
  }
>()('@wisepath/api/paths/application/PathStore') {}
