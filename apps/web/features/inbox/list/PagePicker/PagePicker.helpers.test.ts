import { describe, expect, it } from 'vitest';
import { PageId, PathId, samplePath, summarize } from '@wisepath/domain/paths';
import type { Path } from '@wisepath/domain/paths';
import { ProjectId } from '@wisepath/domain/projects';
import { pagesFor, pathsFor } from './PagePicker.helpers';

const summary = (title: string) => summarize({ ...samplePath, id: PathId.make(title.toLowerCase()), title }, ProjectId.make('general'));

describe('pathsFor', () => {
  it('offers the path last opened first, and only those whose title matches what is typed', () => {
    const paths = [summary('Rust'), summary('Effect'), summary('Elixir')];
    expect(pathsFor(paths, 'elixir', '').map((p) => p.title)).toEqual(['Elixir', 'Rust', 'Effect']);
    expect(pathsFor(paths, 'elixir', ' E ').map((p) => p.title)).toEqual(['Elixir', 'Effect']);
  });
});

describe('pagesFor', () => {
  it("offers the path's main page first, untitled pages under their shown name", () => {
    const page = (id: string, title: string) => ({ id: PageId.make(id), title, content: '', studied: false, updatedAt: '' });
    const path: Path = { ...samplePath, rootPageId: PageId.make('root'), pages: [page('a', 'Alpha'), page('root', 'Main'), page('b', '')] };
    expect(pagesFor(path, '').map((p) => p.id)).toEqual(['root', 'a', 'b']);
    expect(pagesFor(path, 'untitled').map((p) => p.id)).toEqual(['b']);
  });
});
