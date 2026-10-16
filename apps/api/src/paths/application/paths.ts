import { randomUUID } from 'node:crypto';
import { Effect, Option } from 'effect';
import {
  PageId,
  PathId,
  PathNotFound,
  addPage,
  copyPath,
  editPage,
  editPath,
  removePage,
  samplePath,
  startPath,
  summarize,
} from '@wisepath/domain/paths';
import type { NewPage, NewPath, PageEdit, Path, PathEdit } from '@wisepath/domain/paths';
import { CurrentUser } from './CurrentUser';
import { PathStore } from './PathStore';

/**
 * Path use cases: each loads the owner's map, applies the domain command
 * (the same function the web applies to its draft) and stores the change, in
 * one transaction that holds the map so commands on it never interleave.
 */

/** Every account gets a copy of the sample map, once */
const seedSample = Effect.fn('paths.seedSample')(function* () {
  const user = yield* CurrentUser;
  const store = yield* PathStore;

  yield* store.transaction(
    Effect.gen(function* () {
      const firstTime = yield* store.claimSample(user.id);
      if (!firstTime) return;

      const copy = copyPath(samplePath, PathId.make(randomUUID()), () => PageId.make(randomUUID()));
      yield* store.insert(user.id, copy);
    }),
  );
});

export const listPaths = Effect.fn('paths.list')(function* () {
  const user = yield* CurrentUser;
  const store = yield* PathStore;

  yield* seedSample();

  const paths = yield* store.listOwned(user.id);
  return paths.map(summarize);
});

export const getPath = Effect.fn('paths.get')(function* (id: PathId) {
  const user = yield* CurrentUser;
  const store = yield* PathStore;

  const found = yield* store.find(user.id, id);
  if (Option.isNone(found)) return yield* new PathNotFound({ pathId: id });

  return found.value;
});

/** Creating the same map twice (a retry) returns the one already made */
export const createPath = Effect.fn('paths.create')(function* (command: NewPath) {
  const user = yield* CurrentUser;
  const store = yield* PathStore;

  const path = startPath(command);
  if (yield* store.insert(user.id, path)) return path;

  const existing = yield* store.find(user.id, command.id);
  if (Option.isSome(existing)) return existing.value;

  return yield* Effect.die(new Error(`Path id ${command.id} is already used by another account`));
});

export const removePath = Effect.fn('paths.remove')(function* (id: PathId) {
  const user = yield* CurrentUser;
  const store = yield* PathStore;

  yield* store.remove(user.id, id);
});

/** Loads the map, applies one command and stores what it changed */
const change = <E>(id: PathId, apply: (path: Path) => Effect.Effect<Path, E>) =>
  Effect.gen(function* () {
    const user = yield* CurrentUser;
    const store = yield* PathStore;

    return yield* store.transaction(
      Effect.gen(function* () {
        const found = yield* store.find(user.id, id, { lock: true });
        if (Option.isNone(found)) return yield* new PathNotFound({ pathId: id });

        const after = yield* apply(found.value);
        if (after !== found.value) yield* store.save(found.value, after);

        return after;
      }),
    );
  });

export const updatePath = Effect.fn('paths.update')(function* (id: PathId, edit: PathEdit) {
  yield* change(id, (path) => Effect.succeed(editPath(path, edit)));
});

export const createPage = Effect.fn('paths.createPage')(function* (id: PathId, command: NewPage) {
  const path = yield* change(id, (p) => addPage(p, command).pipe(Effect.map((r) => r.path)));
  return path.pages.find((p) => p.id === command.id)!;
});

export const updatePage = Effect.fn('paths.updatePage')(function* (id: PathId, pageId: PageId, edit: PageEdit) {
  yield* change(id, (path) => editPage(path, pageId, edit));
});

export const deletePage = Effect.fn('paths.deletePage')(function* (id: PathId, pageId: PageId) {
  yield* change(id, (path) => removePage(path, pageId));
});
