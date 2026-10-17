import { Effect, Option } from 'effect';
import {
  PathNotFound,
  addPage,
  canEdit,
  canManage,
  canRead,
  editPage,
  editPath,
  removePage,
  startPath,
  summarize,
} from '@wisepath/domain/paths';
import type { NewPage, NewPath, PageEdit, PageId, Path, PathEdit, PathId } from '@wisepath/domain/paths';
import { ownProject } from '../../projects/application/projects';
import { CurrentUser } from './CurrentUser';
import { PathStore } from './PathStore';

/**
 * Path use cases: each loads the map as the user may use it, checks the access
 * the command needs, applies the domain command (the same function the web
 * applies to its draft) and stores the change, in one transaction that holds
 * the map so commands on it never interleave. Without the access needed, the
 * map is not found: whether someone else's map exists never shows.
 */

/** Whether the user's access to this map allows a command */
type Needs = (path: Path) => boolean;

export const reads: Needs = (path) => canRead(path.access);
const edits: Needs = (path) => canEdit(path.access);
export const manages: Needs = (path) => canManage(path.access);

export const listPaths = Effect.fn('paths.list')(function* () {
  const user = yield* CurrentUser;
  const store = yield* PathStore;

  const paths = yield* store.listFor(user.id);
  return paths.map(({ path, projectId, ownerName }) => summarize(path, projectId, ownerName));
});

/** The map when the user's access allows what is asked of it */
export const findFor = (id: PathId, needs: Needs, options?: { readonly lock?: boolean }) =>
  Effect.gen(function* () {
    const user = yield* CurrentUser;
    const store = yield* PathStore;

    const found = yield* store.find(user.id, id, options);
    if (Option.isNone(found) || !needs(found.value)) return yield* new PathNotFound({ pathId: id });
    return found.value;
  });

export const getPath = Effect.fn('paths.get')(function* (id: PathId) {
  return yield* findFor(id, reads);
});

/** Creating the same map twice (a retry) returns the one already made */
export const createPath = Effect.fn('paths.create')(function* (command: NewPath) {
  const user = yield* CurrentUser;
  const store = yield* PathStore;

  yield* ownProject(command.projectId);

  const path = startPath(command);
  if (yield* store.insert(user.id, command.projectId, path)) return path;

  const existing = yield* store.find(user.id, command.id);
  if (Option.isSome(existing) && canManage(existing.value.access)) return existing.value;

  return yield* Effect.die(new Error(`Path id ${command.id} is already used by another account`));
});

export const removePath = Effect.fn('paths.remove')(function* (id: PathId) {
  const user = yield* CurrentUser;
  const store = yield* PathStore;

  yield* store.remove(user.id, id);
});

/** Loads the map, checks the user may do this, applies one command and stores what it changed */
const change = <E>(id: PathId, needs: Needs, apply: (path: Path) => Effect.Effect<Path, E>) =>
  Effect.gen(function* () {
    const user = yield* CurrentUser;
    const store = yield* PathStore;

    return yield* store.transaction(
      Effect.gen(function* () {
        const before = yield* findFor(id, needs, { lock: true });

        const after = yield* apply(before);
        if (after !== before) yield* store.save(user.id, before, after);

        return after;
      }),
    );
  });

export const updatePath = Effect.fn('paths.update')(function* (id: PathId, edit: PathEdit) {
  if (edit.projectId !== undefined) yield* ownProject(edit.projectId);

  yield* change(id, manages, (path) => Effect.succeed(editPath(path, edit)));

  // Moving files the map elsewhere and leaves the map itself as it is; change() checked it is the user's
  if (edit.projectId !== undefined) yield* (yield* PathStore).move(id, edit.projectId);
});

export const createPage = Effect.fn('paths.createPage')(function* (id: PathId, command: NewPage) {
  const path = yield* change(id, edits, (p) => addPage(p, command).pipe(Effect.map((r) => r.path)));
  return path.pages.find((p) => p.id === command.id)!;
});

/**
 * Marking a page studied is the reader's progress, so reading is enough; anything else edits the page, and renaming
 * the root renames the map, which only its owner does. An edit with both is refused whole.
 */
const needsFor =
  (pageId: PageId, edit: PageEdit): Needs =>
  (path) => {
    const { studied: _studied, ...rest } = edit;
    if (Object.values(rest).every((value) => value === undefined)) return reads(path);
    return pageId === path.rootPageId && edit.title !== undefined ? manages(path) : edits(path);
  };

export const updatePage = Effect.fn('paths.updatePage')(function* (id: PathId, pageId: PageId, edit: PageEdit) {
  yield* change(id, needsFor(pageId, edit), (path) => editPage(path, pageId, edit));
});

export const deletePage = Effect.fn('paths.deletePage')(function* (id: PathId, pageId: PageId) {
  yield* change(id, edits, (path) => removePage(path, pageId));
});
