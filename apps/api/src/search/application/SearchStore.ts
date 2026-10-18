import { Context } from 'effect';
import type { Effect } from 'effect';
import type { UserId } from '@wisepath/domain/auth';
import type { PageId, PathId } from '@wisepath/domain/paths';

/** A page that holds every word of a query in its title or its text, before it is ranked */
export interface PageMatch {
  readonly pathId: PathId;
  readonly pageId: PageId;
  readonly title: string;
  readonly content: string;
  readonly pathTitle: string;
  /** ISO date of the page's last edit */
  readonly updatedAt: string;
}

/** Looks through the pages a learner has; storage failures are defects, as in PathStore */
export class SearchStore extends Context.Service<
  SearchStore,
  {
    /**
     * The pages of the learner's paths, their own and those shared with them or taken, whose title or text
     * contains each word (folded: lower case, no accents), at most `limit`, those whose title has every word first
     */
    readonly findPages: (learnerId: UserId, words: ReadonlyArray<string>, limit: number) => Effect.Effect<ReadonlyArray<PageMatch>>;
  }
>()('@wisepath/api/search/application/SearchStore') {}
