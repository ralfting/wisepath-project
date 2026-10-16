import { Effect, Option } from 'effect';
import { DefaultProjectProtected, ProjectNotFound, sortProjects } from '@wisepath/domain/projects';
import type { NewProject, Project, ProjectEdit, ProjectId } from '@wisepath/domain/projects';
import { CurrentUser } from '../../paths/application/CurrentUser';
import { ProjectStore } from './ProjectStore';

/** Project use cases: the learner's groups of paths */

/** The default first, then by name; the default is made the first time */
export const listProjects = Effect.fn('projects.list')(function* () {
  const user = yield* CurrentUser;
  const store = yield* ProjectStore;

  yield* store.ensureDefault(user.id);
  return sortProjects(yield* store.listOwned(user.id));
});

/** Creating the same project twice (a retry) returns the one already made */
export const createProject = Effect.fn('projects.create')(function* (command: NewProject) {
  const user = yield* CurrentUser;
  const store = yield* ProjectStore;

  const project: Project = { id: command.id, name: command.name, isDefault: false };
  if (yield* store.insert(user.id, project)) return project;

  const existing = yield* store.find(user.id, command.id);
  if (Option.isSome(existing)) return existing.value;

  return yield* Effect.die(new Error(`Project id ${command.id} is already used by another account`));
});

export const renameProject = Effect.fn('projects.rename')(function* (id: ProjectId, edit: ProjectEdit) {
  const user = yield* CurrentUser;
  const store = yield* ProjectStore;

  if (!(yield* store.rename(user.id, id, edit.name))) return yield* new ProjectNotFound({ projectId: id });
});

/** Its paths move to the default project; one already gone (a retry) changes nothing */
export const removeProject = Effect.fn('projects.remove')(function* (id: ProjectId) {
  const user = yield* CurrentUser;
  const store = yield* ProjectStore;

  const found = yield* store.find(user.id, id);
  if (Option.isNone(found)) return;
  if (found.value.isDefault) return yield* new DefaultProjectProtected({ projectId: id });

  const fallback = yield* store.ensureDefault(user.id);
  yield* store.remove(user.id, id, fallback.id);
});

/** The project, if it is the user's; for path commands that file a path in one */
export const ownProject = Effect.fn('projects.own')(function* (id: ProjectId) {
  const user = yield* CurrentUser;
  const store = yield* ProjectStore;

  const found = yield* store.find(user.id, id);
  if (Option.isNone(found)) return yield* new ProjectNotFound({ projectId: id });
  return found.value;
});
