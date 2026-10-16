import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { afterAll, assert, beforeAll, describe, it } from '@effect/vitest';
import { Effect, Ref } from 'effect';
import { Cookies, FetchHttpClient, HttpClient } from 'effect/http';
import { HttpApiClient } from 'effect/http-api';
import { WisePathApi } from '@wisepath/contract';
import { Email } from '@wisepath/domain/auth';
import { PageId, PathId } from '@wisepath/domain/paths';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/setup';

/**
 * Search everywhere, end to end: the real Nest app and Postgres (its trigram
 * indexes and unaccent), called through the client generated from the contract.
 */

let app: NestExpressApplication;
let baseUrl: string;

beforeAll(async () => {
  app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: ['error'] });
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}/api`;
});

afterAll(async () => {
  await app?.close();
});

const makeClient = Effect.gen(function* () {
  const cookies = yield* Ref.make(Cookies.empty);
  return yield* HttpApiClient.make(WisePathApi, { baseUrl, transformClient: HttpClient.withCookiesRef(cookies) });
}).pipe(Effect.provide(FetchHttpClient.layer));

const signedIn = Effect.gen(function* () {
  const client = yield* makeClient;
  yield* client.auth.signup({
    payload: { name: 'Tester', email: Email.make(`s-${randomUUID()}@wisepath.test`), password: 'long-enough' },
  });
  return client;
});

type Client = Effect.Success<typeof signedIn>;

/** The account's default project, where its paths go unless told otherwise */
const generalOf = (client: Client) => Effect.map(client.projects.list(), (projects) => projects[0].id);

/** The session cookie of a new account, for requests made without the generated client */
const signupCookie = Effect.promise(async () => {
  const response = await fetch(`${baseUrl}/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Raw', email: `r-${randomUUID()}@wisepath.test`, password: 'long-enough' }),
  });
  return response.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
});

/** A map titled `title` with these pages, off the map unless `rootContent` links to them */
const makeMap = (client: Client, title: string, pages: ReadonlyArray<{ title: string; content: string }>, rootContent = '') =>
  Effect.gen(function* () {
    const pathId = PathId.make(randomUUID());
    const rootPageId = PageId.make(randomUUID());
    yield* client.paths.create({ payload: { id: pathId, projectId: yield* generalOf(client), rootPageId, title } });
    const ids: Array<PageId> = [];
    for (const page of pages) {
      const id = PageId.make(randomUUID());
      yield* client.paths.createPage({ params: { pathId }, payload: { id, title: page.title } });
      yield* client.paths.updatePage({ params: { pathId, pageId: id }, payload: { content: page.content } });
      ids.push(id);
    }
    if (rootContent) yield* client.paths.updatePage({ params: { pathId, pageId: rootPageId }, payload: { content: rootContent } });
    return { pathId, rootPageId, ids };
  });

describe('search API', () => {
  it.effect('needs a session', () =>
    Effect.gen(function* () {
      const client = yield* makeClient;
      const error = yield* Effect.flip(client.search.search({ query: { q: 'anything' } }));
      assert.strictEqual(error._tag, 'NotAuthenticated');
    }),
  );

  it.effect('finds titles first, then text, across maps, with where each page sits', () =>
    Effect.gen(function* () {
      const client = yield* signedIn;
      const nest = yield* makeMap(client, 'NestJS', [
        { title: 'Providers', content: 'Classes that can be injected.' },
        { title: 'Modules', content: 'A module groups **providers** and controllers.' },
      ]);
      const other = yield* makeMap(client, 'Angular', [{ title: 'Custom providers', content: '' }]);

      const hits = yield* client.search.search({ query: { q: 'providers' } });
      assert.deepStrictEqual(
        hits.map((h) => [h.title, h.pathTitle, h.where]),
        [
          ['Providers', 'NestJS', []],
          ['Custom providers', 'Angular', []],
          ['Modules', 'NestJS', []],
        ],
      );
      assert.strictEqual(hits[0].pathId, nest.pathId);
      assert.strictEqual(hits[1].pathId, other.pathId);
      // A title match needs no excerpt; a text match shows its line, with the word marked
      assert.isNull(hits[0].excerpt);
      const excerpt = hits[2].excerpt!;
      assert.strictEqual(excerpt.text, 'A module groups **providers** and controllers.');
      assert.deepStrictEqual(
        excerpt.marks.map(([s, e]) => excerpt.text.slice(s, e)),
        ['providers'],
      );
    }),
  );

  it.effect('says where a page deeper in the map sits', () =>
    Effect.gen(function* () {
      const client = yield* signedIn;
      const map = yield* makeMap(client, 'NestJS', [{ title: 'Fundamentals', content: '- [[Injection scopes]]' }], '- [[Fundamentals]]');
      const deep = PageId.make(randomUUID());
      yield* client.paths.createPage({ params: { pathId: map.pathId }, payload: { id: deep, title: 'Injection scopes' } });

      const [hit] = yield* client.search.search({ query: { q: 'injection scopes' } });
      assert.deepStrictEqual([hit.pageId, hit.where], [deep, ['Fundamentals']]);
    }),
  );

  it.effect('ignores case and accents, and needs every word', () =>
    Effect.gen(function* () {
      const client = yield* signedIn;
      yield* makeMap(client, 'Estudos', [
        { title: 'Revisão espaçada', content: 'Cartões com intervalos crescentes.' },
        { title: 'Memória', content: 'A REVISÃO fortalece a memória.' },
      ]);

      const titles = (q: string) => client.search.search({ query: { q } }).pipe(Effect.map((hits) => hits.map((h) => h.title)));
      assert.deepStrictEqual(yield* titles('revisao'), ['Revisão espaçada', 'Memória']);
      assert.deepStrictEqual(yield* titles('CARTOES intervalos'), ['Revisão espaçada']);
      assert.deepStrictEqual(yield* titles('revisao cartoes'), ['Revisão espaçada']);
      assert.deepStrictEqual(yield* titles('revisao nada'), []);
      assert.deepStrictEqual(yield* titles('   '), []);
      // LIKE's wildcards are only themselves
      assert.deepStrictEqual(yield* titles('%'), []);
    }),
  );

  it.effect("never finds another user's pages", () =>
    Effect.gen(function* () {
      const owner = yield* signedIn;
      const word = `secret${randomUUID().slice(0, 8)}`;
      yield* makeMap(owner, 'Mine', [{ title: 'Private', content: `The ${word} is here.` }]);

      const stranger = yield* signedIn;
      assert.deepStrictEqual(yield* stranger.search.search({ query: { q: word } }), []);
      assert.strictEqual((yield* owner.search.search({ query: { q: word } })).length, 1);
    }),
  );

  it.effect('returns at most the limit, and refuses one out of range', () =>
    Effect.gen(function* () {
      const client = yield* signedIn;
      yield* makeMap(
        client,
        'Many',
        Array.from({ length: 6 }, (_, i) => ({ title: `Note ${i}`, content: 'common word' })),
      );

      assert.strictEqual((yield* client.search.search({ query: { q: 'common', limit: 4 } })).length, 4);
      assert.strictEqual((yield* client.search.search({ query: { q: 'common' } })).length, 6);
      // The generated client won't send it, so ask as any other client could
      const cookie = yield* signupCookie;
      const response = yield* Effect.promise(() => fetch(`${baseUrl}/search?q=common&limit=500`, { headers: { cookie } }));
      assert.strictEqual(response.status, 400);
      assert.strictEqual(((yield* Effect.promise(() => response.json())) as { _tag: string })._tag, 'InvalidRequest');
    }),
  );
});
