import { describe, expect, it } from 'vitest';
import { PageId, PathId, activitiesIn, questionsIn } from '@wisepath/domain/paths';
import type { ActivityId, Answer } from '@wisepath/domain/paths';
import { nodeSize } from '../mindLayout';
import { activityMarkOf } from './ActivityBadge.helpers';

const content = '> [!activity]\n> Write two things.\n\n> [!activity]\n> Copy a sentence.';
const page = { id: PageId.make('journal'), content };
const path = { id: PathId.make('reading') };
const [first, second] = activitiesIn(PathId.make('reading'), page).map((a) => a.id);

describe('the activity badge on the map', () => {
  it.each<[string, boolean, string, ReadonlyArray<ActivityId>, ReturnType<typeof activityMarkOf>]>([
    ['no activity', true, 'Just text', [], null],
    ['a map with no progress (a study, a visitor)', false, content, [], { kind: 'has' }],
    ['a learning path with one ticked', true, content, [first], { kind: 'open', count: 1 }],
    ['a learning path with all ticked', true, content, [first, second], { kind: 'done' }],
  ])('marks %s', (_, progress, text, done, expected) => {
    expect(activityMarkOf(path, { ...page, content: text, done }, progress)).toEqual(expected);
  });

  it('counts an unanswered question as open, and an answered one as done', () => {
    const asked = { ...page, content: '> [!question]\n> Why read it twice?' };
    const [question] = questionsIn(PathId.make('reading'), asked).map((q) => q.id);
    const answers: ReadonlyArray<Answer> = [{ question, body: 'To see more.' }];
    expect([activityMarkOf(path, asked, true), activityMarkOf(path, { ...asked, answers }, true)]).toEqual([{ kind: 'open', count: 1 }, { kind: 'done' }]);
  });

  it('makes room for itself beside the title', () => {
    expect(nodeSize('A reading journal', false, false, true).w).toBeGreaterThan(nodeSize('A reading journal', false, false).w);
  });
});
