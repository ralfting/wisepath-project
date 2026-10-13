import type { Effect, Option } from "effect"
import { Context } from "effect"
import type { UserId } from "@wisepath/domain/auth"
import type { Project, ProjectId } from "@wisepath/domain/projects"

/**
 * Where projects are stored. Storage failures are defects here: the request
 * fails with a 500 and is logged, while the commands keep their own errors.
 */
export class ProjectStore extends Context.Service<ProjectStore, {
  /** The owner's maps, oldest first */
  readonly listOwned: (ownerId: UserId) => Effect.Effect<ReadonlyArray<Project>>
  /** One of the owner's maps; `lock` holds it until the transaction ends, so commands on it run one at a time */
  readonly find: (ownerId: UserId, id: ProjectId, options?: { readonly lock?: boolean }) => Effect.Effect<Option.Option<Project>>
  /** Stores a new map; false when its id is already used */
  readonly insert: (ownerId: UserId, project: Project) => Effect.Effect<boolean>
  /** Writes what changed between two versions of a map */
  readonly save: (before: Project, after: Project) => Effect.Effect<void>
  readonly remove: (ownerId: UserId, id: ProjectId) => Effect.Effect<void>
  /** Marks the account as having its sample; true only the first time */
  readonly claimSample: (ownerId: UserId) => Effect.Effect<boolean>
  /** Runs the effect in one database transaction */
  readonly transaction: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
}>()("@wisepath/api/projects/application/ProjectStore") {}
