import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { afterAll, assert, beforeAll, describe, it } from '@effect/vitest';
import { Effect, Option, Ref } from 'effect';
import { Cookies, FetchHttpClient, HttpClient } from 'effect/http';
import { HttpApiClient } from 'effect/http-api';
import { WisePathApi } from '@wisepath/contract';
import { Email } from '@wisepath/domain/auth';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/setup';

/**
 * Accounts and sessions, end to end: the real Nest app and Postgres, called
 * through the client generated from the contract.
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

/** A client with its own cookie jar, so each one is a separate browser */
const makeClient = Effect.gen(function* () {
  const cookies = yield* Ref.make(Cookies.empty);
  const client = yield* HttpApiClient.make(WisePathApi, {
    baseUrl,
    transformClient: HttpClient.withCookiesRef(cookies),
  });
  const token = Ref.get(cookies).pipe(Effect.map((jar) => Option.getOrThrow(Cookies.getValue(jar, 'access_token'))));
  return { client, token };
}).pipe(Effect.provide(FetchHttpClient.layer));

const newEmail = () => Email.make(`a-${randomUUID()}@wisepath.test`);
const password = 'long-enough';

describe('auth API', () => {
  it.effect('signs up, keeps the session and knows who it is', () =>
    Effect.gen(function* () {
      const { client } = yield* makeClient;
      const email = newEmail();
      const { user } = yield* client.auth.signup({ payload: { name: 'Ada', email, password } });
      assert.deepStrictEqual([user.email, user.name], [email, 'Ada']);
      const me = yield* client.auth.me();
      assert.deepStrictEqual(me.user, user);
    }),
  );

  it.effect('refuses an email that already has an account', () =>
    Effect.gen(function* () {
      const { client } = yield* makeClient;
      const email = newEmail();
      yield* client.auth.signup({ payload: { name: 'Ada', email, password } });
      const error = yield* Effect.flip(client.auth.signup({ payload: { name: 'Other', email, password } }));
      assert.strictEqual(error._tag, 'EmailAlreadyRegistered');
    }),
  );

  it.effect('logs in with the right password only', () =>
    Effect.gen(function* () {
      const email = newEmail();
      const { client: first } = yield* makeClient;
      const { user } = yield* first.auth.signup({ payload: { name: 'Ada', email, password } });

      const { client } = yield* makeClient;
      const wrong = yield* Effect.flip(client.auth.login({ payload: { email, password: 'not-the-one' } }));
      assert.strictEqual(wrong._tag, 'InvalidCredentials');
      // An email with no account answers the same, so it doesn't reveal which accounts exist
      const unknown = yield* Effect.flip(client.auth.login({ payload: { email: newEmail(), password } }));
      assert.strictEqual(unknown._tag, 'InvalidCredentials');
      assert.strictEqual((yield* Effect.flip(client.auth.me()))._tag, 'NotAuthenticated');

      const logged = yield* client.auth.login({ payload: { email, password } });
      assert.deepStrictEqual(logged.user, user);
      assert.deepStrictEqual((yield* client.auth.me()).user, user);
    }),
  );

  it.effect('logging out ends the session', () =>
    Effect.gen(function* () {
      const { client } = yield* makeClient;
      yield* client.auth.signup({ payload: { name: 'Ada', email: newEmail(), password } });
      yield* client.auth.logout();
      const error = yield* Effect.flip(client.auth.me());
      assert.strictEqual(error._tag, 'NotAuthenticated');
    }),
  );

  it.effect('accepts the session as a Bearer token, and refuses a forged one', () =>
    Effect.gen(function* () {
      const { client, token } = yield* makeClient;
      const { user } = yield* client.auth.signup({ payload: { name: 'Ada', email: newEmail(), password } });
      const jwt = yield* token;
      const me = (auth: string) =>
        Effect.promise(() => fetch(`${baseUrl}/auth/me`, { headers: { authorization: auth } }).then(async (r) => [r.status, (await r.json()) as { user?: { id: string }; _tag?: string }] as const));

      const [ok, body] = yield* me(`Bearer ${jwt}`);
      assert.deepStrictEqual([ok, body.user?.id], [200, user.id]);
      const [parts0, parts1] = jwt.split('.');
      const forged = `${parts0}.${parts1}.${'x'.repeat(43)}`;
      assert.deepStrictEqual(yield* me(`Bearer ${forged}`), [401, { _tag: 'NotAuthenticated' }]);
    }),
  );

  it('trims what other clients send, as the contract decodes it', async () => {
    const email = newEmail();
    const response = await fetch(`${baseUrl}/auth/signup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: ' Ada ', email: ` ${email} `, password }),
    });
    assert.strictEqual(response.status, 201);
    const { user } = (await response.json()) as { user: { email: string; name: string } };
    assert.deepStrictEqual([user.email, user.name], [email, 'Ada']);
  });

  it('answers a request that breaks the contract with InvalidRequest', async () => {
    const response = await fetch(`${baseUrl}/auth/signup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Ada', email: 'not-an-email', password: 'short' }),
    });
    assert.strictEqual(response.status, 400);
    assert.strictEqual(((await response.json()) as { _tag: string })._tag, 'InvalidRequest');
  });
});
