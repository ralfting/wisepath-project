import { describe, expect, it } from 'vitest';
import { awaitsName, isUntitled, untitledName } from './title';

describe('untitled pages', () => {
  it('names one "Untitled page", numbered when the name is taken', () => {
    expect(untitledName([{ title: 'Ownership' }])).toBe('Untitled page');
    expect(untitledName([{ title: 'untitled page' }, { title: 'Untitled page (2)' }])).toBe('Untitled page (3)');
  });

  it('knows that stand-in name, and not a title the learner chose around it', () => {
    expect(isUntitled('Untitled page')).toBe(true);
    expect(isUntitled('Untitled page (12)')).toBe(true);
    expect(isUntitled('Untitled page (draft)')).toBe(false);
    expect(isUntitled('Ownership')).toBe(false);
  });

  it('waits for a name only while nothing is written in the page', () => {
    expect(awaitsName({ title: 'Untitled page (2)', content: '  ' })).toBe(true);
    expect(awaitsName({ title: 'Untitled page', content: 'Notes' })).toBe(false);
  });
});
