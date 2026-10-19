import { Config, Effect, Option } from 'effect';
import { NotAdmin, PathNotFound, inCatalog } from '@wisepath/domain/paths';
import type { CatalogFilter, PathId, PublicationRequest } from '@wisepath/domain/paths';
import { UserStore } from '../../auth/application/UserStore';
import { CurrentUser } from './CurrentUser';
import { PathStore } from './PathStore';
import { findFor, manages } from './paths';
import { PublicationStore } from './PublicationStore';

/**
 * Publishing a path to the catalog (docs/plans/19-publish-to-the-catalog.md): its owner asks, a WisePath
 * administrator approves or declines. Until then the path keeps its visibility; only an approval publishes it.
 */

/** WisePath's administrators: the accounts whose email is in ADMIN_EMAILS, comma separated; nobody when unset */
const adminEmails = Config.String('ADMIN_EMAILS').pipe(
  Config.withDefault(''),
  Config.map((list) => new Set(list.split(',').map((email) => email.trim().toLowerCase()).filter(Boolean))),
);

/** Lets an administrator through; anyone else is answered as if there were nothing there */
const requireAdmin = Effect.gen(function* () {
  const user = yield* CurrentUser;
  const found = yield* (yield* UserStore).findById(user.id);
  const admins = yield* Effect.orDie(adminEmails);
  if (Option.isNone(found) || !admins.has(found.value.email.toLowerCase())) return yield* new NotAdmin();
});

/** Saves what the path teaches, who it is for and its language; a path not yet published waits for review */
export const askToPublish = Effect.fn('paths.askToPublish')(function* (id: PathId, request: PublicationRequest) {
  const store = yield* PathStore;
  const publications = yield* PublicationStore;

  yield* store.transaction(
    Effect.gen(function* () {
      const path = yield* findFor(id, manages, { lock: true });
      yield* publications.describe(id, request);
      if (path.visibility !== 'published') yield* publications.request(id);
    }),
  );
});

/** Withdraws the request, or takes a published path out of the catalog: readable by its link, its takers keep it */
export const withdrawPublication = Effect.fn('paths.withdrawPublication')(function* (id: PathId) {
  const store = yield* PathStore;
  const publications = yield* PublicationStore;

  yield* store.transaction(
    Effect.gen(function* () {
      const path = yield* findFor(id, manages, { lock: true });
      yield* publications.drop(id);
      if (path.visibility === 'published') yield* store.setVisibility(id, 'public');
    }),
  );
});

export const listPublications = Effect.fn('publications.list')(function* () {
  yield* requireAdmin;
  return yield* (yield* PublicationStore).listPending();
});

/** Only a request still waiting is decided; anything else is not found */
const decide = (id: PathId, apply: Effect.Effect<void, never, PathStore | PublicationStore>) =>
  Effect.gen(function* () {
    yield* requireAdmin;
    const store = yield* PathStore;
    const publications = yield* PublicationStore;

    yield* store.transaction(
      Effect.gen(function* () {
        if (!(yield* publications.isPending(id))) return yield* new PathNotFound({ pathId: id });
        yield* apply;
      }),
    );
  });

export const approvePublication = Effect.fn('publications.approve')(function* (id: PathId) {
  yield* decide(
    id,
    Effect.gen(function* () {
      yield* (yield* PathStore).setVisibility(id, 'published');
      yield* (yield* PublicationStore).assignSlug(id);
      yield* (yield* PublicationStore).drop(id);
    }),
  );
});

export const declinePublication = Effect.fn('publications.decline')(function* (id: PathId) {
  yield* decide(id, PublicationStore.use((publications) => publications.decline(id)));
});

/** A published map by its catalog address, as a visitor reads it: no marks, nothing to change */
export const readPublished = Effect.fn('publications.readPublished')(function* (slug: string) {
  const found = yield* (yield* PathStore).findPublished(slug);
  if (Option.isNone(found)) return yield* new PathNotFound({ pathId: slug });
  return found.value;
});

/** The published maps the filter asks for (all of them without one), for the catalog and the sitemap */
export const listCatalog = Effect.fn('publications.listCatalog')(function* (filter: CatalogFilter) {
  const entries = yield* (yield* PathStore).listCatalog();
  return entries.filter((entry) => inCatalog(entry, filter));
});
