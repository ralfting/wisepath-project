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
import { PageId, ProjectId } from '@wisepath/domain/projects';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/setup';

/**
 * The projects API, end to end: the real Nest app and Postgres, called through
 * the client generated from the contract. If the server drifts from the
 * contract (a path, a status, a body), these calls fail to decode.
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

/** A client with its own cookie jar, so each one is a separate session */
const makeClient = Effect.gen(function* () {
  const cookies = yield* Ref.make(Cookies.empty);
  return yield* HttpApiClient.make(WisePathApi, {
    baseUrl,
    transformClient: HttpClient.withCookiesRef(cookies),
  });
}).pipe(Effect.provide(FetchHttpClient.layer));

/** A new account, signed in */
const signedIn = Effect.gen(function* () {
  const client = yield* makeClient;
  yield* client.auth.signup({
    payload: { name: 'Tester', email: Email.make(`t-${randomUUID()}@wisepath.test`), password: 'long-enough' },
  });
  return client;
});

const pid = () => ProjectId.make(randomUUID());
const pgid = () => PageId.make(randomUUID());

describe('projects API', () => {
  it.effect('needs a session', () =>
    Effect.gen(function* () {
      const client = yield* makeClient;
      const error = yield* Effect.flip(client.projects.list());
      assert.strictEqual(error._tag, 'NotAuthenticated');
    }),
  );

  it.effect('gives every account one copy of the sample map', () =>
    Effect.gen(function* () {
      const client = yield* signedIn;
      const first = yield* client.projects.list();
      const again = yield* client.projects.list();
      assert.strictEqual(first.length, 1);
      assert.deepStrictEqual(again, first);
      // A study: no next page to continue to
      assert.deepStrictEqual([first[0].title, first[0].kind, first[0].total, first[0].next], ['NestJS', 'study', 41, null]);
      // Deleting it does not bring it back
      yield* client.projects.remove({ params: { projectId: first[0].id } });
      assert.strictEqual((yield* client.projects.list()).length, 0);
    }),
  );

  it.effect('creates, edits and deletes a map', () =>
    Effect.gen(function* () {
      const client = yield* signedIn;
      const id = pid();
      const rootPageId = pgid();
      const made = yield* client.projects.create({ payload: { id, rootPageId, title: 'Rust' } });
      // Sending it again (a retry) returns the same map
      const retried = yield* client.projects.create({ payload: { id, rootPageId, title: 'Rust' } });
      assert.deepStrictEqual(retried, made);
      yield* client.projects.update({ params: { projectId: id }, payload: { description: 'Ownership first' } });
      const got = yield* client.projects.get({ params: { projectId: id } });
      assert.deepStrictEqual([got.title, got.description, got.kind, got.pages.length], ['Rust', 'Ownership first', 'study', 1]);
      // Turned into a learning path, and made as one
      yield* client.projects.update({ params: { projectId: id }, payload: { kind: 'learningPath' } });
      assert.strictEqual((yield* client.projects.get({ params: { projectId: id } })).kind, 'learningPath');
      const courseId = pid();
      const course = yield* client.projects.create({ payload: { id: courseId, rootPageId: pgid(), title: 'Go', kind: 'learningPath' } });
      assert.strictEqual(course.kind, 'learningPath');
      yield* client.projects.remove({ params: { projectId: courseId } });
      yield* client.projects.remove({ params: { projectId: id } });
      const gone = yield* Effect.flip(client.projects.get({ params: { projectId: id } }));
      assert.strictEqual(gone._tag, 'ProjectNotFound');
    }),
  );

  it.effect('runs page commands with the domain rules', () =>
    Effect.gen(function* () {
      const client = yield* signedIn;
      const projectId = pid();
      const rootPageId = pgid();
      const params = { projectId };
      yield* client.projects.create({ payload: { id: projectId, rootPageId, title: 'Rust' } });

      // A page from a [[link]]; a retry of the same command changes nothing
      const borrowId = pgid();
      yield* client.projects.updatePage({
        params: { ...params, pageId: rootPageId },
        payload: { content: 'Start with [[Borrowing]]' },
      });
      yield* client.projects.createPage({ params, payload: { id: borrowId, title: 'Borrowing' } });
      yield* client.projects.createPage({ params, payload: { id: borrowId, title: 'Borrowing' } });
      const taken = yield* Effect.flip(
        client.projects.createPage({ params, payload: { id: pgid(), title: ' borrowing ' } }),
      );
      assert.strictEqual(taken._tag, 'TitleTaken');

      // Renaming moves the [[links]] that used the old title; the look is set in the same command
      yield* client.projects.updatePage({
        params: { ...params, pageId: borrowId },
        payload: { title: 'Borrow checker', previousTitle: 'Borrowing', module: true, color: 'green', studied: true },
      });
      const renamed = yield* client.projects.get({ params });
      const root = renamed.pages.find((p) => p.id === rootPageId)!;
      const borrow = renamed.pages.find((p) => p.id === borrowId)!;
      assert.strictEqual(root.content, 'Start with [[Borrow checker]]');
      assert.deepStrictEqual(
        [borrow.title, borrow.module, borrow.color, borrow.studied],
        ['Borrow checker', true, 'green', true],
      );

      // The root names the map: renaming it renames the map, and it can't be studied or deleted
      yield* client.projects.updatePage({ params: { ...params, pageId: rootPageId }, payload: { title: 'Rust 2024' } });
      assert.strictEqual((yield* client.projects.get({ params })).title, 'Rust 2024');
      const studied = yield* Effect.flip(
        client.projects.updatePage({ params: { ...params, pageId: rootPageId }, payload: { studied: true } }),
      );
      assert.strictEqual(studied._tag, 'RootPageProtected');
      const rootDelete = yield* Effect.flip(client.projects.removePage({ params: { ...params, pageId: rootPageId } }));
      assert.strictEqual(rootDelete._tag, 'RootPageProtected');

      // Deleting a page twice is fine; editing it afterwards says it is gone
      yield* client.projects.removePage({ params: { ...params, pageId: borrowId } });
      yield* client.projects.removePage({ params: { ...params, pageId: borrowId } });
      const missing = yield* Effect.flip(
        client.projects.updatePage({ params: { ...params, pageId: borrowId }, payload: { content: 'x' } }),
      );
      assert.strictEqual(missing._tag, 'PageNotFound');
      assert.strictEqual((yield* client.projects.get({ params })).pages.length, 1);
    }),
  );

  it.effect("keeps each account's maps to itself", () =>
    Effect.gen(function* () {
      const owner = yield* signedIn;
      const other = yield* signedIn;
      const projectId = pid();
      const rootPageId = pgid();
      yield* owner.projects.create({ payload: { id: projectId, rootPageId, title: 'Private' } });
      const read = yield* Effect.flip(other.projects.get({ params: { projectId } }));
      assert.strictEqual(read._tag, 'ProjectNotFound');
      const write = yield* Effect.flip(
        other.projects.updatePage({ params: { projectId, pageId: rootPageId }, payload: { content: 'mine now' } }),
      );
      assert.strictEqual(write._tag, 'ProjectNotFound');
      yield* other.projects.remove({ params: { projectId } });
      assert.strictEqual((yield* owner.projects.get({ params: { projectId } })).pages[0].content, '');
    }),
  );

  it('answers a request that breaks the contract with InvalidRequest', async () => {
    const cookie = await fetch(`${baseUrl}/auth/signup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'T', email: `t-${randomUUID()}@wisepath.test`, password: 'long-enough' }),
    }).then((r) => r.headers.get('set-cookie')!.split(';')[0]);
    const response = await fetch(`${baseUrl}/projects`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ id: 'p', rootPageId: 'r', title: '', extra: 1 }),
    });
    assert.strictEqual(response.status, 400);
    assert.strictEqual(((await response.json()) as { _tag: string })._tag, 'InvalidRequest');
  });
});
