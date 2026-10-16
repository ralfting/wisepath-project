import { Context } from 'effect';
import type { Effect, Option } from 'effect';
import type { UserId } from '@wisepath/domain/auth';
import type { Path, PathId } from '@wisepath/domain/paths';

/**
 * Where paths are stored. Storage failures are defects here: the request
 * fails with a 500 and is logged, while the commands keep their own errors.
 */
export class PathStore extends Context.Service<
  PathStore,
  {
    /** The owner's maps, oldest first */
    readonly listOwned: (ownerId: UserId) => Effect.Effect<ReadonlyArray<Path>>;

    /** One of the owner's maps; `lock` holds it until the transaction ends, so commands on it run one at a time */
    readonly find: (
      ownerId: UserId,
      id: PathId,
      options?: { readonly lock?: boolean },
    ) => Effect.Effect<Option.Option<Path>>;

    /** Stores a new map; false when its id is already used */
    readonly insert: (ownerId: UserId, path: Path) => Effect.Effect<boolean>;

    /** Writes what changed between two versions of a map */
    readonly save: (before: Path, after: Path) => Effect.Effect<void>;

    readonly remove: (ownerId: UserId, id: PathId) => Effect.Effect<void>;

    /** Marks the account as having its sample; true only the first time */
    readonly claimSample: (ownerId: UserId) => Effect.Effect<boolean>;

    /** Runs the effect in one database transaction */
    readonly transaction: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
  }
>()('@wisepath/api/paths/application/PathStore') {}
