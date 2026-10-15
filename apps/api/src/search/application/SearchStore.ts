import { Context } from 'effect';
import type { Effect } from 'effect';
import type { UserId } from '@wisepath/domain/auth';
import type { PageId, ProjectId } from '@wisepath/domain/projects';

/** A page that holds every word of a query in its title or its text, before it is ranked */
export interface PageMatch {
  readonly projectId: ProjectId;
  readonly pageId: PageId;
  readonly title: string;
  readonly content: string;
  readonly projectTitle: string;
  /** ISO date of the page's last edit */
  readonly updatedAt: string;
}

/** Looks through the owner's pages; storage failures are defects, as in ProjectStore */
export class SearchStore extends Context.Service<
  SearchStore,
  {
    /**
     * The owner's pages whose title or text contains each word (folded: lower
     * case, no accents), at most `limit`, those whose title has every word first
     */
    readonly findPages: (ownerId: UserId, words: ReadonlyArray<string>, limit: number) => Effect.Effect<ReadonlyArray<PageMatch>>;
  }
>()('@wisepath/api/search/application/SearchStore') {}
