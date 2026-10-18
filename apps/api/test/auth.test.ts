import { randomUUID } from 'node:crypto';
import { assert, describe, it } from '@effect/vitest';
import { Effect, Option, Ref } from 'effect';
import { Cookies } from 'effect/http';
import { JwtService } from '@nestjs/jwt';
import { Email } from '@wisepath/domain/auth';
import { useApp } from './app';

/**
 * Accounts and sessions, end to end: the real Nest app and Postgres, called
 * through the client generated from the contract.
 */

const { makeSession, baseUrl } = useApp();

/** A client and its session token, so each one is a separate browser */
const makeClient = Effect.map(makeSession, ({ client, cookies }) => ({
  client,
  token: Ref.get(cookies).pipe(Effect.map((jar) => Option.getOrThrow(Cookies.getValue(jar, 'access_token')))),
}));

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

  it.effect('keeps the language a user chooses, and back to the browser on null', () =>
    Effect.gen(function* () {
      const { client } = yield* makeClient;
      const { user } = yield* client.auth.signup({ payload: { name: 'Ada', email: newEmail(), password } });
      assert.strictEqual(user.locale ?? null, null);
      const chosen = yield* client.auth.updateMe({ payload: { locale: 'pt-BR' } });
      assert.strictEqual(chosen.user.locale, 'pt-BR');
      assert.strictEqual((yield* client.auth.me()).user.locale, 'pt-BR');
      yield* client.auth.updateMe({ payload: { locale: null } });
      assert.strictEqual((yield* client.auth.me()).user.locale ?? null, null);
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
        Effect.promise(() =>
          fetch(`${baseUrl()}/auth/me`, { headers: { authorization: auth } }).then(
            async (r) => [r.status, (await r.json()) as { user?: { id: string }; _tag?: string }] as const,
          ),
        );

      const [ok, body] = yield* me(`Bearer ${jwt}`);
      assert.deepStrictEqual([ok, body.user?.id], [200, user.id]);
      const [parts0, parts1] = jwt.split('.');
      const forged = `${parts0}.${parts1}.${'x'.repeat(43)}`;
      assert.deepStrictEqual(yield* me(`Bearer ${forged}`), [401, { _tag: 'NotAuthenticated' }]);
    }),
  );

  it.effect('keeps a browser session for 30 days, renewed as it is used', () =>
    Effect.gen(function* () {
      const { client } = yield* makeClient;
      const { user } = yield* client.auth.signup({ payload: { name: 'Ada', email: newEmail(), password } });
      // Signed with the test secret, as the API would have two days ago
      const signer = new JwtService({ secret: 'test-only' });
      const issuedAt = Math.floor(Date.now() / 1000);
      const token = (daysAgo: number) =>
        signer.sign({ userId: user.id, email: user.email, iat: issuedAt - daysAgo * 86_400 }, { expiresIn: '30d' });
      const me = (jwt: string) =>
        Effect.promise(() => fetch(`${baseUrl()}/auth/me`, { headers: { cookie: `access_token=${jwt}` } }));

      const renewed = yield* me(token(2));
      assert.strictEqual(renewed.status, 200);
      assert.match(renewed.headers.get('set-cookie') ?? '', /access_token=.+Max-Age=2592000/);

      const fresh = yield* me(token(0));
      assert.deepStrictEqual([fresh.status, fresh.headers.get('set-cookie')], [200, null]);

      const expired = yield* me(token(31));
      assert.strictEqual(expired.status, 401);
    }),
  );

  it('trims what other clients send, as the contract decodes it', async () => {
    const email = newEmail();
    const response = await fetch(`${baseUrl()}/auth/signup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: ' Ada ', email: ` ${email} `, password }),
    });
    assert.strictEqual(response.status, 201);
    const { user } = (await response.json()) as { user: { email: string; name: string } };
    assert.deepStrictEqual([user.email, user.name], [email, 'Ada']);
  });

  it('answers a request that breaks the contract with InvalidRequest', async () => {
    const response = await fetch(`${baseUrl()}/auth/signup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Ada', email: 'not-an-email', password: 'short' }),
    });
    assert.strictEqual(response.status, 400);
    assert.strictEqual(((await response.json()) as { _tag: string })._tag, 'InvalidRequest');
  });
});
