import { describe, expect, it } from 'vitest';
import { PathId, samplePath, summarize } from '@wisepath/domain/paths';
import type { PathSummary } from '@wisepath/domain/paths';
import { aProject } from '@/infrastructure/projects/MemoryProjectRepository';
import { fromOthers, groupPaths } from './PathsHome.helpers';

const general = aProject({ name: 'General', isDefault: true });
const work = aProject({ name: 'Work' });
const aPath = (title: string, projectId: string, description?: string): PathSummary => ({
  ...summarize({ ...samplePath, id: PathId.make(title.toLowerCase()), title }, general.id),
  projectId: projectId as PathSummary['projectId'],
  ...(description ? { description } : {}),
});

const rust = aPath('Rust', work.id, 'Systems programming');
const effect = aPath('Effect', general.id);
const orphan = aPath('Japanese', 'deleted-project');
const shared: PathSummary = { ...aPath('Go', general.id), projectId: null, ownerName: 'Ada', access: 'viewer' };

const names = (groups: ReturnType<typeof groupPaths>) => groups.map((g) => [g.project.name, g.paths.map((p) => p.title)]);

describe('groupPaths', () => {
  it('puts each path under its project, and one whose project is gone under the default', () => {
    expect(names(groupPaths([rust, effect, orphan], [general, work], ''))).toEqual([
      ['General', ['Effect', 'Japanese']],
      ['Work', ['Rust']],
    ]);
  });

  it('searches titles and descriptions ignoring case, and leaves out projects with nothing matching', () => {
    expect(names(groupPaths([rust, effect, orphan], [general, work], '  SYSTEMS '))).toEqual([['Work', ['Rust']]]);
    expect(names(groupPaths([rust, effect, orphan], [general, work], 'nothing like it'))).toEqual([]);
  });

  it('keeps paths from others out of every project, in a group of their own that follows the search', () => {
    expect(names(groupPaths([rust, shared], [general, work], ''))).toEqual([
      ['General', []],
      ['Work', ['Rust']],
    ]);
    expect(fromOthers([rust, shared], '').map((p) => p.title)).toEqual(['Go']);
    expect(fromOthers([rust, shared], 'rust')).toEqual([]);
  });

  it('keeps empty projects when not searching', () => {
    expect(names(groupPaths([], [general, work], ''))).toEqual([
      ['General', []],
      ['Work', []],
    ]);
  });
});
