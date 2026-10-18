import { Context } from 'effect';
import type { Effect, Option } from 'effect';
import type { UserId } from '@wisepath/domain/auth';
import type { Path, PathId, PathVisibility } from '@wisepath/domain/paths';
import type { ProjectId } from '@wisepath/domain/projects';

/**
 * Where paths are stored. Storage failures are defects here: the request
 * fails with a 500 and is logged, while the commands keep their own errors.
 */
export class PathStore extends Context.Service<
  PathStore,
  {
    /**
     * The learner's maps, oldest first, with their marks: their own, with the project each is in, and those from
     * others (shared with them or taken), with their owner's name. A public map they never took is not listed.
     */
    readonly listFor: (learnerId: UserId) => Effect.Effect<
      ReadonlyArray<{ readonly path: Path; readonly projectId: ProjectId | null; readonly ownerName: string | null }>
    >;

    /**
     * A map as the reader may use it (its `access`), with their marks; none when they may not read it, as if it did
     * not exist. No reader: a public link opened logged out. `lock` holds it until the transaction ends, so commands
     * on it run one at a time.
     */
    readonly find: (
      reader: UserId | null,
      id: PathId,
      options?: { readonly lock?: boolean },
    ) => Effect.Effect<Option.Option<Path>>;

    /** A published map by its catalog address, as a visitor with no account reads it */
    readonly findPublished: (slug: string) => Effect.Effect<Option.Option<Path>>;

    /** Stores a new map in a project, its studied pages as the learner's marks; false when its id is already used */
    readonly insert: (learnerId: UserId, projectId: ProjectId, path: Path) => Effect.Effect<boolean>;

    readonly setVisibility: (id: PathId, visibility: PathVisibility) => Effect.Effect<void>;

    /** Files the map in another project */
    readonly move: (id: PathId, projectId: ProjectId) => Effect.Effect<void>;

    /** Writes what changed between two versions of a map; changed studied marks are the learner's */
    readonly save: (learnerId: UserId, before: Path, after: Path) => Effect.Effect<void>;

    readonly remove: (ownerId: UserId, id: PathId) => Effect.Effect<void>;

    /** Runs the effect in one database transaction */
    readonly transaction: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
  }
>()('@wisepath/api/paths/application/PathStore') {}
