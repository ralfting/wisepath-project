import { Effect, Option } from 'effect';
import { mapTree, trailTo } from '@wisepath/domain/paths';
import type { PathId } from '@wisepath/domain/paths';
import { SEARCH_LIMIT, excerptOf, matchesAll, queryWords, rankHits } from '@wisepath/domain/search';
import type { SearchHit } from '@wisepath/domain/search';
import { CurrentUser } from '../../paths/application/CurrentUser';
import { PathStore } from '../../paths/application/PathStore';
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
  const paths = yield* PathStore;

  const words = queryWords(query);
  if (words.length === 0) return [];

  const best = rankHits(query, yield* store.findPages(user.id, words, CANDIDATES)).slice(0, limit);

  // Where each page sits comes from its map's links, so each map with a result is read once
  const ids = [...new Set(best.map((match) => match.pathId))];
  const maps = yield* Effect.forEach(ids, (id) => paths.find(user.id, id), { concurrency: 4 });
  const whereOf = new Map<PathId, (pageId: SearchHit['pageId']) => ReadonlyArray<string>>();
  maps.forEach((found, i) => {
    if (Option.isNone(found)) return;
    const path = found.value;
    const tree = mapTree(path);
    whereOf.set(ids[i], (pageId) =>
      trailTo(path, pageId, tree)
        .slice(1, -1)
        .map((page) => page.title),
    );
  });

  return best.map(
    (match): SearchHit => ({
      pathId: match.pathId,
      pageId: match.pageId,
      title: match.title,
      pathTitle: match.pathTitle,
      where: whereOf.get(match.pathId)?.(match.pageId) ?? [],
      updatedAt: match.updatedAt,
      // A title that answers the query says enough; a text match shows the line it is in
      excerpt: matchesAll(match.title, query) ? null : excerptOf(match.content, query),
    }),
  );
});
