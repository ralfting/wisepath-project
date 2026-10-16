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
import { ProjectId } from '@wisepath/domain/projects';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/setup';

/**
 * The projects API, end to end, and how paths are filed in projects: the
 * real Nest app and Postgres, called through the client generated from the
 * contract.
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

type Client = Effect.Success<typeof makeClient>;
/** The account's default project, where its paths go unless told otherwise */
const generalOf = (client: Client) => Effect.map(client.projects.list(), (projects) => projects[0].id);

const pid = () => PathId.make(randomUUID());
const pgid = () => PageId.make(randomUUID());
const prid = () => ProjectId.make(randomUUID());

describe('projects API', () => {
  it.effect('gives every account a default project, and nothing in it yet', () =>
    Effect.gen(function* () {
      const client = yield* signedIn;
      const projects = yield* client.projects.list();
      assert.deepStrictEqual(projects.map((p) => [p.name, p.isDefault]), [['General', true]]);
      assert.deepStrictEqual(yield* client.paths.list(), []);
    }),
  );

  it.effect('creates, renames and lists projects, the default first and the rest by name', () =>
    Effect.gen(function* () {
      const client = yield* signedIn;
      const work = prid();
      const made = yield* client.projects.create({ payload: { id: work, name: 'Work' } });
      assert.deepStrictEqual([made.name, made.isDefault], ['Work', false]);
      // Sending it again (a retry) returns the same project
      assert.deepStrictEqual(yield* client.projects.create({ payload: { id: work, name: 'Work' } }), made);
      yield* client.projects.create({ payload: { id: prid(), name: 'art' } });
      const general = yield* generalOf(client);
      yield* client.projects.rename({ params: { projectId: general }, payload: { name: 'Pessoal' } });
      const names = (yield* client.projects.list()).map((p) => p.name);
      assert.deepStrictEqual(names, ['Pessoal', 'art', 'Work']);
    }),
  );

  it.effect('files new paths in a project and moves them to another', () =>
    Effect.gen(function* () {
      const client = yield* signedIn;
      const work = prid();
      yield* client.projects.create({ payload: { id: work, name: 'Work' } });
      const pathId = pid();
      yield* client.paths.create({ payload: { id: pathId, projectId: work, rootPageId: pgid(), title: 'Rust' } });
      const projectOf = Effect.map(client.paths.list(), (paths) => paths.find((p) => p.id === pathId)?.projectId);
      assert.strictEqual(yield* projectOf, work);
      const general = yield* generalOf(client);
      yield* client.paths.update({ params: { pathId }, payload: { projectId: general } });
      assert.strictEqual(yield* projectOf, general);
    }),
  );

  it.effect("moves a deleted project's paths to the default, which can't be deleted", () =>
    Effect.gen(function* () {
      const client = yield* signedIn;
      const work = prid();
      yield* client.projects.create({ payload: { id: work, name: 'Work' } });
      const pathId = pid();
      yield* client.paths.create({ payload: { id: pathId, projectId: work, rootPageId: pgid(), title: 'Rust' } });
      yield* client.projects.remove({ params: { projectId: work } });
      // Deleting it again (a retry) changes nothing
      yield* client.projects.remove({ params: { projectId: work } });
      const general = yield* generalOf(client);
      assert.deepStrictEqual((yield* client.projects.list()).map((p) => p.id), [general]);
      assert.strictEqual((yield* client.paths.list()).find((p) => p.id === pathId)?.projectId, general);
      const refused = yield* Effect.flip(client.projects.remove({ params: { projectId: general } }));
      assert.strictEqual(refused._tag, 'DefaultProjectProtected');
    }),
  );

  it.effect("keeps each account's projects to itself", () =>
    Effect.gen(function* () {
      const owner = yield* signedIn;
      const other = yield* signedIn;
      const theirs = yield* generalOf(owner);
      const renamed = yield* Effect.flip(other.projects.rename({ params: { projectId: theirs }, payload: { name: 'Mine' } }));
      assert.strictEqual(renamed._tag, 'ProjectNotFound');
      const filed = yield* Effect.flip(
        other.paths.create({ payload: { id: pid(), projectId: theirs, rootPageId: pgid(), title: 'Sneaky' } }),
      );
      assert.strictEqual(filed._tag, 'ProjectNotFound');
      const pathId = pid();
      yield* other.paths.create({ payload: { id: pathId, projectId: yield* generalOf(other), rootPageId: pgid(), title: 'Mine' } });
      const moved = yield* Effect.flip(other.paths.update({ params: { pathId }, payload: { projectId: theirs } }));
      assert.strictEqual(moved._tag, 'ProjectNotFound');
      // Deleting someone else's project is answered as if it were already gone, and leaves it
      yield* other.projects.remove({ params: { projectId: theirs } });
      assert.strictEqual((yield* owner.projects.list()).length, 1);
    }),
  );
});
