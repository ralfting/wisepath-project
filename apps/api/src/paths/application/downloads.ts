import { Effect } from 'effect';
import { exportFolders, markdownFiles } from '@wisepath/domain/paths';
import type { PathId } from '@wisepath/domain/paths';
import { CurrentUser } from './CurrentUser';
import { PathStore } from './PathStore';
import { findFor, manages } from './paths';

/**
 * Downloads as Markdown: only paths the learner owns. A path shared with them or taken to study is someone else's
 * content, and taking it out would be the copy sharing never makes; it answers as not found.
 */

export const exportPath = Effect.fn('paths.export')(function* (id: PathId) {
  const path = yield* findFor(id, manages);
  return { name: path.title, files: markdownFiles(path) };
});

/** Every path the learner owns, one folder each; those from others carry no project of theirs */
export const exportAll = Effect.fn('paths.exportAll')(function* () {
  const user = yield* CurrentUser;
  const store = yield* PathStore;

  const listed = yield* store.listFor(user.id);
  return exportFolders(listed.filter((entry) => entry.projectId !== null).map((entry) => entry.path));
});
