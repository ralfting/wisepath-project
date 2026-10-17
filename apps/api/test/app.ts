import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { afterAll, beforeAll } from '@effect/vitest';
import { Effect, Layer, Ref } from 'effect';
import { Cookies, FetchHttpClient, HttpClient } from 'effect/http';
import { HttpApiClient } from 'effect/http-api';
import { WisePathApi } from '@wisepath/contract';
import { Email } from '@wisepath/domain/auth';
import { PageId, PathId } from '@wisepath/domain/paths';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/setup';
import { DatabaseLive } from '../src/shared/infrastructure/database/Database';
import { SqlLive } from '../src/shared/infrastructure/Sql';

/**
 * The real Nest app on a free port for one test file, and clients generated from the contract to call it. Each
 * client has its own cookie jar, so each one is a separate session.
 */
export function useApp() {
  let app: NestExpressApplication;
  let baseUrl = '';

  beforeAll(async () => {
    app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: ['error'] });
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}/api`;
  });

  afterAll(async () => {
    await app?.close();
  });

  const makeClient = Effect.suspend(() =>
    Effect.gen(function* () {
      const cookies = yield* Ref.make(Cookies.empty);
      return yield* HttpApiClient.make(WisePathApi, { baseUrl, transformClient: HttpClient.withCookiesRef(cookies) });
    }),
  ).pipe(Effect.provide(FetchHttpClient.layer));

  /** A new account, signed in, who it is and its email */
  const signedIn = (name: string) =>
    Effect.gen(function* () {
      const client = yield* makeClient;
      const email = Email.make(`t-${randomUUID()}@wisepath.test`);
      const { user } = yield* client.auth.signup({ payload: { name, email, password: 'long-enough' } });
      return { client, user, email };
    });

  return { makeClient, signedIn };
}

export type Client = Effect.Success<ReturnType<typeof useApp>['makeClient']>;
type SignedIn = ReturnType<typeof useApp>['signedIn'];

export const pid = () => PathId.make(randomUUID());
export const pgid = () => PageId.make(randomUUID());

/** Ada's map of a root linking one page */
export const ownedMap = (signedIn: SignedIn) =>
  Effect.gen(function* () {
    const { client, email } = yield* signedIn('Ada');
    const pathId = pid();
    const rootPageId = pgid();
    const pageId = pgid();
    const [general] = yield* client.projects.list();
    yield* client.paths.create({ payload: { id: pathId, projectId: general.id, rootPageId, title: 'Rust' } });
    yield* client.paths.updatePage({ params: { pathId, pageId: rootPageId }, payload: { content: 'See [[Borrowing]]' } });
    yield* client.paths.createPage({ params: { pathId }, payload: { id: pageId, title: 'Borrowing' } });
    return { owner: client, ownerEmail: email, pathId, rootPageId, pageId };
  });

export type OwnedMap = Effect.Success<ReturnType<typeof ownedMap>>;

/** The tag of each failure, or 'ok', for a list of calls */
export const outcomes = (calls: ReadonlyArray<Effect.Effect<unknown, { readonly _tag: string }>>) =>
  Effect.forEach(calls, (call) =>
    call.pipe(
      Effect.as('ok'),
      Effect.catch((error) => Effect.succeed(error._tag)),
    ),
  );

/** The test database, for setting up what the API can't yet do and checking what it stored */
export const TestDatabase = DatabaseLive.pipe(Layer.provide(SqlLive));
