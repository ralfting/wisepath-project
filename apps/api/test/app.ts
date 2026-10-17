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

  /** A new account, signed in, and who it is */
  const signedIn = (name: string) =>
    Effect.gen(function* () {
      const client = yield* makeClient;
      const { user } = yield* client.auth.signup({
        payload: { name, email: Email.make(`t-${randomUUID()}@wisepath.test`), password: 'long-enough' },
      });
      return { client, user };
    });

  return { makeClient, signedIn };
}

export type Client = Effect.Success<ReturnType<typeof useApp>['makeClient']>;

/** The test database, for setting up what the API can't yet do and checking what it stored */
export const TestDatabase = DatabaseLive.pipe(Layer.provide(SqlLive));
