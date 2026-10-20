import { describe, expect, it } from 'vitest';
import { untitledName } from './title';

describe('untitled pages', () => {
  it('names one "Untitled page", numbered when the name is taken', () => {
    expect(untitledName([{ title: 'Ownership' }])).toBe('Untitled page');
    expect(untitledName([{ title: 'untitled page' }, { title: 'Untitled page (2)' }])).toBe('Untitled page (3)');
  });
});
