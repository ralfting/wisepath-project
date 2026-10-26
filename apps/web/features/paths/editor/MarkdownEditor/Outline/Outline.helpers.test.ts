import { describe, expect, it } from 'vitest';
import { outlinePlace } from './Outline.helpers';

describe('outlinePlace', () => {
  it('lists the headings beside a full page with room for the list on its right', () => {
    expect(outlinePlace(18, false)).toBe('list');
  });

  it('puts the dashes in the margin when there is room for them but not for the list', () => {
    expect(outlinePlace(17.9, false)).toBe('margin');
    expect(outlinePlace(3.5, false)).toBe('margin');
  });

  it('keeps the dashes inside the page with no room, outside a full page, or while a note card holds the margin', () => {
    expect(outlinePlace(3.4, false)).toBe('inside');
    expect(outlinePlace(null, false)).toBe('inside');
    expect(outlinePlace(40, true)).toBe('inside');
  });
});
