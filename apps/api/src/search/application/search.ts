import { Effect, Option } from 'effect';
import { mapTree, pathTo } from '@wisepath/domain/projects';
import type { ProjectId } from '@wisepath/domain/projects';
import { SEARCH_LIMIT, excerptOf, matchesAll, queryWords, rankHits } from '@wisepath/domain/search';
import type { SearchHit } from '@wisepath/domain/search';
import { CurrentUser } from '../../projects/application/CurrentUser';
import { ProjectStore } from '../../projects/application/ProjectStore';
import { SearchStore } from './SearchStore';

/**
 * Search everywhere: the database finds the pages holding every word of the
 * query, the domain ranks them, and each result says where it sits on its map.
 */

/** How many matches are ranked: enough for a personal notebook, before the best `limit` are kept */
const CANDIDATES = 200;

export const searchPages = Effect.fn('search.pages')(function* (query: string, limit = SEARCH_LIMIT) {
  const user = yield* CurrentUser;
  const store = yield* SearchStore;
  const projects = yield* ProjectStore;

  const words = queryWords(query);
  if (words.length === 0) return [];

  const best = rankHits(query, yield* store.findPages(user.id, words, CANDIDATES)).slice(0, limit);

  // Where each page sits comes from its map's links, so each map with a result is read once
  const ids = [...new Set(best.map((match) => match.projectId))];
  const maps = yield* Effect.forEach(ids, (id) => projects.find(user.id, id), { concurrency: 4 });
  const whereOf = new Map<ProjectId, (pageId: SearchHit['pageId']) => ReadonlyArray<string>>();
  maps.forEach((found, i) => {
    if (Option.isNone(found)) return;
    const project = found.value;
    const tree = mapTree(project);
    whereOf.set(ids[i], (pageId) =>
      pathTo(project, pageId, tree)
        .slice(1, -1)
        .map((page) => page.title),
    );
  });

  return best.map(
    (match): SearchHit => ({
      projectId: match.projectId,
      pageId: match.pageId,
      title: match.title,
      projectTitle: match.projectTitle,
      where: whereOf.get(match.projectId)?.(match.pageId) ?? [],
      updatedAt: match.updatedAt,
      // A title that answers the query says enough; a text match shows the line it is in
      excerpt: matchesAll(match.title, query) ? null : excerptOf(match.content, query),
    }),
  );
});
