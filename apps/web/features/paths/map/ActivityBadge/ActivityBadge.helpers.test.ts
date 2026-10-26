import { describe, expect, it } from 'vitest';
import { PageId, PathId, activitiesIn } from '@wisepath/domain/paths';
import type { ActivityId, PathKind } from '@wisepath/domain/paths';
import { nodeSize } from '../mindLayout';
import { activityMarkOf } from './ActivityBadge';

const content = '> [!activity]\n> Write two things.\n\n> [!activity]\n> Copy a sentence.';
const page = { id: PageId.make('journal'), content };
const path = (kind: PathKind) => ({ id: PathId.make('reading'), kind });
const [first, second] = activitiesIn(PathId.make('reading'), page).map((a) => a.id);

describe('the activity badge on the map', () => {
  it.each<[string, PathKind, string, ReadonlyArray<ActivityId>, ReturnType<typeof activityMarkOf>]>([
    ['no activity', 'learningPath', 'Just text', [], null],
    ['a study', 'study', content, [], { kind: 'has' }],
    ['a learning path with one ticked', 'learningPath', content, [first], { kind: 'open', count: 1 }],
    ['a learning path with all ticked', 'learningPath', content, [first, second], { kind: 'done' }],
  ])('marks %s', (_, kind, text, done, expected) => {
    expect(activityMarkOf(path(kind), { ...page, content: text, done })).toEqual(expected);
  });

  it('makes room for itself beside the title', () => {
    expect(nodeSize('A reading journal', false, false, true).w).toBeGreaterThan(nodeSize('A reading journal', false, false).w);
  });
});
