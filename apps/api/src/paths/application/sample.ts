import { randomUUID } from 'node:crypto';
import { Effect, Option } from 'effect';
import type { Locale } from '@wisepath/domain/auth';
import { PageId, PathId, copyPath, literatureSample } from '@wisepath/domain/paths';
import { UserStore } from '../../auth/application/UserStore';
import { ProjectStore } from '../../projects/application/ProjectStore';
import { CurrentUser } from './CurrentUser';
import { PathStore } from './PathStore';

/**
 * The sample path offered on a first visit (docs/plans/16-first-steps.md): a copy of the literature sample, in the
 * learner's language, filed in their default project. One per learner: its id comes from theirs, so asking again (a
 * retry, a second click) returns the copy already made.
 */
export const takeSample = Effect.fn('paths.takeSample')(function* (shown?: Locale) {
  const user = yield* CurrentUser;
  const store = yield* PathStore;

  const project = yield* (yield* ProjectStore).ensureDefault(user.id, shown);
  const account = yield* (yield* UserStore).findById(user.id);
  const locale = Option.match(account, { onNone: () => shown, onSome: (u) => u.locale ?? shown }) ?? 'en';

  const id = PathId.make(`sample-${user.id}`);
  const copy = copyPath(literatureSample(locale), id, () => PageId.make(randomUUID()));
  if (yield* store.insert(user.id, project.id, copy)) return copy;

  const existing = yield* store.find(user.id, id);
  if (Option.isSome(existing)) return existing.value;
  return yield* Effect.die(new Error(`Sample id ${id} is already used by another account`));
});
