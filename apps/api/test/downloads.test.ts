import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { strFromU8, unzipSync } from 'fflate';
import { outcomes, ownedMap, useApp } from './app';

/**
 * Downloading paths as Markdown (docs/plans/17-markdown-export.md): the owner's paths only, one file per page with
 * its text as written; a path from someone else is never copied out.
 */

const { signedIn } = useApp();

/** The zip's files and their text */
const unzipped = (zip: Uint8Array) =>
  Object.fromEntries(Object.entries(unzipSync(zip)).map(([name, bytes]) => [name, strFromU8(bytes)]));

describe('downloading paths as Markdown', () => {
  it.effect('gives the owner one file per page, with the text as written', () =>
    Effect.gen(function* () {
      const map = yield* ownedMap(signedIn);
      const zip = yield* map.owner.paths.export({ params: { pathId: map.pathId } });
      assert.deepStrictEqual(unzipped(zip), { 'Rust.md': 'See [[Borrowing]]', 'Borrowing.md': '' });
    }),
  );

  it.effect('never copies out a path the learner does not own, taken or not', () =>
    Effect.gen(function* () {
      const map = yield* ownedMap(signedIn);
      const params = { pathId: map.pathId };
      yield* map.owner.paths.setVisibility({ params, payload: { visibility: 'public' } });
      const { client: taker } = yield* signedIn('Bob');
      yield* taker.paths.take({ params });
      const { client: stranger } = yield* signedIn('Eve');

      const refused = yield* outcomes([taker.paths.export({ params }), stranger.paths.export({ params })]);
      assert.deepStrictEqual(refused, ['PathNotFound', 'PathNotFound']);
      assert.deepStrictEqual(Object.keys(unzipped(yield* taker.paths.exportAll())), []);
    }),
  );

  it.effect('downloads every path the learner owns, one folder each', () =>
    Effect.gen(function* () {
      const map = yield* ownedMap(signedIn);
      const files = Object.keys(unzipped(yield* map.owner.paths.exportAll())).sort();
      assert.deepStrictEqual(files, ['Rust/Borrowing.md', 'Rust/Rust.md']);
    }),
  );
});
