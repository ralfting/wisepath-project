import { Context } from 'effect';
import type { Effect } from 'effect';
import type { PathId, PendingPublication, PublicationRequest } from '@wisepath/domain/paths';

/**
 * Requests to publish paths to the catalog (docs/plans/19-publish-to-the-catalog.md). Storage failures are defects,
 * as in PathStore; whether the caller may ask or decide is the use case's to check.
 */
export class PublicationStore extends Context.Service<
  PublicationStore,
  {
    /** Saves what the owner told the catalog about the path: what it teaches, who it is for, its language */
    readonly describe: (pathId: PathId, request: PublicationRequest) => Effect.Effect<void>;

    /** Leaves a request waiting, a declined one included, as if asked now */
    readonly request: (pathId: PathId) => Effect.Effect<void>;

    /** Marks the request declined */
    readonly decline: (pathId: PathId) => Effect.Effect<void>;

    /** Drops the request, waiting or declined; nothing when there is none */
    readonly drop: (pathId: PathId) => Effect.Effect<void>;

    /** Gives the path its catalog address from its title, unless it has one: published once, it keeps it. Inside a
     *  transaction, which keeps the other approvals from taking the same address until it commits */
    readonly assignSlug: (pathId: PathId) => Effect.Effect<void>;

    /** Whether a request waits for a decision */
    readonly isPending: (pathId: PathId) => Effect.Effect<boolean>;

    /** The requests waiting, oldest first */
    readonly listPending: () => Effect.Effect<ReadonlyArray<PendingPublication>>;
  }
>()('@wisepath/api/paths/application/PublicationStore') {}
