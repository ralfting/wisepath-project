import { assert, describe, it } from '@effect/vitest';
import { Effect, Exit } from 'effect';
import { outcomes, ownedMap, pgid, useApp } from './app';
import type { Client, OwnedMap } from './app';

/**
 * Who may do what with a path (docs/plans/14-public-and-shared-paths.md), through the API: the owner manages it, an
 * editor edits its pages, a reader reads it and keeps their own marks, and anyone else finds nothing, as if it did
 * not exist. Sharing itself (invites, taking, leaving) is tested in sharing.test.ts.
 */

const { signedIn } = useApp();

/** Every write a non-owner might try, in order: content, a new page, the root's title, the kind, into their project */
const writes = (client: Client, map: OwnedMap) => [
  client.paths.updatePage({ params: { pathId: map.pathId, pageId: map.pageId }, payload: { content: 'Mine now' } }),
  client.paths.createPage({ params: { pathId: map.pathId }, payload: { id: pgid(), title: 'Lifetimes' } }),
  client.paths.updatePage({ params: { pathId: map.pathId, pageId: map.rootPageId }, payload: { title: 'Taken' } }),
  client.paths.update({ params: { pathId: map.pathId }, payload: { kind: 'learningPath' } }),
  Effect.flatMap(client.projects.list(), ([own]) => client.paths.update({ params: { pathId: map.pathId }, payload: { projectId: own.id } })),
];

describe('paths API access', () => {
  it.effect('finds nothing of a private path it was not shared with', () =>
    Effect.gen(function* () {
      const map = yield* ownedMap(signedIn);
      const { client: stranger } = yield* signedIn('Eve');

      const read = yield* outcomes([
        stranger.paths.get({ params: { pathId: map.pathId } }),
        stranger.paths.updatePage({ params: { pathId: map.pathId, pageId: map.pageId }, payload: { studied: true } }),
        ...writes(stranger, map),
      ]);
      assert.deepStrictEqual(read, Array(7).fill('PathNotFound'));
      assert.deepStrictEqual(yield* stranger.paths.list(), []);

      // Making a map with the id of someone else's fails, and never hands theirs back
      const reused = yield* Effect.exit(
        stranger.paths.create({ payload: { id: map.pathId, projectId: (yield* stranger.projects.list())[0].id, rootPageId: pgid(), title: 'Mine' } }),
      );
      assert.isTrue(Exit.isFailure(reused));

      // Deleting someone else's path does nothing
      yield* stranger.paths.remove({ params: { pathId: map.pathId } });
      assert.strictEqual((yield* map.owner.paths.get({ params: { pathId: map.pathId } })).access, 'owner');
    }),
  );

  it.effect('lets a reader read and keep their own marks, and nothing else', () =>
    Effect.gen(function* () {
      const map = yield* ownedMap(signedIn);
      const { client: reader, email } = yield* signedIn('Bob');
      yield* map.owner.paths.share({ params: { pathId: map.pathId }, payload: { email, role: 'viewer' } });

      const [listed] = yield* reader.paths.list();
      assert.deepStrictEqual([listed.id, listed.access, listed.projectId, listed.ownerName], [map.pathId, 'viewer', null, 'Ada']);

      yield* reader.paths.updatePage({ params: { pathId: map.pathId, pageId: map.pageId }, payload: { studied: true } });
      const theirs = yield* reader.paths.get({ params: { pathId: map.pathId } });
      const owners = yield* map.owner.paths.get({ params: { pathId: map.pathId } });
      assert.deepStrictEqual(
        [theirs.access, theirs.pages.find((p) => p.id === map.pageId)?.studied, owners.pages.find((p) => p.id === map.pageId)?.studied],
        ['viewer', true, false],
      );

      assert.deepStrictEqual(yield* outcomes(writes(reader, map)), Array(5).fill('PathNotFound'));
      // A mark sent with an edit is refused whole
      const mixed = yield* outcomes([
        reader.paths.updatePage({ params: { pathId: map.pathId, pageId: map.pageId }, payload: { studied: false, content: 'x' } }),
      ]);
      assert.deepStrictEqual(mixed, ['PathNotFound']);
      assert.isTrue((yield* reader.paths.get({ params: { pathId: map.pathId } })).pages.find((p) => p.id === map.pageId)?.studied);
    }),
  );

  it.effect("lets an editor edit pages, but not rename, change, move or delete the path", () =>
    Effect.gen(function* () {
      const map = yield* ownedMap(signedIn);
      const { client: editor, email } = yield* signedIn('Cy');
      yield* map.owner.paths.share({ params: { pathId: map.pathId }, payload: { email, role: 'editor' } });

      const tried = yield* outcomes(writes(editor, map));
      assert.deepStrictEqual(tried, ['ok', 'ok', 'PathNotFound', 'PathNotFound', 'PathNotFound']);

      yield* editor.paths.remove({ params: { pathId: map.pathId } });
      const seen = yield* map.owner.paths.get({ params: { pathId: map.pathId } });
      assert.deepStrictEqual(
        [seen.title, seen.kind, seen.pages.find((p) => p.id === map.pageId)?.content, seen.pages.length],
        ['Rust', 'study', 'Mine now', 3],
      );
    }),
  );

  it.effect('lets anyone read a public path without listing it for them', () =>
    Effect.gen(function* () {
      const map = yield* ownedMap(signedIn);
      const { client: stranger } = yield* signedIn('Dee');
      const visibility = (to: 'public' | 'private') =>
        map.owner.paths.setVisibility({ params: { pathId: map.pathId }, payload: { visibility: to } });
      yield* visibility('public');

      const read = yield* stranger.paths.get({ params: { pathId: map.pathId } });
      assert.deepStrictEqual([read.access, read.visibility], ['viewer', 'public']);
      assert.deepStrictEqual(yield* stranger.paths.list(), []);
      assert.deepStrictEqual(yield* outcomes(writes(stranger, map)), Array(5).fill('PathNotFound'));

      yield* visibility('private');
      assert.deepStrictEqual(yield* outcomes([stranger.paths.get({ params: { pathId: map.pathId } })]), ['PathNotFound']);
    }),
  );
});
