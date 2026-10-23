import { describe, expect, it } from 'vitest';
import { readCalloutMarker } from './callouts';

describe('reading a callout marker', () => {
  it.each([
    ['[!warning]\nBack up first.', { kind: 'warning', rest: 'Back up first.' }],
    ['  [!DANGER]  ', { kind: 'danger', rest: '' }],
    ['[!info]\r\nLine', { kind: 'info', rest: 'Line' }],
    ['[!note]\nGitHub kind', null],
    ['Just a quote [!info]', null],
  ])('%j', (text, expected) => {
    expect(readCalloutMarker(text)).toEqual(expected);
  });
});
