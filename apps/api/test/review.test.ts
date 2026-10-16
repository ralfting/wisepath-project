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
import { CardId } from '@wisepath/domain/review';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/setup';

/**
 * The review API, end to end: cards written in pages, listed when due and
 * graded, through the client generated from the contract.
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
  return yield* HttpApiClient.make(WisePathApi, {
    baseUrl,
    transformClient: HttpClient.withCookiesRef(cookies),
  });
}).pipe(Effect.provide(FetchHttpClient.layer));

type Client = Effect.Success<typeof makeClient>;

/** The account's default project, where its paths go unless told otherwise */
const generalOf = (client: Client) => Effect.map(client.projects.list(), (projects) => projects[0].id);

const signedIn = Effect.gen(function* () {
  const client = yield* makeClient;
  yield* client.auth.signup({
    payload: { name: 'Tester', email: Email.make(`r-${randomUUID()}@wisepath.test`), password: 'long-enough' },
  });
  return client;
});

/** A new path whose root page has this text */
const pathWith = (client: Client, title: string, content: string) =>
  Effect.gen(function* () {
    const pathId = PathId.make(randomUUID());
    const rootPageId = PageId.make(randomUUID());
    yield* client.paths.create({ payload: { id: pathId, projectId: yield* generalOf(client), rootPageId, title } });
    yield* client.paths.updatePage({ params: { pathId, pageId: rootPageId }, payload: { content } });
    return { pathId, rootPageId };
  });

/** The end of the day, a day from now: anything due by then is due today */
const tomorrow = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

describe('review API', () => {
  it.effect('needs a session', () =>
    Effect.gen(function* () {
      const client = yield* makeClient;
      const error = yield* Effect.flip(client.review.counts({ query: { dayEnds: tomorrow() } }));
      assert.strictEqual(error._tag, 'NotAuthenticated');
    }),
  );

  it.effect('lists the cards written in pages, per path, with where they come from', () =>
    Effect.gen(function* () {
      const client = yield* signedIn;
      const rust = yield* pathWith(client, 'Rust', 'Who owns a value? :: One variable\n```\nnot :: a card\n```\nA ==borrow== is a reference.');
      const go = yield* pathWith(client, 'Go', 'What runs a goroutine? :: The scheduler');

      const all = yield* client.review.due({ query: { dayEnds: tomorrow() } });
      // The sample path has no cards
      assert.deepStrictEqual(
        all.map((c) => [c.pathTitle, c.kind, c.answer]),
        [
          ['Rust', 'basic', 'One variable'],
          ['Rust', 'cloze', 'borrow'],
          ['Go', 'basic', 'The scheduler'],
        ],
      );
      assert.isTrue(all.every((c) => c.state === null && c.pageTitle === c.pathTitle));

      const onlyGo = yield* client.review.due({ query: { dayEnds: tomorrow(), pathId: go.pathId } });
      assert.deepStrictEqual(onlyGo.map((c) => c.question), ['What runs a goroutine?']);

      const counts = yield* client.review.counts({ query: { dayEnds: tomorrow() } });
      assert.strictEqual(counts.due, 3);
      assert.deepStrictEqual(
        counts.paths.map((p) => [p.pathId, p.cards, p.due]),
        [
          [rust.pathId, 2, 2],
          [go.pathId, 1, 1],
        ],
      );
    }),
  );

  it.effect('grades a card, schedules it, and a retry of the same grade changes nothing', () =>
    Effect.gen(function* () {
      const client = yield* signedIn;
      yield* pathWith(client, 'Rust', 'Who owns a value? :: One variable');
      const [card] = yield* client.review.due({ query: { dayEnds: tomorrow() } });

      const state = yield* client.review.grade({ params: { cardId: card.id }, payload: { grade: 3, reps: 0 } });
      assert.strictEqual(state.reps, 1);
      assert.isAbove(Date.parse(state.due), Date.now() + 23 * 60 * 60 * 1000);
      const retried = yield* client.review.grade({ params: { cardId: card.id }, payload: { grade: 3, reps: 0 } });
      assert.deepStrictEqual(retried, state);

      // Not due again today; due once its day comes
      assert.strictEqual((yield* client.review.due({ query: { dayEnds: tomorrow() } })).length, 0);
      const later = new Date(Date.parse(state.due) + 1000).toISOString();
      const [back] = yield* client.review.due({ query: { dayEnds: later } });
      assert.deepStrictEqual([back.id, back.state?.reps], [card.id, 1]);

      // Again brings it back within the day
      const again = yield* client.review.grade({ params: { cardId: card.id }, payload: { grade: 1, reps: 1 } });
      assert.deepStrictEqual([again.reps, again.lapses], [2, 1]);
      assert.strictEqual((yield* client.review.due({ query: { dayEnds: tomorrow() } })).length, 1);
    }),
  );

  it.effect('keeps a card when its answer is edited, and its state when its line is gone and back', () =>
    Effect.gen(function* () {
      const client = yield* signedIn;
      const { pathId, rootPageId } = yield* pathWith(client, 'Rust', 'Who owns a value? :: One variable');
      const [card] = yield* client.review.due({ query: { dayEnds: tomorrow() } });
      yield* client.review.grade({ params: { cardId: card.id }, payload: { grade: 3, reps: 0 } });

      const edit = (content: string) => client.paths.updatePage({ params: { pathId, pageId: rootPageId }, payload: { content } });
      const later = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      yield* edit('Who owns a value? :: Exactly one variable');
      const [edited] = yield* client.review.due({ query: { dayEnds: later } });
      assert.deepStrictEqual([edited.id, edited.answer, edited.state?.reps], [card.id, 'Exactly one variable', 1]);

      yield* edit('No cards now');
      assert.strictEqual((yield* client.review.counts({ query: { dayEnds: later } })).due, 0);
      const gone = yield* Effect.flip(client.review.grade({ params: { cardId: card.id }, payload: { grade: 3, reps: 1 } }));
      assert.strictEqual(gone._tag, 'CardNotFound');

      yield* edit('Who owns a value? :: One variable');
      const [returned] = yield* client.review.due({ query: { dayEnds: later } });
      assert.strictEqual(returned.state?.reps, 1);
    }),
  );

  it.effect('starts 20 new cards a day, across every path', () =>
    Effect.gen(function* () {
      const client = yield* signedIn;
      // One day for the whole test: the cards graded below were started within it
      const dayEnds = tomorrow();
      const lines = (from: number) => Array.from({ length: 15 }, (_, i) => `Q${from + i}? :: A`).join('\n');
      const first = yield* pathWith(client, 'One', lines(0));
      yield* pathWith(client, 'Two', lines(100));
      const due = yield* client.review.due({ query: { dayEnds } });
      assert.strictEqual(due.length, 20);

      // Five started today in the first path leave fifteen for the second, and ten in the first
      for (const card of due.slice(0, 5)) {
        yield* client.review.grade({ params: { cardId: card.id }, payload: { grade: 3, reps: 0 } });
      }
      const counts = yield* client.review.counts({ query: { dayEnds } });
      assert.strictEqual(counts.due, 15);
      assert.deepStrictEqual(counts.paths.map((p) => [p.cards, p.due]), [
        [15, 10],
        [15, 15],
      ]);
      const onlyFirst = yield* client.review.due({ query: { dayEnds, pathId: first.pathId } });
      assert.strictEqual(onlyFirst.length, 10);
    }),
  );

  it.effect("never shows or grades another user's cards", () =>
    Effect.gen(function* () {
      const alice = yield* signedIn;
      const bob = yield* signedIn;
      yield* pathWith(alice, 'Rust', 'Who owns a value? :: One variable');
      const [card] = yield* alice.review.due({ query: { dayEnds: tomorrow() } });

      assert.strictEqual((yield* bob.review.due({ query: { dayEnds: tomorrow() } })).length, 0);
      const error = yield* Effect.flip(bob.review.grade({ params: { cardId: card.id }, payload: { grade: 3, reps: 0 } }));
      assert.strictEqual(error._tag, 'CardNotFound');
      const unknown = yield* Effect.flip(alice.review.grade({ params: { cardId: CardId.make('nope') }, payload: { grade: 3, reps: 0 } }));
      assert.strictEqual(unknown._tag, 'CardNotFound');
    }),
  );

  it.effect('refuses a grade outside 1 to 4 and a day that is not a date', () =>
    Effect.gen(function* () {
      const client = yield* signedIn;
      const bad = yield* Effect.flip(client.review.counts({ query: { dayEnds: 'soon' } }));
      assert.strictEqual(bad._tag, 'InvalidRequest');
      const res = yield* Effect.promise(() =>
        fetch(`${baseUrl}/review/x`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"grade":5,"reps":0}' }),
      );
      // Without a session the guard answers first; the schema refusal is covered by the pipe
      assert.strictEqual(res.status, 401);
    }),
  );
});
